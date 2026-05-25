from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional
from enum import Enum


class WarehouseID(str, Enum):
    W001 = "W001"
    W002 = "W002"
    W003 = "W003"
    W004 = "W004"
    W005 = "W005"


class RiskLevel(str, Enum):
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"


class PredictionInput(BaseModel):
    """Input features matching the trained RandomForest model exactly."""

    Traffic_Level: float = Field(..., ge=0.0, le=10.0, description="Traffic congestion level (0–10)")
    ETA_Variation: float = Field(..., description="Variation in estimated arrival time (minutes)")
    Weather_Severity: float = Field(..., ge=0.0, le=10.0, description="Weather severity score (0–10)")
    Loading_Time: float = Field(..., ge=0.0, description="Loading time in minutes")
    Route_Risk: float = Field(..., ge=0.0, le=10.0, description="Route risk score (0–10)")
    Delivery_Time_Deviation: float = Field(..., description="Deviation from scheduled delivery time (minutes)")
    Disruption_Score: float = Field(..., ge=0.0, le=10.0, description="Overall disruption score (0–10) — highest importance feature")
    Fuel_Rate: float = Field(..., ge=0.0, description="Fuel consumption rate (L/100km)")
    Vehicle_Capacity: float = Field(..., ge=0.0, le=1.0, description="Vehicle capacity utilisation (0–1)")
    Warehouse_ID: WarehouseID = Field(..., description="Warehouse identifier (W001–W005)")
    Order_Status: float = Field(..., ge=0.0, le=1.0, description="Order fulfilment status (0=pending, 1=fulfilled)")
    Cargo_Condition: float = Field(..., ge=0.0, le=1.0, description="Cargo condition score (0=poor, 1=perfect)")
    Driver_Fatigue: float = Field(..., ge=0.0, le=10.0, description="Driver fatigue level (0–10)")

    model_config = {"json_schema_extra": {
        "example": {
            "Traffic_Level": 7.2,
            "ETA_Variation": 15.0,
            "Weather_Severity": 4.5,
            "Loading_Time": 45.0,
            "Route_Risk": 6.0,
            "Delivery_Time_Deviation": 30.0,
            "Disruption_Score": 8.1,
            "Fuel_Rate": 12.5,
            "Vehicle_Capacity": 0.85,
            "Warehouse_ID": "W003",
            "Order_Status": 0.0,
            "Cargo_Condition": 0.9,
            "Driver_Fatigue": 6.5,
        }
    }}


class PredictionOutput(BaseModel):
    risk_level: RiskLevel
    confidence: float = Field(..., description="Probability of the predicted class (0–1)")
    probabilities: Dict[str, float] = Field(..., description="Probability for each risk class")
    input_features: Dict[str, float] = Field(..., description="Encoded features sent to the model")
    top_risk_factors: List[Dict] = Field(..., description="Top contributing features for this prediction")


class BatchPredictionInput(BaseModel):
    records: List[PredictionInput] = Field(..., min_length=1, max_length=500)


class BatchPredictionOutput(BaseModel):
    total: int
    predictions: List[PredictionOutput]
    summary: Dict[str, int] = Field(..., description="Count per risk level")
