import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from config import PREPROCESSOR_PATH
from utils.logger import logger

class DataPreprocessor:
    def __init__(
        self,
        numerical_features: Optional[List[str]] = None,
        categorical_features: Optional[List[str]] = None
    ):
        self.numerical_features = numerical_features or [
            "tenure", "MonthlyCharges", "TotalCharges", "SupportTickets", "SeniorCitizen"
        ]
        self.categorical_features = categorical_features or [
            "gender", "Partner", "Dependents", "PhoneService", "MultipleLines",
            "InternetService", "OnlineSecurity", "OnlineBackup", "DeviceProtection",
            "TechSupport", "StreamingTV", "StreamingMovies", "Contract",
            "PaperlessBilling", "PaymentMethod"
        ]
        self.pipeline: Optional[ColumnTransformer] = None
        self.feature_names: List[str] = []

    def build_pipeline(self) -> ColumnTransformer:
        num_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler())
        ])

        cat_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
        ])

        transformer = ColumnTransformer(
            transformers=[
                ("num", num_pipeline, self.numerical_features),
                ("cat", cat_pipeline, self.categorical_features)
            ],
            remainder="drop"
        )
        return transformer

    def fit(self, df: pd.DataFrame) -> "DataPreprocessor":
        """Fit the preprocessor on DataFrame."""
        clean_df = self._align_columns(df)
        self.pipeline = self.build_pipeline()
        self.pipeline.fit(clean_df)
        self._cache_feature_names()
        logger.info(f"Preprocessor fitted with {len(self.feature_names)} transformed features.")
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Transform DataFrame into preprocessed numpy array."""
        if self.pipeline is None:
            raise ValueError("Preprocessor pipeline is not fitted.")
        clean_df = self._align_columns(df)
        return self.pipeline.transform(clean_df)

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fit and transform DataFrame."""
        self.fit(df)
        return self.transform(df)

    def _align_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Ensure all required numerical and categorical columns exist in DataFrame."""
        aligned = df.copy()
        
        # Clean TotalCharges if string/whitespace
        if "TotalCharges" in aligned.columns:
            aligned["TotalCharges"] = pd.to_numeric(aligned["TotalCharges"], errors="coerce")
            
        for col in self.numerical_features:
            if col not in aligned.columns:
                aligned[col] = 0.0
            else:
                aligned[col] = pd.to_numeric(aligned[col], errors="coerce").fillna(0.0)

        for col in self.categorical_features:
            if col not in aligned.columns:
                aligned[col] = "No"
            else:
                aligned[col] = aligned[col].astype(str).fillna("No")

        return aligned

    def _cache_feature_names(self):
        """Extract clean human-readable feature names after one-hot encoding."""
        if self.pipeline is None:
            self.feature_names = []
            return

        cat_encoder = self.pipeline.named_transformers_["cat"].named_steps["onehot"]
        encoded_cat_names = list(cat_encoder.get_feature_names_out(self.categorical_features))
        self.feature_names = list(self.numerical_features) + encoded_cat_names

    def get_feature_names(self) -> List[str]:
        return self.feature_names

    def transform_single(self, record: Dict[str, Any]) -> np.ndarray:
        """Transform a single customer dictionary for inference."""
        df = pd.DataFrame([record])
        return self.transform(df)

    def save(self, filepath: Path = PREPROCESSOR_PATH):
        """Save preprocessor pipeline and feature names to disk."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self, filepath)
        logger.info(f"Saved preprocessor to {filepath}")

    @classmethod
    def load(cls, filepath: Path = PREPROCESSOR_PATH) -> "DataPreprocessor":
        """Load preprocessor from disk."""
        if not filepath.exists():
            raise FileNotFoundError(f"Preprocessor file not found at {filepath}")
        preprocessor = joblib.load(filepath)
        logger.info(f"Loaded preprocessor from {filepath}")
        return preprocessor
