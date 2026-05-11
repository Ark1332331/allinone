# B-001 变更计划：Pydantic 数据模型 + 目录脚手架

> **变更类型**：新建模块  
> **优先级**：P0（后续B-002/B-003/B-004的依赖）  
> **负责人**：后端B（用户）→ 由Coding Model执行

---

## 📋 任务概览

为术语功能创建核心数据结构和项目脚手架。这是整个术语功能的**基础层**，没有业务逻辑，只定义数据模型。

### 为什么要先做B-001？
- B-002（服务）需要导入这些模型来定义函数返回类型
- B-003（路由）需要这些模型来标注`response_model`
- B-004（测试）需要这些模型来Mock数据
- **顺序严格**：B-001 → B-002 → B-003 → B-004，不能乱序

---

## 🗂️ 涉及文件清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| **新建** | `api/models/__init__.py` | Python包初始化 |
| **新建** | `api/models/glossary.py` | 术语功能全部数据模型 |
| **新建** | `api/services/__init__.py` | Python包初始化 |
| **新建** | `api/routes/__init__.py` | Python包初始化 |
| **不碰** | `api/api.py` | 本Spec不改，B-003时才改 |

**核心文件**：`api/models/glossary.py`（8个Pydantic模型）

---

## 🏗️ 实现计划

### Step 1: 创建目录结构
```bash
api/
├── models/          # 新建
│   ├── __init__.py  # 空文件
│   └── glossary.py  # 8个模型定义
├── services/        # 新建
│   └── __init__.py  # 空文件
└── routes/          # 新建
    └── __init__.py  # 空文件
```

### Step 2: 定义8个Pydantic模型

在 `api/models/glossary.py` 中定义：

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# 1️⃣ GlossaryTerm - 单个术语
class GlossaryTerm(BaseModel):
    term: str                       # 术语原文（英文），如 "Backtracking"
    label: str                      # 中文释义，如 "回溯"
    wikiUrl: Optional[str] = None   # Wikipedia链接（可选）
    googleQuery: str                # Google搜索关键词，如 "Backtracking algorithm"
    description: str                # 简短定义，如 "一种搜索算法"

# 2️⃣ GlossaryWithStats - 术语列表 + 统计信息
class GlossaryWithStats(BaseModel):
    terms: List[GlossaryTerm]       # 所有术语
    statistics: Dict[str, int]      # 术语出现频率统计，如 {"RAG": 15, "FAISS": 8}
    cached: bool                    # 是否来自缓存（True=读的缓存文件，False=刚从LLM抽取）

# 3️⃣ GlossaryOccurrence - 术语在某页的出现记录
class GlossaryOccurrence(BaseModel):
    pageId: str                    # 页面ID，注意：驼峰（与OpenAPI一致）
    pageTitle: str                 # 页面标题
    count: int                     # 出现次数

# 4️⃣ GlossaryIndexItem - 术语 + 其所有出现位置
class GlossaryIndexItem(BaseModel):
    term: GlossaryTerm
    occurrences: List[GlossaryOccurrence]

# 5️⃣ GlossaryIndexResponse - 术语索引页的完整响应
class GlossaryIndexResponse(BaseModel):
    terms: List[GlossaryIndexItem]
    totalTerms: int

# 6️⃣ GlossaryExtractRequest - 单页抽取请求
class GlossaryExtractRequest(BaseModel):
    page_id: str
    page_content: str
    existing_terms: Optional[List[GlossaryTerm]] = None

# 7️⃣ GlossaryExtractResponse - 单页抽取的响应
class GlossaryExtractResponse(BaseModel):
    extracted_terms: List[GlossaryTerm]
    merged_terms: List[GlossaryTerm]

# 8️⃣ GlossaryRefreshResponse - 强制刷新后的响应
class GlossaryRefreshResponse(BaseModel):
    terms: List[GlossaryTerm]
    statistics: Dict[str, int]
    message: str = "术语列表已更新"
