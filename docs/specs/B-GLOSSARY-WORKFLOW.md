# 后端 B：专有名词高亮与术语检索 — 工作流与任务分解

> 本文档由 Opus (Architect) 根据 `MULTI_MODEL_WORKFLOW.md` 流程为**后端 B** 角色生成。
> 包含完整的任务拆分、执行顺序、Task Spec 以及对 Coding Model 的精确指引。

---

## 角色确认

| 字段 | 值 |
|------|-----|
| **你的角色** | 后端 B（专有名词高亮与术语检索） |
| **职责范围** | `api/models/glossary.py`、`api/services/glossary_service.py`、`api/routes/glossary.py`、`api/api.py`（注册路由）、单元测试 |
| **API 端点** | 4 个（`GET /wiki/glossary`、`POST /wiki/glossary/extract`、`GET /wiki/glossary/index`、`POST /wiki/glossary/refresh`） |
| **不碰的模块** | 前端（前端 D 负责）、阅读指南（后端 A）、搜索（后端 C） |

---

## 整体执行流程

```
B-001: Pydantic 数据模型 + 目录脚手架
  ↓
B-002: 术语服务核心 — LLM 抽取 + 正则匹配 + 文件缓存
  ↓
B-003: FastAPI 路由 + 路由注册到 api.py
  ↓
B-004: 单元测试（含 LLM Mock）
```

**依赖关系**：B-001 → B-002 → B-003 → B-004（严格线性）

**预计总改动文件**：10 个新建 + 1 个修改

---

## Task Spec B-001: Pydantic 数据模型 + 目录脚手架

---

### 基本信息

| 字段 | 值 |
|------|-----|
| **Spec 编号** | B-001 |
| **创建者** | Opus (Architect) |
| **执行模型** | Coding Model |
| **依赖** | 无 |
| **预计改动文件数** | 4 |
| **难度** | low |

---

### 任务目标

创建术语功能所需的全部 Pydantic 数据模型，并建立 `api/models/`、`api/services/`、`api/routes/` 目录结构。

---

### 上下文背景

#### 为什么做
三个新功能模块（阅读指南、术语、搜索）共享 `api/models/`、`api/services/`、`api/routes/` 三层目录结构。术语模块需要先定义好数据模型，后续 Service 和 Route 才能引用。

#### 关联功能
属于"专有名词高亮与术语检索"功能，是该功能的数据层基础。

#### 当前状态
`api/models/`、`api/services/`、`api/routes/` 三个目录均不存在，需要新建。现有 Pydantic 模型全部定义在 `api/api.py` 中（如 `WikiPage`、`WikiCacheData` 等）。

---

### 涉及文件（精确）

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 新建 | `api/models/__init__.py` | 空文件，建立 Python 包 |
| 新建 | `api/models/glossary.py` | 术语功能全部 Pydantic 模型 |
| 新建 | `api/services/__init__.py` | 空文件，建立 Python 包 |
| 新建 | `api/routes/__init__.py` | 空文件，建立 Python 包 |
| 不改 | `api/api.py` | 本 Spec 不改（B-003 再改） |

---

### 架构约束

- 所有模型必须继承 `pydantic.BaseModel`
- 字段命名与 OpenAPI 规范（`DeepWiki API.openapi.yaml`）严格一致（驼峰式）
- 模型文件内只定义数据结构，不含业务逻辑
- `Optional` 字段必须有默认值

---

### 需参考的现有代码

| 文件 | 参考目的 |
|------|---------|
| `api/api.py` 第 39-131 行 | 现有 Pydantic 模型的定义风格（BaseModel + Field + 类型标注） |
| `c:\Users\pc\Downloads\DeepWiki API.openapi.yaml` 第 1083-1295 行 | Glossary 相关端点的请求/响应 Schema |

---

### 实现指引

#### 推荐方案

在 `api/models/glossary.py` 中定义以下模型：

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class GlossaryTerm(BaseModel):
    term: str                       # 术语原文（英文）
    label: str                      # 中文释义
    wikiUrl: Optional[str] = None   # Wikipedia 链接
    googleQuery: str                # Google 搜索关键词
    description: str                # 简短定义

class GlossaryWithStats(BaseModel):
    terms: List[GlossaryTerm]
    statistics: Dict[str, int]      # 术语出现频率统计
    cached: bool                    # 是否来自缓存

