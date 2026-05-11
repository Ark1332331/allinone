# 前置评估（Pre-Assessment）实现计划

## Context

allinone 的第一个核心功能。用户打开学习材料（PDF/PPT 转 MD、代码仓库）时，在深入之前先获得评估：复杂度、所需概念、与自身知识的差距、诚实建议。此功能会设置后续功能（划线提问、概念库）的代码模式。

## 功能定义

1. **复杂度评估** — introductory / intermediate / advanced + 推理
2. **核心概念提取** — 前置知识 / 核心概念 / 扩展概念，标注依赖关系
3. **差距分析** — 所需概念 vs 用户画像，known / partial / unknown + 证据
4. **诚实建议** — ready / needs_preparation / not_recommended + 缺口清单 + 学习路径

## 设计选择

| 决策 | 选择 | 理由 |
|------|------|------|
| 入口 | 独立新页面 `/pre-assessment` | 功能隔离，不混用旧 Wiki 流程 |
| 用户画像 | 自动读取 + 手动修正 | 减少输入负担，保留控制权 |
| 输出格式 | 结构化 JSON + 卡片 UI | 可扫读、可回看，符合"先结构后深入"偏好 |
| LLM 调用 | 非流式，prompt 约束 JSON | 结构化输出，通用 provider 兼容 |
| 画像更新 | 评估结果包含更新建议，用户审核后应用 | 遵循 delta-trigger 协议 |

## 数据流

```
用户粘贴 MD 内容 → 点击"开始前置评估"
  → POST /api/pre-assessment {content, content_title, profile_overrides}
    → 后端读取 user_profile.md
    → 组装 prompt（画像 + 内容）
    → 调用 LLM（AsyncOpenAI, temp=0.3）
    → 解析 JSON → PreAssessmentResponse
  → 前端渲染 4 张卡片 + 画像更新建议
    → 用户审核更新建议 → POST /api/pre-assessment/update-profile
      → 追加到 user_profile.md
```

## 文件变更

### 新增（5）

**1. `api/pre_assessment.py`** — 后端核心模块
- Pydantic 模型：`PreAssessmentRequest`, `PreAssessmentResponse`, `ComplexityAssessment`, `CoreConcept`, `GapItem`, `Recommendation`, `ProfileUpdateRequest`
- `read_user_profile()` — 自动检测画像路径（env var → 项目路径推算）
- `handle_pre_assessment()` — 主处理器
- `get_profile()` / `update_profile()` — 画像读写端点

**2. `src/app/pre-assessment/page.tsx`** — 评估页面
- 内容输入区（标题 + 大文本域）
- 画像查看/修正面板（可折叠）
- 评估按钮 + loading 状态
- 结果区（4 卡片 + 画像更新建议）

**3. `src/components/PreAssessmentCards.tsx`** — 卡片组件
- `ComplexityCard` — 色标徽章（绿/黄/红）+ 推理
- `CoreConceptsList` — 概念名 + 类别徽章 + 依赖标签
- `GapAnalysisTable` — 概念 | 掌握状态 | 建议（按 unknown 优先排序）
- `RecommendationCard` — readiness 徽章 + 缺口 + 学习路径

**4. `src/types/pre-assessment.ts`** — TypeScript 类型

**5. `api/prompts.py`（新增内容）** — `PRE_ASSESSMENT_SYSTEM_PROMPT`

### 修改（4）

**6. `api/api.py`** — 注册 3 个新路由
**7. `next.config.ts`** — 添加 3 条 rewrite 规则
**8. `src/app/page.tsx`** — 首页添加"前置评估"导航链接

## 实现顺序

1. `src/types/pre-assessment.ts` — 零依赖
2. `api/prompts.py` — PRE_ASSESSMENT_SYSTEM_PROMPT
3. `api/pre_assessment.py` — 模型 + prompt + 画像读取 + 处理器
4. `api/api.py` — 路由注册
5. `next.config.ts` — rewrite 规则
6. `src/components/PreAssessmentCards.tsx` — 卡片组件
7. `src/app/pre-assessment/page.tsx` — 评估页面
8. `src/app/page.tsx` — 导航链接
9. 端到端测试

## 关键复用

- `api/config.py::get_model_config()` — 模型客户端获取
- `api/prompts.py` — 现有 XML-style prompt 模式
- `api/api.py` — `app.add_api_route()` 注册模式
- `next.config.ts` — 现有 rewrite 模式
- `src/app/globals.css` — CSS 变量（`--accent-primary`, `--card-bg`, `--highlight`）
- Modal overlay 模式（参考 Ask.tsx）

## 验证

```bash
# 后端
python -m api.main  # 确认新端点注册成功
curl -X POST http://localhost:8001/api/pre-assessment \
  -H "Content-Type: application/json" \
  -d '{"content": "# Python基础\n\n变量与数据类型...", "content_title": "Python入门"}'

# 前端
npm run dev  # 确认 /pre-assessment 页面可访问
# 浏览器：粘贴 MD 内容 → 点击评估 → 确认卡片渲染 → 确认画像更新
```
