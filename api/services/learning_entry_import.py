import base64
import logging
import tempfile
from pathlib import Path
from typing import Optional

from api.models.learning_entry import (
    LearningEntryImportRequest,
    LearningEntryImportResponse,
)

logger = logging.getLogger(__name__)

MAX_IMPORT_BYTES = 15 * 1024 * 1024
DIRECT_TEXT_EXTENSIONS = {".md", ".markdown", ".txt"}
MARKITDOWN_EXTENSIONS = {
    ".pdf",
    ".ppt",
    ".pptx",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".html",
    ".htm",
}


def _safe_title_from_filename(filename: str) -> str:
    stem = Path(filename).stem.strip()
    if not stem:
        return "未命名材料"
    return stem[:300]


def _source_type_from_extension(extension: str) -> str:
    if extension == ".pdf":
        return "pdf_md"
    if extension in {".ppt", ".pptx"}:
        return "ppt_md"
    if extension in {".md", ".markdown", ".txt", ".doc", ".docx"}:
        return "note_md"
    return "other_md"


def _decode_payload(content_base64: str) -> bytes:
    try:
        raw_bytes = base64.b64decode(content_base64, validate=True)
    except Exception as exc:
        raise ValueError("Uploaded file payload is not valid base64 data") from exc

    if not raw_bytes:
        raise ValueError("Uploaded file is empty")

    if len(raw_bytes) > MAX_IMPORT_BYTES:
        raise ValueError("Uploaded file is too large for current beta import")

    return raw_bytes


def _decode_text_content(raw_bytes: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gbk", "latin-1"):
        try:
            return raw_bytes.decode(encoding).strip()
        except UnicodeDecodeError:
            continue
    raise ValueError("Unable to decode uploaded text file")


def _convert_with_markitdown(temp_path: Path) -> str:
    try:
        from markitdown import MarkItDown
    except Exception as exc:
        raise RuntimeError(
            "MarkItDown is not installed in the backend environment yet. "
            "Current beta can import .md/.txt directly. "
            "To enable PDF/PPT/Word/Excel conversion, install markitdown with the needed extras."
        ) from exc

    converter = MarkItDown(enable_plugins=False)
    try:
        result = converter.convert_local(str(temp_path))
    except AttributeError:
        result = converter.convert(str(temp_path))

    text_content = getattr(result, "text_content", None)
    if not text_content:
        raise ValueError("MarkItDown returned empty content for this file")
    return text_content.strip()


def import_learning_material(
    request: LearningEntryImportRequest,
) -> LearningEntryImportResponse:
    filename = Path(request.filename).name
    extension = Path(filename).suffix.lower()
    raw_bytes = _decode_payload(request.content_base64)
    title = _safe_title_from_filename(filename)
    warnings: list[str] = []

    if extension in DIRECT_TEXT_EXTENSIONS:
        full_content = _decode_text_content(raw_bytes)
        if not full_content:
            raise ValueError("Uploaded text file is empty after decoding")
        return LearningEntryImportResponse(
            title=title,
            source_type=_source_type_from_extension(extension),
            full_content=full_content,
            filename=filename,
            mime_type=request.mime_type,
            detected_extension=extension,
            converter_used="direct_text",
            import_summary="已直接导入文本内容，可继续做初步判断。",
            warnings=warnings,
        )

    if extension not in MARKITDOWN_EXTENSIONS:
        raise ValueError(
            f"Current beta does not support importing {extension or 'this file type'} yet."
        )

    temp_path: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
            temp_file.write(raw_bytes)
            temp_path = Path(temp_file.name)

        full_content = _convert_with_markitdown(temp_path)
        return LearningEntryImportResponse(
            title=title,
            source_type=_source_type_from_extension(extension),
            full_content=full_content,
            filename=filename,
            mime_type=request.mime_type,
            detected_extension=extension,
            converter_used="markitdown",
            import_summary="已通过转换器导入文件内容，可继续做初步判断。",
            warnings=warnings,
        )
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception as exc:
                logger.warning("Failed to clean up temporary import file %s: %s", temp_path, exc)
