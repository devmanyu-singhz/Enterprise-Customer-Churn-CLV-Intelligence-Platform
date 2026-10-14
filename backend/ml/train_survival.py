import time
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple, List, Optional
from lifelines import CoxPHFitter, KaplanMeierFitter

from config import SURVIVAL_MODEL_PATH, SURVIVAL_FEATURES_PATH
from ml.data_loader import get_or_create_dataset
from utils.logger import logger

# Essential covariates for survival analysis
SURVIVAL_NUMERICAL = ["MonthlyCharges", "SupportTickets"]
SURVIVAL_CATEGORICAL = [
    "Contract", "InternetService", "TechSupport", "PaymentMethod", "PaperlessBilling"
]

def prepare_survival_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """Transform raw DataFrame into clean numerical/dummy format suitable for CoxPHFitter."""
    data = pd.DataFrame()
    
    # Duration and Event
    data["tenure"] = pd.to_numeric(df["tenure"], errors="coerce").fillna(1).clip(lower=1)
    data["Churn"] = pd.to_numeric(df["Churn"], errors="coerce").fillna(0).astype(int)

    # Numerical covariates
    for col in SURVIVAL_NUMERICAL:
        if col in df.columns:
            data[col] = pd.to_numeric(df[col], errors="coerce").fillna(df[col].median() if col in df else 0.0)
        else:
            data[col] = 0.0

    # Categorical dummy variables with drop_first=True to avoid collinearity
    cat_df = pd.DataFrame()
    for col in SURVIVAL_CATEGORICAL:
        if col in df.columns:
            cat_df[col] = df[col].astype(str).fillna("No")
        else:
            cat_df[col] = "No"

    dummies = pd.get_dummies(cat_df, drop_first=True, dtype=float)
    data = pd.concat([data, dummies], axis=1)

    covariates = [c for c in data.columns if c not in ["tenure", "Churn"]]
    return data, covariates

def train_survival_model(
    df: pd.DataFrame = None,
    save_artifacts: bool = True
) -> Tuple[CoxPHFitter, List[str], Dict[str, Any]]:
    """Train Cox Proportional Hazards Model on customer tenure and churn event."""
    start_time = time.time()
    
    if df is None:
        df = get_or_create_dataset()

    surv_data, covariates = prepare_survival_data(df)

    logger.info(f"Fitting Cox Proportional Hazards model with {len(covariates)} covariates on {len(surv_data)} samples...")
    cph = CoxPHFitter(penalizer=0.1)
    cph.fit(surv_data, duration_col="tenure", event_col="Churn")

    # Fit baseline Kaplan-Meier as benchmark
    kmf = KaplanMeierFitter()
    kmf.fit(surv_data["tenure"], event_observed=surv_data["Churn"], label="Overall Customer Survival")
    median_survival = float(kmf.median_survival_time_) if not np.isnan(kmf.median_survival_time_) else 48.0

    elapsed = round(time.time() - start_time, 3)
    logger.info(f"Cox model trained in {elapsed}s | Concordance Index: {round(cph.concordance_index_, 4)} | Median Survival: {median_survival}m")

    stats = {
        "concordance_index": round(float(cph.concordance_index_), 4),
        "median_survival_months": median_survival,
        "covariates_count": len(covariates),
        "total_records": len(df),
        "training_duration_seconds": elapsed
    }

    if save_artifacts:
        SURVIVAL_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(cph, SURVIVAL_MODEL_PATH)
        logger.info(f"Saved Cox survival model to {SURVIVAL_MODEL_PATH}")

        with open(SURVIVAL_FEATURES_PATH, "w") as f:
            json.dump(covariates, f, indent=2)
        logger.info(f"Saved survival covariates to {SURVIVAL_FEATURES_PATH}")

    return cph, covariates, stats

def load_survival_model() -> Tuple[CoxPHFitter, List[str]]:
    """Load persisted Cox survival model and covariate list."""
    if not SURVIVAL_MODEL_PATH.exists() or not SURVIVAL_FEATURES_PATH.exists():
        raise FileNotFoundError("Survival model or feature list not found. Run training first.")
    
    cph = joblib.load(SURVIVAL_MODEL_PATH)
    with open(SURVIVAL_FEATURES_PATH, "r") as f:
        covariates = json.load(f)
    return cph, covariates

def prepare_single_survival_record(record: Dict[str, Any], covariates: List[str]) -> pd.DataFrame:
    """Format single customer record into the exact DataFrame schema required by CoxPHFitter."""
    df_single = pd.DataFrame([record])
    
    # Create base frame
    row_data = {}
    for col in SURVIVAL_NUMERICAL:
        row_data[col] = float(df_single[col].values[0]) if col in df_single.columns else 0.0

    # Categorical values
    cat_df = pd.DataFrame()
    for col in SURVIVAL_CATEGORICAL:
        cat_df[col] = df_single[col].astype(str) if col in df_single.columns else pd.Series(["No"])

    dummies = pd.get_dummies(cat_df, drop_first=True, dtype=float)

    # Combine and ensure all expected covariates exist
    combined = pd.DataFrame([row_data])
    combined = pd.concat([combined, dummies], axis=1)

    for cov in covariates:
        if cov not in combined.columns:
            combined[cov] = 0.0

    return combined[covariates]
