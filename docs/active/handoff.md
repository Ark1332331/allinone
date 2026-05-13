# 当前交接

## 用途

这个文件是当前用户 + Codex + Claude 的共享交接面。

如果你是第一次进入仓库的 agent，不要从聊天记录开始，也不要先猜当前任务。
先按文档入口顺序阅读，然后把这里当作当前执行合同。

## 必读顺序

1. `docs/README.md`
2. `docs/context.md`
3. `docs/active/current-focus.md`
4. `docs/active/handoff.md`
5. `docs/specs/learning-entry-workflow.md`
6. `docs/specs/pre-assessment-plan.md`
7. `AGENTS.md`

## 角色分工

- User
  负责产品方向、优先级和最终验收。
- Codex
  负责目标对齐、质疑与批评、spec 收敛、实现、自审，以及共享工作流维护。
- Claude
  当前不是默认执行者；只有用户明确重新引入时，才作为可选第二 agent。

## 当前协作循环

1. User + Codex 对齐目标、范围、取舍、风险和非目标。
2. Codex 把当前真相写入共享文档，而不是只留在聊天里。
3. Codex 按已确认的 spec 实现。
4. Codex 自审并记录关键决策。
5. User 判断结果是否真的朝想要的助手前进。

## 当前活跃方向

`learning-entry-workflow`

补充：

- `learning-modes-alignment`
- 下一阶段重点不是给 `pre-assessment` 补更多字段，而是把不同学习目标拆成不同模式

## 当前并行实验

允许并行探索一个**实验性外部 Copilot 代理 provider**，但它不是主线能力，也不是官方 API 接入。
如果 Claude 参与这一块，必须先阅读：

1. `docs/specs/experimental-copilot-proxy-plan.md`
2. 本文件

并严格遵守：

- 不要内嵌 Copilot 私有认证
- 不要伪装官方客户端
- 不要碰 `pre-assessment` 主链路

## 已经对齐的内容

- 项目现在是 `allinone`，一个个性化学习助手，不再是通用 repo wiki 产品。
- 助手应当观察、引导、判断，必要时批评，而不是被动顺从。
- repo 里的共享文档是跨 agent 延续性的主层；私有 memory 只是补充。
- 当前真正的主路径是学习材料入口，而不是单独的评估表单。
- `pre-assessment` v1 必须优先服务用户真实的学习材料工作流，但它只是主路径中的一个初判节点。
- 当前新增对齐：
  - 复习提分、理解探索、电子书交互至少是三条不同模式
  - 学科内应能承载书籍、习题、课件、往年卷、重点提纲
  - 系统应根据材料类型和目标推断默认模式，而不是让用户一开始就自己定义卡点
  - 电子书交互模式是很强的候选主方向，因为它最接近“真正跟着用户一起学”

## 当前对主路径的实现解释

当前不应再把 `/pre-assessment` 页面理解成完整入口。

当前主路径应该帮助用户完成：

1. 导入材料
2. 自动转 markdown
3. 先得到一个初步学习判断
4. 进入阅读
5. 在阅读中通过选区和轻量提问暴露真实卡点

其中 `pre-assessment` 负责的是第 3 步，不再单独承担 1-5 全部入口职责。

但这还不够。

当前最新判断是：

- 这条主路径本身还要继续分流
- 不能默认所有材料都应先落到同一个“判断页”
- 用户期待的最终产品更接近：
  - 学科主页
  - 学科资料架
  - 复习模式 / 探索模式 / 阅读器模式
  - 阅读中的锚点问答与持久化

## v1 范围

v1 主范围仍只聚焦学习材料：

- `pdf -> md`
- `ppt -> md`
- 其他 markdown 学习笔记
- 选中文本
- 选区上下文

不要把 v1 扩成仓库级代码材料统一评估器，也不要重新回到“先让用户填写长表单”的旧入口。

## 如果未来重新引入 Claude

Claude 目前不是默认执行者。

如果未来重新引入，Claude 应该：

1. 把 `docs/specs/pre-assessment-plan.md` 当作当前活跃 draft spec。
2. 严格保留已收窄的 v1 范围。
3. 避免退回到旧的“内容分类器”思路。
4. 如果开始实现，只保留将来支持代码材料的扩展口，不要在 v1 里直接做出来。
5. 一旦某个设计选择会明显改变用户工作流，先停下来重新对齐，而不是默默拍板。

## Claude 不该默认假设什么

- 不要假设旧的 DeepWiki-Open 计划仍然有效。
- 不要假设归档文档默认仍可执行，除非被明确引用。
- 不要假设 v1 范围越大越好。
- 不要假设用户要的是抽象总结；用户要的是有行动指导性的结构。

## 当前仍可能需要进一步确认的问题

1. 最终响应 schema 如何在清晰和可扩展之间拿平衡？
2. `profile_update_suggestions` 在 v1 里应展示到什么程度，是纯结果字段还是带轻量交互？
3. 文件导入、初判、阅读是否拆成多页面，还是保留单线渐进式入口。

## 当前建议

