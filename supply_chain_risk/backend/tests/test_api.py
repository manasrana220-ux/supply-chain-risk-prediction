import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import numpy as np

# Patch settings before importing app
import os
os.environ["MODEL_PATH"] = "app/models/risk_prediction_model.pkl"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["ENVIRONMENT"] = "testing"

from app.main import app
from app.services.model_service import model_service

client = TestClient(app)

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def load_model():
    model_service.load_model()


def get_token():
    resp = client.post("/api/v1/auth/token", data={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]


VALID_PAYLOAD = {
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

# ── Auth tests ─────────────────────────────────────────────────────────────────

def test_login_success():
    resp = client.post("/api/v1/auth/token", data={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password():
    resp = client.post("/api/v1/auth/token", data={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


# ── Health tests ───────────────────────────────────────────────────────────────

def test_health():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["n_features"] == 16
    assert set(data["classes"]) == {"High", "Low", "Moderate"}


# ── Prediction tests ───────────────────────────────────────────────────────────

def test_predict_requires_auth():
    resp = client.post("/api/v1/predict", json=VALID_PAYLOAD)
    assert resp.status_code == 401


def test_predict_valid():
    token = get_token()
    resp = client.post(
        "/api/v1/predict",
        json=VALID_PAYLOAD,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] in ["Low", "Moderate", "High"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert set(data["probabilities"].keys()) == {"High", "Low", "Moderate"}
    assert abs(sum(data["probabilities"].values()) - 1.0) < 0.01
    assert len(data["top_risk_factors"]) > 0


def test_predict_moderate_risk():
    """Low disruption + low traffic should yield Moderate risk (model's calm-state class)."""
    token = get_token()
    payload = {**VALID_PAYLOAD, "Disruption_Score": 0.5, "Traffic_Level": 1.0, "Driver_Fatigue": 1.0}
    resp = client.post(
        "/api/v1/predict",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["risk_level"] == "Moderate"


def test_predict_high_risk():
    """Disruption_Score >= 5 reliably yields High risk."""
    token = get_token()
    payload = {**VALID_PAYLOAD, "Disruption_Score": 8.0, "Traffic_Level": 8.0, "Driver_Fatigue": 8.0}
    resp = client.post(
        "/api/v1/predict",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["risk_level"] == "High"


def test_predict_invalid_warehouse():
    token = get_token()
    payload = {**VALID_PAYLOAD, "Warehouse_ID": "W999"}
    resp = client.post(
        "/api/v1/predict",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


def test_predict_out_of_range():
    token = get_token()
    payload = {**VALID_PAYLOAD, "Disruption_Score": 999.0}
    resp = client.post(
        "/api/v1/predict",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422


def test_batch_predict():
    token = get_token()
    payload = {"records": [VALID_PAYLOAD, {**VALID_PAYLOAD, "Disruption_Score": 0.1}]}
    resp = client.post(
        "/api/v1/predict/batch",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["predictions"]) == 2
    assert sum(data["summary"].values()) == 2


def test_features_endpoint():
    token = get_token()
    resp = client.get("/api/v1/features", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["features"]) == 16
    assert "Disruption_Score" in data["importances"]
