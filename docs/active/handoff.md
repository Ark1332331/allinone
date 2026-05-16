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

## 2026-05-16 Model Config Presets Update

- User need:
  - A configured model should be savable under a custom name.
  - Later model switching should not require retyping provider/model/base URL/API key.
- Implemented:
  - `src/lib/model-config.ts` now supports named local presets and active preset switching.
  - `GlobalModelConfig` now has:
    - preset dropdown
    - preset name input
    - save as new preset
    - update current preset
    - delete preset
  - Existing callers still use `loadModelConfig()`, so learning chat and pre-assessment continue reading the active config without API changes.
- Safety note:
  - Presets store API keys in browser localStorage, consistent with the existing global config behavior.
  - If this becomes sensitive later, add a "do not persist key" mode rather than mixing it into the current preset work.

## 2026-05-16 PDF Reader Scale And Empty Anchor Correction

- User feedback:
  - PDF anchors should not remain when there is no conversation history.
  - The PDF page is too large; one page nearly fills the whole viewport.
- Implemented:
  - PDF anchors now render only for snippets with at least one message.
  - `getMaterialSnippetHistory` now excludes empty snippets, so history panels represent actual conversations.
  - PDF rendering scale is no longer fixed at `1.45`; default is `1.00`.
  - Added zoom controls from 70% to 160%, plus `-` / `+` buttons for quick adjustment.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Node test runner is still blocked by `spawn EPERM` in the current environment.

## 2026-05-16 Major Course Concrete Courses Update

- User need:
  - `专业课` should not be one giant shared shelf.
  - User should be able to create concrete course names and enter each course separately.
  - Existing imported materials currently belong to `数字系统设计基础`.
- Implemented:
  - `/learn/major-course` now opens a major-course course list instead of a material shelf.
  - Default concrete course: `数字系统设计基础`.
  - Users can create custom concrete courses locally.
  - Concrete course shelves use URL paths such as `/learn/major-course/digital-system`.
  - Local workspace storage still uses stable slugs such as `major-course:digital-system`.
  - On first entry, legacy `major-course` materials are migrated to `major-course:digital-system` if the target shelf is still empty.
- Follow-up correction:
  - Do not link directly to `/learn/major-course:digital-system`; that route 404s.
  - Added dedicated routes for `/learn/major-course/[course]` and `/learn/major-course/[course]/[materialId]`.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Node tests still cannot run in this environment because of `spawn EPERM`.

## 2026-05-16 Major Course Route And Hydration Correction

- User reported the course page was still not usable after the route split.
- Root causes found:
  - The browser was still on the legacy colon URL `/learn/major-course:digital-system`.
  - Next did not route that colon path into the App Router page in this dev setup, so page-level redirects alone were insufficient.
  - `SubjectShelfClient` read `localStorage` during its initial client render, while the server render had an empty workspace. If local materials existed, the material count could be `0` on the server and `2` on the client, causing a hydration error.
- Implemented:
  - Added `next.config.ts` redirects from `/learn/major-course\\::course` and `/learn/major-course\\::course/:materialId` to the slash routes.
  - Kept page-level legacy redirect helpers as a fallback for any path that does reach App Router.
  - Changed `SubjectShelfClient` to render an initial empty workspace consistently, then load the real browser workspace in `useEffect`.
  - Added tests documenting the legacy route redirect helpers.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - `curl -I --max-redirs 0 http://127.0.0.1:3000/learn/major-course:digital-system` returns `307` to `/learn/major-course/digital-system`.
  - `curl -I http://127.0.0.1:3000/learn/major-course/digital-system` returns `200`.
  - Node tests are still blocked by `spawn EPERM` before assertions run.

## 2026-05-16 Concurrent Material Import Correction

- User reported that choosing another file before the previous import finished could leave only one final material instead of both.
- Root cause:
  - `SubjectShelfClient` added imported materials with a stale `workspace` value captured by the render closure.
  - If two imports overlapped, each completion could write a workspace based on the same old material list, so the later write overwrote the earlier one.
  - The file input and drop handler also only consumed `files[0]`, so true batch import was not supported.