class GlossaryOccurrence(BaseModel):
    pageId: str                     # 注意：驼峰，与 OpenAPI 一致
    pageTitle: str
    count: int

class GlossaryIndexItem(BaseModel):
    term: GlossaryTerm
    occurrences: List[GlossaryOccurrence]

class GlossaryIndexResponse(BaseModel):
    terms: List[GlossaryIndexItem]
    totalTerms: int

class GlossaryExtractRequest(BaseModel):
    page_id: str
    page_content: str
    existing_terms: Optional[List[GlossaryTerm]] = None

class GlossaryExtractResponse(BaseModel):
    extracted_terms: List[GlossaryTerm]
    merged_terms: List[GlossaryTerm]

class GlossaryRefreshResponse(BaseModel):
    terms: List[GlossaryTerm]
    statistics: Dict[str, int]
    message: str = "术语列表已更新"
```

#### 关键步骤
1. 创建 `api/models/`、`api/services/`、`api/routes/` 目录及 `__init__.py`
2. 在 `api/models/glossary.py` 中定义上述所有模型
3. 验证模型可以正常 import

---

### 测试要求

| 测试文件 | 测什么 |
|---------|---------|
| 暂无（B-004 统一测试） | 本 Spec 仅验证 import 不报错 |

---

### 验收标准（可量化）

- [ ] `api/models/`、`api/services/`、`api/routes/` 三个目录存在且各含 `__init__.py`
- [ ] `api/models/glossary.py` 包含全部 8 个模型类
- [ ] `from api.models.glossary import GlossaryTerm, GlossaryWithStats` 等 import 成功
- [ ] 所有模型字段与 OpenAPI 规范一致
- [ ] 无 lint 错误

---

### 禁止事项

- 不要在模型文件中写业务逻辑或 LLM 调用
- 不要修改 `api/api.py`
- 不要引入 pydantic 以外的新依赖

---

## Task Spec B-002: 术语服务核心

---

### 基本信息

| 字段 | 值 |
|------|-----|
| **Spec 编号** | B-002 |
| **创建者** | Opus (Architect) |
| **执行模型** | Coding Model |
| **依赖** | B-001 |
| **预计改动文件数** | 2 |
| **难度** | high |

---

### 任务目标

实现术语服务的核心业务逻辑：LLM 术语抽取、正则匹配统计、文件缓存读写、术语索引生成。

---

### 上下文背景

#### 为什么做
术语高亮功能的核心是让 LLM 从 Wiki 页面内容中动态识别专业术语。首次请求触发 LLM 抽取，结果缓存到本地文件，后续请求直接读缓存。

#### 关联功能
这是术语功能的业务逻辑层，上层由 Route 调用（B-003），下层依赖 B-001 的 Pydantic 模型。

#### 当前状态
项目已有完整的多 Provider LLM 调用体系（见 `api/simple_chat.py`），术语服务需要复用这套 Provider 机制做非流式 LLM 调用。

---

### 涉及文件（精确）

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 新建 | `api/services/glossary_service.py` | 术语服务全部业务逻辑 |
| 新建 | `api/prompts.py`（追加内容） | 追加 `GLOSSARY_EXTRACT_PROMPT` 常量 |
| 不改 | `api/config.py` | 只读引用 `get_model_config`、`configs` |
| 不改 | `api/simple_chat.py` | 参考 LLM 调用模式，不修改 |
| 不改 | `api/api.py` | 参考 wiki cache 读写模式（`WIKI_CACHE_DIR`、JSON 文件操作） |

---

### 架构约束

- **数据流**：Route → Service → (LLM / 文件缓存)，不跳过 Service 层
- **LLM 调用**：复用项目已有的 Provider 体系（`get_model_config` + Client 类），支持所有 7 个 Provider
- **缓存路径**：`~/.adalflow/glossary/{repo_type}_{owner}_{repo}_{language}.json`，与 wiki cache 模式对齐
- **无状态**：Service 函数不持有实例状态，用函数式风格
- **JSON 输出解析**：LLM 返回的 JSON 需要容错解析（可能包含 markdown 代码块包裹）

---

### 需参考的现有代码

| 文件 | 参考目的 |
|------|---------|
| `api/simple_chat.py` 第 330-460 行 | 多 Provider LLM 调用模式：`get_model_config` → 实例化 Client → `convert_inputs_to_api_kwargs` → `acall` |
| `api/api.py` 第 444-507 行 | 文件缓存读写模式：`WIKI_CACHE_DIR`、`os.makedirs`、`json.load`/`json.dump`、`model_dump()` |
| `api/prompts.py` | Prompt 模板格式：XML 标签结构、`{变量}` 占位符 |
| `api/config.py` 第 58-60 行 | `CLIENT_CLASSES` 映射和 `get_model_config()` 函数签名 |

---

### 实现指引

#### 推荐方案

`api/services/glossary_service.py` 需要实现以下核心函数：

```python
# 公开接口（Route 层调用）
async def get_glossary(owner, repo, repo_type, language, provider, model, wiki_pages) -> GlossaryWithStats
async def extract_terms_from_page(page_id, page_content, existing_terms, provider, model) -> GlossaryExtractResponse
async def get_glossary_index(owner, repo, repo_type, language, wiki_pages) -> GlossaryIndexResponse
async def refresh_glossary(owner, repo, repo_type, language, provider, model, wiki_pages) -> GlossaryRefreshResponse

