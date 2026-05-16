import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

from api.models.learning_chat import LearningChatRequest, LearningChatResponse
from api.services.learning_chat import generate_learning_chat_answer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/learning-chat", tags=["learning-chat"])
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]


@router.post("", response_model=LearningChatResponse)
async def create_learning_chat(request: LearningChatRequest) -> LearningChatResponse:
    try:
        answer = await generate_learning_chat_answer(
            material=request.material.model_dump(),
            selected_snippets=[snippet.model_dump() for snippet in request.selected_snippets],
            current_target=request.current_target.model_dump(),
            background_materials=[material.model_dump() for material in request.background_materials],
            messages=[message.model_dump() for message in request.messages],
            workspace_root=WORKSPACE_ROOT,
            provider=request.provider,
            model=request.model,
            api_key=request.api_key,
            base_url=request.base_url,
        )
        return LearningChatResponse(answer=answer)
    except ValueError as exc:
        logger.error("Learning chat validation error: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Learning chat generation failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate learning chat response. Please check model configuration and try again.",
        ) from exc