- Implemented:
  - Import writes now use a functional workspace state update and persist that exact next workspace to localStorage.
  - The file picker uses `multiple`.
  - File input and drag/drop both import every selected/dropped file.
  - The import button remains available while imports are running and shows the active import count.
  - Added a Node test documenting that adding a second imported material preserves the first.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - `node --test --experimental-strip-types tests/node/learning-workspace.test.ts` is still blocked by `spawn EPERM`.

## 2026-05-16 Import-To-Reading Not Found Correction

- User reported newly imported materials opened into the `没找到这份材料` page.
- Root causes / risks addressed:
  - New concrete-course material ids were derived from `subjectSlug`, so ids could contain `:` from `major-course:digital-system` and become fragile inside route segments.
  - Import persistence still depended on when React processed the state updater; clicking a card immediately after import could race with localStorage persistence.
- Implemented:
  - `createImportedMaterialDraft` now sanitizes the subject portion of generated material ids, e.g. `major-course-digital-system-...`.
  - `SubjectShelfClient` now keeps a synchronous `workspaceRef`; import completion updates the ref, React state, and localStorage in the same call.
  - Added a Node test documenting URL-safe concrete-course material ids.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Node tests remain blocked by `spawn EPERM` before assertions run.

## 2026-05-16 PDF Fast Original Import And Markdown Raw Tag Correction

- User feedback:
  - PDF import is too slow when the goal is only to read the original file.
  - Reading page works, but Next dev overlay reports `The tag <sp> is unrecognized in this browser` from `Markdown.tsx`.
- Root cause / product decision:
  - Current PDF import waited for backend MarkItDown conversion before creating the material, which is unnecessary for original-file-first reading.
  - MarkItDown or converted HTML-like content can emit non-standard raw tags such as `<sp>`, and `rehypeRaw` lets them reach React.
- Implemented:
  - PDF files now use a fast original-file import path in `SubjectShelfClient`: create the material immediately with `converter_used: original_file`, save the source file, and skip backend markdown conversion.
  - The placeholder `full_content` clearly states that structured text has not been generated yet.
  - `Markdown.tsx` maps raw `<sp>` tags to normal `<span>` elements to avoid the dev overlay warning.
  - Added a Node test describing the fast original-first PDF payload.
- Follow-up:
  - For full-context chat / pre-assessment quality on PDFs, add an async "generate structured text" job or manual parse button later instead of blocking initial import.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Node tests remain blocked by `spawn EPERM`.

## 2026-05-16 Non-Blocking Reading Q&A Panel And Selection Follow-Up

- User feedback:
  - Asking a screenshot/text question should expand the answer in the right-top reading companion panel, not occupy the whole page and interrupt reading.
  - Text selection, including assistant replies, should show the action menu beside the selected text.
  - Direct ask should include all already-added snippets plus the newly selected text/reply context.
- Root causes found:
  - The reading side panel still rendered a full-page backdrop, so it behaved like a blocking modal even though the panel itself was positioned on the right.
  - Screenshot direct ask and snippet-history opening set `historySnippetIndex`, which opened the old blocking history dialog.
  - Selection menu placement preferred the mouseup pointer position instead of the selected range rectangle, so the menu could appear away from the actual highlighted text.
  - Learning chat requests only sent the active thread snippet in `selected_snippets`, losing other staged comparison snippets.
