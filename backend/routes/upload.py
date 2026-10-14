import shutil
import re
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd

from config import UPLOAD_PATH, ACTIVE_DATASET_PATH, MAX_UPLOAD_SIZE_MB
from ml.data_loader import summarize_dataset, get_or_create_dataset, generate_telco_dataset
from utils.logger import logger

router = APIRouter(prefix="", tags=["Upload & Dataset Management"])

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload custom customer dataset (.csv). Validates size, schema, and updates active dataset."""
    filename = file.filename or "uploaded_dataset.csv"
    
    # Sanitize filename
    clean_name = re.sub(r"[^a-zA-Z0-9_\.-]", "_", Path(filename).name)
    if not clean_name.lower().endswith((".csv", ".parquet")):
        raise HTTPException(status_code=400, detail="Only .csv and .parquet files are supported.")

    destination = UPLOAD_PATH / clean_name
    
    # Read file content with size validation
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {MAX_UPLOAD_SIZE_MB} MB."
        )

    with open(destination, "wb") as f:
        f.write(content)

    # Parse and validate dataframe
    try:
        if clean_name.lower().endswith(".parquet"):
            df = pd.read_parquet(destination)
        else:
            df = pd.read_csv(destination)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded file: {str(e)}")

    # Schema validation
    required_cols = ["tenure", "MonthlyCharges"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing essential columns required for analysis: {', '.join(missing)}"
        )

    # Copy to active dataset
    df.to_csv(ACTIVE_DATASET_PATH, index=False)
    logger.info(f"Successfully processed upload '{clean_name}' with {len(df)} rows.")

    summary = summarize_dataset(df)
    summary["message"] = f"Dataset '{clean_name}' uploaded and activated successfully."
    return summary

@router.post("/upload/reset-sample")
async def reset_sample_dataset():
    """Reset the active dataset to the standard Telco Customer Churn dataset."""
    df = generate_telco_dataset()
    df.to_csv(ACTIVE_DATASET_PATH, index=False)
    logger.info("Active dataset reset to standard Telco benchmark.")
    summary = summarize_dataset(df)
    summary["message"] = "Dataset reset to standard Telco customer benchmark."
    return summary

@router.get("/dataset/summary")
async def get_dataset_summary():
    """Retrieve summary statistics of current active dataset."""
    df = get_or_create_dataset()
    return summarize_dataset(df)

@router.get("/dataset/sample-customers")
async def get_sample_customers():
    """Return preset customer personas for instant 1-click inspection and What-If simulation."""
    presets = [
        {
            "id": "persona-1",
            "name": "High-Risk Month-to-Month Newcomer",
            "description": "High monthly bill, electronic check, 3 support tickets, no tech support.",
            "data": {
                "gender": "Female",
                "SeniorCitizen": 0,
                "Partner": "No",
                "Dependents": "No",
                "tenure": 4,
                "PhoneService": "Yes",
                "MultipleLines": "No",
                "InternetService": "Fiber optic",
                "OnlineSecurity": "No",
                "OnlineBackup": "No",
                "DeviceProtection": "No",
                "TechSupport": "No",
                "StreamingTV": "Yes",
                "StreamingMovies": "Yes",
                "Contract": "Month-to-month",
                "PaperlessBilling": "Yes",
                "PaymentMethod": "Electronic check",
                "MonthlyCharges": 89.90,
                "TotalCharges": 359.60,
                "SupportTickets": 3
            }
        },
        {
            "id": "persona-2",
            "name": "Loyal Enterprise Long-Term Customer",
            "description": "Two-year contract, bank transfer, full support suite, zero tickets.",
            "data": {
                "gender": "Male",
                "SeniorCitizen": 0,
                "Partner": "Yes",
                "Dependents": "Yes",
                "tenure": 48,
                "PhoneService": "Yes",
                "MultipleLines": "Yes",
                "InternetService": "DSL",
                "OnlineSecurity": "Yes",
                "OnlineBackup": "Yes",
                "DeviceProtection": "Yes",
                "TechSupport": "Yes",
                "StreamingTV": "Yes",
                "StreamingMovies": "No",
                "Contract": "Two year",
                "PaperlessBilling": "No",
                "PaymentMethod": "Credit card (automatic)",
                "MonthlyCharges": 64.50,
                "TotalCharges": 3096.00,
                "SupportTickets": 0
            }
        },
        {
            "id": "persona-3",
            "name": "Moderate-Risk Mid-Tenure Streamer",
            "description": "One-year contract nearing expiration, fiber optic, 1 ticket.",
            "data": {
                "gender": "Male",
                "SeniorCitizen": 1,
                "Partner": "No",
                "Dependents": "No",
                "tenure": 18,
                "PhoneService": "Yes",
                "MultipleLines": "Yes",
                "InternetService": "Fiber optic",
                "OnlineSecurity": "Yes",
                "OnlineBackup": "No",
                "DeviceProtection": "Yes",
                "TechSupport": "No",
                "StreamingTV": "Yes",
                "StreamingMovies": "Yes",
                "Contract": "One year",
                "PaperlessBilling": "Yes",
                "PaymentMethod": "Bank transfer (automatic)",
                "MonthlyCharges": 94.20,
                "TotalCharges": 1695.60,
                "SupportTickets": 1
            }
        }
    ]
    return presets