# 内部函数
async def _call_llm_extract(content: str, provider: str, model: str) -> List[GlossaryTerm]
def _match_terms_in_content(content: str, terms: List[str]) -> Dict[str, int]
def _read_glossary_cache(owner, repo, repo_type, language) -> Optional[GlossaryWithStats]
def _write_glossary_cache(owner, repo, repo_type, language, data: GlossaryWithStats) -> bool
def _parse_llm_json_response(raw_text: str) -> List[dict]
```

#### 关键步骤

1. **追加 Prompt 到 `api/prompts.py`**：
   ```python
   GLOSSARY_EXTRACT_PROMPT = """从以下技术文档中识别专业术语和概念。

   规则：
   1. 只提取技术术语、框架名、算法名、协议名等专业名词
   2. 过滤常见通用词汇（如"功能"、"方法"、"文件"）
   3. 返回术语的标准写法（区分大小写，如 "FAISS" 而非 "faiss"）
   4. 提供中文释义和简短定义
   5. 生成适合 Google 搜索的关键词组合
   6. 尝试提供 Wikipedia 链接（格式：https://en.wikipedia.org/wiki/术语名）

   输出格式（严格 JSON，不要包裹 markdown 代码块）：
   {
     "terms": [
       {
         "term": "RAG",
         "label": "检索增强生成",
         "wikiUrl": "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
         "googleQuery": "RAG retrieval augmented generation LLM",
         "description": "一种结合信息检索和文本生成的AI架构模式"
       }
     ]
   }

   文档内容：
   {content}"""
   ```

2. **实现 LLM 调用**（参考 `simple_chat.py` 模式，但使用非流式调用）：
   - 通过 `get_model_config(provider, model)` 获取模型配置
   - 实例化对应 Client
   - 使用 `convert_inputs_to_api_kwargs` + `acall` 发起请求
   - Google Provider 使用 `genai.GenerativeModel.generate_content_async`（非流式）
   - 其他 Provider 使用 `acall` 但不开 `stream=True`

3. **实现缓存读写**（参考 `api/api.py` 的 wiki cache 模式）：
   - 缓存目录：`os.path.join(get_adalflow_default_root_path(), "glossary")`
   - 文件名：`{repo_type}_{owner}_{repo}_{language}.json`
   - 读：`json.load` → `GlossaryWithStats(**data)`
   - 写：`data.model_dump()` → `json.dump`

4. **实现正则匹配统计**：
   - 使用 `re.findall(r'\b' + re.escape(term) + r'\b', content, re.IGNORECASE)` 做单词边界匹配
   - 返回 `Dict[str, int]` 统计每个术语出现次数

5. **实现 JSON 响应解析容错**：
   - LLM 可能返回 ````json ... ``` `` 包裹的内容
   - 用正则剥离代码块标记后再 `json.loads`

#### 边界情况（必须处理）
- Wiki 页面内容为空 → 返回空术语列表
- LLM 返回非法 JSON → 记录日志，返回空列表，不抛异常
- 缓存文件损坏 → 删除缓存，重新触发 LLM 抽取
- Provider 未配置 API Key → 抛出 `HTTPException(500)` 并给出明确提示
- 术语列表为空 → 正常返回空列表和空统计

---

### 测试要求

| 测试文件 | 测什么 |
|---------|---------|
| B-004 统一测试 | LLM 抽取（Mock）、正则匹配、缓存读写、JSON 解析容错 |

---

### 验收标准（可量化）

