# 前置评估（Pre-Assessment）实现计划

> Status: active draft
> Read after `docs/README.md`, `docs/context.md`, and `docs/active/handoff.md`.
> This file defines the current proposed direction for `pre-assessment` v1.

## 1. 目标重述

`pre-assessment` 不是一个“把内容分成初级/中级/高级”的通用分类器。

它的第一职责是帮助用户在真正投入时间之前做出学习决策：

1. 这个材料我现在适不适合读？
2. 如果不适合，最关键的前置缺口是什么？
3. 如果适合，我应该重点抓什么、可以先跳过什么？
4. 这份材料里哪些部分是“高复用骨架”，值得优先理解？
5. 这些判断为什么成立，证据来自材料本身还是来自用户画像？

## 2. v1 作用范围

### 2.1 v1 先服务什么

v1 只优先服务学习材料工作流：

- `pdf -> md`
- `ppt -> md`
- 用户选中的一段文本
- 该段上下文
- 整份材料的标题 / 来源信息

对应的真实场景是：

- 数学教材
- 课程 PPT
- 课程讲义
- 论文笔记
- 科研方向说明文档

### 2.2 v1 暂时不做什么

以下内容不作为 v1 主目标：

- 直接面向整个代码仓库的前置评估
- 复杂的多轮对话式诊断
- 自动写回用户画像
- 花哨 UI
- 多材料批量比较

### 2.3 为什么这样收敛

这是用户当前最真实、最高频、最容易验证价值的工作流。

如果 v1 同时承担“学习材料评估”和“代码仓库评估”，问题会被做散：

- 输入结构不同
- 判断标准不同
- 输出重点不同
- UI 交互不同

所以 v1 必须先把“学习材料前置评估”做准。

## 3. 产品定位

`pre-assessment` 是 `allinone` 的第一个“学习决策层”功能。

它位于：

1. 材料进入系统之后
2. 深入阅读、划线提问、概念沉淀之前

它的作用不是替代阅读，而是降低盲目投入成本。

## 4. 核心输出

v1 的输出必须回答 5 个问题。

### 4.1 现在是否值得投入

字段建议：

- `readiness`: `ready` | `needs_preparation` | `not_now`
- `confidence`: `high` | `medium` | `low`
- `summary`: 一句话判断

例子：

- `ready`: 可以现在读，但建议先带着两个关键问题读
- `needs_preparation`: 现在直接读会卡住，建议先补某两个前置概念
- `not_now`: 当前阶段投入产出比低，建议延后

### 4.2 最关键的前置缺口

不是列一大堆概念，而是只指出最影响理解的少数缺口。

字段建议：

- `blocking_gaps`: 0-3 个
- 每项包含：
  - `concept`
  - `why_it_blocks`
  - `evidence_source`: `material` | `profile` | `both`
  - `suggested_preparation`

### 4.3 这份材料的高复用骨架

这是最关键的差异点之一。

用户不是要“完整摘要”，而是要先知道这份材料最值得抓住的结构。

字段建议：

- `core_frame`
  - `what_this_material_is_really_about`
  - `3_to_5_key_axes`
  - `what_is_foundational`
  - `what_is_detail_or_later`

### 4.4 阅读策略

字段建议：

- `reading_strategy`
  - `focus_first`
  - `skim_or_skip_for_now`
  - `questions_to_keep_in_mind`

### 4.5 判断依据

所有关键判断必须说明依据。

字段建议：

- `evidence_notes`
  - 这条判断来自内容结构
  - 这条判断来自用户画像
  - 这条判断来自两者的结合

## 5. 输入模型

v1 输入不应再只是一个大文本框。

它应该围绕“材料 + 选区 + 上下文”建模。

## 5.1 请求结构

```json
{
  "source_type": "pdf_md | ppt_md | note_md | other_md",
  "title": "高数第六章 曲面积分",
  "full_content": "整份 markdown 内容",
  "selected_excerpt": "用户当前最关心的一段，可为空",
  "excerpt_context_before": "选区前文，可为空",
  "excerpt_context_after": "选区后文，可为空",
  "user_goal_hint": "为什么现在看这份材料，可为空",
  "profile_overrides": {}
}
```