- Implemented:
  - Removed the side panel backdrop so the PDF/text remains scrollable and readable while answers are visible.
  - PDF anchors, history-list items, screenshot direct ask, and thread buttons now open the specific active thread in the right-side panel instead of the blocking history dialog.
  - Added `src/lib/reading-interactions.ts` for selection-menu positioning and multi-snippet question context assembly.
  - Selection menu position now uses the selected text rectangle first, clamps inside the viewport, and has a higher z-index so it appears beside selections in both reading content and assistant answers.
  - Follow-up correction: selection capture for Markdown正文 and LLM answers now uses document-level `pointerup` plus marked reading containers, so dragging outside the exact Markdown wrapper or selecting inside the right panel can still open the menu.
  - Follow-up correction: while a text selection menu is open, scroll/resize recomputes its position from the current browser selection so it follows the reading position.
  - `sendQuestion` now sends the current material's staged snippets as `selected_snippets`; assistant-reply direct ask adds the selected reply as transient context.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - `node --experimental-strip-types -e "...reading-interactions..."` passed for the new pure helpers.
  - Node test runner remains blocked by `spawn EPERM` before assertions run.

## 2026-05-16 PDF Capture Menu Position Reverted

- User feedback:
  - The previous correction targeted the wrong layer: PDF screenshot questioning was acceptable as a fixed top-right panel.
  - The real failing layer is Markdown正文 and LLM回答 text selection.
- Implemented:
  - Reverted the PDF screenshot question panel back to its fixed top-right reader position.
  - Removed the unnecessary PDF canvas-region viewport helper and its test.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Node test runner remains blocked by `spawn EPERM` before assertions run.

## 2026-05-16 Non-Interrupting Right-Side Answer Flow

- User feedback:
  - After asking from the top-right flow, the answer should keep appearing in the top-right panel while the user continues reading.
  - Current behavior felt like the whole page re-rendered, PDF jumped back to page 1, and the side panel showed all history/threads.
- Root causes found:
  - `persistStudyState()` updated `material.savedSnippets`; the material-sync effect depended on `material.savedSnippets` and reset `activeSnippetIndex` to `0`, so the active conversation could jump to the first historical thread.
  - The original-file loading effect depended on the whole `material` object. Saving chat created a new material object, rebuilt the object URL, and caused `PdfReadingSurface` to reload the PDF from page 1.
  - `sendQuestion()` and anchor/history opening called `scrollIntoView()` on the active thread, which could move reading focus instead of letting the user keep scrolling.
  - The side panel put Background and full Threads sections before the active Q&A, so opening the answer felt like opening a history dashboard.
- Implemented:
  - Material-to-local-snippet syncing now runs on `material.id` changes only; chat saves no longer reset the active thread.
  - Original source-file/object URL loading now runs on `material.id` changes only; chat saves no longer reload the PDF document.
  - Removed active-thread `scrollIntoView()` calls from send/open flows.
  - Simplified the right-side panel to prioritize only the current active Q&A. Full history remains accessible through the top `历史记录` entry and PDF/page anchors.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - `node --experimental-strip-types -e "...reading-interactions..."` passed for the pure helper checks.
  - Node test runner remains blocked by `spawn EPERM` before assertions run.

## 2026-05-16 Assistant Reply Selection Anchors

- User feedback:
  - LLM answers must be selectable like reading text.
  - Selecting answer text should open the nearby selection box, allow a custom follow-up, create its own anchor/thread, and not fill the bottom generic follow-up box.
- Implemented:
  - Added `assistant_reply` as a `ReadingSnippetSource`.
  - Selection menus now include an optional custom question field; direct ask uses it and includes the selected text as the quoted context.
  - Assistant-answer selections now create `回答片段 N` snippet threads instead of continuing the old parent thread as transient context.
  - Assistant answers are annotated with clickable marks for saved answer snippets, so the selected answer text remains recoverable as an anchor.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - `node --experimental-strip-types -e "...createSelectionSnippetDraft..."` passed.
  - Full Node test runner remains blocked by `spawn EPERM` before assertions run.

## 2026-05-16 Inline PDF Screenshot Answer Correction

- User correction:
  - For PDF screenshot ask, after filling the question in the current top-right screenshot box, the answer should appear below that same box.
  - It should not open the right-side `Reading Tools / 片段问答` panel, because that still interrupts the current reading flow.