- [ ] `get_glossary` 首次调用触发 LLM 抽取并写缓存
- [ ] `get_glossary` 二次调用直接读缓存（`cached=True`）
- [ ] `refresh_glossary` 强制重新 LLM 抽取并覆盖缓存
- [ ] `extract_terms_from_page` 单页抽取可独立工作
- [ ] `_match_terms_in_content` 正确统计术语频次（忽略大小写，单词边界）
- [ ] LLM 返回畸形 JSON 时不抛异常
- [ ] 缓存文件路径与 FEATURES.md 规定的一致
- [ ] 无 lint 错误

---

### 风险提示

| 风险 | 影响 | 规避方式 |
|------|------|---------|
| LLM 返回格式不稳定 | JSON 解析失败 | `_parse_llm_json_response` 加 try/except + 正则清洗 |
| 非流式 LLM 调用模式与现有代码不同 | 可能调用方式有差异 | 参考 `simple_chat.py` 但去掉 `stream=True` |
| 多 Provider 差异 | 每个 Provider 的 acall 返回格式不同 | 统一提取 response text 的逻辑 |

---

### 禁止事项

- 不要修改 `api/simple_chat.py` 或 `api/websocket_wiki.py`
- 不要引入新的第三方依赖（只用已有的 `re`、`json`、`os`、`logging`）
- 不要在 Service 层处理 HTTP 请求/响应（那是 Route 层的事）
- 不要硬编码 Provider，必须通过 `get_model_config` 动态获取

---

## Task Spec B-003: FastAPI 路由 + 路由注册

---

### 基本信息

| 字段 | 值 |
|------|-----|
| **Spec 编号** | B-003 |
| **创建者** | Opus (Architect) |
| **执行模型** | Coding Model |
| **依赖** | B-001, B-002 |
| **预计改动文件数** | 2 |
| **难度** | medium |

---

### 任务目标

创建术语功能的 4 个 FastAPI 路由端点，并将路由注册到主应用 `api/api.py`。

---

### 上下文背景

#### 为什么做
路由层是前端与术语服务之间的桥梁，需要按 OpenAPI 规范精确实现请求参数解析、Service 调用和响应格式化。

#### 关联功能
路由层调用 B-002 的 Service 函数，使用 B-001 的数据模型。

#### 当前状态
现有路由全部直接定义在 `api/api.py` 中。新功能改用 `APIRouter` + `include_router` 模式。

---

### 涉及文件（精确）

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 新建 | `api/routes/glossary.py` | 4 个路由端点 |
| 修改 | `api/api.py` | 末尾追加：import glossary router + `app.include_router` |
| 不改 | `api/services/glossary_service.py` | 只调用，不修改 |
| 不改 | `api/models/glossary.py` | 只引用，不修改 |

---

### 架构约束

- 使用 `fastapi.APIRouter` 而非直接在 `app` 上定义路由
- 路由前缀为 `/wiki`，在 `api/api.py` 中通过 `app.include_router(router, prefix="/wiki", tags=["Glossary"])` 注册
- 路由函数只做参数验证 + 调 Service + 返回结果，不含业务逻辑
- 查询参数使用 `fastapi.Query`，路径参数直接声明
- 错误统一用 `HTTPException` 抛出

---

### 需参考的现有代码

| 文件 | 参考目的 |
|------|---------|
| `api/api.py` 第 513-604 行 | Wiki cache 端点的参数风格（`Query(...)` 带 description） |
| `api/api.py` 第 432-440 行 | 路由注册模式（`add_api_route`），新功能改用 `include_router` |
| `c:\Users\pc\Downloads\DeepWiki API.openapi.yaml` | 4 个 Glossary 端点的精确参数和响应 Schema |

---

### 实现指引

#### 推荐方案

`api/routes/glossary.py` 结构：

