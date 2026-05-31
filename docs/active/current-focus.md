# 当前焦点

> 最后更新: 2026-05-31

## 项目是什么

allinone — 个性化学习助手。帮用户阅读课件/教材，边读边问，逐步暴露和解决理解卡点。

## 已实现的核心能力

- 学科 → 资料架 → 导入 PDF/PPT → 自动转 Markdown
- 结构化文本阅读 + 原文件阅读（PDF 渲染）
- **AskMenu 快捷提问**：选中文字 → 弹出意图菜单（解释/为什么/举例/推导步骤/自定义/加入片段）→ 精简输入框 → 发送 → floatingThread 显示回答
- **PDF 截图提问**：框选区域 → 紧凑卡片（截图缩略图+输入框）→ 发送给视觉模型
- snippet 锚点系统：选区/截图 → 持久化片段 → 可回溯的问答线程
- 回答内继续选中追问（assistant_reply → 子线程）
- 初步判断（pre-assessment）：一键生成阅读策略建议
- 历史面板：按材料查看所有问答记录

## 当前技术栈

- 前端: Next.js 15 + React 19 + Tailwind CSS 4 + pdfjs-dist
- 后端: copilot-api（LLM 代理，支持 DeepSeek/OpenAI 兼容接口）
- 存储: 浏览器 localStorage（workspace/snippets/config）

## 接下来的方向（按优先级）

1. **回答质量提升** — system prompt 注入学科上下文、用户画像、学习阶段
2. **统一提问容器** — PDF 截图和文本选中的回答都走 floatingThread，共享上下文
3. **prompt 模板可配置** — 用户可以自定义/增删快捷提问按钮
4. **多模型接入** — Copilot/Gemini 学生优惠、模型切换
5. **长材料分段** — 长 PDF 不应一次全部渲染，按章节分段加载

## 不做的事

- 不做通用 repo wiki 工具
- 不做复杂表单入口
- 不做跨资料拼接提问（当前阶段）
- 不做自动画像写回（画像更新保持建议层）
