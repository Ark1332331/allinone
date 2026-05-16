import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from adalflow.core.types import ModelType

from api.config import get_model_config
from api.openai_client import OpenAIClient
from api.services.assistant_memory import format_assistant_memory_for_prompt

logger = logging.getLogger(__name__)

MAX_MATERIAL_CHARS = 16000
MAX_BACKGROUND_CHARS = 2500
MAX_SNIPPET_CHARS = 1200


def _is_screenshot_snippet(snippet: Dict[str, Any]) -> bool:
    return (
        snippet.get("source") == "pdf_screenshot"
        or str(snippet.get("imageDataUrl", "")).startswith("data:image/")
    )


def _trim_text(value: Optional[str], max_chars: int) -> str:
    if not value:
        return ""

    text = value.strip()
    if len(text) <= max_chars:
        return text

    head = text[: int(max_chars * 0.72)].rstrip()
    tail = text[-int(max_chars * 0.22) :].lstrip()
    return f"{head}\n\n[... omitted for prompt budget ...]\n\n{tail}"


def build_learning_chat_prompt(
    material: Dict[str, Any],
    selected_snippets: List[Dict[str, Any]],
    current_target: Dict[str, Any],
    background_materials: List[Dict[str, Any]],
    memory_context: str,
    messages: List[Dict[str, Any]],
) -> str:
    def format_snippet(snippet: Dict[str, Any]) -> str:
        label = snippet.get("anchorLabel", "未标注位置")
        text = _trim_text(str(snippet.get("text", "")), MAX_SNIPPET_CHARS)
        if not _is_screenshot_snippet(snippet):
            return f"- {label}: {text}"

        page_number = snippet.get("pageNumber")
        screenshot_label = f"第 {page_number} 页截图" if page_number else "PDF 截图"
        return f"- {label}（{screenshot_label}）: {text}"

    snippet_block = "\n".join(
        [
            format_snippet(snippet)
            for snippet in selected_snippets
            if str(snippet.get("text", "")).strip()
        ]
    ).strip() or "无"

    background_roles = {
        item.get("materialId"): item.get("backgroundRole")
        for item in current_target.get("backgroundMaterials", [])
    }
    background_block = "\n\n".join(
        [
            "\n".join(
                [
                    f"[背景资料] {background.get('title', '未命名资料')}",
                    f"角色: {background_roles.get(background.get('id'), 'unknown')}",
                    f"主定位: {background.get('primaryRole', 'unknown')}",
                    _trim_text(str(background.get("fullContent", "")), MAX_BACKGROUND_CHARS),
                ]
            )
            for background in background_materials
        ]
    ).strip() or "无"

    conversation_block = "\n".join(
        [
            f"{message.get('role', 'user')}: {message.get('content', '').strip()}"
            for message in messages
            if str(message.get("content", "")).strip()
        ]
    ).strip()

    return (
        "你是一个面向真实学习场景的阅读助手，不只是答题机器。\n"
        "你必须结合当前资料、用户手选片段、当前目标背景资料和长期画像来回答。\n"
        "你可以指出理解漏洞、偷懒路径、复习误区和优先级问题，但不要空泛说教。\n"
        "如果证据不足，要明确说依据来自当前资料、背景资料还是用户画像。\n\n"
        "<长期画像>\n"
        f"{memory_context or '无'}\n"
        "</长期画像>\n\n"
        "<当前目标>\n"
        f"{current_target.get('title', '当前目标')}\n"
        "</当前目标>\n\n"
        "<当前资料>\n"
        f"标题: {material.get('title', '未命名资料')}\n"
        f"主定位: {material.get('primaryRole', 'unknown')}\n"
        f"正文:\n{_trim_text(str(material.get('fullContent', '')), MAX_MATERIAL_CHARS)}\n"
        "</当前资料>\n\n"
        "<已选片段>\n"
        f"{snippet_block}\n"
        "</已选片段>\n\n"
        "<目标背景资料>\n"
        f"{background_block}\n"
        "</目标背景资料>\n\n"
        "<对话历史>\n"
        f"{conversation_block}\n"
        "</对话历史>\n\n"
        "请直接回答最后一个用户问题。优先解释当前片段在当前资料里的作用。"
        "如果已选片段包含 PDF 截图，请优先观察截图里的公式、图像、排版和上下文线索，"
        "再结合结构化文本、背景资料或画像指出更值得关注的方向。"
    )


def build_learning_chat_images(
    selected_snippets: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    images: List[Dict[str, Any]] = []

    for snippet in selected_snippets:
        image_data_url = str(snippet.get("imageDataUrl", "")).strip()
        if not image_data_url.startswith("data:image/"):
            continue

        images.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": image_data_url,
                    "detail": "high",
                },
            }
        )

    return images


async def generate_learning_chat_answer(
    material: Dict[str, Any],
    selected_snippets: List[Dict[str, Any]],
    current_target: Dict[str, Any],
    background_materials: List[Dict[str, Any]],
    messages: List[Dict[str, Any]],
    workspace_root: Path,
    provider: str = "openai",
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> str:
    memory_context = format_assistant_memory_for_prompt(
        workspace_root,
        purpose="general",
    )
    prompt = build_learning_chat_prompt(
        material=material,
        selected_snippets=selected_snippets,
        current_target=current_target,
        background_materials=background_materials,
        memory_context=memory_context,
        messages=messages,
    )
    images = build_learning_chat_images(selected_snippets)
    model_config = get_model_config(provider, model)["model_kwargs"]

    if provider == "google":
        if images:
            raise ValueError("PDF screenshot questions currently require an OpenAI-compatible vision model.")

        import google.generativeai as genai

        generative_model = genai.GenerativeModel(
            model_name=model or model_config["model"],
            generation_config={
                "temperature": model_config.get("temperature", 0.6),
                "top_p": model_config.get("top_p", 0.8),
                "top_k": model_config.get("top_k", 20),
            },
        )
        response = generative_model.generate_content(prompt)
        content = getattr(response, "text", "") or ""
        if not content:
            raise ValueError("Model returned an empty learning-chat response")
        return content

    model_client = OpenAIClient(api_key=api_key, base_url=base_url)
    model_kwargs = {
        "model": model or model_config["model"],
        "stream": False,
        "temperature": model_config.get("temperature", 0.6),
    }
    if images:
        model_kwargs["images"] = images
        model_kwargs["detail"] = "high"
    if "top_p" in model_config:
        model_kwargs["top_p"] = model_config["top_p"]

    api_kwargs = model_client.convert_inputs_to_api_kwargs(
        input=prompt,
        model_kwargs=model_kwargs,
        model_type=ModelType.LLM,
    )
    response = await model_client.acall(api_kwargs=api_kwargs, model_type=ModelType.LLM)
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Model returned an empty learning-chat response")
    return content
