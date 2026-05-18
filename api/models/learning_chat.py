from typing import List, Literal, Optional

from pydantic import BaseModel, Field


LearningChatRole = Literal["user", "assistant", "system"]
BackgroundRole = Literal["standard", "evidence", "explanation"]
SnippetSource = Literal["text", "pdf_text", "pdf_screenshot", "assistant_reply"]


class LearningChatMessage(BaseModel):
    role: LearningChatRole
    content: str = Field(..., min_length=1)


class LearningChatSnippet(BaseModel):
    materialId: str = Field(..., min_length=1, max_length=120)
    text: str = Field(..., min_length=1)
    anchorLabel: str = Field(..., min_length=1, max_length=120)
    source: Optional[SnippetSource] = None
    imageDataUrl: Optional[str] = Field(default=None, max_length=8_000_000)
    pageNumber: Optional[int] = Field(default=None, ge=1)


class LearningChatBackgroundAssignment(BaseModel):
    materialId: str = Field(..., min_length=1, max_length=120)
    backgroundRole: BackgroundRole


class LearningChatTarget(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    backgroundMaterials: List[LearningChatBackgroundAssignment] = Field(
        default_factory=list,
        max_length=12,
    )


class LearningChatMaterial(BaseModel):
    id: Optional[str] = Field(default=None, max_length=120)
    title: str = Field(..., min_length=1, max_length=300)
    primaryRole: Optional[str] = Field(default=None, max_length=80)
    fullContent: str = Field(..., min_length=1)


class LearningChatRequest(BaseModel):
    material: LearningChatMaterial
    selected_snippets: List[LearningChatSnippet] = Field(default_factory=list, max_length=12)
    current_target: LearningChatTarget
    background_materials: List[LearningChatMaterial] = Field(default_factory=list, max_length=12)
    messages: List[LearningChatMessage] = Field(..., min_length=1, max_length=20)
    provider: str = Field(default="openai", min_length=1, max_length=80)
    model: Optional[str] = Field(default=None, max_length=120)
    api_key: Optional[str] = Field(default=None, max_length=300)
    base_url: Optional[str] = Field(default=None, max_length=300)


class LearningChatResponse(BaseModel):
    answer: str = Field(..., min_length=1)
