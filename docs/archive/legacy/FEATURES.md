# DeepWiki-Open 功能改造方案

> Archived legacy feature document.
> This reflects an earlier DeepWiki-Open phase and is not the current primary product plan for `allinone`.

本文档聚焦于三个新增功能模块的设计与实现，采用"一人一模块"的分工方式。

---

## 功能概览

| 功能 | 目标 | 负责人 | 状态 |
|------|------|--------|------|
| 闯关式阅读指南 | 将Wiki从"自由浏览"升级为"有引导的学习路径" | 后端 A | 规划中 |
| 专有名词高亮 | 在Wiki正文中对技术术语进行高亮，支持跳转搜索 | 后端 B | 规划中 |
| Wiki全文搜索 | 快速定位页面标题、正文内容、文件路径 | 后端 C | 规划中 |
| 前端UI集成 | 三个功能的组件、页面、API调用 | 前端 D | 规划中 |

---

## 项目目录结构（新增部分）

```
deepwiki-open/
├── api/
│   ├── routes/                    # 路由模块（新增）
│   │   ├── __init__.py
│   │   ├── reading_guide.py       # 功能一：阅读指南接口
│   │   ├── glossary.py            # 功能二：术语接口
│   │   └── search.py              # 功能三：搜索接口
│   ├── services/                  # 业务逻辑层（新增）
│   │   ├── __init__.py
│   │   ├── reading_guide_service.py
│   │   ├── glossary_service.py
│   │   └── search_service.py
│   ├── models/                    # Pydantic 模型（新增）
│   │   ├── __init__.py
│   │   ├── reading_guide.py
│   │   ├── glossary.py
│   │   └── search.py
│   └── api.py                     # 主应用（修改：注册新路由）
├── src/
│   ├── app/[owner]/[repo]/
│   │   ├── page.tsx               # 主页面（修改）
│   │   └── glossary/
│   │       └── page.tsx           # 术语索引页（新增）
│   ├── components/
│   │   ├── WikiTreeView.tsx       # 左侧导航树（修改）
│   │   ├── Markdown.tsx           # Markdown 渲染（修改）
│   │   ├── ReadingGuide.tsx       # 阅读指南组件（新增）
│   │   ├── ReadingGuideLevel.tsx  # 关卡卡片（新增）
│   │   ├── GlossaryTerm.tsx       # 术语高亮组件（新增）
│   │   ├── GlossaryTooltip.tsx    # 术语提示（新增）
│   │   ├── GlossaryMenu.tsx       # 术语菜单（新增）
│   │   ├── WikiSearch.tsx         # 搜索组件（新增）
│   │   ├── WikiSearchInput.tsx    # 搜索输入（新增）
│   │   └── WikiSearchResult.tsx   # 搜索结果（新增）
│   ├── hooks/
│   │   ├── useReadingGuide.ts     # 阅读指南 Hook（新增）
│   │   └── useGlossary.ts         # 术语 Hook（新增）
│   ├── lib/api/
│   │   ├── readingGuide.ts        # 阅读指南 API（新增）
│   │   ├── glossary.ts            # 术语 API（新增）
│   │   └── search.ts              # 搜索 API（新增）
│   └── types/
│       ├── readingGuide.ts        # 阅读指南类型（新增）
│       ├── glossary.ts            # 术语类型（新增）
│       └── search.ts              # 搜索类型（新增）
└── api/deepwiki-openapi.yaml      # OpenAPI 规范（已更新）
```

---

## 功能一：闯关式代码阅读指南

**负责人：后端 A**

### 产品目标

将 Wiki 从"自由浏览"升级为"有引导的学习路径"：
- 知道先读哪一页、为什么先读
- 看完后知道下一步读什么
- 追踪当前阅读进度

### 数据模型

