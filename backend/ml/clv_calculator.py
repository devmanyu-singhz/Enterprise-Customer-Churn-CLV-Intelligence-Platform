import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from lifelines import CoxPHFitter
from config import LOW_RISK_THRESHOLD, HIGH_RISK_THRESHOLD

def calculate_risk_tier(churn_prob: float) -> str:
    """Classify churn probability into business risk tier."""
    if churn_prob < LOW_RISK_THRESHOLD:
        return "Low Risk"
    elif churn_prob <= HIGH_RISK_THRESHOLD:
        return "Medium Risk"
    else:
        return "High Risk"

def compute_customer_survival_and_lifetime(
    cph: CoxPHFitter,
    covariates_df: pd.DataFrame,
    current_tenure: float = 12.0,
    horizon_months: int = 36
) -> Tuple[List[Dict[str, float]], float]:
    """
    Compute customer survival curve and expected remaining lifetime in months.
    Uses conditional survival: P(T > t0 + dt | T > t0) = S(t0 + dt) / S(t0)
    """
    surv_fn = cph.predict_survival_function(covariates_df)
    times = surv_fn.index.values
    probs = surv_fn.iloc[:, 0].values

    # Clean current tenure
    t0 = max(1.0, float(current_tenure))

    # Baseline probability at current tenure S(t0)
    # Interpolate S(t0) from times and probs
    s_t0 = float(np.interp(t0, times, probs))
    if s_t0 <= 1e-4:
        s_t0 = 1e-4

    curve = []
    future_probs = []
    
    # Generate survival points for future months (e.g., 1, 3, 6, 9, 12, 18, 24, 30, 36)
    evaluation_months = [1, 2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 27, 30, 33, 36]
    for dt in evaluation_months:
        t_future = t0 + dt
        s_future = float(np.interp(t_future, times, probs))
        cond_prob = float(np.clip(s_future / s_t0, 0.0, 1.0))
        curve.append({
            "month": int(dt),
            "future_tenure": int(t0 + dt),
            "probability": round(cond_prob, 4)
        })

    # Integrate / sum monthly conditional survival up to 48 months to calculate expected remaining lifetime
    dt_grid = np.arange(1, 49)
    for dt in dt_grid:
        s_future = float(np.interp(t0 + dt, times, probs))
        cond_p = float(np.clip(s_future / s_t0, 0.0, 1.0))
        future_probs.append(cond_p)

    expected_remaining_months = float(np.round(np.sum(future_probs), 1))
    # Safeguard reasonable range [1, 48]
    expected_remaining_months = max(1.0, min(48.0, expected_remaining_months))

    return curve, expected_remaining_months

def compute_clv(
    monthly_charges: float,
    expected_remaining_months: float,
    churn_probability: float
) -> float:
    """
    Calculate Dynamic Customer Lifetime Value (CLV).
    Formula: CLV = Monthly Charges * Expected Remaining Tenure * (1 - Churn Probability)
    """
    mc = max(0.0, float(monthly_charges))
    tenure_months = max(0.0, float(expected_remaining_months))
    prob = np.clip(float(churn_probability), 0.0, 1.0)
    
    clv = mc * tenure_months * (1.0 - prob)
    return float(np.round(clv, 2))
