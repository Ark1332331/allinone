import sys
from pathlib import Path

import pytest

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from api.services.learning_chat import build_learning_chat_images, build_learning_chat_prompt


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


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__]))