```python
# api/models/reading_guide.py

class ReadingGuideLevel(BaseModel):
    id: str                    # level-1, level-2, ...
    title: str                 # "第一关：项目概览"
    goal: str                  # 学习目标
    pages: List[str]           # 页面ID列表
    tips: Optional[List[str]]  # 阅读提示

class ReadingGuide(BaseModel):
    id: str                    # {repo_type}_{owner}_{repo}_{language}
    title: str                 # 阅读指南标题
    levels: List[ReadingGuideLevel]
    created_at: int            # Unix时间戳

class ReadingProgress(BaseModel):
    guide_id: str
    completed_page_ids: List[str]
    current_level_id: Optional[str]
    updated_at: int
```

### 关卡规则

| 关卡 | 标题 | 目标 | 关键词 |
|------|------|------|--------|
| level-1 | 第一关：项目概览 | 了解整体架构 | overview, introduction, readme, getting started |
| level-2 | 第二关：基础使用 | 掌握基本用法 | usage, tutorial, example, guide |
| level-3 | 第三关：API参考 | 理解核心API | api, reference, interface, method |
| level-4 | 第四关：进阶主题 | 深入设计原理 | architecture, design, advanced |
| level-5 | 第五关：贡献指南 | 参与项目贡献 | contribute, development, testing |

### 页面分配算法

```python
def assign_pages_to_levels(pages: List[WikiPage]) -> List[ReadingGuideLevel]:
    """
    1. 按 importance 排序（high → medium → low）
    2. 根据标题关键词匹配分配到对应关卡
    3. 每关最多5页
    4. 未匹配的页面放入最合适的关卡
    """
    pass
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/wiki/reading-guide` | 生成阅读指南 |
| GET | `/wiki/reading-guide/{id}` | 获取阅读指南 |
| GET | `/wiki/reading-progress` | 获取阅读进度 |
| PUT | `/wiki/reading-progress` | 更新阅读进度 |

### 缓存目录

```
~/.adalflow/
├── reading_guides/
│   └── {repo_type}_{owner}_{repo}_{language}.json
└── reading_progress/
    └── {repo_type}_{owner}_{repo}_{language}.json
```

### 交付物

- [ ] `api/models/reading_guide.py` - Pydantic 模型
- [ ] `api/services/reading_guide_service.py` - 生成与缓存服务
- [ ] `api/routes/reading_guide.py` - FastAPI 路由
- [ ] `api/api.py` - 注册路由（修改）
- [ ] 单元测试

---

## 功能二：专有名词高亮与术语检索

**负责人：后端 B**

### 产品目标

在 Wiki 正文中对技术术语进行高亮，点击后可跳转维基百科或 Google 搜索。

### 核心设计

**术语来源**：完全依赖 LLM 动态识别，不使用静态词典。

**工作流程**：
1. 用户访问 Wiki 页面时，前端调用术语接口
2. 后端使用 LLM 分析页面内容，抽取专业术语
3. LLM 同时生成术语的中文释义、Wikipedia 链接建议、Google 搜索关键词
4. 结果缓存到 `~/.adalflow/glossary/{project_key}.json`
5. 前端根据术语列表渲染高亮组件

### 数据模型

```python
# api/models/glossary.py

class GlossaryTerm(BaseModel):
    term: str              # 术语原文（英文）
    label: str             # 中文释义
    wikiUrl: Optional[str] # Wikipedia链接
    googleQuery: str       # Google搜索关键词
    description: str       # 简短定义

class GlossaryWithStats(BaseModel):
    terms: List[GlossaryTerm]
    statistics: Dict[str, int]  # 术语出现频率统计
    cached: bool                # 是否来自缓存

class GlossaryOccurrence(BaseModel):
    page_id: str
    page_title: str
    count: int

class GlossaryIndexItem(BaseModel):
    term: GlossaryTerm
    occurrences: List[GlossaryOccurrence]
```

### LLM Prompt 设计要点