- Implemented:
  - `PdfReadingSurface` now owns screenshot-answer UI state: sending, answer, and error.
  - `onScreenshotQuestion` can return `{ answer, error }`.
  - Direct screenshot ask keeps the screenshot popup open and renders the model answer under the same input/actions.
  - `ReadingWorkspace.handleScreenshotQuestion()` persists the screenshot thread but calls chat with `openPanel: false`, returning the answer to the popup instead of showing it in the side panel.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.

## 2026-05-16 PDF Screenshot Popup Follow-Up Polish

- User feedback:
  - The screenshot ask popup should be manually resizable.
  - The model answer inside that popup should render Markdown, not raw markdown text.
  - Selecting text inside the popup answer should allow follow-up in the same popup.
- Implemented:
  - The screenshot popup now uses CSS resize with bounded min/max sizing and internal overflow.
  - Popup answers render through the shared `Markdown` component.
  - Selecting answer text in the popup opens an inline follow-up input below the answer; follow-up calls keep using the same screenshot context and append the new answer inside the popup.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.

## 2026-05-16 PDF Screenshot Popup Collapsed Context And Anchored Follow-Ups

- User correction:
  - After asking, the original screenshot preview and question should collapse unless explicitly expanded.
  - While waiting, the popup should focus on "answering"; after completion, it should show only the current answer by default.
  - Selecting answer text must show the follow-up option beside the selected text, not at the bottom after reading.
  - Follow-up should leave an underline anchor on the original answer text; the corresponding answer popup can be closed or permanently deleted.
- Implemented:
  - Direct screenshot ask now collapses the screenshot/question context while the answer is pending.
  - Screenshot popup keeps an expand/collapse context control.
  - Answer selection records viewport coordinates and opens a fixed follow-up input next to the selection.
  - Follow-up answers are separate floating popups. Closing hides the popup but keeps the underline anchor; deleting removes the popup and its anchor.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.

## 2026-05-16 Markdown And LLM Answer Selection Menu Correction

- User feedback:
  - In structured Markdown reading mode, selecting text no longer showed the ask box in a visible/usable place.
  - LLM answers still could not reliably be selected for follow-up, which breaks the "ask while reading" loop.
- Root causes found:
  - The selection menu used `Range.getBoundingClientRect()` for the whole selection. Long Markdown rows, tables, or multi-line selections can produce a huge rectangle, so the menu may clamp to an unrelated screen edge instead of the currently selected visible text.
  - Reading scope detection relied too much on `anchorNode.closest(...)` and `focusNode` containment. Rendered Markdown inside assistant replies has nested nodes, marks, lists, and code spans, so valid answer selections could be discarded as outside the reading scope.
- Implemented:
  - `getSelectionMenuPosition()` now accepts `range.getClientRects()` and chooses the visible selection line closest to the pointer, with above/below placement and viewport clamping.
  - `ReadingWorkspace` now passes the explicit current selectable container from Markdown正文 or assistant reply mouseup handlers.
  - Selection validation now checks the browser `Range` against candidate reading containers with `range.intersectsNode(...)`, so Markdown/assistant reply DOM nesting no longer drops valid selections.
  - Added a pure helper test for choosing the visible rect nearest the pointer.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Direct `node --experimental-strip-types -e` helper verification passed.
  - Full Node test runner remains blocked by this environment's `spawn EPERM` before assertions run.

## 2026-05-16 Current Anchor Box Usability Correction

- User feedback:
  - The floating question/answer box must be usable without repeated user trial-and-error.
  - It needs an obvious close affordance and user-controlled sizing.
  - Clicking an anchor should reopen only that anchor's current Q&A box, not push the user into the full history view.
  - The work process also needs to remember the main interaction principle instead of fixing one symptom and forgetting the original reading-flow goal.
- Implemented:
  - The selection ask popover now has a visible `X` close button and native resize support.
  - The right-top current-anchor Q&A panel now has a visible `X` close button and native resize support.
  - Anchor activation now explicitly closes the all-history panel and opens the current-anchor panel only.
  - The all-history panel copy now clarifies that clicking an item reopens only that anchor in the current Q&A box.
