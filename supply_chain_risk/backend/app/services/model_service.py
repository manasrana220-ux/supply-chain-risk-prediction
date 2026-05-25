import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple

from app.core.config import settings


# Feature order MUST match training — do not reorder
FEATURE_ORDER = [
    "Traffic_Level", "ETA_Variation", "Weather_Severity", "Loading_Time",
    "Route_Risk", "Delivery_Time_Deviation", "Disruption_Score", "Fuel_Rate",
    "Vehicle_Capacity", "Warehouse_ID_W002", "Warehouse_ID_W003",
    "Warehouse_ID_W004", "Warehouse_ID_W005", "Order_Status",
    "Cargo_Condition", "Driver_Fatigue",
]

# Feature importances (from model.feature_importances_) for explanations
FEATURE_IMPORTANCES = {
    "Disruption_Score": 0.6695,
    "Traffic_Level": 0.1776,
    "Driver_Fatigue": 0.0632,
    "Delivery_Time_Deviation": 0.0211,
    "Weather_Severity": 0.0175,
    "Loading_Time": 0.0103,
    "ETA_Variation": 0.0096,
    "Vehicle_Capacity": 0.0093,
    "Fuel_Rate": 0.0093,
    "Route_Risk": 0.0082,
}


class ModelService:
    def __init__(self):
        self._model = None

    def load_model(self):
        path = Path(settings.MODEL_PATH)
        if not path.exists():
            raise FileNotFoundError(f"Model not found at {path}")
        self._model = joblib.load(path)
        
        # Dynamically update global importances from the loaded model
        FEATURE_IMPORTANCES.clear()
        for feat, imp in zip(FEATURE_ORDER, self._model.feature_importances_):
            FEATURE_IMPORTANCES[feat] = round(float(imp), 4)
            
        return self

    @property
    def model(self):
        if self._model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        return self._model

    def preprocess(self, raw: Dict) -> pd.DataFrame:
        """Convert raw API input dict → model-ready DataFrame."""
        warehouse_id = raw.pop("Warehouse_ID", "W001")

        row = dict(raw)
        # One-hot encode Warehouse_ID (W001 is the baseline — all zeros)
        for w in ["W002", "W003", "W004", "W005"]:
            row[f"Warehouse_ID_{w}"] = 1.0 if warehouse_id == w else 0.0

        # Build DataFrame in exact training feature order
        df = pd.DataFrame([row])[FEATURE_ORDER]
        return df

    def predict_single(self, raw: Dict) -> Tuple[str, float, Dict[str, float], Dict[str, float]]:
        """
        Returns: (risk_level, confidence, probabilities, encoded_features_dict)
        """
        df = self.preprocess(raw)
        classes = self.model.classes_  # ['High', 'Low', 'Moderate']

        proba = self.model.predict_proba(df)[0]
        prob_dict = {cls: round(float(p), 4) for cls, p in zip(classes, proba)}

        predicted_class = classes[np.argmax(proba)]
        confidence = round(float(np.max(proba)), 4)

        encoded = {col: round(float(val), 4) for col, val in zip(FEATURE_ORDER, df.values[0])}
        return predicted_class, confidence, prob_dict, encoded

    def get_top_risk_factors(self, encoded: Dict[str, float], n: int = 5) -> List[Dict]:
        """Return top-n features weighted by importance × normalised input value."""
        factors = []
        for feat, importance in FEATURE_IMPORTANCES.items():
            if feat in encoded:
                factors.append({
                    "feature": feat,
                    "value": encoded[feat],
                    "importance": round(importance, 4),
                })
        # Sort by importance (could also weight by value for per-record explanations)
        factors.sort(key=lambda x: -x["importance"])
        return factors[:n]


# Singleton
model_service = ModelService()
