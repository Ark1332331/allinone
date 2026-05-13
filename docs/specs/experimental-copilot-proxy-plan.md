# 实验功能：Copilot 外部代理接入方案

> Status: experimental draft
> 这不是主线能力，不是正式 provider，不应影响 `pre-assessment` 主链路。

## 1. 目标定位

这个功能不是“实现官方 Copilot API”。

因为当前更可信的现实是：

- GitHub 官方主流模型调用路径是 `GitHub Models`
- Copilot 聊天框不是一个面向我们稳定开放的标准 API
- 社区里确实存在“Copilot -> OpenAI 兼容代理”的工具和方案

所以这里的正确定位只能是：

**让 allinone 支持连接一个外部运行的、OpenAI 兼容的 Copilot 代理。**

不要把它写成：

- 官方支持
- 稳定长期可维护
- 零风险可直接大规模使用

## 2. 为什么采用外部代理，而不是内嵌伪装

当前不建议把以下内容直接嵌进 allinone：

- GitHub 设备流登录细节
- 私有 token 交换逻辑
- VS Code / JetBrains header 伪装
- Copilot 内部 endpoint 映射

原因：

1. 风险高
   这些逻辑依赖非官方稳定契约，容易失效。
2. 可维护性差
   一旦 GitHub 改登录流或请求头，项目主仓会被拖着修。
3. 污染主线
   allinone 当前主目标是学习助手，不是逆向 Copilot 协议。
4. 不利于多 agent 协作
   一旦这层埋进 provider 基础设施，后续任何模型问题都更难定位。

## 3. 本实验真正要实现什么

### 3.1 v1 范围

只做以下内容：

1. 新增一个实验性 provider，例如：
   - `copilot_proxy`
2. 它本质上只是一个指向外部 OpenAI 兼容代理的 client
3. 支持通过环境变量配置：
   - `COPILOT_PROXY_BASE_URL`
   - `COPILOT_PROXY_API_KEY`
4. 在 `api/config/generator.json` 中注册这个 provider
5. 在文档里明确：
   - 这是实验性能力
   - 需要你先单独运行外部代理工具
   - allinone 不负责 Copilot 认证或 token 获取

### 3.2 明确不做

不要做下面这些：

- 不要实现 GitHub 设备流登录
- 不要读取 VS Code 本地 Copilot token 缓存
- 不要伪装官方插件请求头
- 不要直接请求 `api.githubcopilot.com`
- 不要在仓库里写“学生订阅即可稳定当 API 用”这类表述
- 不要让这个 provider 成为默认 provider
- 不要影响现有 `openai` / `google` provider

## 4. Claude 的实现边界

Claude 只允许改这些区域：

- `api/config.py`
- `api/config/generator.json`
- `api/copilot_proxy_client.py`
- 新增一份实验说明文档，例如：
  - `docs/workflows/experimental-copilot-proxy.md`

Claude 不要改这些区域：

- `api/api.py`
- `api/prompts.py`
- `api/routes/pre_assessment.py`
- `api/services/pre_assessment.py`
- `src/app/pre-assessment/`
- `src/components/PreAssessmentCards.tsx`
- `src/types/pre-assessment.ts`
- 启动脚本，除非用户明确要求

## 5. 实现形式建议

推荐实现方式：

### 5.1 client 设计

做一个薄 wrapper，例如 `CopilotProxyClient`：

- 继承现有 `OpenAIClient`
- 默认从环境变量读取：
  - `COPILOT_PROXY_BASE_URL`
  - `COPILOT_PROXY_API_KEY`
- 不内置任何 GitHub 登录逻辑
- 不内置任何伪装 header
- 如果没有配置 URL，应该明确报错

### 5.2 provider 命名

不要命名为 `copilot`。

推荐命名：

- `copilot_proxy`

这样能明确表达：

- 它不是官方 Copilot API
- 它依赖外部代理层

### 5.3 文档要求

文档必须明确写出：

1. allinone 不自带 Copilot 认证
2. 用户需要自己启动一个外部 OpenAI 兼容代理
3. 这个能力是实验性的
4. 频率限制、封控、失效问题由代理方案自己承担

## 6. 验收标准

Claude 交付后，至少满足：

1. 仓库可以静态导入新 client
2. 不破坏现有 `openai` / `google` provider
3. 不改动 `pre-assessment` 主链路
4. 文档能让人明白：
   - 为什么这是实验性方案
   - 怎么接
   - 这个仓库不负责哪一层

## 7. 不合格信号

出现以下任意情况，都算方向跑偏：

1. 代码里出现 GitHub 设备流登录实现
2. 代码里读取 VS Code Copilot token 缓存
3. 代码里对官方编辑器 header 做伪装
4. 代码里直接请求 `api.githubcopilot.com`
5. 文档把它写成“官方 API”或“稳定 provider”
6. 为了它去改 `pre-assessment` 或核心路由

## 8. 给 Claude 的一句话任务描述

实现一个**实验性外部 Copilot 代理 provider**，本质是 OpenAI 兼容代理接入层，不要内嵌 Copilot 私有认证或协议伪装，不要修改 `pre-assessment` 主链路。
