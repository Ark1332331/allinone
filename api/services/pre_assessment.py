import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from adalflow.core.types import ModelType

from api.config import get_model_config
from api.models.pre_assessment import PreAssessmentRequest, PreAssessmentResponse
from api.openai_client import OpenAIClient
from api.prompts import PRE_ASSESSMENT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

MAX_FULL_CONTENT_CHARS = 18000
MAX_CONTEXT_CHARS = 3000
MAX_EXCERPT_CHARS = 4000


def _read_text_file(path: Path) -> str:
    if not path.exists():
        return ""

    try:
        return path.read_text(encoding="utf-8").strip()
    except Exception as exc:
        logger.warning("Failed to read profile context from %s: %s", path, exc)
        return ""


def load_private_profile_context(workspace_root: Path) -> str:
    private_root = workspace_root / ".codex" / "memory"
    parts = []

    for relative_path, label in [
        ("user_profile.md", "User Profile"),
        ("session_state.md", "Session State"),
        ("project_direction.md", "Project Direction"),
    ]:
        content = _read_text_file(private_root / relative_path)
        if content:
            parts.append(f"[{label}]\n{content}")

    return "\n\n".join(parts).strip()


def _trim_text(value: Optional[str], max_chars: int) -> str:
    if not value:
        return ""

    text = value.strip()
    if len(text) <= max_chars:
        return text

    head = text[: int(max_chars * 0.7)].rstrip()
    tail = text[-int(max_chars * 0.25) :].lstrip()
    return (
        f"{head}\n\n[... middle truncated to keep prompt size manageable ...]\n\n{tail}"
    )


def build_pre_assessment_prompt(
    request: PreAssessmentRequest, profile_context: str
) -> str:
    payload: Dict[str, Any] = {
        "source_type": request.source_type,
        "title": request.title,
        "user_goal_hint": request.user_goal_hint or "",
        "full_content": _trim_text(request.full_content, MAX_FULL_CONTENT_CHARS),
        "selected_excerpt": _trim_text(request.selected_excerpt, MAX_EXCERPT_CHARS),
        "excerpt_context_before": _trim_text(
            request.excerpt_context_before, MAX_CONTEXT_CHARS
        ),
        "excerpt_context_after": _trim_text(
            request.excerpt_context_after, MAX_CONTEXT_CHARS
        ),
        "profile_context": profile_context,
        "profile_overrides": request.profile_overrides,
    }

    return (
        f"{PRE_ASSESSMENT_SYSTEM_PROMPT}\n\n"
        "<PROFILE_CONTEXT>\n"
        f"{payload['profile_context'] or 'No private profile context available.'}\n"
        "</PROFILE_CONTEXT>\n\n"
        "<PROFILE_OVERRIDES>\n"
        f"{json.dumps(payload['profile_overrides'], ensure_ascii=False, indent=2)}\n"
        "</PROFILE_OVERRIDES>\n\n"
        "<MATERIAL_INPUT>\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n"
        "</MATERIAL_INPUT>\n"
    )


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    cleaned = raw_text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Model response did not contain a JSON object")

    json_text = cleaned[start : end + 1]
    return json.loads(json_text)


async def call_pre_assessment_model(
    prompt: str, provider: str = "openai", model: Optional[str] = None
) -> str:
    model_config = get_model_config(provider, model)["model_kwargs"]

    if provider == "google":
        import google.generativeai as genai

        generative_model = genai.GenerativeModel(
            model_name=model or model_config["model"],
            generation_config={
                "temperature": min(model_config.get("temperature", 0.7), 0.6),
                "top_p": model_config.get("top_p", 0.8),
                "top_k": model_config.get("top_k", 20),
            },
        )
        response = generative_model.generate_content(prompt)
        return getattr(response, "text", "") or ""

    model_client = OpenAIClient()
    model_kwargs = {
        "model": model or model_config["model"],
        "stream": False,
        "temperature": min(model_config.get("temperature", 0.7), 0.6),
    }
    if "top_p" in model_config:
        model_kwargs["top_p"] = model_config["top_p"]

    api_kwargs = model_client.convert_inputs_to_api_kwargs(
        input=prompt,
        model_kwargs=model_kwargs,
        model_type=ModelType.LLM,
    )
    response = await model_client.acall(
        api_kwargs=api_kwargs,
        model_type=ModelType.LLM,
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Model returned an empty response")
    return content


def _sanitize_response(response: PreAssessmentResponse) -> PreAssessmentResponse:
    response.blocking_gaps = response.blocking_gaps[:3]
    response.core_frame.key_axes = response.core_frame.key_axes[:5]
    response.core_frame.what_is_foundational = (
        response.core_frame.what_is_foundational[:4]
    )
    response.core_frame.what_is_detail_or_later = (
        response.core_frame.what_is_detail_or_later[:4]
    )
    response.reading_strategy.focus_first = response.reading_strategy.focus_first[:3]
    response.reading_strategy.skim_or_skip_for_now = (
        response.reading_strategy.skim_or_skip_for_now[:3]
    )
    response.reading_strategy.questions_to_keep_in_mind = (
        response.reading_strategy.questions_to_keep_in_mind[:3]
    )
    response.evidence_notes = response.evidence_notes[:3]
    response.profile_update_suggestions = response.profile_update_suggestions[:3]
    return response


async def generate_pre_assessment(
    request: PreAssessmentRequest, workspace_root: Path
) -> PreAssessmentResponse:
    profile_context = load_private_profile_context(workspace_root)
    prompt = build_pre_assessment_prompt(request, profile_context)
    raw_response = await call_pre_assessment_model(prompt)
    payload = _extract_json_object(raw_response)
    result = PreAssessmentResponse.model_validate(payload)
    return _sanitize_response(result)
