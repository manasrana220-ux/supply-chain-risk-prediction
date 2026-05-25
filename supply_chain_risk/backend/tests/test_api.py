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
    
    from app.core.database import Base, engine, SessionLocal
    from app.models.user_model import User
    from app.core.security import get_password_hash
    
    # Create test database tables
    Base.metadata.drop_all(bind=engine)  # Start fresh
    Base.metadata.create_all(bind=engine)
    
    # Seed users
    db = SessionLocal()
    try:
        db.add(User(username="admin", hashed_password=get_password_hash("admin123"), role="admin", recovery_phrase="supply-chain"))
        db.add(User(username="analyst", hashed_password=get_password_hash("analyst123"), role="analyst", recovery_phrase="supply-chain"))
        db.commit()
    finally:
        db.close()


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


def test_login_case_insensitive():
    resp = client.post("/api/v1/auth/token", data={"username": "AdMiN", "password": "admin123"})
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


# ── Registration tests ──────────────────────────────────────────────────────────

def test_register_success():
    username = f"user_{np.random.randint(10000, 99999)}"
    resp = client.post(
        "/api/v1/auth/register",
        json={"username": username, "password": "newpassword123", "role": "analyst"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == username
    assert data["role"] == "analyst"
    assert data["is_active"] is True

    # Verify login works with the newly registered user
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": username, "password": "newpassword123"}
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_register_duplicate():
    username = f"user_{np.random.randint(10000, 99999)}"
    resp = client.post(
        "/api/v1/auth/register",
        json={"username": username, "password": "newpassword123", "role": "analyst"}
    )
    assert resp.status_code == 201

    duplicate_resp = client.post(
        "/api/v1/auth/register",
        json={"username": username, "password": "differentpass", "role": "admin"}
    )
    assert duplicate_resp.status_code == 400
    assert duplicate_resp.json()["detail"] == "Username already registered"


def test_register_invalid_role():
    resp = client.post(
        "/api/v1/auth/register",
        json={"username": f"user_{np.random.randint(10000, 99999)}", "password": "password123", "role": "super-user"}
    )
    assert resp.status_code == 400
    assert "Role must be either" in resp.json()["detail"]


# ── User Directory Permission tests ───────────────────────────────────────────

def test_get_users_admin():
    token = get_token()
    resp = client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    usernames = [u["username"] for u in data]
    assert "admin" in usernames
    assert "analyst" in usernames


def test_get_users_analyst():
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": "analyst", "password": "analyst123"}
    )
    token = login_resp.json()["access_token"]
    resp = client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


# ── Password Reset and Profile Photo tests ────────────────────────────────────

def test_reset_password_success():
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"username": "analyst", "recovery_phrase": "supply-chain", "new_password": "newanalyst123"}
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Password reset successfully"

    # Verify we can login with the new password
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": "analyst", "password": "newanalyst123"}
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # Revert back to original password for other tests
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"username": "analyst", "recovery_phrase": "supply-chain", "new_password": "analyst123"}
    )
    assert resp.status_code == 200


def test_reset_password_invalid_phrase():
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"username": "analyst", "recovery_phrase": "wrong-phrase", "new_password": "newpassword123"}
    )
    assert resp.status_code == 400
    assert "Incorrect recovery phrase" in resp.json()["detail"]


def test_reset_password_case_insensitive():
    resp = client.post(
        "/api/v1/auth/reset-password",
        json={"username": "AnAlYsT", "recovery_phrase": "supply-chain", "new_password": "analyst123"}
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Password reset successfully"


def test_profile_photo_upload():
    token = get_token()
    base64_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    resp = client.put(
        "/api/v1/auth/profile-photo",
        json={"profile_photo": base64_photo},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["profile_photo"] == base64_photo

    # Check that user response from GET /users contains the photo
    resp_users = client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert resp_users.status_code == 200
    admin_user = next(u for u in resp_users.json() if u["username"] == "admin")
    assert admin_user["profile_photo"] == base64_photo
