# Supply Chain Risk Prediction — Full Stack Project

A production-ready system that wraps your `RandomForestClassifier` model in a
FastAPI backend, React frontend, MLflow tracking server, and Docker infrastructure.

## Model Summary

| Property | Value |
|---|---|
| Algorithm | RandomForestClassifier (100 trees) |
| Output classes | **Low** · **Moderate** · **High** |
| Input features | 16 (Traffic_Level, Disruption_Score, …) |
| Top predictor | Disruption_Score (67% importance) |
| sklearn version | 1.6.1 |

---

## Project Structure

```
supply_chain_risk/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── api/
│   │   │   ├── predict.py           # POST /predict, /predict/batch, GET /features
│   │   │   ├── auth.py              # POST /auth/token  (JWT)
│   │   │   └── health.py            # GET  /health
│   │   ├── core/
│   │   │   ├── config.py            # Settings (pydantic-settings)
│   │   │   └── security.py          # JWT auth helpers
│   │   ├── schemas/
│   │   │   └── prediction.py        # Pydantic I/O schemas
│   │   ├── services/
│   │   │   ├── model_service.py     # Model loader + preprocessing + predict
│   │   │   └── mlflow_service.py    # Prediction logging to MLflow
│   │   └── models/
│   │       └── risk_prediction_model.pkl
│   ├── tests/
│   │   └── test_api.py              # 11 pytest tests (all passing ✅)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                        # React dashboard (Phase 4)
├── docker-compose.yml               # Full stack: API + DB + MLflow + Grafana
├── .github/workflows/ci-cd.yml      # GitHub Actions CI/CD
└── README.md
```

---

## Quick Start (local, no Docker)

### 1. Set up Python env

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SECRET_KEY
```

### 3. Run the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000/docs** — full Swagger UI with all endpoints.

### 4. Run tests

```bash
pytest tests/ -v
```

---

## Docker (full stack)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| API + Swagger | http://localhost:8000/docs |
| MLflow UI | http://localhost:5000 |
| React frontend | http://localhost:3000 |
| Grafana | http://localhost:3001 (admin/admin) |
| Prometheus | http://localhost:9090 |

---

## API Usage

### Get a token

```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -d "username=admin&password=admin123"
```

### Single prediction

```bash
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
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
    "Driver_Fatigue": 6.5
  }'
```

**Response:**
```json
{
  "risk_level": "High",
  "confidence": 0.84,
  "probabilities": {"High": 0.84, "Moderate": 0.15, "Low": 0.01},
  "top_risk_factors": [
    {"feature": "Disruption_Score", "value": 8.1, "importance": 0.6695},
    {"feature": "Traffic_Level",    "value": 7.2, "importance": 0.1776},
    {"feature": "Driver_Fatigue",   "value": 6.5, "importance": 0.0632}
  ]
}
```

### Batch prediction (up to 500 records)

```bash
curl -X POST http://localhost:8000/api/v1/predict/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"records": [{...}, {...}]}'
```

---

## Roadmap — Next Phases

| Phase | Status | Description |
|---|---|---|
| 1 — Data pipeline | ✅ Done | Feature engineering, preprocessing |
| 2 — Model tracking | ✅ Done | MLflow logging on every prediction |
| 3 — REST API | ✅ Done | FastAPI with auth, validation, batch |
| 4 — React dashboard | 🔜 Next | Prediction form + analytics charts |
| 5 — CI/CD | ✅ Done | GitHub Actions: test → build → deploy |
| 6 — Monitoring | 🔜 Next | Evidently drift detection + Grafana |

---

## Demo Credentials

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Full access |
| analyst | analyst123 | Read + predict |

> ⚠️ Change these in production — use a real database for user management.