```python
import logging
from fastapi import APIRouter, HTTPException, Query
from api.models.glossary import (
    GlossaryWithStats, GlossaryExtractRequest, GlossaryExtractResponse,
    GlossaryIndexResponse, GlossaryRefreshResponse
)
from api.services import glossary_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/glossary", response_model=GlossaryWithStats)
async def get_glossary(
    owner: str = Query(..., description="仓库所有者"),
    repo: str = Query(..., description="仓库名称"),
    repo_type: str = Query(..., description="仓库类型"),
    language: str = Query(..., description="Wiki语言"),
    provider: str = Query("google", description="LLM provider"),
    model: str = Query(None, description="LLM model"),
):
    ...


@router.post("/glossary/extract", response_model=GlossaryExtractResponse)
async def extract_glossary_terms(request: GlossaryExtractRequest):
    ...


@router.get("/glossary/index", response_model=GlossaryIndexResponse)
async def get_glossary_index(
    owner: str = Query(..., description="仓库所有者"),
    repo: str = Query(..., description="仓库名称"),
    repo_type: str = Query(..., description="仓库类型"),
    language: str = Query(..., description="Wiki语言"),
):
    ...


@router.post("/glossary/refresh", response_model=GlossaryRefreshResponse)
async def refresh_glossary(
    owner: str = Query(..., description="仓库所有者"),
    repo: str = Query(..., description="仓库名称"),
    repo_type: str = Query(..., description="仓库类型"),
    language: str = Query(..., description="Wiki语言"),
    provider: str = Query("google", description="LLM provider"),
    model: str = Query(None, description="LLM model"),
):
    ...
```

#### 关键步骤

1. 创建 `api/routes/glossary.py`，定义 4 个路由
2. 每个路由内部：参数校验 → 调用 `glossary_service.xxx()` → try/except 包裹 → 返回结果或抛 `HTTPException`
3. 在 `api/api.py` 末尾（`get_processed_projects` 函数之后）追加：
   ```python
   from api.routes.glossary import router as glossary_router
   app.include_router(glossary_router, prefix="/wiki", tags=["Glossary"])
   ```

#### `GET /wiki/glossary` 的特殊逻辑
此端点需要读取 wiki cache 来获取 wiki_pages。流程：
1. 调用 `read_wiki_cache(owner, repo, repo_type, language)` 获取缓存的 Wiki 数据
2. 从 `wiki_structure.pages` 提取页面内容
3. 传给 `glossary_service.get_glossary(..., wiki_pages=pages)`
4. 如果 wiki cache 不存在，返回 `HTTPException(404, "Wiki cache not found, please generate wiki first")`

#### `POST /wiki/glossary/refresh` 同理
也需要先读 wiki cache 获取页面内容。

#### 边界情况（必须处理）
- Wiki cache 不存在 → 404 "Wiki cache not found"
- LLM 调用失败 → 500 "术语抽取失败: {error}"
- 参数缺失 → FastAPI 自动 422

---

### 测试要求

| 测试文件 | 测什么 |
|---------|---------|
| B-004 统一测试 | 路由参数解析、错误码、与 Service Mock 的集成 |

---

### 验收标准（可量化）

- [ ] `GET /wiki/glossary?owner=x&repo=y&repo_type=github&language=en` 返回 200 + `GlossaryWithStats` 格式
- [ ] `POST /wiki/glossary/extract` 接受 JSON body 返回 200 + `GlossaryExtractResponse` 格式
- [ ] `GET /wiki/glossary/index` 返回 200 + `GlossaryIndexResponse` 格式
- [ ] `POST /wiki/glossary/refresh` 返回 200 + `GlossaryRefreshResponse` 格式
- [ ] Wiki cache 不存在时返回 404
- [ ] 路由在 `GET /` 的端点列表中可见
- [ ] 无 lint 错误

---

### 禁止事项

- 不要在路由函数中写 LLM 调用或缓存逻辑（那是 Service 层的事）
- 不要修改 `api/api.py` 中的任何现有端点
- 不要改变现有 API 签名或响应格式
- 追加到 `api/api.py` 的代码不要超过 5 行

---

## Task Spec B-004: 单元测试

---

### 基本信息

| 字段 | 值 |
|------|-----|
| **Spec 编号** | B-004 |
| **创建者** | Opus (Architect) |
| **执行模型** | Coding Model |
| **依赖** | B-001, B-002, B-003 |
| **预计改动文件数** | 2 |
| **难度** | medium |

---

### 任务目标

为术语功能编写完整的单元测试，覆盖数据模型、Service 核心逻辑（含 LLM Mock）、路由端点。

---

### 上下文背景

#### 为什么做
术语功能依赖 LLM 调用，测试必须用 Mock 隔离外部依赖。正则匹配和缓存逻辑是纯本地计算，可以直接测。

#### 当前状态
测试统一入口是 `python tests/run_tests.py`，使用 pytest。现有测试在 `tests/unit/`、`tests/integration/`、`tests/api/`。

---

