import mlflow
from datetime import datetime
from app.core.config import settings


def log_prediction(
    input_data: dict,
    risk_level: str,
    confidence: float,
    probabilities: dict,
):
    """Log a single prediction to MLflow for tracking and drift analysis."""
    if settings.ENVIRONMENT == "testing":
        return

    import requests
    try:
        # Avoid hanging if MLflow server is down
        requests.get(settings.MLFLOW_TRACKING_URI, timeout=0.2)
    except Exception:
        print("[MLflow] Server unreachable, skipping prediction tracking.")
        return

    try:
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
        mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)

        with mlflow.start_run(run_name=f"predict_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"):
            # Log input features
            mlflow.log_params({k: v for k, v in list(input_data.items())[:10]})

            # Log prediction
            mlflow.log_metrics({
                "confidence": confidence,
                "prob_high": probabilities.get("High", 0),
                "prob_low": probabilities.get("Low", 0),
                "prob_moderate": probabilities.get("Moderate", 0),
                "risk_numeric": {"Low": 0, "Moderate": 1, "High": 2}.get(risk_level, -1),
            })

            mlflow.set_tag("risk_level", risk_level)
    except Exception as e:
        # MLflow errors must never crash the prediction endpoint
        print(f"[MLflow] Logging skipped: {e}")
