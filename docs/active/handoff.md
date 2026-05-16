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
7. `docs/specs/learning-v2-alignment.md`
8. `AGENTS.md`

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

`learning-v2-alignment`

补充：
- `learning-entry-workflow`
- `learning-modes-alignment`
- `learning-object-model`
- `document-processing-pipeline`

下一阶段重点不是给 `pre-assessment` 补更多字段，而是把不同学习目标拆成不同模式，并明确视觉资料与文本资料的不同阅读路径。

## 已经对齐的内容

- 项目现在是 `allinone`，一个个性化学习助手，不再是通用 repo wiki 产品。
- 助手应当观察、引导、判断，必要时批评，而不是被动顺从。
- repo 里的共享文档是跨 agent 延续性的主层；私有 memory 只是补充。
- 当前真正的主路径是学习材料入口，而不是单独的评估表单。
- `pre-assessment` v1 必须优先服务用户真实的学习材料工作流，但它只是在主路径中的一个初判节点。
- 当前新增对齐：
  - 现在不适合继续直接堆功能
  - 必须先完成一次 v2 正式对齐
  - `learning-v2-alignment` 是当前主 spec
- 当前新增对齐：
  - 复习提分、理解探索、电子书交互至少是三条不同模式
  - 学科内应能承载书籍、习题、课件、往年卷、重点提纲
  - 系统应根据材料类型和目标推断默认模式，而不是让用户一开始就自己定义卡点
  - 电子书交互模式是很强的候选主方向，因为它最接近“真正跟着用户一起学”
  - 划线提问不是电子书模式专属能力，而是通用交互层
  - 通用交互层要能作用于原文、清洗后的 md、用户笔记和 LLM 回复
  - 短材料与长材料不该共用完全相同的默认工作流
  - 后续实现前必须先明确对象模型和文档处理中间层
  - 数学 PDF、PPT、图示型课件不能只靠 markdown 转写
  - 后续阅读器需要保留源文件阅读层，并支持截图或区域提问
  - memory 不应出现在主前端，但也不能完全不可校对，后续要走“内部层 + 可见校对层”
 - 当前新增对齐：
   - 主路径已收敛为“学科 -> 资料库 -> 资料卡 -> 直接正文阅读 -> 划线提问/连续追问”
   - 不再经过资料详情中间页，`pre-assessment` 改为阅读页顶部按钮
   - 资料库默认全部混排，资料卡只展示少量核心字段
   - 阅读页追问默认带“当前选区硬上下文 + 当前目标强背景 + 用户长期画像”
   - 用户手动把资料加入当前目标背景，并手动选择单一背景作用：标准类 / 证据类 / 讲解类
   - 支持同一资料内部多处选区组成一次提问上下文，但当前阶段明确不做跨资料拼接提问

## 当前对主路径的实现解释

当前不应再把 `/pre-assessment` 页面理解成完整入口。
当前主路径应该帮助用户完成：

1. 导入材料
2. 自动转 markdown
3. 先得到一个初步学习判断
4. 进入阅读
5. 在阅读中通过选区和轻量提问暴露真实卡点

其中 `pre-assessment` 负责的是第 3 步，不再单独承担 1-5 全部入口职责。

当前最新判断是：
- 这条主路径本身还要继续分流
- 不能默认所有材料都应先落到同一个“判断页”
- 用户期待的最终产品更接近：
  - 学科主页
  - 学科资料架
  - 复习模式 / 探索模式 / 阅读器模式
  - 阅读中的锚点问答与持久化
- 并且这些模式之下，应共用一套底层交互能力：
  - 选区
  - 划线
  - 锚点线程
  - 问答恢复
  - 证据沉淀
- 在真正恢复实现前，优先先读 `learning-v2-alignment`

## v1 范围

v1 主范围仍只聚焦学习材料：

- `pdf -> md`
- `ppt -> md`
- 其他 markdown 学习笔记
- 选中文本
- 选区上下文

不要把 v1 扩成仓库级代码材料统一评估器，也不要重新回到“先让用户填长表单”的旧入口。

## 当前建议

- 优先设计导入型主入口，而不是继续堆旧表单字段。
- `pre-assessment` 保留为初判能力，但不要让它继续独占首页心智。
- UI 第一屏先让用户开始，而不是先让用户组织复杂输入。
- 画像更新先停留在建议层，不做自动状态写回。
- 输出优先短而有行动性，不追求花哨和全面。
- 如果后续再次出现“还没说清实现哪条路就直接开始做”的倾向，应先暂停并重新对齐。
- 如果后续实现把阅读页再次退回成“单段即时问答框”或“只看当前材料不看背景”的模式，视为偏离当前主 spec。
## 2026-05-14 Codex Handoff Update

