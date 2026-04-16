# Quick Start - 功能开发指南

本文档提供快速开始开发的步骤，适用于接手三个新功能模块的开发者。

---

## 环境准备

### 1. 后端环境

```bash

# 安装 Python 依赖（必须从仓库根目录）
python -m pip install poetry==2.0.1
poetry install -C api

# 创建 .env 文件
echo "GOOGLE_API_KEY=your_key" > .env
echo "OPENAI_API_KEY=your_key" >> .env

# 启动后端（必须从仓库根目录）
python -m api.main
```

### 2. 前端环境

```bash
# 安装依赖
yarn install
# 或
npm install

# 启动开发服务器
yarn dev
# 或
npm run dev
```

### 3. 访问应用

浏览器打开 `http://localhost:3000`

---

## 开发新功能

### 创建新目录

```bash
# 创建后端目录
mkdir -p api/routes api/services api/models

# 创建前端目录
mkdir -p src/lib/api src/types
```

### 功能开发流程

以 **Wiki搜索** 为例：

#### Step 1: 定义 Pydantic 模型

```bash
# 创建文件
touch api/models/__init__.py
touch api/models/search.py
```

```python
# api/models/search.py
from pydantic import BaseModel
from enum import Enum
from typing import List, Dict, Any, Optional

class SearchMode(str, Enum):
    all = "all"
    title = "title"
    content = "content"
    filePath = "filePath"

class WikiSearchResult(BaseModel):
    pageId: str
    title: str
    snippet: str
    matchedField: str
    score: float
    highlights: Optional[List[Dict[str, int]]] = None

class WikiSearchResponse(BaseModel):
    results: List[WikiSearchResult]
    total: int
    query: str
    mode: str
    pagination: Dict[str, Any]
```

#### Step 2: 实现服务逻辑

```bash
touch api/services/__init__.py
touch api/services/search_service.py
```

```python
# api/services/search_service.py
import os
import json
from typing import List
from api.models.search import SearchMode, WikiSearchResult, WikiSearchResponse

def search_in_pages(
    query: str,
    pages: List[dict],
    mode: SearchMode = SearchMode.all,
    limit: int = 20,
    offset: int = 0
) -> WikiSearchResponse:
    """
    在Wiki页面中搜索关键词
    
    Args:
        query: 搜索关键词
        pages: Wiki页面列表
        mode: 搜索模式
        limit: 返回结果数量
        offset: 分页偏移
    
    Returns:
        WikiSearchResponse: 搜索结果
    """
    results = []
    query_lower = query.lower()
    
    for page in pages:
        score = 0
        matched_field = None
        
        # 标题匹配
        if mode in [SearchMode.all, SearchMode.title]:
            title_lower = page.get("title", "").lower()
            if title_lower == query_lower:
                score += 100
                matched_field = "title"
            elif query_lower in title_lower:
                score += 60
                matched_field = "title"
        
        # 文件路径匹配
        if mode in [SearchMode.all, SearchMode.filePath]:
            for path in page.get("filePaths", []):
                if query_lower in path.lower():
                    score += 40
                    matched_field = "filePath"
                    break
        
        # 内容匹配
        if mode in [SearchMode.all, SearchMode.content]:
            content = page.get("content", "")
            count = content.lower().count(query_lower)
            if count > 0:
                score += 20 + (count - 1) * 10
                matched_field = "content"
        
        if score > 0:
            results.append({
                "pageId": page["id"],
                "title": page["title"],
                "snippet": generate_snippet(page.get("content", ""), query),
                "matchedField": matched_field,
                "score": score
            })
    
    # 按得分排序
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return WikiSearchResponse(
        results=results[offset:offset + limit],
        total=len(results),
        query=query,
        mode=mode.value,
        pagination={"offset": offset, "limit": limit, "hasMore": offset + limit < len(results)}
    )

def generate_snippet(content: str, keyword: str, context_chars: int = 50) -> str:
    """生成带高亮的摘要"""
    idx = content.lower().find(keyword.lower())
    if idx == -1:
        return ""
    
    start = max(0, idx - context_chars)
    end = min(len(content), idx + len(keyword) + context_chars)
    
    snippet = content[start:end]
    # 高亮关键词
    snippet = snippet.replace(
        content[idx:idx + len(keyword)],
        f"**{content[idx:idx + len(keyword)]}**"
    )
    return snippet
```

#### Step 3: 创建路由

```bash
touch api/routes/__init__.py
touch api/routes/search.py
```

