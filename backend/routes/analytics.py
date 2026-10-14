import json
from pathlib import Path
from fastapi import APIRouter
import pandas as pd
import numpy as np

from config import METRICS_PATH, LOW_RISK_THRESHOLD, HIGH_RISK_THRESHOLD
from ml.data_loader import get_or_create_dataset
from routes.predict import get_models
from ml.clv_calculator import calculate_risk_tier, compute_clv
from utils.logger import logger

router = APIRouter(prefix="/analytics", tags=["Executive Analytics"])

@router.get("")
async def get_analytics_overview():
    """Retrieve comprehensive executive dashboard metrics, risk distributions, cohort breakdowns, and model evaluation metrics."""
    df = get_or_create_dataset()
    total_customers = len(df)
    
    # Load evaluation metrics
    eval_metrics = {}
    if METRICS_PATH.exists():
        try:
            with open(METRICS_PATH, "r") as f:
                eval_metrics = json.load(f)
        except Exception as e:
            logger.warning(f"Error loading {METRICS_PATH}: {e}")

    # Churn stats
    churned_count = int(df["Churn"].sum()) if "Churn" in df.columns else 0
    churn_rate = float(np.round(churned_count / max(total_customers, 1), 4))
    
    avg_monthly = float(np.round(df["MonthlyCharges"].mean(), 2)) if "MonthlyCharges" in df.columns else 0.0
    total_monthly_revenue = float(np.round(df["MonthlyCharges"].sum(), 2)) if "MonthlyCharges" in df.columns else 0.0

    # Model inference for accurate risk tiers and dynamic CLVs across entire dataset
    classifier, preprocessor, cph, covariates = get_models()
    X_trans = preprocessor.transform(df)
    churn_probs = classifier.predict_proba(X_trans)[:, 1]

    high_risk_count = 0
    med_risk_count = 0
    low_risk_count = 0
    total_revenue_at_risk = 0.0
    clv_list = []

    for i in range(len(df)):
        p = float(churn_probs[i])
        tier = calculate_risk_tier(p)
        mc = float(df["MonthlyCharges"].iloc[i]) if "MonthlyCharges" in df.columns else 60.0
        tenure = float(df["tenure"].iloc[i]) if "tenure" in df.columns else 12.0
        
        # Approximate remaining lifetime: higher churn probability corresponds to lower remaining months
        exp_life = float(np.clip(40.0 * (1.0 - 0.7 * p), 2.0, 48.0))
        clv = compute_clv(mc, exp_life, p)
        clv_list.append(clv)

        if tier == "High Risk":
            high_risk_count += 1
            total_revenue_at_risk += mc * 12
        elif tier == "Medium Risk":
            med_risk_count += 1
        else:
            low_risk_count += 1

    avg_clv = float(np.round(np.mean(clv_list), 2)) if clv_list else 0.0

    # Contract breakdown
    contract_breakdown = []
    if "Contract" in df.columns:
        for contract_type, grp in df.groupby("Contract"):
            c_indices = grp.index
            c_churn_rate = float(np.round(grp["Churn"].mean(), 4)) if "Churn" in grp.columns else 0.0
            c_avg_prob = float(np.round(np.mean([churn_probs[idx] for idx in c_indices]), 4))
            c_avg_clv = float(np.round(np.mean([clv_list[idx] for idx in c_indices]), 2))
            contract_breakdown.append({
                "category": contract_type,
                "total_customers": len(grp),
                "actual_churn_rate": c_churn_rate,
                "predicted_churn_prob": c_avg_prob,
                "avg_clv": c_avg_clv
            })

    # Internet Service breakdown
    internet_breakdown = []
    if "InternetService" in df.columns:
        for net_type, grp in df.groupby("InternetService"):
            n_indices = grp.index
            n_churn_rate = float(np.round(grp["Churn"].mean(), 4)) if "Churn" in grp.columns else 0.0
            n_avg_prob = float(np.round(np.mean([churn_probs[idx] for idx in n_indices]), 4))
            internet_breakdown.append({
                "category": net_type,
                "total_customers": len(grp),
                "actual_churn_rate": n_churn_rate,
                "predicted_churn_prob": n_avg_prob
            })

    # Payment Method breakdown
    payment_breakdown = []
    if "PaymentMethod" in df.columns:
        for pay_type, grp in df.groupby("PaymentMethod"):
            p_indices = grp.index
            p_churn_rate = float(np.round(grp["Churn"].mean(), 4)) if "Churn" in grp.columns else 0.0
            p_avg_prob = float(np.round(np.mean([churn_probs[idx] for idx in p_indices]), 4))
            payment_breakdown.append({
                "category": pay_type,
                "total_customers": len(grp),
                "actual_churn_rate": p_churn_rate,
                "predicted_churn_prob": p_avg_prob
            })

    return {
        "kpis": {
            "total_customers": total_customers,
            "churned_count": churned_count,
            "retained_count": total_customers - churned_count,
            "churn_rate": churn_rate,
            "avg_monthly_charges": avg_monthly,
            "total_monthly_revenue": total_monthly_revenue,
            "annual_revenue_at_risk": round(total_revenue_at_risk, 2),
            "avg_customer_clv": avg_clv
        },
        "risk_distribution": [
            {"tier": "Low Risk", "count": low_risk_count, "percentage": round(low_risk_count / total_customers * 100, 1), "color": "#10b981"},
            {"tier": "Medium Risk", "count": med_risk_count, "percentage": round(med_risk_count / total_customers * 100, 1), "color": "#f59e0b"},
            {"tier": "High Risk", "count": high_risk_count, "percentage": round(high_risk_count / total_customers * 100, 1), "color": "#ef4444"}
        ],
        "contract_breakdown": contract_breakdown,
        "internet_breakdown": internet_breakdown,
        "payment_breakdown": payment_breakdown,
        "model_metrics": eval_metrics
    }
