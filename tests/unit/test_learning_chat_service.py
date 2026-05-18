import sys
from pathlib import Path

import pytest

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.learning_chat import build_learning_chat_images, build_learning_chat_prompt
from api.models.learning_chat import LearningChatRequest


pytestmark = pytest.mark.unit


def test_build_learning_chat_prompt_includes_material_snippets_background_and_memory():
    prompt = build_learning_chat_prompt(
        material={
            "title": "反向传播",
            "full_content": "反向传播用于高效计算梯度。",
        },
        selected_snippets=[
            {
                "materialId": "m1",
                "text": "链式法则是关键",
                "anchorLabel": "第 2 段",
            }
        ],
        current_target={
            "title": "深度学习第一轮理解",
            "backgroundMaterials": [
                {"materialId": "b1", "backgroundRole": "standard"}
            ],
        },
        background_materials=[
            {
                "id": "b1",
                "title": "课程大纲",
                "primaryRole": "exam_outline",
                "fullContent": "先理解误差反传，再看矩阵形式。",
            }
        ],
        memory_context="你需要观察、判断并指出学习盲点。",
        messages=[
            {"role": "user", "content": "这段为什么重要？"},
        ],
    )

    assert "反向传播" in prompt
    assert "链式法则是关键" in prompt
    assert "深度学习第一轮理解" in prompt
    assert "课程大纲" in prompt
    assert "观察、判断并指出学习盲点" in prompt
    assert "这段为什么重要？" in prompt
    assert "数学表达式" in prompt
    assert "$...$" in prompt
    assert "$$...$$" in prompt


def test_build_learning_chat_prompt_marks_pdf_screenshot_snippets():
    prompt = build_learning_chat_prompt(
        material={
            "title": "高数课件",
            "full_content": "这里是结构化文本。",
        },
        selected_snippets=[
            {
                "materialId": "m1",
                "text": "PDF 第 3 页截图区域",
                "anchorLabel": "PDF 截图 1",
                "source": "pdf_screenshot",
                "imageDataUrl": "data:image/png;base64,abc123",
                "pageNumber": 3,
            }
        ],
        current_target={
            "title": "理解定理证明",
            "backgroundMaterials": [],
        },
        background_materials=[],
        memory_context="",
        messages=[
            {"role": "user", "content": "请看截图解释这一步。"},
        ],
    )

    assert "PDF 截图 1" in prompt
    assert "截图" in prompt
    assert "第 3 页" in prompt
    assert "请看截图解释这一步" in prompt


def test_build_learning_chat_images_extracts_data_url_images():
    images = build_learning_chat_images(
        [
            {
                "materialId": "m1",
                "text": "PDF 第 3 页截图区域",
                "anchorLabel": "PDF 截图 1",
                "source": "pdf_screenshot",
                "imageDataUrl": "data:image/png;base64,abc123",
                "pageNumber": 3,
            },
            {
                "materialId": "m1",
                "text": "普通文字片段",
                "anchorLabel": "片段 2",
                "source": "text",
            },
        ]
    )

    assert images == [
        {
            "type": "image_url",
            "image_url": {
                "url": "data:image/png;base64,abc123",
                "detail": "high",
            },
        }
    ]


def test_learning_chat_request_accepts_assistant_reply_snippets():
    request = LearningChatRequest(
        material={
            "id": "m1",
            "title": "问答片段",
            "primaryRole": "textbook",
            "fullContent": "原材料内容",
        },
        selected_snippets=[
            {
                "materialId": "m1",
                "text": "回答里选中的内容",
                "anchorLabel": "回答片段 1",
                "source": "assistant_reply",
            }
        ],
        current_target={"title": "理解追问", "backgroundMaterials": []},
        background_materials=[],
        messages=[{"role": "user", "content": "继续解释这句话"}],
    )

    assert request.selected_snippets[0].source == "assistant_reply"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__]))
