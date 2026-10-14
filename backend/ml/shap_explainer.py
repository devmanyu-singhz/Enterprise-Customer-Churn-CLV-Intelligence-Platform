import json
import time
import shap
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from xgboost import XGBClassifier

from config import SHAP_SUMMARY_PATH
from ml.preprocessor import DataPreprocessor
from utils.logger import logger

class ChurnShapExplainer:
    def __init__(self, model: XGBClassifier, preprocessor: DataPreprocessor):
        self.model = model
        self.preprocessor = preprocessor
        self.feature_names = preprocessor.get_feature_names()
        
        # Initialize TreeExplainer
        logger.info("Initializing SHAP TreeExplainer...")
        self.explainer = shap.TreeExplainer(self.model)
        
        # Base logit value
        expected_value = self.explainer.expected_value
        if isinstance(expected_value, (list, np.ndarray)):
            self.base_logit = float(expected_value[1] if len(expected_value) > 1 else expected_value[0])
        else:
            self.base_logit = float(expected_value)
            
        # Base probability via sigmoid
        self.base_probability = float(np.round(1.0 / (1.0 + np.exp(-self.base_logit)), 4))

    def explain_individual(
        self,
        record: Dict[str, Any],
        top_n: int = 8
    ) -> Dict[str, Any]:
        """Compute local SHAP waterfall feature attribution for a single customer."""
        start_time = time.time()
        
        # Transform single record
        X_trans = self.preprocessor.transform_single(record)
        
        # Calculate raw SHAP values
        shap_values = self.explainer.shap_values(X_trans)
        if isinstance(shap_values, list):
            sv = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        elif len(shap_values.shape) == 3:
            sv = shap_values[0, :, 1]
        else:
            sv = shap_values[0]

        # Calculate predicted logit and probability
        total_logit = self.base_logit + np.sum(sv)
        pred_prob = float(1.0 / (1.0 + np.exp(-total_logit)))

        # Convert SHAP logit contributions into probability shift shares for business clarity
        total_abs_sv = np.sum(np.abs(sv))
        total_prob_delta = pred_prob - self.base_probability
        
        contributions = []
        for i, (name, val) in enumerate(zip(self.feature_names, sv)):
            # Formatted human-readable name
            readable_name = self._format_feature_name(name)
            
            # Approximate marginal probability impact
            if total_abs_sv > 1e-6:
                prob_impact = (val / total_abs_sv) * total_prob_delta
            else:
                prob_impact = 0.0

            # Get raw customer value if directly available
            raw_val = self._extract_raw_value(record, name)

            contributions.append({
                "feature": readable_name,
                "raw_feature": name,
                "impact": float(np.round(prob_impact, 4)),
                "raw_shap": float(np.round(val, 4)),
                "direction": "increases_risk" if prob_impact >= 0 else "decreases_risk",
                "customer_value": raw_val
            })

        # Sort by absolute impact
        contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
        top_contributions = contributions[:top_n]

        calc_latency_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(f"SHAP explanation generated in {calc_latency_ms}ms")

        return {
            "base_value": self.base_probability,
            "predicted_probability": round(pred_prob, 4),
            "feature_contributions": top_contributions,
            "latency_ms": calc_latency_ms
        }

    def compute_and_save_global_summary(
        self,
        df: pd.DataFrame,
        sample_size: int = 300,
        filepath: Path = SHAP_SUMMARY_PATH
    ) -> List[Dict[str, Any]]:
        """Compute global feature importance across dataset sample and save."""
        logger.info(f"Computing global SHAP summary across {min(len(df), sample_size)} samples...")
        sample_df = df.sample(min(len(df), sample_size), random_state=42)
        X_trans = self.preprocessor.transform(sample_df)

        shap_values = self.explainer.shap_values(X_trans)
        if isinstance(shap_values, list):
            sv = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        elif len(shap_values.shape) == 3:
            sv = shap_values[:, :, 1]
        else:
            sv = shap_values

        mean_abs = np.mean(np.abs(sv), axis=0)
        mean_val = np.mean(sv, axis=0)

        global_features = []
        for name, importance, effect in zip(self.feature_names, mean_abs, mean_val):
            global_features.append({
                "feature": self._format_feature_name(name),
                "raw_feature": name,
                "importance": float(np.round(importance, 4)),
                "mean_impact": float(np.round(effect, 4)),
                "direction": "Risk Driver" if effect >= 0 else "Retention Anchor"
            })

        global_features.sort(key=lambda x: x["importance"], reverse=True)
        top_global = global_features[:15]

        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, "w") as f:
            json.dump({
                "base_probability": self.base_probability,
                "top_features": top_global
            }, f, indent=2)

        logger.info(f"Saved global SHAP summary to {filepath}")
        return top_global

    def _format_feature_name(self, name: str) -> str:
        """Format raw column names into clean UI labels."""
        clean = name.replace("cat__", "").replace("num__", "")
        # Common replacements
        clean = clean.replace("Contract_Month-to-month", "Month-to-Month Contract")
        clean = clean.replace("Contract_Two year", "Two-Year Contract")
        clean = clean.replace("Contract_One year", "One-Year Contract")
        clean = clean.replace("InternetService_Fiber optic", "Fiber Optic Internet")
        clean = clean.replace("PaymentMethod_Electronic check", "Electronic Check Payment")
        clean = clean.replace("TechSupport_No", "No Tech Support")
        clean = clean.replace("OnlineSecurity_No", "No Online Security")
        clean = clean.replace("PaperlessBilling_Yes", "Paperless Billing")
        clean = clean.replace("SupportTickets", "Support Tickets")
        clean = clean.replace("MonthlyCharges", "Monthly Charges")
        clean = clean.replace("TotalCharges", "Total Charges")
        clean = clean.replace("tenure", "Tenure (Months)")
        return clean

    def _extract_raw_value(self, record: Dict[str, Any], feature_col: str) -> Any:
        """Find the corresponding customer input value."""
        # Check direct match
        if feature_col in record:
            return record[feature_col]
        
        # Check prefix match for one-hot encoded features
        for key in record:
            if feature_col.startswith(key + "_"):
                return record[key]
        return None