## 5.2 设计理由

- `full_content`
  用于理解整份材料结构。
- `selected_excerpt`
  用于贴近用户当前真实困惑。
- `excerpt_context_before/after`
  避免只看一句话导致判断失真。
- `user_goal_hint`
  允许用户在“作业 / 预习 / 科研入门”之间显式说明目的。

## 6. 与用户画像的关系

`pre-assessment` 不是只看材料。

它必须读取用户画像，并明确把画像当作判断的一部分。

当前 v1 至少使用这些画像维度：

- 当前学习阶段
- 当前课程 / 知识背景
- 学习偏好：先骨架、后深入
- 当前优先方向：数学优先

但 v1 不自动写回画像。

原因：

- 自动写回风险高
- 容易把临时判断误当稳定画像
- 多 agent 协作下更容易制造脏状态

因此 v1 只输出：

- `profile_update_suggestions`

由用户后续审批是否应用。

## 7. 输出结构草案

```json
{
  "readiness": {
    "level": "needs_preparation",
    "confidence": "high",
    "summary": "现在直接硬读会低效，建议先补两个前置概念再回来。"
  },
  "blocking_gaps": [
    {
      "concept": "隐函数与梯度方向",
      "why_it_blocks": "材料默认你已经接受定向约定，否则会在符号判断处卡住。",
      "evidence_source": "both",
      "suggested_preparation": "先补一个关于梯度与法向量关系的短讲解。"
    }
  ],
  "core_frame": {
    "what_this_material_is_really_about": "这份材料的核心不是计算步骤，而是定向约定如何影响公式选择。",
    "key_axes": [
      "对象是什么",
      "默认约定是什么",
      "哪些步骤只是机械计算",
      "哪里需要几何直觉"
    ],
    "foundational_first": [
      "定向的来源",
      "公式背后的几何意义"
    ],
    "detail_for_later": [
      "长计算例题",
      "重复型技巧"
    ]
  },
  "reading_strategy": {
    "focus_first": [
      "先看定义与约定，不急着做题",
      "先理解两个例题的共性"
    ],
    "skim_or_skip_for_now": [
      "重复计算练习先略过"
    ],
    "questions_to_keep_in_mind": [
      "这里默认了什么方向约定？",
      "这一页是在教概念还是教技巧？"
    ]
  },
  "evidence_notes": [
    {
      "claim": "你会在定向问题卡住",
      "basis": "材料大量省略隐式约定；用户画像显示更需要中间层解释。"
    }
  ],
  "profile_update_suggestions": [
    {
      "type": "possible_gap",
      "content": "在数学学习中，用户更容易卡在教材省略的中间层桥接概念。"
    }
  ]
}
```

## 8. 前端交互

### 8.1 页面目标

页面不是“提交文本 -> 看 JSON”。

而是让用户迅速得到一个可执行的学习判断。

### 8.2 页面组成

建议保留独立页面：`/pre-assessment`

页面区域：

1. 材料信息区
   - 标题
   - 来源类型
   - 用户目标说明（可选）
2. 材料内容区
   - 整份 MD 输入
   - 选区内容输入（可选）
   - 前后文输入（可选）
3. 结果区
   - 现在值不值得投入
   - 最关键缺口
   - 高复用骨架
   - 阅读策略
   - 判断依据
4. 画像更新建议区
   - 仅展示建议，不自动应用

### 8.3 UI 原则

- 第一屏先给结论
- 第二屏再给依据
- 卡片数量少于旧版方案
- 避免“看起来信息很多但不知道该怎么办”

## 9. 后端实现建议

## 9.1 新增文件

- `api/pre_assessment.py`
  - 请求/响应模型
  - 画像读取
  - prompt 构造
  - LLM 调用
  - JSON 解析

- `src/app/pre-assessment/page.tsx`
  - 页面容器

