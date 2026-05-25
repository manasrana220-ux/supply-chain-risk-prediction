from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import predict, health, auth
from app.core.config import settings
from app.services.model_service import model_service
from prometheus_fastapi_instrumentator import Instrumentator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load model
    model_service.load_model()
    print(f"Model loaded successfully from {settings.MODEL_PATH}")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="Supply Chain Risk Prediction API",
    description="Predicts delivery risk level (Low / Moderate / High) using a RandomForest model.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = list(settings.ALLOWED_ORIGINS)
import os
# Support custom production origins via comma-separated string
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    origins.extend([o.strip() for o in cors_origins_env.split(",") if o.strip()])
# Fallback support for the user's active Render frontend URL
origins.append("https://risk-prediction-dashboard-ixj7.onrender.com")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)

# Routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(auth.router,   prefix="/api/v1/auth", tags=["Auth"])
app.include_router(predict.router, prefix="/api/v1", tags=["Predictions"])


@app.get("/")
def root():
    return {
        "service": "Supply Chain Risk Prediction API",
        "version": "1.0.0",
        "docs": "/docs",
    }
