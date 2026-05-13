from typing import List, Literal, Optional

from pydantic import BaseModel, Field


ImportedSourceType = Literal["pdf_md", "ppt_md", "note_md", "other_md"]


class LearningEntryImportRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    mime_type: Optional[str] = Field(default=None, max_length=150)
    content_base64: str = Field(..., min_length=1)


class LearningEntryImportResponse(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    source_type: ImportedSourceType
    full_content: str = Field(..., min_length=1)
    filename: str = Field(..., min_length=1, max_length=255)
    mime_type: Optional[str] = Field(default=None, max_length=150)
    detected_extension: str = Field(..., min_length=1, max_length=20)
    converter_used: str = Field(..., min_length=1, max_length=60)
    import_summary: str = Field(..., min_length=1, max_length=300)
    warnings: List[str] = Field(default_factory=list, max_length=5)
