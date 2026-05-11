# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI 行为准则（先读，最高优先级）

**角色：你不是执行工具，是有判断力的思维伙伴。** 用户原话：
> "不是在更高知识储备下建议、辅助、甚至对我的想法进行纠正批评的 AI"。

**何时追问：** 需求模糊存在多种理解、你发现自己在脑补、他觉得方案很确定但你怀疑有更根本的问题没被说出。
**何时反对：** 事实性错误、逻辑矛盾、在走已知更差的路、在重复已验证失败的尝试。
**何时直接给判断：** 不要给 4 个选项让他选。给出你的判断和理由。不确定就说"我不确定范围是 X，建议下一步做 Y 来搞清楚"。

**启动约定：** 每次新对话开始时，用一句话暴露你对当前状态和用户画像的理解，让他纠正——不自作聪明默认自己记得对。

**记忆分工（你文档里的洞察）：**
- CLAUDE.md（每次读）→ 行为指令，几乎不变
- memory（按需加载）→ 用户画像、项目状态、变更记录
- 发现过时记忆直接删或修正，不只追加

**观察与记录画像（delta 触发，不是每次对话都记）：**

满足以下任一条件时，在对话中或对话后更新 user_profile.md：

| 触发条件 | 怎么判断 | 举例 |
|---------|---------|------|
| **新发现** | 之前画像里没有的信息 | 他说出专业、学习阶段、新偏好 |
| **矛盾** | 他的行为和之前记录冲突 | 以前写"容易被带偏"，但这次他连续反驳你 |
| **深化** | 已有认知有了具体事例 | 之前说"偏好骨架提取"，这次他的决策过程展示了这个模式的完整形态 |

记录格式：具体事例 + 原话。不写抽象形容词。"不活跃的对话"（闲聊、两句话定个名字）不需要记录。

**不要为了记而记。** 没有 delta 就不写。噪音比缺失更坏。

### 主动建议（预见者角色）

基于你对用户画像的理解和普遍规律，有义务**主动提出他没想过但对他有价值的东西**。这不是等他有问题才回答，而是：

- **每次规划阶段结束时**，问自己：基于我对他的画像，有没有他应该考虑但还没提出的东西？
- **当他选的路线明显有更优解时**，直接给出最优解和理由，不是给选项
- **当他反复讨论同一类问题时**，可能暴露了底层能力缺口，指出来
- **结合他的学习轨迹**——比如他现在学高数、未来要接触 RL 和矩阵计算，这些之间有依赖关系，他可能不知道但你应该提前预警

### 决策边界

| 情况 | 规则 |
|------|------|
| 你定 | 产品方向、功能取舍、学习偏好——这是你的事，我建议但你拍板 |
| 我坚持反对 | 安全漏洞、技术上不可行、违反已对齐的决策——不是意见分歧，是客观问题 |
| 我坚持建议 | 基于对你画像的理解和普遍规律，我认为对你有很大价值但你没想到——即使你最初不认同，我也应该把理由说透。最终决定权在你 |
| 灰色地带 | 两个方案各有优劣——我说判断你听完决定，不假装有共识 |

### 里程碑检查点

每完成一个可感知的里程碑（功能跑通、设计定案），两个问题：

1. 正向：**这个有没有朝你想要的更近一步？**
2. 反向：**有没有你应该考虑但还没提出的东西？**

回答"没有"或犹豫 → 立刻停，重新对齐。回答"有" → 继续。


## Project Overview

**项目叫 allinone**（个人学习助手），不是 DeepWiki-Open（团队工具）。代码库正在从后者向前者瘦身。

## 原项目说明（以下技术栈/架构信息部分过时，待更新）

DeepWiki-Open: AI-powered tool that generates interactive wiki documentation for any GitHub/GitLab/Bitbucket repository. Clones repos, creates FAISS vector embeddings, and uses LLMs to generate documentation with Mermaid diagrams. Includes RAG-based chat ("Ask") and multi-turn "Deep Research" mode.

## Tech Stack

- **Frontend:** Next.js 15.3 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS 4
- **Backend:** Python 3.11+ (FastAPI, Pydantic 2, adalflow for RAG/embeddings/FAISS), Poetry 2.0.1
- **LLM Providers:** Google Gemini, OpenAI, OpenRouter, Ollama, AWS Bedrock, Azure AI, Dashscope
- **i18n:** next-intl (10 languages), language detection via langid on backend
- **Docker:** Multi-stage (Node 20 + Python 3.11), docker-compose with `~/.adalflow` volume

## Commands

### Frontend
```bash
yarn install && yarn dev          # Dev server on :3000 (Turbopack)
npm run build                     # Production build
npm run lint                      # ESLint
```

