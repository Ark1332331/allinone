from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


SourceType = Literal["pdf_md", "ppt_md", "note_md", "other_md"]
ReadinessLevel = Literal["ready", "needs_preparation", "not_now"]
ConfidenceLevel = Literal["high", "medium", "low"]
EvidenceSource = Literal["material", "profile", "both"]
ProfileSuggestionType = Literal[
    "possible_gap", "learning_preference", "workflow_signal", "strength"
]


class PreAssessmentRequest(BaseModel):
    source_type: SourceType
    title: str = Field(..., min_length=1, max_length=300)
    full_content: str = Field(..., min_length=1)
    selected_excerpt: Optional[str] = Field(default=None)
    excerpt_context_before: Optional[str] = Field(default=None)
    excerpt_context_after: Optional[str] = Field(default=None)
    user_goal_hint: Optional[str] = Field(default=None, max_length=1000)
    profile_overrides: Dict[str, Any] = Field(default_factory=dict)


class ReadinessAssessment(BaseModel):
    level: ReadinessLevel
    confidence: ConfidenceLevel
    summary: str = Field(..., min_length=1, max_length=400)


class BlockingGap(BaseModel):
    concept: str = Field(..., min_length=1, max_length=120)
    why_it_blocks: str = Field(..., min_length=1, max_length=400)
    evidence_source: EvidenceSource
    suggested_preparation: str = Field(..., min_length=1, max_length=300)


class CoreFrame(BaseModel):
    what_this_material_is_really_about: str = Field(
        ..., min_length=1, max_length=400
    )
    key_axes: List[str] = Field(default_factory=list, max_length=5)
    what_is_foundational: List[str] = Field(default_factory=list, max_length=4)
    what_is_detail_or_later: List[str] = Field(default_factory=list, max_length=4)


class ReadingStrategy(BaseModel):
    focus_first: List[str] = Field(default_factory=list, max_length=3)
    skim_or_skip_for_now: List[str] = Field(default_factory=list, max_length=3)
    questions_to_keep_in_mind: List[str] = Field(default_factory=list, max_length=3)


class EvidenceNote(BaseModel):
    claim: str = Field(..., min_length=1, max_length=200)
    basis: str = Field(..., min_length=1, max_length=300)


class ProfileUpdateSuggestion(BaseModel):
    type: ProfileSuggestionType
    content: str = Field(..., min_length=1, max_length=300)


class PreAssessmentResponse(BaseModel):
    readiness: ReadinessAssessment
    blocking_gaps: List[BlockingGap] = Field(default_factory=list, max_length=3)
    core_frame: CoreFrame
    reading_strategy: ReadingStrategy
    evidence_notes: List[EvidenceNote] = Field(default_factory=list, max_length=3)
    profile_update_suggestions: List[ProfileUpdateSuggestion] = Field(
        default_factory=list, max_length=3
    )
