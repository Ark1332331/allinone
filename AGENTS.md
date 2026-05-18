## DeepWiki-Open 代理指引

### 共享文档入口

- 进入仓库后，先读 `docs/README.md`，再按其中顺序读 `docs/context.md`、`docs/active/current-focus.md`、`docs/active/handoff.md`、`docs/active/learning-traces.md`。
- 如果 `docs/archive/` 下的历史文档与 `docs/active/`、`docs/specs/` 冲突，优先相信后者。
- `docs/active/handoff.md` 只放当前合同、当前真相和下一步；详细历史更新放到 `docs/archive/handoffs/`。
- `docs/active/learning-traces.md` 是稳定画像之前的原始证据层。不要把单次纠偏直接写成用户画像；先记录证据，待多次验证或用户确认后再提炼。
- 如果同一交互/实现问题连续修错两次，必须暂停补丁，先写清：场景、用户动作、预期、实际、涉及组件/状态、实际事件路径、预期事件路径、最小修改断点和不修改范围。
- 重要代码或产品变更结束时，必须同步更新对应文档；如果只是历史流水，归档而不是继续加厚 handoff。

只记录本仓库里代理最容易猜错或踩坑的事实。

### 入口与边界

- 后端在 `api/`，FastAPI 入口是 `api/main.py`，应用对象在 `api/api.py` 的 `app`。
- 前端在 `src/`，Next.js App Router；首页是 `src/app/page.tsx`，Repo Wiki 页是 `src/app/[owner]/[repo]/page.tsx`。
- 后端行为的真实来源是 `api/config/*.json` + 环境变量，经 `api/config.py` 组装为 `configs`；配置冲突时优先信这个，不优先信 README 描述。

### 本地运行

- 后端依赖必须从仓库根目录安装：`python -m pip install poetry==2.0.1 && poetry install -C api`
- 后端启动也必须从仓库根目录：`python -m api.main`
- `api/pyproject.toml` 要求 `python ^3.11`；Windows 上尽量不要用 Python 3.13 跑后端，`faiss-cpu` 常装不上。
- 前端开发：`yarn install` 后 `yarn dev`；`package.json` 已固定 `yarn@1.22.22`，但 `npm install && npm run dev` 也能工作。
- 本地浏览器应访问 `http://localhost:3000`，不要直接访问后端端口；前端依赖 `/api/...` 代理。

### 开发环境坑点

- `api/main.py` 在 `NODE_ENV != 'production'` 时启用 `watchfiles` 热重载；若缺包会直接启动失败，装 `watchfiles` 或设 `NODE_ENV=production`。
- 热重载只监听 `api/`；改前端或根目录配置不会触发后端自动重启。
- Windows + Anaconda 环境常在 Poetry 升降级包时卡在权限/跨盘卸载错误；优先使用项目自己的 venv。
- Poetry 默认会自己建环境；如需把依赖装进当前 venv，先执行 `poetry config virtualenvs.create false`。

### 环境变量与模型配置

- 根目录 `.env` 会在后端启动时被 `dotenv.load_dotenv()` 自动加载；CI 只会创建空 `.env`，不能要求真实 key 才能启动。
- 生成模型走 provider/model 选择，后端通过 `api/config.get_model_config(provider, model)` 决定具体 client。
- OpenAI 兼容接口靠 `OPENAI_API_KEY` + `OPENAI_BASE_URL`；`OPENAI_BASE_URL` 通常必须带 `/v1`，否则常见症状是返回 HTML/XML 错误页而不是 JSON。
- 嵌入 provider 由 `DEEPWIKI_EMBEDDER_TYPE` 控制，支持 `openai` / `google` / `ollama` / `bedrock`，配置定义在 `api/config/embedder.json`。
- 本地 embedding 最顺的路径是 `DEEPWIKI_EMBEDDER_TYPE=ollama`；默认模型是 `nomic-embed-text`。
- Google embedding 默认模型是 `gemini-embedding-001`，非 README 提到的 `text-embedding-004`。

