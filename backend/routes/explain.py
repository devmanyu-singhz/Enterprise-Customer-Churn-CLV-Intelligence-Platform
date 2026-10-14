import json
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from config import SHAP_SUMMARY_PATH
from ml.shap_explainer import ChurnShapExplainer
from routes.predict import get_models, CustomerPayload
from ml.data_loader import get_or_create_dataset
from utils.logger import logger

router = APIRouter(prefix="/explain", tags=["Explainability (SHAP)"])

_explainer = None

def get_explainer():
    global _explainer
    if _explainer is None:
        classifier, preprocessor, _, _ = get_models()
        _explainer = ChurnShapExplainer(classifier, preprocessor)
    return _explainer

def reload_explainer():
    global _explainer
    classifier, preprocessor, _, _ = get_models()
    _explainer = ChurnShapExplainer(classifier, preprocessor)

@router.post("/individual")
async def explain_individual(payload: CustomerPayload):
    """Compute local SHAP waterfall feature attribution for a single customer."""
    start_time = time.time()
    try:
        explainer = get_explainer()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainer not initialized: {str(e)}")

    record = payload.model_dump()
    if record.get("TotalCharges") is None:
        record["TotalCharges"] = round(record["MonthlyCharges"] * record["tenure"], 2)

    result = explainer.explain_individual(record, top_n=10)
    result["latency_ms"] = round((time.time() - start_time) * 1000, 2)
    return result

@router.get("/global")
async def get_global_explanation():
    """Retrieve global SHAP feature importance summary across the active customer dataset."""
    if SHAP_SUMMARY_PATH.exists():
        try:
            with open(SHAP_SUMMARY_PATH, "r") as f:
                data = json.load(f)
                return data
        except Exception as e:
            logger.warning(f"Error reading {SHAP_SUMMARY_PATH}: {e}")

    # If file doesn't exist yet, compute and return
    explainer = get_explainer()
    df = get_or_create_dataset()
    top_features = explainer.compute_and_save_global_summary(df)
    return {
        "base_probability": explainer.base_probability,
        "top_features": top_features
    }