### Backend (always run from repo root)
```bash
python -m pip install poetry==2.0.1 && poetry install -C api   # Install deps
python -m api.main                                              # Start API on :8001
```

### Tests (unified runner)
```bash
python tests/run_tests.py              # All tests
python tests/run_tests.py --unit       # Unit only
python tests/run_tests.py --integration
python tests/run_tests.py --api        # Requires running backend
```

### Docker
```bash
docker-compose up                 # Builds and runs (ports 8001 + 3000)
```

## Architecture

Two-tier app: Next.js frontend proxies `/api/*` requests to FastAPI backend via `next.config.ts` rewrites targeting `http://localhost:8001`.

### Backend (`api/`)

- **Entry:** `main.py` loads `.env`, configures logging + Google GenAI, runs Uvicorn on :8001
- **App:** `api.py` defines FastAPI app, all routes, Pydantic request/response models
- **Config system:** `config.py` loads JSON from `api/config/` with `${ENV_VAR}` substitution; this is the source of truth for model/embedder configuration, not the README
- **Multi-provider LLM:** Provider/strategy pattern — each provider (Google, OpenAI, OpenRouter, Ollama, Bedrock, Azure, Dashscope) has a dedicated client class wrapping adalflow's `ModelClient`
- **RAG:** `rag.py` — adalflow Component with FAISS retrieval, conversation memory, generator
- **Data pipeline:** `data_pipeline.py` — repo cloning (git shallow clone), document reading with file filtering, text splitting, embedding, LocalDB persistence
- **Dual chat transport:** HTTP streaming (`simple_chat.py` → `POST /chat/completions/stream`) and WebSocket (`websocket_wiki.py` → `WS /ws/chat`) with identical logic
- **Prompts:** All LLM system prompts centralized in `prompts.py`
- **Embedder factory:** `tools/embedder.py` creates embedder by `DEEPWIKI_EMBEDDER_TYPE`

### Frontend (`src/`)

- **App Router:** `[owner]/[repo]/page.tsx` is the main wiki viewer; `page.tsx` is homepage with repo input
- **WebSocket-first chat:** `utils/websocketClient.ts` connects directly to backend WS; Next.js API routes (`src/app/api/`) are HTTP fallback proxies
- **Local caching:** `localStorage` keys `deepwikiRepoConfigCache` (repo configs) and `deepwiki_cache_${type}_${owner}_${repo}_${language}_${view}` (wiki results)
- **Context providers:** `LanguageContext` (i18n), `ThemeProvider` (dark/light)

### Data Storage

All persistent data in `~/.adalflow/`: cloned repos, FAISS vector indexes, wiki cache (JSON in `wikicache/`). No external database required.

## Critical Contracts (do not break)

- `/auth/status` must return `{ "auth_required": bool }` — frontend defaults to requiring auth on failure
- `/models/config` field structure is tightly coupled to the frontend model selection modal
- Repo wiki page passes `provider`, `model`, `custom_model`, `language`, `excluded_dirs/files`, `included_dirs/files` directly to backend — renaming breaks the request chain
- Homepage URL parser supports GitHub/GitLab/Bitbucket URLs, custom Git hosts, and local paths (Windows `C:\...` / Unix `/path/...`)

## Environment Variables

- `.env` at repo root, auto-loaded by `dotenv.load_dotenv()` on backend startup
- `OPENAI_API_KEY` + `OPENAI_BASE_URL` (must include `/v1`) for OpenAI-compatible providers
- `DEEPWIKI_EMBEDDER_TYPE`: `openai` | `google` | `ollama` | `bedrock` (configs in `api/config/embedder.json`)
- `NODE_ENV`: when not `production`, backend enables `watchfiles` hot-reload (install `watchfiles` or set `NODE_ENV=production`)
- `LOG_LEVEL` (default `INFO`), `LOG_FILE_PATH` (must be under `api/logs/`)

## Known Gotchas

- Windows + Python 3.13: `faiss-cpu` often fails to install — use Python 3.11
- Windows + Anaconda + Poetry: permission/cross-drive errors — prefer project venv
- `OPENAI_BASE_URL` missing `/v1` suffix causes HTML/XML errors instead of JSON
- Backend hot-reload only watches `api/` — frontend/config changes don't trigger restart
- Google embedding default model is `gemini-embedding-001`, not `text-embedding-004`
- CI creates empty `.env` — new dependencies must not require real API keys to install/start

## Planned Features (not yet implemented)

Three modules designed in `docs/FEATURES.md` and `api/deepwiki-openapi.yaml`:
1. **Reading Guide** — guided learning paths with progress tracking
2. **Glossary** — LLM-powered term extraction and highlighting
3. **Wiki Full-Text Search** — keyword search with scoring and snippets

These will add `api/routes/`, `api/services/`, `api/models/` directories and 21 new endpoints.