### 前后端契约（不要破坏）

- `/auth/status` 必须继续返回 `{ "auth_required": bool }`；首页请求失败时会默认视为需要认证。
- `/models/config` 的字段层级被前端模型选择弹窗严格依赖。
- Repo Wiki 页会把 `provider`、`model`、`custom_model`、`language`、`excluded_dirs/files`、`included_dirs/files` 直接透传到后端；改字段名会破坏现有请求链路。

### 仓库输入与过滤

- 首页支持 GitHub/GitLab/Bitbucket URL、自定义 Git 托管 URL、本地路径（Windows `C:\...` / Unix `/path/...`）。改 URL 解析逻辑时要保兼容。
- 默认过滤规则在 `api/config.py` 的 `DEFAULT_EXCLUDED_DIRS` / `DEFAULT_EXCLUDED_FILES`，可被 `api/config/repo.json` 覆盖；过滤字段也可由前端透传覆盖。

### 数据存储与缓存

- 默认不需要 MySQL/Postgres/Redis 之类外部数据库。
- 后端数据目录在 `~/.adalflow`：仓库克隆、FAISS 向量索引、Wiki 缓存都落这里。
- 前端本地缓存 key：Repo 配置用 `deepwikiRepoConfigCache`；生成 Wiki 结果用 `deepwiki_cache_${type}_${owner}_${repo}_${language}_${view}`。

### 日志配置

- `LOG_LEVEL` 控制日志级别，默认 `INFO`；`LOG_FILE_PATH` 指定日志文件路径，默认 `api/logs/application.log`。
- `LOG_FILE_PATH` 必须在 `api/logs` 目录下，否则会被拒绝（防止路径遍历）。

### 测试

- 统一测试入口是 `python tests/run_tests.py`，不要优先猜 `pytest` 命令。
- 分类测试：`--unit`、`--integration`、`--api`。
- `tests/run_tests.py` 会先尝试加载根目录 `.env`，只警告缺失的 key，不强制失败。
- API 测试依赖运行中的后端；需要时先从仓库根跑 `python -m api.main`。

### CI / 构建

- CI workflow 在 `.github/workflows/docker-build-push.yml`，构建前会 `touch .env`；新增强依赖时必须在空密钥环境下也能完成安装与启动。
- Docker 构建上下文是仓库根，不能假定后端单独从 `api/` 目录构建。

### 已验证的常见故障

- `ModuleNotFoundError: faiss`：多半是 Python 版本不对或 wheel 没装上，优先换 Python 3.11。
- `No valid XML found in response`：通常不是仓库 URL 问题，而是所谓 OpenAI 兼容接口返回了非 JSON 内容，先检查 `OPENAI_BASE_URL` 和鉴权。
- Mermaid 渲染失败常见于 LLM 把整张 flowchart 写成单行，或把额外说明/系统提示混进代码块；前端 Mermaid 组件已有一些容错，但不要依赖它兜所有非法图。

### 新功能规划（参考 `deepwiki-open方案.md`）

项目计划新增三个功能模块，后端代码结构如下：
- `api/routes/` - 路由层：`reading_guide.py`、`glossary.py`、`search.py`
- `api/services/` - 业务逻辑层：对应三个服务的核心算法
- `api/models/` - Pydantic 模型：`reading_guide.py`、`glossary.py`、`search.py`

新增功能的缓存目录：
- 阅读指南：`~/.adalflow/reading_guides/`
- 阅读进度：`~/.adalflow/reading_progress/`
- 术语词典：`~/.adalflow/glossary/`

术语识别采用 LLM 动态识别方案，不使用静态词典；首次调用时触发 LLM 抽取，结果缓存到本地。

API 规范见 `api/deepwiki-openapi.yaml`，新增 21 个端点（阅读指南 4 个、术语 3 个、搜索 3 个）。