- Process note:
  - Treat "ask while reading" as the invariant: close/hide should not delete, delete should remove the anchor, and anchor clicks should preserve reading context.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Direct helper verification for selection menu placement passed.

## 2026-05-16 Reading Interaction Final Repair

- User correction:
  - For Markdown text and LLM answers, the question entry must appear beside the selected text while reading.
  - After submitting from that local question box, the answer should appear in the upper-right current-anchor Q&A panel, so reading is not interrupted.
  - Clicking an anchor must reopen only that anchor's current Q&A, not the all-history panel.
- Implemented:
  - Removed the old `historySnippetIndex` path from `ReadingWorkspace`; anchors now route through one `openSnippetInCurrentBox` function.
  - PDF anchors, structured-text anchors, assistant-answer anchors, and all-history item clicks now all open the upper-right current-anchor Q&A box and close the all-history panel.
  - `sendQuestion()` explicitly closes the all-history panel when a question is submitted, so direct selection asks cannot leave the user in history mode.
  - Assistant-reply snippet labels are now clean and stable (`Assistant reply N`) instead of garbled/legacy labels.
- Ask-while-reading invariant:
  - Text selection and anchor clicks must preserve reading context.
  - The all-history panel is only an index opened from the top History button.
  - Close hides the current box; delete removes the anchor/thread.
- Manual acceptance checklist to keep for the next pass:
  - Structured Markdown selection opens a visible ask box near the selection.
  - LLM answer selection opens the same visible ask box near the selection.
  - The ask box has close and resize controls.
  - The current-anchor Q&A box has close and resize controls.
  - PDF/text/answer anchor clicks open only current-anchor Q&A.
  - All-history opens only from the History button.
  - Reader chrome has no visible mojibake.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Direct helper verification passed for `createSelectionSnippetDraft`, `getVisibleSelectionRect`, and `getSelectionMenuPosition`.
  - Full Node test runner remains blocked in this environment by `spawn EPERM`.

## 2026-05-16 Final Reading Popup Resize And Markdown Math Repair

- User feedback:
  - Markdown/LLM answer rendering still showed raw math in some cases.
  - Selection question popups and new follow-up popups had to be freely draggable.
  - Left-side resizing had to work, not only bottom-right resizing.
  - Resizing had to enlarge the actual question/answer content area, not just the outer frame.
- Implemented:
  - Added KaTeX-backed Markdown math rendering for `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`.
  - Added `katex` as an explicit frontend dependency and loaded KaTeX CSS globally.
  - Replaced the structured-text/assistant-answer selection ask popup's native CSS resize with explicit `{x, y, width, height}` state.
  - Selection ask popup now supports header drag, left-edge resize, bottom-right resize, and a textarea that grows with the popup.
  - PDF screenshot ask popup keeps explicit drag/resize behavior, including left-edge resizing and answer-area growth.
  - PDF answer-selection follow-up popup is now draggable and resizable, with a textarea that grows with the popup.
  - PDF follow-up answer popups are now draggable, left-resizable, bottom-right-resizable, and their answer area grows with the popup.
  - Ignored local `.codex-next-*.log` and `.superpowers/` state files so local verification/tool artifacts are not committed.
- Verification:
  - `node_modules/.bin/tsc.cmd --noEmit` passed.
  - Direct `renderMarkdownMath` check passed for dollar, display-dollar, paren, and bracket LaTeX wrappers.
  - Direct `clampFloatingBox` / `clampSelectionBox` checks passed.
  - `node --test --experimental-strip-types tests/node/learning-workspace.test.ts` remains blocked by `spawn EPERM` before assertions run.
  - Starting `npm run dev` also hit `spawn EPERM` in this sandbox; escalation request was automatically rejected, so browser-level manual verification is still pending on the user's side.