- Completed in this pass:
  - rewrote `src/components/learning/SubjectShelfClient.tsx`
  - rewrote `src/components/learning/ReadingWorkspace.tsx`
  - added `src/app/learn/[subject]/[materialId]/page.tsx`
  - rewrote `src/app/learn/page.tsx` into a cleaner reading-first entrance
  - moved subject metadata into `src/lib/learn-content.ts`
  - rewrote `src/app/learn/[subject]/page.tsx` to consume shared subject metadata
  - rewrote `src/components/GlobalModelConfig.tsx` with clean Chinese labels
  - added stricter frontend type guards for learning import / pre-assessment / learning chat responses
  - enabled `allowImportingTsExtensions` in `tsconfig.json` so the existing node strip-types tests still compile under project TypeScript checks
- User-facing result:
  - import into subject shelf
  - click a material card and enter正文 directly
  - optionally open pre-assessment from the reading page header
  - select text inside current material and send follow-up questions with current target + background materials
- Verification performed:
  - `node_modules/.bin/tsc.cmd --noEmit`
  - `node --test --experimental-strip-types tests/node/learn-content.test.ts`
  - `node --test --experimental-strip-types tests/node/learning-workspace.test.ts`
  - `python tests/unit/test_learning_chat_service.py`
- Keep in mind:
  - repo still contains many unrelated dirty changes; do not assume this pass owns all modified files shown by `git status`
  - the larger IA / UI cleanup is not finished yet; this pass only stabilizes the minimum reading-first loop

## 2026-05-14 PDF Viewer Update

- Added:
  - `src/app/api/pdf-worker/route.ts` to serve the local pdf.js worker
  - `src/components/learning/PdfReadingSurface.tsx` using `react-pdf-viewer`
  - PDF text-selection popup with `直接提问` / `加入待问`
  - global PDF viewer styles in `src/app/layout.tsx`
- Reading-page behavior now:
  - PDF uses a real viewer instead of pretending the markdown preview is the original file
  - structured text still remains for follow-up chat and pre-assessment
  - text selections can be turned into temporary ask snippets without permanently polluting the list
- Verified in this turn:
  - `node_modules/.bin/tsc.cmd --noEmit`
  - `node --test --experimental-strip-types tests/node/learning-workspace.test.ts`
  - `node --test --experimental-strip-types tests/node/learn-content.test.ts`
  - `python tests/unit/test_learning_chat_service.py`

## 2026-05-15 PDF Reading Interaction Update

- User feedback:
  - Do not require a top toolbar click before asking screenshots; screenshot asking should feel like part of reading.
  - In original-file mode, the page should focus on the PDF; structured text is still useful as hidden context/fallback, but should not be a parallel reading surface.
  - History should be recoverable by clicking the corresponding position on the PDF page.
  - A top-level history entry is still needed to scan all questions and pages.
  - Xiaomi MiMo 2.5 may be the next model integration target.
- Implemented:
  - `PdfReadingSurface` now provides a per-page `框选提问` button and only the current page enters capture mode.
  - Screenshot capture asks for the user's custom question before sending; the generic prompt is only a fallback.
  - Screenshot snippets render as numbered anchors on the PDF page at their saved region.
  - Clicking a PDF anchor opens that snippet's history.
  - Reading page header now includes `历史记录`, opening an all-question panel sorted by page/position.
  - Added snippet ids and `getMaterialSnippetHistory` for stable history lookup/sorting.
  - Added a Node test describing stable screenshot ids and page/position history sorting.
- Follow-up correction:
  - Deleting a conversation now removes the snippet instead of leaving a `0 条消息` shell.
  - Clicking a PDF anchor opens only the corresponding thread, not the entire side history list.
  - Assistant answers can now be selected for follow-up; direct ask continues the current thread.
- Important scope decision:
  - MiMo 2.5 should be handled next as an OpenAI-compatible model configuration/provider task; do not tangle it with PDF reader interaction.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - `node --test --experimental-strip-types tests/node/learning-workspace.test.ts` could not run in the current sandbox because Node child spawning fails with `spawn EPERM`.
