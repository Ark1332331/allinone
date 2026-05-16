from typing import List, Literal

from pydantic import BaseModel, Field


AssistantMemoryPurpose = Literal["general", "pre_assessment"]


class AssistantMemorySection(BaseModel):
    key: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=240)
    path: str = Field(..., min_length=1, max_length=300)
    char_count: int = Field(..., ge=0)


class AssistantMemoryContextResponse(BaseModel):
    purpose: AssistantMemoryPurpose
    summary: str = Field(..., min_length=1, max_length=300)
    context_text: str = Field(..., min_length=1)
    sections: List[AssistantMemorySection] = Field(default_factory=list, max_length=12)
