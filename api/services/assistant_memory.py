import logging
from pathlib import Path
from typing import Dict, List, TypedDict

from api.models.assistant_memory import (
    AssistantMemoryContextResponse,
    AssistantMemoryPurpose,
    AssistantMemorySection,
)

logger = logging.getLogger(__name__)

_MEMORY_ROOT_RELATIVE = Path(".codex") / "memory"


class MemorySectionSpec(TypedDict):
    key: str
    label: str
    description: str
    filename: str


_MEMORY_SECTION_SPECS: Dict[AssistantMemoryPurpose, List[MemorySectionSpec]] = {
    "general": [
        {
            "key": "ai_guide",
            "label": "AI Guide",
            "description": "记录助手的工作原则、表达方式和协作风格约束。",
            "filename": "ai_guide.md",
        },
        {
            "key": "assistant_contract",
            "label": "Assistant Contract",
            "description": "记录这个助手必须履行的职责，例如观察、更新、引导和纠偏。",
            "filename": "assistant_contract.md",
        },
        {
            "key": "user_profile",
            "label": "User Profile",
            "description": "记录你的稳定偏好、反感点、触发点和长期协作方式。",
            "filename": "user_profile.md",
        },
        {
            "key": "session_state",
            "label": "Session State",
            "description": "记录当前阶段的真实进展、阻塞点、风险和最近决策。",
            "filename": "session_state.md",
        },
        {
            "key": "project_direction",
            "label": "Project Direction",
            "description": "记录项目主线目标、产品边界和不要误入的方向。",
            "filename": "project_direction.md",
        },
    ],
    "pre_assessment": [
        {
            "key": "ai_guide",
            "label": "AI Guide",
            "description": "提供前置评估阶段也必须遵守的总体工作原则。",
            "filename": "ai_guide.md",
        },
        {
            "key": "assistant_contract",
            "label": "Assistant Contract",
            "description": "约束前置评估不能只做表面回答，而要体现观察、判断与引导。",
            "filename": "assistant_contract.md",
        },
        {
            "key": "user_profile",
            "label": "User Profile",
            "description": "注入与你有关的长期偏好，让这次评估更像在为你本人服务。",
            "filename": "user_profile.md",
        },
        {
            "key": "session_state",
            "label": "Session State",
            "description": "补充当前项目所处阶段、产品修正方向和本轮重点。",
            "filename": "session_state.md",
        },
        {
            "key": "project_direction",
            "label": "Project Direction",
            "description": "提醒前置评估只是学习工作流中的一个环节，而不是全部。",
            "filename": "project_direction.md",
        },
    ],
}


def _read_text_file(path: Path) -> str:
    if not path.exists():
        return ""

    try:
        return path.read_text(encoding="utf-8").strip()
    except Exception as exc:
        logger.warning("Failed to read assistant memory from %s: %s", path, exc)
        return ""


def load_assistant_memory_context(
    workspace_root: Path, purpose: AssistantMemoryPurpose = "general"
) -> AssistantMemoryContextResponse:
    memory_root = workspace_root / _MEMORY_ROOT_RELATIVE
    sections: List[AssistantMemorySection] = []
    parts: List[str] = []

    for spec in _MEMORY_SECTION_SPECS[purpose]:
        absolute_path = memory_root / spec["filename"]
        content = _read_text_file(absolute_path)
        if not content:
            continue

        sections.append(
            AssistantMemorySection(
                key=spec["key"],
                label=spec["label"],
                description=spec["description"],
                path=str((_MEMORY_ROOT_RELATIVE / spec["filename"]).as_posix()),
                char_count=len(content),
            )
        )
        parts.append(f'[{spec["label"]}]\n{content}')

    context_text = "\n\n".join(parts).strip() or "No assistant memory available."
    summary = (
        f"已加载 {len(sections)} 份记忆文件。"
        if sections
        else "当前没有可用的助手记忆。"
    )

    return AssistantMemoryContextResponse(
        purpose=purpose,
        summary=summary,
        context_text=context_text,
        sections=sections,
    )


def format_assistant_memory_for_prompt(
    workspace_root: Path, purpose: AssistantMemoryPurpose = "general"
) -> str:
    return load_assistant_memory_context(
        workspace_root=workspace_root,
        purpose=purpose,
    ).context_text
