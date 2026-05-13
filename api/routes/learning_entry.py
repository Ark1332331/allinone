import logging

from fastapi import APIRouter, HTTPException

from api.models.learning_entry import (
    LearningEntryImportRequest,
    LearningEntryImportResponse,
)
from api.services.learning_entry_import import import_learning_material

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/learning-entry", tags=["learning-entry"])


@router.post("/import", response_model=LearningEntryImportResponse)
async def import_learning_entry_material(
    request: LearningEntryImportRequest,
) -> LearningEntryImportResponse:
    try:
        return import_learning_material(request)
    except RuntimeError as exc:
        logger.warning("Learning entry import requires optional converter: %s", exc)
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    except ValueError as exc:
        logger.error("Learning entry import validation error: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Learning entry import failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to import learning material. Please try again.",
        ) from exc
