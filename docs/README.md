# 文档入口

这个 `docs/` 目录是当前项目里“人 + 多 agent 协作”的共享真相源。

如果你是第一次进入这个仓库的 agent，请按下面顺序阅读：

1. [`context.md`](./context.md)
   项目方向、用户背景、协作期望。
2. [`IMPLEMENTATION.md`](./IMPLEMENTATION.md)
   想实现什么、现在已经实现了什么。不汇总 spec，只写实际状态。
3. [`active/current-focus.md`](./active/current-focus.md)
   当前真正正在讨论或建设的重点。
4. [`active/handoff.md`](./active/handoff.md)
   当前决策、未决问题、执行边界、交接方式。
5. [`specs/`](./specs/) 里的相关文档
   当前仍然有效的功能 spec。
6. [`workflows/`](./workflows/) 里的相关文档
   agent 之间如何协作、如何交接、如何本地使用。

## 目录职责

- `context.md`
  跨会话稳定上下文。优先读。
- `active/`
  当前任务中心。想知道“现在做到哪了、下一步是什么”先看这里。
- `specs/`
  当前有效的产品/实现 spec。
- `workflows/`
  协作协议、模板、本地使用方式。
- `archive/`
  历史材料、旧方案、已过时文档。除非被明确引用，否则不要当作当前真相。

## 当前优先级规则

如果 `archive/` 里的文档与 `context.md`、`active/`、`specs/` 冲突，按下面优先级相信：

1. `active/`
2. `IMPLEMENTATION.md`
3. `specs/`
4. `context.md`
5. `workflows/`
6. `archive/`
