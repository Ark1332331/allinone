# 本地使用

## 目标

让本地验证和日常使用尽量简单，不需要你每次都手动分别启动前端和后端。

## 当前现实

这个项目现在仍然是双进程应用：

- 前端：Next.js，地址 `http://localhost:3000`
- 后端：FastAPI，地址 `http://localhost:8001`

所以当前阶段的目标不是“真正单进程化”，而是“只做一次启动动作就把两边都拉起来”。

## 推荐工作流

### 启动全部服务

在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-start.ps1
```

这个脚本会启动：

- 后端：`python -m api.main`
- 前端：`npx next dev --turbopack --port 3000`

同时会把状态和日志写到：

- `.codex/local/dev-processes.json`
- `.codex/local/backend-8001.log`
- `.codex/local/frontend-3000.log`

### 端口冲突时怎么处理

这个项目现在默认使用：

- 前端：`3000`
- 后端：`8001`

如果你本机上已经有别的项目占用了这些端口，不要硬记，不要手动乱猜。
直接在启动前指定端口：

```powershell
$env:FRONTEND_PORT=3001
$env:BACKEND_PORT=8002
powershell -ExecutionPolicy Bypass -File .\scripts\dev-start.ps1
```

启动脚本现在会先检查端口是否被占用；如果被占用，会直接报错提醒你换端口或先停掉旧进程。

### 环境要求

后端需要 Python 3.11（`faiss-cpu` 等依赖在 3.11 上最稳定）。

本项目使用专用 conda 环境 `allinone`，第一次使用前先创建并安装依赖：

```powershell
# 创建环境
conda create -n allinone python=3.11 -y

# 安装依赖
conda run -n allinone pip install backoff adalflow fastapi uvicorn faiss-cpu openai python-dotenv httpx
```

启动脚本 `dev-start.ps1` 默认使用 `allinone` 环境。想用其他环境：

```powershell
$env:CONDA_ENV_NAME = "myenv"
powershell -ExecutionPolicy Bypass -File .\scripts\dev-start.ps1
```

- 看到 `uvicorn`、`adalflow` 缺失 → 重新跑上面 pip install
- 看到 `api.routes` / `api.services` 导入异常 → 优先检查启动目录或模块路径

### 停止全部服务

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-stop.ps1
```

## 当前主要验证入口

现阶段最重要的本地验证页面是：

`http://localhost:3000/pre-assessment`

如果你改了 `FRONTEND_PORT`，就把 `3000` 换成你指定的端口。

如果本机对 `localhost` 解析不稳定，可以直接访问：

`http://127.0.0.1:3000/pre-assessment`

## 为什么这是当前最合适的方案

- 几乎不改架构
- 最快支持 `pre-assessment` 的验证
- 不会把时间浪费在过早包装成本上
- 让注意力继续留在核心学习工作流，而不是部署包装

## 未来可能的方向

如果 `pre-assessment` 和主日常工作流被验证确实有价值，后续可以再考虑：

- 后端后台常驻
- 桌面应用壳
- 单命令打包的本地应用

但这些都不是当前优先级。
