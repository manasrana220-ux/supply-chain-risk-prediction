from fastapi import APIRouter
from app.services.model_service import model_service, FEATURE_ORDER

router = APIRouter()


@router.get("/health", summary="Service health check")
def health():
    try:
        model = model_service.model
        return {
            "status": "ok",
            "model": model.__class__.__name__,
            "n_features": model.n_features_in_,
            "classes": list(model.classes_),
            "n_estimators": model.n_estimators,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
