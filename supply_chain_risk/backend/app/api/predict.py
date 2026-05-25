from fastapi import APIRouter, Depends, HTTPException
from collections import Counter

from app.schemas.prediction import (
    PredictionInput, PredictionOutput,
    BatchPredictionInput, BatchPredictionOutput,
)
from app.services.model_service import model_service
from app.services.mlflow_service import log_prediction
from app.core.security import get_current_user

router = APIRouter()


def _build_output(raw: dict) -> PredictionOutput:
    risk_level, confidence, probabilities, encoded = model_service.predict_single(raw)
    top_factors = model_service.get_top_risk_factors(encoded)

    # Fire-and-forget MLflow log (non-blocking)
    try:
        log_prediction(raw, risk_level, confidence, probabilities)
    except Exception:
        pass

    return PredictionOutput(
        risk_level=risk_level,
        confidence=confidence,
        probabilities=probabilities,
        input_features=encoded,
        top_risk_factors=top_factors,
    )


@router.post("/predict", response_model=PredictionOutput, summary="Single shipment risk prediction")
def predict(
    payload: PredictionInput,
    current_user: dict = Depends(get_current_user),
):
    """
    Predict delivery risk for a single shipment.

    Returns **Low**, **Moderate**, or **High** risk with per-class probabilities
    and the top contributing features.
    """
    raw = payload.model_dump()
    try:
        return _build_output(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/batch", response_model=BatchPredictionOutput, summary="Batch shipment risk predictions")
def predict_batch(
    payload: BatchPredictionInput,
    current_user: dict = Depends(get_current_user),
):
    """Predict risk for up to 500 shipments in one call."""
    results = []
    for record in payload.records:
        raw = record.model_dump()
        try:
            results.append(_build_output(raw))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing record: {e}")

    summary = dict(Counter(r.risk_level.value for r in results))
    return BatchPredictionOutput(
        total=len(results),
        predictions=results,
        summary=summary,
    )


@router.get("/features", summary="List model input features and their importance")
def get_features(current_user: dict = Depends(get_current_user)):
    """Return all 16 features the model expects, with their importance scores."""
    from app.services.model_service import FEATURE_IMPORTANCES, FEATURE_ORDER
    return {
        "features": FEATURE_ORDER,
        "importances": FEATURE_IMPORTANCES,
        "classes": list(model_service.model.classes_),
        "n_estimators": model_service.model.n_estimators,
    }
