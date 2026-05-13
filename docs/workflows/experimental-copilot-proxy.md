# 实验功能：Copilot 外部代理接入

> Status: experimental
> allinone 不内嵌 Copilot 认证，依赖外部代理工具提供 OpenAI 兼容端点。

## 这是做什么的

让 allinone 能使用你的 GitHub Copilot 学生订阅，通过一个本地代理工具转发请求。

## 架构

```
allinone (copilot_proxy provider)
  → 本地代理 (OpenAI 兼容 /v1/chat/completions)
    → GitHub Copilot API
```

allinone 只负责第一层：配置好代理地址，像普通 OpenAI provider 一样用。

## 前置条件

你需要先运行一个 Copilot 代理工具。推荐：

- [copilot-gpt4-service](https://github.com/aaamoon/copilot-gpt4-service)（Go，社区最常用）
- [copilot-api](https://github.com/ericc-ch/copilot-api)（Node.js，支持 Claude Code）

这些工具会：
1. 引导你 GitHub 登录获取 Copilot token
2. 在本地启动 OpenAI 兼容端点
3. 把请求转发到 Copilot 后端

## 配置

```bash
# 设置代理地址（默认 http://localhost:8080/v1）
export COPILOT_PROXY_BASE_URL=http://localhost:8080/v1

# 如果代理需要 API key（通常不需要，随便填）
export COPILOT_PROXY_API_KEY=copilot
```

## 使用

在 allinone 里指定 provider 为 `copilot_proxy`：

```python
# 代码中
provider = "copilot_proxy"
model = "gpt-4o"  # 或其他代理支持的模型
```

## 没有配置时会怎样

如果 `COPILOT_PROXY_BASE_URL` 未设置，allinone 会直接报错：

```
copilot_proxy provider 需要配置外部代理地址。
请设置环境变量 COPILOT_PROXY_BASE_URL，
例如: COPILOT_PROXY_BASE_URL=http://localhost:8080/v1
```

## 风险说明

- 这是实验性功能，依赖社区代理工具的可用性
- GitHub 对 Copilot 请求有频率限制，不要高并发
- 代理工具失效时需要更换工具，allinone 本身不需要修改
- 不保证长期稳定可用
