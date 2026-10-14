import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

PORT = int(os.getenv("PORT", 8000))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

MODEL_PATH = BASE_DIR / os.getenv("MODEL_PATH", "saved_models")
UPLOAD_PATH = BASE_DIR / os.getenv("UPLOAD_PATH", "uploads")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", 50))

MODEL_PATH.mkdir(parents=True, exist_ok=True)
UPLOAD_PATH.mkdir(parents=True, exist_ok=True)

# Artifact and model file paths
ACTIVE_DATASET_PATH = MODEL_PATH / "active_dataset.csv"
CLASSIFIER_MODEL_PATH = MODEL_PATH / "xgboost_churn_model.pkl"
SURVIVAL_MODEL_PATH = MODEL_PATH / "cox_survival_model.pkl"
PREPROCESSOR_PATH = MODEL_PATH / "preprocessor.pkl"
METRICS_PATH = MODEL_PATH / "evaluation_metrics.json"
SHAP_SUMMARY_PATH = MODEL_PATH / "shap_summary.json"
SURVIVAL_FEATURES_PATH = MODEL_PATH / "survival_features.json"

# Risk tier thresholds
LOW_RISK_THRESHOLD = float(os.getenv("LOW_RISK_THRESHOLD", 0.35))
HIGH_RISK_THRESHOLD = float(os.getenv("HIGH_RISK_THRESHOLD", 0.65))

# CORS origins
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]