```
从技术文档中识别专业术语和概念：
1. 过滤常见通用词汇（如"功能"、"方法"）
2. 返回术语的标准写法（区分大小写）
3. 提供中文释义和简短定义
4. 生成适合 Google 搜索的关键词组合

输出格式：
{
  "terms": [
    {
      "term": "RAG",
      "label": "检索增强生成",
      "wikiUrl": "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
      "googleQuery": "RAG LLM retrieval augmented generation",
      "description": "一种结合检索和生成的AI架构"
    }
  ]
}
```

### 核心算法

```python
def extract_terms_with_llm(content: str) -> List[GlossaryTerm]:
    """调用 LLM 分析内容，抽取术语"""
    pass

def match_terms_in_content(content: str, terms: List[str]) -> Dict[str, int]:
    """正则匹配统计术语出现次数"""
    # 使用正则表达式 + 单词边界（\b）
    # 忽略大小写匹配
    pass
```

### 缓存策略

- 首次请求时触发 LLM 抽取
- 结果缓存到本地文件
- Wiki 重新生成时自动失效缓存

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/wiki/glossary` | 获取术语词典（首次调用自动触发LLM抽取） |
| POST | `/wiki/glossary/refresh` | 强制重新抽取术语（Wiki更新后调用） |
| GET | `/wiki/glossary/index` | 获取术语索引页数据 |

### 与静态词典方案的区别

| 对比项 | 静态词典方案 | LLM动态识别方案 |
|--------|-------------|-----------------|
| 术语来源 | 预定义的 JSON 文件 | LLM 分析页面内容 |
| 术语准确性 | 依赖词典完整性 | 更贴合项目实际 |
| 维护成本 | 需要持续更新词典 | 无需维护 |
| 响应速度 | 直接读取，极快 | 首次较慢（LLM调用） |
| 项目适配性 | 通用术语 | 项目特定术语也能识别 |

### 交付物

- [ ] `api/models/glossary.py` - Pydantic 模型
- [ ] `api/services/glossary_service.py` - LLM抽取与统计服务
- [ ] `api/routes/glossary.py` - FastAPI 路由
- [ ] `api/api.py` - 注册路由（修改）
- [ ] 单元测试（含 LLM Mock）

---

## 功能三：Wiki 全文搜索

**负责人：后端 C**

### 产品目标

提供全文搜索能力，快速定位页面标题、正文内容、文件路径。

### 数据模型

```python
# api/models/search.py

from enum import Enum

class SearchMode(str, Enum):
    all = "all"           # 标题 + 正文 + 文件路径
    title = "title"       # 仅标题
    content = "content"   # 仅正文
    filePath = "filePath" # 仅文件路径

class WikiSearchResult(BaseModel):
    pageId: str
    title: str
    snippet: str           # 摘要（关键词用**高亮）
    matchedField: str      # 匹配字段类型
    score: float           # 匹配得分
    highlights: Optional[List[Dict[str, int]]]

class WikiSearchResponse(BaseModel):
    results: List[WikiSearchResult]
    total: int
    query: str
    mode: str
    pagination: Dict[str, Any]  # {offset, limit, hasMore}

class SearchHistoryItem(BaseModel):
    query: str
    timestamp: int  # Unix时间戳（毫秒）
```

### 搜索模式

| 模式 | 说明 | 搜索范围 |
|------|------|----------|
| all | 全局搜索 | 标题 + 正文 + 文件路径 |
| title | 仅标题 | 页面标题 |
| content | 仅正文 | 页面内容 |
| filePath | 仅文件路径 | 源文件路径 |

### 评分规则

| 匹配类型 | 得分 |
|----------|------|
| 标题完全匹配 | +100 |
| 标题包含关键词 | +60 |
| 文件路径包含 | +40 |
| 正文包含（首次） | +20 |
| 多次命中（每次） | +10 |

### 核心算法

```python
def search_wiki(
    query: str,
    pages: List[WikiPage],
    mode: SearchMode = SearchMode.all,
    limit: int = 20,
    offset: int = 0
) -> WikiSearchResponse:
    """
    搜索流程：
    1. 遍历所有页面
    2. 根据模式计算匹配得分
    3. 按得分倒序排列
    4. 生成摘要（关键词用 ** 高亮）
    """
    pass