- 优先设计导入型主入口，而不是继续堆旧表单字段。
- `pre-assessment` 保留为初判能力，但不要让它继续独占首页心智。
- UI 第一屏先让用户开始，而不是先让用户组织复杂输入。
- 画像更新先停留在建议层，不做自动状态写回。
- 输出优先短而有行动性，不追求花哨和全面。

## 审查重点

实现完成后，审查要重点看：

- 有没有 scope 漂移
- 有没有重新滑回“通用分类器语言”
- UI 是否贴近真实学习工作流
- 输出是否过长
- 是否暗含了对用户背景的不合理假设

## Claude 2026-05-13 交接：copilot_proxy 实验 provider

### 做了什么

按 `docs/specs/experimental-copilot-proxy-plan.md` 实现了外部 Copilot 代理接入层：

| 操作 | 文件 |
|------|------|
| 新增 | `api/copilot_proxy_client.py` — `CopilotProxyClient`（薄 wrapper，继承 OpenAIClient） |
| 新增 | `docs/workflows/experimental-copilot-proxy.md` — 使用文档 |
| 修改 | `api/config.py` — import + CLIENT_CLASSES 注册 |
| 修改 | `api/config/generator.json` — 新增 `copilot_proxy` provider |
| 删除 | `api/copilot_auth.py` — 原因：内嵌认证（不合 spec） |
| 删除 | `api/copilot_client.py` — 原因：已被 copilot_proxy_client.py 替代 |

### 未改动

`api/api.py`, `api/prompts.py`, `api/routes/*`, `api/services/*`, `api/models/*`, `src/*`

### 当前阻塞

`copilot_proxy` 自身导入链基本可用，但主入口 `api.api` 在当前 `allinone` 环境里仍受 Google 依赖影响。

当前已验证：

- `import api` ✓
- `from api.copilot_proxy_client import CopilotProxyClient` ✓
- `from api.config import get_model_config, CLIENT_CLASSES` ✓
- `get_model_config("copilot_proxy", "gpt-4o")` → 应可正常返回

当前未完全通过：

- `import api.api` 在 `allinone` 环境下仍可能因 `google-generativeai` 缺失而失败

所以这里的当前真相应该是：

- `copilot_proxy` 方向基本可接受
- 后端主入口环境仍未完全收口

### 验证方式

代理配置好后：

```bash
export COPILOT_PROXY_BASE_URL=http://localhost:8080/v1
```

provider 名 `copilot_proxy`，默认模型 `gpt-4o`。
未配置 `COPILOT_PROXY_BASE_URL` 时会明确报错并提示配置方式。

---

## 当前状态

- `pre-assessment`：后端能力已具备，但前端心智已从“前置评估表单”调整为“学习入口 beta”
- `copilot_proxy`：provider 接入层已完成，方向符合实验定位
- 环境：专用 conda env `allinone`（Python 3.11），`dev-start.ps1` 默认使用它
- 本地联调：
  - 后端 `http://localhost:8001/health` 已通
  - 前端 `http://127.0.0.1:3000/pre-assessment` 已返回 200
  - `POST http://127.0.0.1:3000/api/learning-entry/import` 已通过真实上传测试
- 运行脚本：
  - `scripts/dev-start.ps1` 现使用 `.dev-state/dev-processes.json`
  - `scripts/dev-stop.ps1` 已能兜底清理 3000/8001 监听进程
- 下一步：继续围绕真实使用体验和模式分流收口，而不是再花时间纠缠环境猜谜

## 当前批评

如果后续实现又开始出现下面这些倾向，需要立刻停下来重新对齐：

- 把不同学习目标重新揉成一页
- 要求用户先写清自己的卡点、目标、材料类型
- 用“功能越来越多”掩盖产品抽象没有分层
- 只做导入和判断，不去定义真正的阅读界面与锚点问答

## 2026-05-13 新收口

- `/pre-assessment` 页面已被重新表述为 “Learning Entry Beta”
- 当前页面会明确区分：
  - 真正目标：文件导入 -> 自动转 markdown -> 初判 -> 阅读 -> 划线提问
  - 当前可用：导入 `.md / .txt` 或手动粘贴 markdown，先拿初步判断
- 这是有意为之：
  - 不再假装文件上传已经完成
  - 不再把旧表单包装成最终产品
  - 先让页面心智和产品方向一致

## 2026-05-13 新进展：最小材料导入

- 后端新增了学习入口导入接口：`/api/learning-entry/import`
- 当前策略：
  - `.md / .markdown / .txt`：直接导入
  - `.pdf / .ppt / .pptx / .doc / .docx / .xls / .xlsx / .csv / .html`：走 `MarkItDown` 适配口
- 当前真实状态：
  - 代码结构已接好
  - 当前本地 `allinone` 环境已确认可用 `markitdown`
  - `.md` 直读链已验证
  - `MarkItDown` 转换链已至少用 `.html` 样本验证通过
  - PDF / PPT / Word / Excel 仍属于 beta，尚未用真实样本充分回归
- 为了绕开 Python 侧缺失 `python-multipart` 会导致 FastAPI 启动失败的问题，上传解析放在 Next API 层完成，再转成 JSON 发给后端
