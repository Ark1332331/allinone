# 当前重点

## 核心目标

把项目和协作流程整理成一个稳定可持续的形态，让 `allinone` 能在清晰的主路径上推进；当前活跃方向已经进入一次正式的 `v2 对齐阶段`，不再继续默认“边实现边收口”。

## 现在最重要的事

1. 明确“学习入口工作流”的主路径，让系统先承担导入、转换、暴露结构和降低提问门槛的责任。
2. 把不同学习目标拆开，不再默认所有材料都走同一套“前置判断”逻辑。
3. 明确视觉材料不能只依赖 `markdown`，确立“源文件阅读层 + 结构化理解层”的双通道。
4. 让产品开始长出“学科 -> 资料架 -> 模式路由 -> 阅读器”的骨架，而不是继续加厚单页表单。
5. 建立稳定的共享交接方式，让上下文不再依赖手动聊天转发。
6. 让 memory 不只是一份“存笔记”的目录，而是逐步变成观察、引导、画像更新、agent 定位的一部分。
7. 为 memory 增加“可见校对层”，避免内部记忆完全不可见或直接污染前端。
8. 重新审视 `pre-assessment` 当前形态是否仍然过像“专家工具入口”，并继续把它降回主路径里的一个初判节点。
9. 清理 `docs/`，让任何 agent 进来都能立刻找到当前真相，而不是陷进历史文档。

## 当前状态

- 项目方向已经从 DeepWiki-Open 转向 `allinone`。
- 文档结构已经完成第一轮重组，当前文档入口已建立。
- `pre-assessment` 的 spec 已经从“分类器思路”改成“学习决策助手思路”，但现在进一步确认：它本身仍然不足以承担完整主入口。
- 当前新增结论：现在不适合继续直接补功能，必须先完成一次正式的 v2 对齐。
- 当前新增主 spec：`docs/specs/learning-v2-alignment.md`
- 新增对齐结论：至少要分成三种模式，而不是继续假装一个流程能吃下所有学习场景。
  - 复习提分模式
  - 理解探索模式
  - 电子书交互模式
- 新增纠偏：电子书交互模式不是“唯一能划线提问的模式”；划线提问属于通用交互层。
- 新增纠偏：`markdown` 不再被视为唯一主载体，而是结构化理解层的一部分。
- 新增信息架构方向：应尽快转向“学科主页 -> 资料架 -> 模式路由”，而不是让用户直接面对一个泛化入口页。
- 新增架构纠偏：
  - 划线提问属于通用交互层，不属于某一种模式
  - 短材料和长材料应共享对象体系，但默认工作流不同
  - 文档处理应保留原始解析层、清洗层和结构层，而不是只存一份 md
- 新增交互收口：
  - 主路径已收敛为“学科 -> 资料库 -> 资料卡 -> 正文阅读 -> 划线提问/连续追问”
  - `pre-assessment` 已降级为阅读页顶部按钮 + 追问区隐式背景
  - 阅读页默认上下文不再只有当前选区，而是“硬上下文 + 当前目标强背景 + 长期画像”
  - 支持同一资料内多处选区组成一次提问上下文，但当前阶段不做跨资料拼接提问
- 新增资料对象方向：
  - 资料必须拆成“文件类型”和“学习角色”两层
  - 导入时由系统先猜主定位/辅助定位，用户轻确认
  - 背景资料由用户手动加入当前目标，并手动选择单一背景作用：标准类 / 证据类 / 讲解类
- 新增视觉材料判断：
  - 数学 PDF、PPT、带图课件不能只靠文本转写
  - 后续阅读器必须考虑截图提问或区域提问
- 当前阶段由 Codex 负责对齐、实现、自审和文档维护。
- Claude 不再是这一阶段的默认执行路径。
- 新暴露的问题：当前 UI、输入方式和工作流仍更像“需要用户自我组织信息的专家工具”，还不像“能先帮用户进入学习状态的助手”。
- 新暴露的问题：如果继续默认“说一点就实现一点”，会再次出现“实现路径和用户真实目标没有彻底对齐”的假进展。

## 下一步

当前更合理的优先级是：
1. 完成 `learning-v2-alignment` 收口
2. 明确三类模式的边界和默认路由规则
3. 明确对象模型和文档处理流水线
4. 把“学科主页 / 资料架 / 阅读器”画成真实页面结构
5. 再决定先验证哪个最小闭环

当前已推进到：
1. 学习空间入口
2. 学科资料架骨架
3. 从资料类型进入初判
4. v2 对齐问题已经被明确暴露

下一步更适合先做文档与方案：
1. 资料对象模型定稿
2. 视觉资料双通道定稿
3. 记忆双层机制定稿
4. 明确阅读页的多选区提问交互与资料卡背景开关如何落 UI
5. 再决定是阅读器优先还是复习提分模式优先
## 2026-05-14 Codex Update

- v2 minimal reading loop is now wired end to end:
  - `learn/[subject]` acts as subject shelf
  - material cards route directly to `learn/[subject]/[materialId]`
  - reading page supports current-material text selection, snippet staging, and in-page follow-up chat
  - pre-assessment is a top action inside reading, not the main entry gate
- Subject shelf now supports:
  - manual current-target title editing
  - drag-and-drop import
  - manual background-role attachment for materials
- Verified in this turn:
  - `tsc --noEmit`
  - `node --test --experimental-strip-types tests/node/learning-workspace.test.ts`
  - `python tests/unit/test_learning_chat_service.py`
- Next likely focus:
  - simplify overall learn home / subject-entry visual structure
  - improve imported-material reading polish for images and richer document rendering
  - decide how current-target background should scale beyond current single-material reading loop

## 2026-05-15 Codex Update

- User corrected PDF reading interaction:
  - screenshot asking must happen inside the reading flow, not through a top-level mode button
  - original-file reading should not keep loading structured text as a second main reading surface
  - history should be recoverable from anchors on the PDF page, plus a top-level all-history entry
  - Xiaomi MiMo 2.5 is a likely next model target, but should be handled as model-provider work, not mixed into PDF UI changes
- Implemented direction:
  - PDF pages now expose a per-page `框选提问` floating action
  - screenshot ask now asks for the user's own question before sending; fixed prompts are only fallback
  - screenshot snippets render as clickable PDF page anchors
  - reading page has a top `历史记录` panel listing all snippets by page/position
  - deleting a thread removes the snippet shell; PDF anchors open only their own thread; assistant answers support selection follow-up
  - structured text remains available for context and fallback, but is no longer shown under the original PDF when the original file renders
- Verification this turn:
  - `node_modules/.bin/tsc.cmd --noEmit`
- Verification blockers:
  - Node test runner still fails in this sandbox with `spawn EPERM`
  - Python unit test still requires the backend dependency environment with `adalflow`
