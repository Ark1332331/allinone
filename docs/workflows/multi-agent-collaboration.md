# 多 agent 协作工作流

这个项目采用“共享文档交接”模式。

## 核心原则

私有 memory 用来帮助单个 agent 保持风格、细节和长期观察。  
repo 里的共享文档用来协调所有 agent。

如果 agent 必须在私有 memory 和 repo 文档之间做取舍：

- 执行真相以共享 repo 文档为准
- 细节语气、观察和长期画像可以参考私有 memory

## 协作 agent 的必读顺序

1. `docs/README.md`
2. `docs/context.md`
3. `docs/active/current-focus.md`
4. `docs/active/handoff.md`
5. 相关的 `docs/specs/` 文档

## 分工

- Codex
  负责对齐、批判、spec 收敛、review 和工作流维护。
- Claude
  只在被明确重新引入时，作为可选执行者或第二视角。
- User
  负责最终产品判断和验收。

## 共享交接规则

每次出现有意义的规划结论、review 结论、或执行边界变化后，都应更新共享文档，而不是只依赖聊天记录。

## 私有 memory 规则

私有 memory 不能成为唯一的关键任务状态来源。

如果某条信息是另一个 agent 继续工作的必要前提，它必须被写进：

- `docs/active/`
- 或 `docs/specs/`