```python
# api/routes/search.py
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from api.models.search import SearchMode, WikiSearchResponse
from api.services.search_service import search_in_pages

router = APIRouter()

@router.get("/search", response_model=WikiSearchResponse)
async def search_wiki(
    owner: str = Query(..., description="仓库所有者"),
    repo: str = Query(..., description="仓库名称"),
    repo_type: str = Query(..., description="仓库类型"),
    language: str = Query(..., description="Wiki语言"),
    query: str = Query(..., description="搜索关键词"),
    mode: SearchMode = Query(SearchMode.all, description="搜索模式"),
    limit: int = Query(20, ge=1, le=100, description="结果数量"),
    offset: int = Query(0, ge=0, description="分页偏移")
):
    """
    Wiki全文搜索
    """
    # TODO: 从缓存加载 Wiki 页面
    # pages = load_wiki_cache(owner, repo, repo_type, language)
    
    # return search_in_pages(query, pages, mode, limit, offset)
    
    raise HTTPException(status_code=501, detail="Not implemented yet")
```

#### Step 4: 注册路由

```python
# api/api.py（在文件末尾添加）

from api.routes import search

app.include_router(search.router, prefix="/wiki", tags=["Wiki Search"])
```

---

## 测试

### 运行后端测试

```bash
# 运行所有测试
python tests/run_tests.py

# 运行单元测试
python tests/run_tests.py --unit

# 运行API测试（需要后端运行中）
python tests/run_tests.py --api
```

### 手动测试 API

```bash
# 启动后端
python -m api.main

# 测试健康检查
curl http://localhost:8001/health

# 测试搜索（实现后）
curl "http://localhost:8001/wiki/search?owner=AsyncFuncAI&repo=deepwiki-open&repo_type=github&language=en&query=RAG"
```

---

## 前端开发

### 创建类型定义

```bash
mkdir -p src/types
touch src/types/search.ts
```

```typescript
// src/types/search.ts
export type SearchMode = 'all' | 'title' | 'content' | 'filePath';

export interface WikiSearchResult {
  pageId: string;
  title: string;
  snippet: string;
  matchedField: string;
  score: number;
  highlights?: Array<{ start: number; end: number }>;
}

export interface WikiSearchResponse {
  results: WikiSearchResult[];
  total: number;
  query: string;
  mode: string;
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}
```

### 创建 API 调用

```bash
mkdir -p src/lib/api
touch src/lib/api/search.ts
```

```typescript
// src/lib/api/search.ts
import type { SearchMode, WikiSearchResponse } from '@/types/search';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8001';

export async function searchWiki(params: {
  owner: string;
  repo: string;
  repo_type: string;
  language: string;
  query: string;
  mode?: SearchMode;
  limit?: number;
  offset?: number;
}): Promise<WikiSearchResponse> {
  const searchParams = new URLSearchParams({
    owner: params.owner,
    repo: params.repo,
    repo_type: params.repo_type,
    language: params.language,
    query: params.query,
    mode: params.mode || 'all',
    limit: String(params.limit || 20),
    offset: String(params.offset || 0),
  });

  const response = await fetch(`${API_BASE}/wiki/search?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }
  return response.json();
}
```

### 创建组件

```bash
touch src/components/WikiSearch.tsx
```

```tsx
// src/components/WikiSearch.tsx
'use client';

import { useState } from 'react';
import { searchWiki } from '@/lib/api/search';
import type { WikiSearchResult } from '@/types/search';

interface WikiSearchProps {
  owner: string;
  repo: string;
  repoType: string;
  language: string;
  onPageClick: (pageId: string) => void;
}

export function WikiSearch({ owner, repo, repoType, language, onPageClick }: WikiSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await searchWiki({
        owner,
        repo,
        repo_type: repoType,
        language,
        query,
      });
      setResults(response.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wiki-search">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索 Wiki..."
          className="w-full p-2 border rounded"
        />
      </form>

      {loading && <div className="p-2">搜索中...</div>}

      <ul className="mt-2 space-y-2">
        {results.map((result) => (
          <li
            key={result.pageId}
            onClick={() => onPageClick(result.pageId)}
            className="p-2 hover:bg-gray-100 rounded cursor-pointer"
          >
            <div className="font-medium">{result.title}</div>
            <div
              className="text-sm text-gray-600"
              dangerouslySetInnerHTML={{ __html: result.snippet }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 常见问题

### Q: 后端启动失败 "ModuleNotFoundError: faiss"

A: Python 版本问题，使用 Python 3.11：
```bash
py -3.11 -m pip install poetry==2.0.1
py -3.11 -m poetry install -C api
```

### Q: 前端无法连接后端

A: 检查 `NEXT_PUBLIC_API_BASE` 环境变量，确保指向正确端口。

### Q: 如何调试 API？

A: 使用 FastAPI 自动文档：
```
http://localhost:8001/docs
```

---

## 参考文档

- [完整功能规格](./FEATURES.md)
- [OpenAPI 规范](../api/deepwiki-openapi.yaml)
- [AGENTS.md](../AGENTS.md) - 开发注意事项
