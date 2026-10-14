import time
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from config import CLASSIFIER_MODEL_PATH, METRICS_PATH, ACTIVE_DATASET_PATH
from ml.preprocessor import DataPreprocessor
from ml.data_loader import get_or_create_dataset
from utils.logger import logger
from utils.metrics import compute_classification_metrics

def train_churn_classifier(
    df: pd.DataFrame = None,
    preprocessor: DataPreprocessor = None,
    save_artifacts: bool = True
) -> Tuple[XGBClassifier, DataPreprocessor, Dict[str, Any]]:
    """Train XGBoost Churn Classifier and evaluate performance."""
    start_time = time.time()
    
    if df is None:
        df = get_or_create_dataset()

    if "Churn" not in df.columns:
        raise ValueError("Dataset must contain target column 'Churn'.")

    # Clean Churn target column
    y = df["Churn"].astype(int).values
    
    # Initialize & fit preprocessor if not provided
    if preprocessor is None:
        preprocessor = DataPreprocessor()
        preprocessor.fit(df)

    X_transformed = preprocessor.transform(df)

    # Train / test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_transformed, y, test_size=0.2, random_state=42, stratify=y
    )

    # Train XGBoost
    model = XGBClassifier(
        n_estimators=160,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42
    )
    
    logger.info("Training XGBoost Classifier...")
    model.fit(X_train, y_train)

    # Evaluate on test set
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = compute_classification_metrics(y_test, y_pred, y_prob)
    elapsed = round(time.time() - start_time, 3)
    metrics["training_duration_seconds"] = elapsed
    metrics["total_samples"] = len(df)
    metrics["train_samples"] = len(X_train)
    metrics["test_samples"] = len(X_test)

    logger.info(f"Model trained in {elapsed}s | ROC-AUC: {metrics['roc_auc']} | F1: {metrics['f1_score']}")

    if save_artifacts:
        preprocessor.save()
        CLASSIFIER_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, CLASSIFIER_MODEL_PATH)
        logger.info(f"Saved classifier model to {CLASSIFIER_MODEL_PATH}")

        with open(METRICS_PATH, "w") as f:
            json.dump(metrics, f, indent=2)
        logger.info(f"Saved evaluation metrics to {METRICS_PATH}")

    return model, preprocessor, metrics

def load_churn_classifier(filepath: Path = CLASSIFIER_MODEL_PATH) -> XGBClassifier:
    """Load persisted XGBoost classifier."""
    if not filepath.exists():
        raise FileNotFoundError(f"Classifier model file not found at {filepath}")
    return joblib.load(filepath)

if __name__ == "__main__":
    train_churn_classifier()
