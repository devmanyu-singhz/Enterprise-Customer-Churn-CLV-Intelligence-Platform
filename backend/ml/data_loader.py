import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple
from config import ACTIVE_DATASET_PATH
from utils.logger import logger

DEFAULT_FEATURES = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "tenure",
    "PhoneService", "MultipleLines", "InternetService", "OnlineSecurity",
    "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV",
    "StreamingMovies", "Contract", "PaperlessBilling", "PaymentMethod",
    "MonthlyCharges", "TotalCharges", "SupportTickets"
]

NUMERICAL_FEATURES = ["tenure", "MonthlyCharges", "TotalCharges", "SupportTickets", "SeniorCitizen"]

CATEGORICAL_FEATURES = [
    "gender", "Partner", "Dependents", "PhoneService", "MultipleLines",
    "InternetService", "OnlineSecurity", "OnlineBackup", "DeviceProtection",
    "TechSupport", "StreamingTV", "StreamingMovies", "Contract",
    "PaperlessBilling", "PaymentMethod"
]

def generate_telco_dataset(num_records: int = 1200) -> pd.DataFrame:
    """Generate a realistic Telco Customer Churn dataset."""
    np.random.seed(42)
    
    genders = ["Female", "Male"]
    partners = ["Yes", "No"]
    dependents = ["Yes", "No"]
    phone_services = ["Yes", "No"]
    internet_services = ["Fiber optic", "DSL", "No"]
    contracts = ["Month-to-month", "One year", "Two year"]
    payment_methods = [
        "Electronic check", "Mailed check",
        "Bank transfer (automatic)", "Credit card (automatic)"
    ]

    records = []
    for i in range(1, num_records + 1):
        customer_id = f"{7000 + i:04d}-TELCO"
        gender = np.random.choice(genders)
        senior = int(np.random.choice([0, 1], p=[0.84, 0.16]))
        partner = np.random.choice(partners, p=[0.48, 0.52])
        dep = np.random.choice(dependents, p=[0.30, 0.70])
        
        # Tenure distribution: mixture of new and loyal customers
        if np.random.rand() < 0.35:
            tenure = np.random.randint(1, 13)
        elif np.random.rand() < 0.7:
            tenure = np.random.randint(13, 49)
        else:
            tenure = np.random.randint(49, 73)
            
        contract = np.random.choice(contracts, p=[0.55, 0.24, 0.21])
        if tenure > 36 and contract == "Month-to-month" and np.random.rand() < 0.6:
            contract = np.random.choice(["One year", "Two year"])
            
        phone = np.random.choice(phone_services, p=[0.90, 0.10])
        mult_lines = "No phone service" if phone == "No" else np.random.choice(["Yes", "No"], p=[0.45, 0.55])
        
        internet = np.random.choice(internet_services, p=[0.44, 0.34, 0.22])
        if internet == "No":
            sec = backup = dev = tech = tv = movies = "No internet service"
            base_charge = np.random.uniform(18.5, 25.0)
        else:
            sec = np.random.choice(["Yes", "No"], p=[0.29, 0.71])
            backup = np.random.choice(["Yes", "No"], p=[0.34, 0.66])
            dev = np.random.choice(["Yes", "No"], p=[0.34, 0.66])
            tech = np.random.choice(["Yes", "No"], p=[0.29, 0.71])
            tv = np.random.choice(["Yes", "No"], p=[0.38, 0.62])
            movies = np.random.choice(["Yes", "No"], p=[0.38, 0.62])
            
            base_charge = 45.0 if internet == "DSL" else 75.0
            addons = sum([sec == "Yes", backup == "Yes", dev == "Yes", tech == "Yes", tv == "Yes", movies == "Yes"])
            base_charge += addons * 6.5
            
        monthly_charges = float(np.round(base_charge + np.random.uniform(-3, 3), 2))
        total_charges = float(np.round(monthly_charges * tenure + np.random.uniform(-10, 10), 2))
        
        paperless = np.random.choice(["Yes", "No"], p=[0.59, 0.41])
        payment = np.random.choice(payment_methods, p=[0.34, 0.22, 0.22, 0.22])
        
        # Support tickets correlation with frustration
        support_tickets = np.random.poisson(lam=1.2)
        if tech == "No" and internet != "No":
            support_tickets += np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2])
            
        # Realistic Churn Log-Odds Formula
        logit = -1.2
        logit += 0.8 if contract == "Month-to-month" else (-0.6 if contract == "Two year" else -0.2)
        logit += 0.6 if tech == "No" and internet != "No" else -0.3
        logit += 0.5 if payment == "Electronic check" else 0.0
        logit += 0.35 * support_tickets
        logit -= 0.04 * tenure
        logit += 0.015 * (monthly_charges - 60)
        logit += 0.3 if internet == "Fiber optic" and sec == "No" else 0.0

        prob = 1 / (1 + np.exp(-logit))
        churn = 1 if np.random.rand() < prob else 0

        records.append({
            "customerID": customer_id,
            "gender": gender,
            "SeniorCitizen": senior,
            "Partner": partner,
            "Dependents": dep,
            "tenure": tenure,
            "PhoneService": phone,
            "MultipleLines": mult_lines,
            "InternetService": internet,
            "OnlineSecurity": sec,
            "OnlineBackup": backup,
            "DeviceProtection": dev,
            "TechSupport": tech,
            "StreamingTV": tv,
            "StreamingMovies": movies,
            "Contract": contract,
            "PaperlessBilling": paperless,
            "PaymentMethod": payment,
            "MonthlyCharges": monthly_charges,
            "TotalCharges": total_charges,
            "SupportTickets": int(support_tickets),
            "Churn": churn
        })

    df = pd.DataFrame(records)
    return df

def get_or_create_dataset(csv_path: Path = ACTIVE_DATASET_PATH) -> pd.DataFrame:
    """Load existing dataset or generate new Telco sample dataset."""
    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path)
            logger.info(f"Loaded existing dataset from {csv_path} with {len(df)} rows.")
            return df
        except Exception as e:
            logger.warning(f"Error loading {csv_path}: {e}. Generating new dataset.")

    df = generate_telco_dataset()
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False)
    logger.info(f"Saved generated Telco dataset to {csv_path} with {len(df)} records.")
    return df

def summarize_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute rich summary statistics for dataset preview."""
    total_customers = len(df)
    churn_count = int(df["Churn"].sum()) if "Churn" in df.columns else 0
    churn_rate = float(np.round(churn_count / max(total_customers, 1), 4))
    
    avg_monthly = float(np.round(df["MonthlyCharges"].mean(), 2)) if "MonthlyCharges" in df.columns else 0.0
    total_monthly_revenue = float(np.round(df["MonthlyCharges"].sum(), 2)) if "MonthlyCharges" in df.columns else 0.0
    revenue_at_risk = float(np.round(df[df["Churn"] == 1]["MonthlyCharges"].sum() * 12, 2)) if "Churn" in df.columns else 0.0

    missing_counts = df.isnull().sum().to_dict()
    total_missing = sum(missing_counts.values())

    return {
        "total_records": total_customers,
        "churned_count": churn_count,
        "retained_count": total_customers - churn_count,
        "churn_rate": churn_rate,
        "avg_monthly_charges": avg_monthly,
        "total_monthly_revenue": total_monthly_revenue,
        "annual_revenue_at_risk": revenue_at_risk,
        "total_missing_values": total_missing,
        "missing_by_column": missing_counts,
        "columns": list(df.columns)
    }