```

### Step 3: 验证Import
确保以下import都能成功：
```python
from api.models.glossary import (
    GlossaryTerm, GlossaryWithStats, GlossaryOccurrence,
    GlossaryIndexItem, GlossaryIndexResponse,
    GlossaryExtractRequest, GlossaryExtractResponse,
    GlossaryRefreshResponse
)
```

---

## ✅ 验收标准

- [ ] `api/models/`、`api/services/`、`api/routes/` 三个目录存在
- [ ] 各目录有 `__init__.py` 文件
- [ ] `api/models/glossary.py` 包含全部8个模型类
- [ ] 所有模型继承 `pydantic.BaseModel`
- [ ] 所有字段名与OpenAPI规范一致（注意驼峰）
- [ ] 可以成功 import 所有模型
- [ ] 无 lint 错误
- [ ] 文件 < 200 行

---

## 🚫 禁止事项

- ❌ 不要在模型文件中写任何业务逻辑
- ❌ 不要调用LLM或文件I/O
- ❌ 不要修改 `api/api.py`
- ❌ 不要引入新的第三方依赖（只用pydantic）
- ❌ 不要添加除了`models/`、`services/`、`routes/`以外的目录

---

## 🔑 关键决策点

### 为什么这8个模型？
这8个模型对应**术语功能的4个API端点**，以及**内部服务的功能划分**：

| API端点 | 涉及模型 |
|--------|--------|
| `GET /wiki/glossary` | GlossaryWithStats |
| `POST /wiki/glossary/extract` | GlossaryExtractRequest + GlossaryExtractResponse |
| `GET /wiki/glossary/index` | GlossaryIndexResponse |
| `POST /wiki/glossary/refresh` | GlossaryRefreshResponse |

### 为什么GlossaryOccurrence用pageId/pageTitle而不是page_id/page_title？
OpenAPI规范中定义的字段名是驼峰式 `pageId` / `pageTitle`，遵循REST API的标准约定。Python内部可以使用 snake_case 命名 + Pydantic `alias` 映射，但对外 JSON 序列化必须对齐 OpenAPI。

### 为什么GlossaryWithStats用statistics（Dict）而不是total_terms（int）？
OpenAPI 定义了 `statistics: Dict[str, int]` 作为术语出现频率的完整统计（如 `{"RAG": 15, "FAISS": 8}`），不是简单的总数。这是对外契约，B-002 的 `_match_terms_in_content` 需要直接产出这个结构。

### 为什么GlossaryRefreshResponse用statistics而不是updated_at？
OpenAPI 的 refresh 响应结构与 get 对齐，都返回 `statistics`。用 `updated_at` 是 Plan 私自引入的简化，不符合契约。如需时间戳可在 B-002 Service 层通过缓存文件 mtime 判断。

### 为什么GlossaryExtractResponse有两个术语列表？
- `extracted_terms`：本页新识别的术语
- `merged_terms`：本页新识别 + 已有术语的合并结果（供B-003返回給前端）

---

## 📝 完成后的汇报形式

实现完毕后，Coding Model会提交：

```
## B-001 完成报告

### 改动摘要
- 新建 api/models/__init__.py
- 新建 api/models/glossary.py (共XX行)
- 新建 api/services/__init__.py
- 新建 api/routes/__init__.py

### 验证结果
- [x] 所有 import 成功
- [x] pylint / mypy 无错误

### 下一步
B-002 依赖这些模型开始实现服务层。
```

---

## ⚠️ 与其他功能的隔离

B-001 **完全独立**，不涉及：
- 功能A（阅读指南）的模型
- 功能C（搜索）的模型
- 现有的Wiki caching逻辑
- 前端代码

所以B-001的改动风险很低。

---

## 🔗 前置条件

✅ 无前置条件（B-001是起点）

## 📦 输出物

✅ 4个新建文件（都很小，合计<200行）

## ⏱️ 预计工时

⏱️ ~5-10分钟（只是数据定义）

---

**下一步**：你审视上述计划，确认理解无误后，我会执行B-001的coding。
