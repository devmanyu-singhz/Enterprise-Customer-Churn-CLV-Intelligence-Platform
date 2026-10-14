import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import (
    PORT, ENVIRONMENT, CORS_ORIGINS, CLASSIFIER_MODEL_PATH,
    SURVIVAL_MODEL_PATH, PREPROCESSOR_PATH
)
from ml.data_loader import get_or_create_dataset
from ml.train_classifier import train_churn_classifier
from ml.train_survival import train_survival_model
from ml.shap_explainer import ChurnShapExplainer
from routes.upload import router as upload_router
from routes.predict import router as predict_router, reload_models, get_models
from routes.explain import router as explain_router, reload_explainer
from routes.analytics import router as analytics_router
from utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Bootstrap dataset, preprocessor, and ML models on initial startup."""
    logger.info("Initializing Enterprise Customer Churn & CLV Engine...")
    
    # Ensure active dataset exists
    df = get_or_create_dataset()

    # Check if models exist, if not train automatically
    if not (CLASSIFIER_MODEL_PATH.exists() and SURVIVAL_MODEL_PATH.exists() and PREPROCESSOR_PATH.exists()):
        logger.info("Models not found on disk. Executing automatic pipeline training...")
        model, preprocessor, metrics = train_churn_classifier(df)
        cph, covariates, s_metrics = train_survival_model(df)
        explainer = ChurnShapExplainer(model, preprocessor)
        explainer.compute_and_save_global_summary(df)
        logger.info("Automatic pipeline bootstrap complete.")
    else:
        logger.info("Pre-trained models verified on disk.")

    # Pre-warm model singletons
    try:
        get_models()
        logger.info("Inference engines pre-warmed successfully.")
    except Exception as e:
        logger.warning(f"Error pre-warming models: {e}")

    yield
    logger.info("Shutting down Churn & CLV Engine.")

app = FastAPI(
    title="Enterprise Customer Churn & CLV Intelligence Engine",
    description="Production-ready predictive churn scoring, survival analysis, dynamic CLV calculation, and SHAP explainability.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Route Modules
app.include_router(upload_router)
app.include_router(predict_router)
app.include_router(explain_router)
app.include_router(analytics_router)

@app.get("/", tags=["Health Check"])
async def root():
    """Health check and engine status."""
    df = get_or_create_dataset()
    models_ready = CLASSIFIER_MODEL_PATH.exists() and SURVIVAL_MODEL_PATH.exists()
    return {
        "status": "healthy",
        "service": "Enterprise Customer Churn & CLV Engine",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "models_ready": models_ready,
        "dataset_records": len(df),
        "timestamp": time.time()
    }

@app.post("/train", tags=["Model Training"])
async def train_all_models():
    """Trigger complete re-training of XGBoost classifier, Cox survival model, and SHAP explainer."""
    start_time = time.time()
    df = get_or_create_dataset()

    try:
        # Train classifier
        clf_model, preprocessor, clf_metrics = train_churn_classifier(df)
        # Train survival model
        cph_model, covariates, surv_metrics = train_survival_model(df)
        # Re-compute global SHAP summary
        explainer = ChurnShapExplainer(clf_model, preprocessor)
        top_global = explainer.compute_and_save_global_summary(df)

        # Reload singletons
        reload_models()
        reload_explainer()

        total_elapsed = round(time.time() - start_time, 2)
        logger.info(f"Complete retraining cycle finished in {total_elapsed}s")

        return {
            "status": "success",
            "message": "All models and explainers retrained successfully.",
            "duration_seconds": total_elapsed,
            "classifier_metrics": clf_metrics,
            "survival_metrics": surv_metrics,
            "top_global_drivers": top_global[:5]
        }
    except Exception as e:
        logger.error(f"Error during model retraining: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=True)