### 涉及文件（精确）

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 新建 | `tests/unit/test_glossary_models.py` | 数据模型测试 |
| 新建 | `tests/unit/test_glossary_service.py` | Service 核心逻辑测试（含 LLM Mock） |
| 不改 | `tests/run_tests.py` | 已有的 test runner 会自动发现新测试 |

---

### 架构约束

- 使用 `pytest` + `unittest.mock`（不引入新测试依赖）
- LLM 调用必须 Mock，不能依赖真实 API Key
- 缓存测试使用 `tmp_path` fixture（pytest 内置），不污染 `~/.adalflow/`
- 测试标记：`@pytest.mark.unit`

---

### 需参考的现有代码

| 文件 | 参考目的 |
|------|---------|
| `tests/unit/test_all_embedders.py` | 现有单元测试的结构和 import 模式 |
| `tests/unit/__init__.py` | 包结构 |

---

### 实现指引

#### 测试用例清单

**`test_glossary_models.py`**：
1. `test_glossary_term_creation` — 正常创建 GlossaryTerm
2. `test_glossary_term_optional_wiki_url` — wikiUrl 为 None 正常
3. `test_glossary_with_stats_creation` — GlossaryWithStats 完整创建
4. `test_glossary_extract_request_creation` — ExtractRequest 模型
5. `test_glossary_index_item_creation` — IndexItem 嵌套模型

**`test_glossary_service.py`**：
1. `test_match_terms_in_content_basic` — 基本匹配："RAG" 在文本中出现 3 次
2. `test_match_terms_in_content_case_insensitive` — "faiss" 匹配 "FAISS"
3. `test_match_terms_in_content_word_boundary` — "API" 不匹配 "RAPID"
4. `test_match_terms_in_content_empty` — 空内容返回全 0
5. `test_parse_llm_json_response_clean` — 干净 JSON 解析
6. `test_parse_llm_json_response_with_markdown` — 带 ````json` 包裹的解析
7. `test_parse_llm_json_response_invalid` — 非法 JSON 返回空列表
8. `test_read_glossary_cache_not_found` — 缓存不存在返回 None
9. `test_write_and_read_glossary_cache` — 写入后读取一致（用 `tmp_path`）
10. `test_get_glossary_with_cache` — Mock LLM，验证首次调用写缓存
11. `test_get_glossary_from_cache` — 验证缓存命中时不调 LLM

#### 边界情况（必须覆盖）
- 空术语列表
- LLM 返回空字符串
- 缓存文件损坏（JSON 语法错误）
- 术语包含正则特殊字符（如 "C++"、".NET"）

---

### 验收标准（可量化）

- [ ] 所有测试通过：`python tests/run_tests.py --unit`
- [ ] 不依赖任何真实 API Key 或网络
- [ ] 测试文件 < 400 行
- [ ] 核心逻辑覆盖率 ≥ 80%（`_match_terms_in_content`、`_parse_llm_json_response`、缓存读写）
- [ ] 无 lint 错误

---

### 禁止事项

- 不要依赖真实 LLM API（必须 Mock）
- 不要在测试中写入 `~/.adalflow/` 真实路径
- 不要修改任何非测试文件

---

## 完成后：Coding Model 汇报模板

每个 Spec 完成后，请按以下格式汇报：

```markdown
## 完成报告: {Spec 编号}

### 改动摘要
| 文件 | 操作 | 行数 |
|------|------|------|
| | | |

### 测试结果
- 单元测试: N pass / 0 fail
- 覆盖率: XX%
- 构建: 通过/失败

### 自检
- [ ] 函数 < 50 行
- [ ] 文件 < 800 行
- [ ] 无硬编码密钥
- [ ] 无深层嵌套 (>4层)
- [ ] 遵循命名约定
- [ ] 未修改 Spec 范围外文件

### 注意事项
{需要 Opus 审查时特别注意的点}
```

---

## 执行顺序总结

```
第 1 步：拿 Spec B-001 → Coding Model 实现 → 你审 → Opus 审查
第 2 步：拿 Spec B-002 → Coding Model 实现 → 你审 → Opus 审查
第 3 步：拿 Spec B-003 → Coding Model 实现 → 你审 → Opus 审查
第 4 步：拿 Spec B-004 → Coding Model 实现 → 你审 → Opus 审查
最后：  全量测试 → 合并
```

每步之间是**掌控点**：你审完 Spec 再给 Coding Model，Coding Model 完成后由 Opus 审查。
