import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

from api.models.pre_assessment import PreAssessmentRequest, PreAssessmentResponse
from api.services.pre_assessment import generate_pre_assessment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pre-assessment", tags=["pre-assessment"])
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]


@router.post("", response_model=PreAssessmentResponse)
async def create_pre_assessment(
    request: PreAssessmentRequest,
) -> PreAssessmentResponse:
    try:
        return await generate_pre_assessment(request, WORKSPACE_ROOT)
    except ValueError as exc:
        logger.error("Pre-assessment validation error: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Pre-assessment generation failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate pre-assessment. Please check model configuration and try again.",
        ) from exc
