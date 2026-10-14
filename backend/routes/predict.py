import time
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np

from config import CLASSIFIER_MODEL_PATH, PREPROCESSOR_PATH, SURVIVAL_MODEL_PATH
from ml.preprocessor import DataPreprocessor
from ml.train_classifier import load_churn_classifier
from ml.train_survival import load_survival_model, prepare_single_survival_record, prepare_survival_data
from ml.clv_calculator import calculate_risk_tier, compute_customer_survival_and_lifetime, compute_clv
from ml.data_loader import get_or_create_dataset
from utils.logger import logger

router = APIRouter(prefix="/predict", tags=["Predictions"])

class CustomerPayload(BaseModel):
    tenure: float = Field(default=12.0, ge=1.0, le=100.0)
    MonthlyCharges: float = Field(default=65.0, ge=0.0)
    TotalCharges: Optional[float] = Field(default=None)
    Contract: str = Field(default="Month-to-month")
    PaymentMethod: str = Field(default="Electronic check")
    PaperlessBilling: str = Field(default="Yes")
    TechSupport: str = Field(default="No")
    InternetService: str = Field(default="Fiber optic")
    OnlineSecurity: str = Field(default="No")
    OnlineBackup: str = Field(default="No")
    DeviceProtection: str = Field(default="No")
    StreamingTV: str = Field(default="No")
    StreamingMovies: str = Field(default="No")
    PhoneService: str = Field(default="Yes")
    MultipleLines: str = Field(default="No")
    gender: str = Field(default="Female")
    SeniorCitizen: int = Field(default=0)
    Partner: str = Field(default="No")
    Dependents: str = Field(default="No")
    SupportTickets: int = Field(default=1, ge=0)

    class Config:
        extra = "allow"

# Global lazy singletons
_classifier = None
_preprocessor = None
_survival_model = None
_survival_covariates = None

def get_models():
    global _classifier, _preprocessor, _survival_model, _survival_covariates
    if _classifier is None or _preprocessor is None:
        _classifier = load_churn_classifier()
        _preprocessor = DataPreprocessor.load()
    if _survival_model is None or _survival_covariates is None:
        _survival_model, _survival_covariates = load_survival_model()
    return _classifier, _preprocessor, _survival_model, _survival_covariates

def reload_models():
    """Force reload models after re-training."""
    global _classifier, _preprocessor, _survival_model, _survival_covariates
    _classifier = load_churn_classifier()
    _preprocessor = DataPreprocessor.load()
    _survival_model, _survival_covariates = load_survival_model()

@router.post("/individual")
async def predict_individual(payload: CustomerPayload):
    """Predict churn probability, expected lifetime, and dynamic CLV for a single customer."""
    start_time = time.time()
    try:
        model, preprocessor, cph, covariates = get_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Models not ready: {str(e)}")

    record = payload.model_dump()
    if record.get("TotalCharges") is None:
        record["TotalCharges"] = round(record["MonthlyCharges"] * record["tenure"], 2)

    # 1. Churn Probability via XGBoost
    X_trans = preprocessor.transform_single(record)
    churn_prob = float(model.predict_proba(X_trans)[0, 1])
    risk_tier = calculate_risk_tier(churn_prob)

    # 2. Survival Analysis & Remaining Lifetime via CoxPH
    surv_df = prepare_single_survival_record(record, covariates)
    survival_curve, exp_remaining_months = compute_customer_survival_and_lifetime(
        cph, surv_df, current_tenure=record["tenure"]
    )

    # 3. Dynamic CLV
    clv = compute_clv(record["MonthlyCharges"], exp_remaining_months, churn_prob)

    latency_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(f"Individual prediction computed in {latency_ms}ms | Churn: {round(churn_prob, 4)} | CLV: ${clv}")

    return {
        "churn_probability": round(churn_prob, 4),
        "risk_tier": risk_tier,
        "expected_lifetime_months": exp_remaining_months,
        "estimated_clv": clv,
        "survival_curve": survival_curve,
        "latency_ms": latency_ms
    }