- `src/components/PreAssessmentCards.tsx`
  - 结果卡片

- `src/types/pre-assessment.ts`
  - TS 类型

## 9.2 修改文件

- `api/prompts.py`
  - 新增 `PRE_ASSESSMENT_SYSTEM_PROMPT`

- `api/api.py`
  - 注册路由

- `next.config.ts`
  - 添加 rewrite

- `src/app/page.tsx`
  - 入口导航

## 10. Prompt 原则

prompt 必须约束模型做这几件事：

1. 不要泛泛总结材料
2. 优先判断“用户现在读这个是否合适”
3. 不要罗列过多概念
4. 明确区分：
   - 内容本身的难点
   - 用户当前阶段的难点
5. 输出必须面向行动，而不是面向分类

## 10.1 输出长度控制原则

这里不采用“总字数越短越好”的机械压缩。

真正要控制的是：

- 跑题程度
- 项目数量
- 每个区块承担的职责

而不是简单压缩所有解释。

### 两层输出原则

输出应分为两层：

1. 决策层
   - 必须短
   - 只回答“现在该不该读、先补什么、先抓什么、先跳过什么”

2. 依据层
   - 可以适度展开
   - 只能解释决策层的判断
   - 不得扩写成整份材料摘要

### 允许详细的地方

可以在“真正的卡点”上稍微详细。

例如：

- 为什么某个隐含约定会卡住用户
- 为什么某个前置概念是阻塞性的
- 为什么建议先抓某个骨架

### 不允许详细的地方

不应在这些地方扩写：

- 泛泛背景介绍
- 整份材料摘要
- 大量概念百科式解释
- 与当前决策无关的延伸讨论

### 建议上限

- `readiness.summary`
  - 1-2 句
- `blocking_gaps`
  - 最多 3 个，理想状态 1-2 个
- `core_frame.key_axes`
  - 3-5 条
- `reading_strategy.focus_first`
  - 最多 3 条
- `reading_strategy.skim_or_skip_for_now`
  - 最多 3 条
- `evidence_notes`
  - 最多 3 条，每条只解释一个关键判断

### 核心判断

宁可在关键桥接点上多解释一句，也不要把输出做成空洞但整洁的“短答案”。

如果结果很短，但不能真正帮用户知道自己卡在哪里，也视为失败。

## 11. 非目标与风险

## 11.1 非目标

- 不做自动课程规划器
- 不做完整画像编辑器
- 不做代码仓库难度分析器

## 11.2 主要风险

1. 输出太像“摘要”而不是“决策建议”
2. 输出太长，反而增加负担
3. 过度依赖用户画像，导致误判
4. 选区上下文不足时给出过强判断

## 11.3 风险控制

- 要求输出 `confidence`
- 要求标注判断依据
- 对上下文不足场景允许输出低置信度
- 限制 blocking gaps 数量

## 12. v2 扩展方向

v2 才考虑统一扩展到代码材料：

- `source_type = repo_file | repo_module`
- 输入变成：
  - 文件内容
  - 文件路径
  - 仓库上下文
- 输出变成：
  - 读这个文件前要会什么
  - 这个模块在整体里起什么作用
  - 哪些文件先读，哪些后读

也就是说：

v1 解决“学习材料要不要现在读、怎么读”
v2 才解决“代码材料先读哪里、如何入门”

## 13. 验收标准

如果一个数学 / 课程材料样例输入后，结果不能明确帮助用户回答下面这些问题，则视为失败：

1. 我现在该不该投入时间？
2. 我最需要先补什么？
3. 这份材料先抓什么骨架？
4. 哪些部分先别陷进去？

如果输出只是“这是中级内容，涉及概念 A/B/C”，也视为失败。

## 14. 当前建议结论

当前建议将 `pre-assessment` v1 明确收敛为：

- 面向学习材料
- 面向学习决策
- 面向“先骨架后深入”的用户偏好
- 面向后续划线提问与概念沉淀的前置层

在这个版本做对之前，不要把它扩展成仓库级统一评估器。
