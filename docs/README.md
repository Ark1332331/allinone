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
5. [`active/learning-traces.md`](./active/learning-traces.md)
   用户学习与协作过程中的原始理解资料。它不是稳定画像，但可为后续画像和产品设计提供证据。
6. [`specs/`](./specs/) 里的相关文档
   当前仍然有效的功能 spec。
7. [`workflows/`](./workflows/) 里的相关文档
   agent 之间如何协作、如何交接、如何本地使用。

## 目录职责

- `context.md`
  跨会话稳定上下文。优先读。
- `active/`
  当前任务中心。想知道“现在做到哪了、下一步是什么”先看这里。其中 `learning-traces.md` 记录原始学习痕迹，不等同于稳定用户画像。
- `specs/`
  当前有效的产品/实现 spec。
- `workflows/`
  协作协议、模板、本地使用方式。
- `archive/`
  历史材料、旧方案、已过时文档。除非被明确引用，否则不要当作当前真相。详细 handoff 流水在 `archive/handoffs/`。

## 当前关键 spec

- [`specs/learning-v2-alignment.md`](./specs/learning-v2-alignment.md)
  当前学习入口和阅读工作流的主对齐文档。
- [`specs/learning-object-model.md`](./specs/learning-object-model.md)
  学科、资料、目标、背景资料等对象边界。
- [`specs/document-processing-pipeline.md`](./specs/document-processing-pipeline.md)
  原文件、清洗文本、结构化理解层的处理流水线。
- [`specs/memory-and-context-pipeline.md`](./specs/memory-and-context-pipeline.md)
  如何把稳定画像、学习痕迹、当前任务状态迁移到产品 API 调用上下文。

## 当前优先级规则

如果 `archive/` 里的文档与 `context.md`、`active/`、`specs/` 冲突，按下面优先级相信：

1. `active/`
2. `IMPLEMENTATION.md`
3. `specs/`
4. `context.md`
5. `workflows/`
6. `archive/`
