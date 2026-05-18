# allinone 实现状态

> 最后更新：2026-05-16
> 这份文档只写两件事：想实现什么、现在已经实现了什么。不汇总 spec，不重复设计文档。

## 一、想实现什么

### 产品是什么

一个**认识用户的个人学习助手**。用户把资料丢进来，系统帮他拆结构、做初判、进阅读、边读边问。助手不只回答问题，还观察用户的提问方式、停留位置、反驳行为，逐步形成更针对这个人的引导和判断。

不是通用 wiki 生成器，不是专家表单工具，不是"让用户先写清楚自己卡在哪"的入口页。

### 核心能力目标

**导入与转换**
- 支持 PDF、PPT、PPTX、DOCX、MD、TXT 等常见学习资料格式
- 自动转为可读文本，同时保留源文件（图片、公式、版式不能被 md 吞掉）

**阅读与提问**
- 源文件上直接阅读（PDF 原始页、PPT 原始页），不只是看转出来的 md
- 任意位置划线/框选提问，多段选区拼成一个上下文包
- 问答锚定到原文位置，关了能恢复，点了能继续
- 截图提问是主需求，不是锦上添花——数学 PDF、PPT 课件、带图材料不能只靠文字

**初期分析**
- 这份材料我现在适不适合读？
- 不适合的话，最关键的前置缺口是什么？
- 适合的话，重点抓什么、可以先跳过什么？
- 哪些部分是高复用骨架，值得优先理解？
- 这些判断为什么成立——证据来自材料本身、当前目标背景，还是用户长期画像？

**背景证据联动**
- 往年卷、考纲、老师画重点不只是"可阅读的资料"，更是系统做判断时的证据
- 同一本书，为考试复习和为理解探索时，系统的建议应该不同
- 文本层（可阅读、可划线、可追问）+ 评判层（命中率、重点优先级、考试约束）双层模型

**助手角色**
- 不只回答问题（工具职责）
- 观察用户的提问、停留、反驳，更新对用户的理解（观察职责）
- 当用户方向抓偏、把问题描述错时，明确指出并纠偏（引导职责）

### 选用的轮子

| 轮子 | 用途 | 为什么选 |
|------|------|---------|
| markitdown | 文件 → markdown 转换 | 微软出品，覆盖 PDF/PPT/DOCX/XLSX 等常见格式，轻量易接入 |
| pdfjs-dist | 前端 PDF 原始页渲染 | 直接操作 canvas，自定义文本选择和截图框选叠层，比用封装库更灵活 |
| OpenAI 兼容 API | LLM 调用 | 统一接口，可接 DeepSeek/OpenAI/未来 MiMo 等任意兼容 provider |
| FastAPI + Next.js | 前后端框架 | 继承自原项目，已瘦身 |

MinerU 在评估中但当前未接入——它输出结构化 JSON、公式转 LaTeX、多栏/扫描件支持更好，适合后续高保真路线。

### 工作流选择

当前用 Codex 做需求对齐、规划和架构审查，coding 环节分给其他模型。原因：CLI 里跑的模型报错时自己默默想不汇报、没电时 session 丢失成本太高、内置插件只提供 Haiku 4.5。

---

## 二、现在已经实现了什么

### 架构总览

```
前端 (Next.js 15 + React 19 + TypeScript)
├─ /learn                         学习空间首页
├─ /learn/[subject]               学科资料架（SubjectShelfClient）
├─ /learn/[subject]/[materialId]  正文阅读页（ReadingWorkspace）
│  ├─ PdfReadingSurface           PDF 原始页 + 框选截图提问
│  └─ Markdown                    结构化文本 + 文本选区提问
├─ src/lib/learning-workspace.ts  纯函数状态管理（localStorage 持久化）
├─ src/lib/learning-source-store.ts  源文件存储
└─ src/lib/learn-content.ts       学科元数据

后端 (FastAPI + Python)
├─ /api/learning-chat             学习追问（带材料+选区+目标+背景+画像上下文）
├─ /api/assistant-memory/context  助手记忆读写（画像、契约、会话状态）
└─ /api/pdf-worker                提供 pdf.js worker 文件
```

V1 阶段前端状态全部走 localStorage，没有数据库。后端只负责 LLM 调用和 memory 文件读写。

### 主路径（已跑通）

```
学科首页 → 资料架 → 资料卡点击 → 正文阅读页
                              ├─ PDF 原始视图（框选截图提问 + 锚点恢复）
                              ├─ Markdown 结构视图（文本选区提问）
                              ├─ pre-assessment（顶部按钮，可选）
                              └─ 追问区（硬上下文 + 强背景 + 软背景）
```

### 已实现的数据模型

**SubjectWorkspace**（学科工作空间）
- `subjectSlug` — 学科标识（advanced-math / probability / deep-learning / major-course）
- `currentTarget` — 当前学习目标（用户可自定义标题）
- `materials[]` — 资料列表

