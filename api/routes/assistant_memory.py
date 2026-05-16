import logging
from pathlib import Path

from fastapi import APIRouter

from api.models.assistant_memory import (
    AssistantMemoryContextResponse,
    AssistantMemoryPurpose,
)
from api.services.assistant_memory import load_assistant_memory_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assistant-memory", tags=["assistant-memory"])
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]


@router.get("/context", response_model=AssistantMemoryContextResponse)
async def get_assistant_memory_context(
    purpose: AssistantMemoryPurpose = "general",
) -> AssistantMemoryContextResponse:
    return load_assistant_memory_context(WORKSPACE_ROOT, purpose=purpose)