def generate_snippet(content: str, keyword: str, context_chars: int = 50) -> str:
    """
    摘要生成：
    1. 定位第一个匹配位置
    2. 前后各取50字符
    3. 用 ** 包裹关键词
    """
    pass
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/wiki/search` | Wiki全文搜索 |
| GET | `/wiki/search/history` | 获取搜索历史 |
| DELETE | `/wiki/search/history` | 清空搜索历史 |

### 交付物

- [ ] `api/models/search.py` - Pydantic 模型
- [ ] `api/services/search_service.py` - 搜索与评分服务
- [ ] `api/routes/search.py` - FastAPI 路由
- [ ] `api/api.py` - 注册路由（修改）
- [ ] 单元测试

---

## 功能四：前端 UI 实现

**负责人：前端 D**

### 职责范围

负责三个功能的所有前端实现：
- 组件开发
- 页面集成
- API 调用
- 类型定义

### 前端类型定义

```typescript
// src/types/readingGuide.ts
interface ReadingGuideLevel {
  id: string;
  title: string;
  goal: string;
  pages: string[];
  tips?: string[];
}

interface ReadingGuide {
  id: string;
  title: string;
  levels: ReadingGuideLevel[];
  created_at: number;
}

interface ReadingProgress {
  guide_id: string;
  completed_page_ids: string[];
  current_level_id?: string;
  updated_at: number;
}

// src/types/glossary.ts
interface GlossaryTerm {
  term: string;
  label: string;
  wikiUrl?: string;
  googleQuery: string;
  description: string;
}

interface GlossaryWithStats {
  terms: GlossaryTerm[];
  statistics: Record<string, number>;
  cached: boolean;
}

// src/types/search.ts
type SearchMode = 'all' | 'title' | 'content' | 'filePath';

interface WikiSearchResult {
  pageId: string;
  title: string;
  snippet: string;
  matchedField: string;
  score: number;
  highlights?: Array<{ start: number; end: number }>;
}

interface WikiSearchResponse {
  results: WikiSearchResult[];
  total: number;
  query: string;
  mode: string;
  pagination: { offset: number; limit: number; hasMore: boolean };
}
```

### 组件清单

| 功能 | 组件 | 职责 |
|------|------|------|
| 阅读指南 | `ReadingGuide.tsx` | 主容器，展示关卡列表 |
| | `ReadingGuideLevel.tsx` | 单个关卡卡片 |
| | `WikiTreeNodeBadge.tsx` | 节点徽章（序号+完成状态） |
| 术语高亮 | `GlossaryTerm.tsx` | 高亮术语，hover显示tooltip |
| | `GlossaryTooltip.tsx` | 术语提示框 |
| | `GlossaryMenu.tsx` | 操作菜单（Wikipedia/Google跳转） |
| 搜索 | `WikiSearch.tsx` | 主容器，搜索输入+结果列表 |
| | `WikiSearchInput.tsx` | 搜索输入框（防抖） |
| | `WikiSearchResult.tsx` | 搜索结果项（高亮关键词） |

### 需修改的现有文件

| 文件 | 修改内容 |
|------|----------|
| `src/app/[owner]/[repo]/page.tsx` | 集成阅读指南侧边栏、搜索组件 |
| `src/components/WikiTreeView.tsx` | 添加"普通导航/学习路线"切换Tab、搜索栏 |
| `src/components/Markdown.tsx` | 注入术语高亮组件 |

### API 调用文件

```typescript
// src/lib/api/readingGuide.ts
export async function generateReadingGuide(request: ReadingGuideGenerateRequest): Promise<ReadingGuide>
export async function getReadingGuide(id: string): Promise<ReadingGuide>
export async function getReadingProgress(params: ProgressQueryParams): Promise<ReadingProgress>
export async function updateReadingProgress(request: ReadingProgressUpdateRequest): Promise<ReadingProgress>