**LearningMaterialRecord**（资料记录）
- 基本字段：id / title / filename / sourceType / fullContent
- 学习角色：primaryRole（教材/新课课件/复习课件/重点整理/考纲/往年卷/习题集/复习笔记）+ secondaryRoles
- 阅读偏好：preferredViewMode（structured 文本 / original 源文件）
- 评估缓存：latestPreAssessment
- 交互历史：savedSnippets / chatHistory

**ReadingSnippet**（阅读片段）
- 文本内容 + 锚点标签 + 来源类型（text / pdf_text / pdf_screenshot）
- 截图类额外带：imageDataUrl / pageNumber / region (x, y, width, height)
- 可挂载消息历史 messages[]

**BackgroundRole**（背景资料作用分类）
- `standard` — 通用背景（决定考什么、重要度）
- `evidence` — 证据材料（决定哪些题型真实出现过）
- `explanation` — 讲解材料（决定如何理解、如何压缩）

每份背景资料只能选一个作用。

### 资料架能力

- 拖拽导入（PDF/PPT/MD 等），后端 markitdown 转换 → 返回 md 文本
- 系统自动推断主定位 + 辅助定位（基于文件名关键词和来源类型）
- 用户可手动修改主定位
- 资料卡一键加入/移出当前目标背景，手动选择背景作用
- 支持手动编辑当前目标标题
- 支持删除资料

### 阅读页能力

**PDF 原始视图**
- pdfjs-dist 渲染原始 PDF 页面
- 每页提供"框选提问"浮动按钮，点击后进入截图模式
- 鼠标拖拽框选区域 → 弹出问题输入框（用户写自己的问题，泛化提示只是兜底）
- 截图片段渲染为 PDF 页上的编号锚点（显示在对应区域位置）
- 点击锚点打开对应线程，不打开整个历史列表
- 顶部"历史记录"面板，按页码/位置排序所有片段
- 删除对话同时删除对应片段

**Markdown 结构视图**
- 渲染清洗后的 markdown 文本
- 文本选区 → 弹出菜单（直接提问 / 加入待问）
- 多处选区组成一个上下文包

**追问区**
- 上下文栈：硬上下文（当前选区）+ 强背景（当前目标下的背景资料）+ 软背景（用户长期画像）
- LLM 回复中的文本可以再次选中追问
- 支持多轮连续追问

**Pre-assessment（前置评估）**
- 阅读页顶部按钮，不再独占入口
- 点击后弹出评估卡片：适合怎么用 / 先看哪里 / 先跳过哪里 / 当前最大阻塞 / 高复用骨架
- 折叠区展示：为什么这样判断、依据来自哪层、把握高低与待验证项
- 即使用户不点开，评估结论也作为追问区的隐式背景

### 后端服务

**learning-chat（学习追问）**
- 输入：当前材料 + 选中片段（支持文本和截图两类） + 当前目标 + 背景资料 + 历史消息 + 模型配置
- 拼装三层上下文 prompt（硬/强/软）
- 截图类片段单独标注页码和类型
- 背景资料按角色标注（standard / evidence / explanation）

**assistant-memory（助手记忆）**
- 按用途（general / pre_assessment）读取 .codex/memory/ 下的记忆文件
- 支持格式化为 prompt 注入上下文
- 当前包含：ai_guide / assistant_contract / user_profile / session_state / project_direction

### 模型配置

- 前端 GlobalModelConfig 组件，统一管理 provider / model / api_key / base_url
- 存储在 localStorage，每个请求独立携带
- 兼容 OpenAI 兼容接口（DeepSeek、未来 MiMo 2.5 等）

---

## 三、当前明确不做（边界线）

- 不做三种学习模式的完整分流路由（复习提分/理解探索/电子书交互的独立 UI）
- 不做跨资料选区拼接提问（当前只支持同一资料内部多段选区）
- 不做数据库持久化（V1 全部 localStorage）
- 不做重型解析器（MinerU 等高保真路线待后续）
- 不做章节树和文档结构对象（DocumentStructure / TextBlock）
- 不做掌握度证据自动积累（MasteryEvidence）
- 不做记忆双层机制的前端校对层
- 不把内部记忆直接展示在主用户界面
- 不把旧 DeepWiki-Open 的代码分析能力直接嵌进来（待瘦身后再议）

---

## 四、下一步方向

当前优先级不是补更多功能，而是：
1. 简化学习首页/学科入口的视觉结构
2. 改善导入资料的阅读体验（图片渲染、更丰富的文档展示）
3. 决定当前目标 + 背景资料的能力如何扩展到单材料阅读之外
4. MiMo 2.5 作为新的模型 provider 接入（OpenAI 兼容路线）