@router.post("/batch")
async def predict_batch(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="churn_probability"),
    order: str = Query(default="desc"),
    risk_tier_filter: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None)
):
    """Score the active dataset in batch, returning sorted, filterable customer records with CLV and risk tiers."""
    start_time = time.time()
    try:
        model, preprocessor, cph, covariates = get_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Models not ready: {str(e)}")

    df = get_or_create_dataset()

    # Preprocess all rows
    X_trans = preprocessor.transform(df)
    churn_probs = model.predict_proba(X_trans)[:, 1]

    # Prepare survival predictions
    surv_data, _ = prepare_survival_data(df)
    surv_features = surv_data[covariates]
    
    # Batch predict survival curves using Cox partial hazard
    partial_hazards = cph.predict_partial_hazard(surv_features).values.flatten()
    baseline_cum_hazard = cph.baseline_cumulative_hazard_

    results = []
    high_count = 0
    med_count = 0
    low_count = 0
    total_revenue_at_risk = 0.0

    for i in range(len(df)):
        row = df.iloc[i].to_dict()
        cid = row.get("customerID", f"CUST-{i+1:04d}")
        prob = float(churn_probs[i])
        tier = calculate_risk_tier(prob)

        if tier == "High Risk":
            high_count += 1
            total_revenue_at_risk += float(row.get("MonthlyCharges", 0.0)) * 12
        elif tier == "Medium Risk":
            med_count += 1
        else:
            low_count += 1

        tenure = float(row.get("tenure", 12))
        monthly = float(row.get("MonthlyCharges", 60))

        # Fast vector-approximated expected remaining lifetime based on hazard ratio
        hazard = float(partial_hazards[i])
        # Customers with higher hazard decay faster: remaining lifetime scales inversely with hazard
        exp_life = float(np.round(np.clip(36.0 / (0.5 + 0.8 * hazard), 1.0, 48.0), 1))
        clv = compute_clv(monthly, exp_life, prob)

        results.append({
            "customerID": cid,
            "tenure": int(tenure),
            "MonthlyCharges": monthly,
            "TotalCharges": float(row.get("TotalCharges", round(monthly * tenure, 2))),
            "Contract": row.get("Contract", "Month-to-month"),
            "PaymentMethod": row.get("PaymentMethod", "Electronic check"),
            "InternetService": row.get("InternetService", "Fiber optic"),
            "TechSupport": row.get("TechSupport", "No"),
            "SupportTickets": int(row.get("SupportTickets", 0)),
            "churn_probability": round(prob, 4),
            "risk_tier": tier,
            "expected_lifetime_months": exp_life,
            "estimated_clv": clv
        })

    # Apply search filter
    if search:
        s = search.lower().strip()
        results = [
            r for r in results 
            if s in r["customerID"].lower() or s in r["Contract"].lower() or s in r["PaymentMethod"].lower()
        ]

    # Apply risk tier filter
    if risk_tier_filter and risk_tier_filter.lower() != "all":
        results = [r for r in results if r["risk_tier"].lower() == risk_tier_filter.lower()]

    # Sorting
    reverse = (order.lower() == "desc")
    if sort_by in ["churn_probability", "estimated_clv", "tenure", "MonthlyCharges", "expected_lifetime_months"]:
        results.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)

    total_filtered = len(results)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_records = results[start_idx:end_idx]

    latency_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "page": page,
        "limit": limit,
        "total_records": total_filtered,
        "total_pages": int(np.ceil(total_filtered / limit)) if total_filtered > 0 else 1,
        "risk_breakdown": {
            "high_risk": high_count,
            "medium_risk": med_count,
            "low_risk": low_count
        },
        "annual_revenue_at_risk": round(total_revenue_at_risk, 2),
        "customers": paginated_records,
        "latency_ms": latency_ms
    }