// src/lib/api/glossary.ts
export async function getGlossary(params: GlossaryQueryParams): Promise<GlossaryWithStats>
export async function refreshGlossary(params: GlossaryQueryParams): Promise<GlossaryWithStats>
export async function getGlossaryIndex(params: GlossaryQueryParams): Promise<GlossaryIndexResponse>

// src/lib/api/search.ts
export async function searchWiki(params: SearchQueryParams): Promise<WikiSearchResponse>
export async function getSearchHistory(params: HistoryQueryParams): Promise<SearchHistoryResponse>
export async function clearSearchHistory(params: HistoryQueryParams): Promise<void>
```

### 交付物

- [ ] 类型定义文件 (`src/types/*.ts`)
- [ ] API 调用函数 (`src/lib/api/*.ts`)
- [ ] 组件实现 (`src/components/*.tsx`)
- [ ] 页面集成 (`src/app/[owner]/[repo]/page.tsx`)
- [ ] 术语索引页 (`src/app/[owner]/[repo]/glossary/page.tsx`)

---

## 协作流程

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   后端 A    │   │   后端 B    │   │   后端 C    │
│  阅读指南   │   │  术语高亮   │   │  Wiki搜索   │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
                 ┌─────────────┐
                 │   前端 D    │
                 │   UI 集成   │
                 └─────────────┘
```

**依赖关系**：
1. 后端 A/B/C 各自独立开发，无相互依赖
2. 前端 D 等待后端接口完成后进行联调
3. 可并行开发，后端完成后即可开始前端联调

---

## 里程碑

| 阶段 | 时间 | 后端 A | 后端 B | 后端 C | 前端 D |
|------|------|--------|--------|--------|--------|
| 第1周 | Week 1 | 模型+服务 | 模型+服务 | 模型+服务 | 类型定义 |
| 第2周 | Week 2 | 路由+测试 | 路由+测试 | 路由+测试 | API函数 |
| 第3周 | Week 3 | 文档 | 文档 | 文档 | 组件开发 |
| 第4周 | Week 4 | - | - | - | 页面集成 |
| 第5周 | Week 5 | 联调修复 | 联调修复 | 联调修复 | 联调测试 |

---

## 后端路由注册

在 `api/api.py` 中添加：

```python
# 导入新路由模块
from api.routes import reading_guide, glossary, search

# 注册路由
app.include_router(reading_guide.router, prefix="/wiki", tags=["Reading Guide"])
app.include_router(glossary.router, prefix="/wiki", tags=["Glossary"])
app.include_router(search.router, prefix="/wiki", tags=["Wiki Search"])
```

---

## OpenAPI 文档

所有接口规范已定义在 `api/deepwiki-openapi.yaml`，包含：
- 21 个 API 端点
- 13 个 Schema 定义
- 完整的请求/响应示例

---

## 缓存目录汇总

```
~/.adalflow/
├── repos/                    # 克隆的仓库（已有）
├── databases/                # FAISS向量索引（已有）
├── wikicache/                # Wiki缓存（已有）
├── reading_guides/           # 阅读指南（新增）
├── reading_progress/         # 阅读进度（新增）
└── glossary/                 # 术语词典（新增）
```

---

## 实现优先级建议

### 第一阶段：后端核心（并行开发）

1. **功能三：Wiki搜索** - 最简单，无外部依赖，纯本地计算
2. **功能一：阅读指南** - 中等复杂度，规则化算法
3. **功能二：术语识别** - 最复杂，需要LLM集成

### 第二阶段：前端集成

等待后端API完成后开始。

---

## 技术要点总结

| 功能 | 后端核心 | 前端核心 |
|------|----------|----------|
| 阅读指南 | 规则化页面分组算法 | 关卡展示、进度追踪 |
| 术语高亮 | LLM动态识别 + 正则匹配统计 | 术语组件渲染、高亮显示 |
| Wiki搜索 | 评分排序算法 | 搜索框、结果列表、高亮 |
