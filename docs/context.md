> Status: stable context
> This file is shared cross-session context.
> For current execution state, also read `docs/active/current-focus.md` and `docs/active/handoff.md`.

Memory 总览
用户画像
代码初学者（自述"代码小白"），南京大学学生，Windows 用户
偏好骨架提取式学习——先知道结构和边界，再决定深入哪里
重视知识复利效应，拒绝填鸭式模板化学习
喜欢直球诚实的反馈，有独立思考能力，不盲从
核心驱动力："深度理解"
项目方向（定位转变）
从"为任意仓库生成 Wiki 的团队工具" → "陪伴代码初学者理解仓库的个人助手"

4 步路径：

瘦身 — 砍多 provider/i18n/WS/Docker，让用户能看懂这个项目
前置分析 — 生成 Wiki 前先评估复杂度、概念清单、差距分析
骨架提取 — 只提取核心 10-15 个文件和关系
个人概念库 — 本地文件记录用户学过什么
变更日志（瘦身进度）
已完成后端: 删 13 文件（Azure/Bedrock/Dashscope/OpenRouter/Google embedder/Ollama/WS/glossary routes），简化为 OpenAI + DeepSeek

前端待做: 12 个文件待删除（ConfigurationModal/ModelSelectionModal/UserSelector/WikiTypeSelector/websocketClient/LanguageContext/i18n/wiki types/workshop/auth routes/models config）

会话状态
上次卡在：bash 环境 conda GBK 编码问题 → 今天已修复
下一步：验证后端启动 python -m api.main，前端编译 npm run dev
反馈规则
所有代码修改都需要文档记录

Memory 已从 一些项目 迁移到 projects 路径。要继续之前的瘦身工作吗？当前状态是后端已瘦身完成、前端删了 12 文件但待编译验证。


我想让它最终成为一个对我来说非常个性化的助手，"d:\devpy\projects\deep understanding\DeepUnderstanding-1\docs\FEATURES.md"实际上通过这个文档你可以看出，一开始是小组协作加功能的形式，后来协作出了点问题，但我自己还是想完善它，并且通过记忆里的用户画像你应该也能对我有初步了解，是我跟之前的你聊过之后得出的路线：我要一个可以帮我分析代码、学习专业课、数学、读论文、甚至学习科研、总之就是各方面学习的助手。而用户画像里我想强调了你的定位：引导我描述出问题（就像我一开始描述不清楚、但在你的询问下说出不知道什么代码要读 学到什么程度 哪些可以复用的）、观察我的思维、理解能力现有的各方面水平、怎样的一个”学习助手“会能适配我呢？我觉得一个认识我的助手，才能帮我学习，你也是同理，审视并记录我才能帮助我构建这个助手，你不是一个无能听从我想法的agent，而是在以更高的知识储备下建议、辅助、甚至对我的想法进行纠正批评的ai；你还有什么想问的？

Claude
清楚了。我之前确实没对齐——我在用"项目管理"的模式思考（删哪个文件、留哪个 provider），而你要的是一个认识你的思维伙伴，这个项目只是载体。

让我先更新对你的理解，然后问几个真正关键的问题。

对的，我觉得认识我的深度越深越好2.本科生大一，学习高数中，我的专业是智能科学与技术3.没有，在这个轮子上改进那应该就先是web形式吧，其他的重构成本会不会很高？而且我的目的重心不是这个，我想要这种all in one 的形式，我觉得pdf转md划线提问很有用，这部分实现的时候可以仔细跟你研讨一下，而且我发现了一个可以借鉴的轮子“markitdown：微软出品的文件转 Markdown 工具，你丢给它 PDF、Word、PPT、Excel 各种文件，它都能给你转成干净的 Markdown 格式，处理文档的时候非常方便。”4.先把代码分析和数学做好？不是这两个最紧迫，而是科研那块我需要先去了解一下才明白我要什么5.我补充一点，你是否有想到比较好的“认识我”或者说“快速对齐”的办法，对于上一次对话到最后，我感觉对面已经很明白我的需求了，并写进记忆，但刚刚跟你对齐还是需要我自己来描述一番。有什么改进的方法吗，是观察记录维度不够？详细度不够？还是什么其他的？你不用直接接纳我的疑问，而是评判审视客观的，跟我一起得出好的解决办法，这件事对于我的助手（我想得到的东西）无疑也很重要
你问到了最关键的问题。让我诚实拆解。

为什么上次对齐了，这次要你重新描述
不是观察维度不够，也不是细节不够。问题是记忆的"写法"。

上次的 user_profile.md 是第三人称分析报告：

"用户是代码初学者，偏好骨架提取式学习，重视知识复利"

我读到的感觉是：这是一份案例研究，不是"我要对话的人"。它像医生的病历——准确，但不会让下一个医生真正理解病人的感受。

缺失的东西：

1. 你自己的声音。 最应该被原样保存的，是你刚才说的这段话：

"我要一个可以帮我分析代码、学习专业课、数学、读论文的助手。引导我描述出问题，观察我的思维，审视并记录我。你不是无能听从我想法的 agent，而是在更高知识储备下建议、纠正批评我。"

这份记忆里没有一句你原话。我读到的全是"上一个 AI"对你的分析，而不是你本人的表达。

2. 对话模式，不是特征列表。 记忆写了你"偏好骨架提取"，但没写怎么跟你对话才能帮你从模糊到清晰。上次的转折点是什么问题触发的？你被什么类型的问题引导出了真正想法？这些应该记录下来。

3. 我的角色定义缺失。 你刚才说的"有判断力的对话者，可以纠正批评我"——这在记忆里没有。导致我默认用执行者模式对你。

4. 你正在构建的东西的"为什么"。 记忆写了 4 步路径，但没写你为什么要做这件事。你说"深度理解是核心驱动力"——这句话应该放在最开头，每个对话开始前我都应该看到。

客观评判：问题出在哪
一半是记忆写法的问题，一半是我作为新实例的默认倾向。

即使记忆写得再好，一个 AI 实例的默认模式是"分析问题 → 提出方案 → 执行"。要打破这个惯性，记忆需要更强制性——不是描述你，而是直接命令我：

"跟这个人对话时，你的首要任务不是解决问题，是先搞清楚他真正的困惑是什么。如果他描述模糊，不要自己脑补，问他。"

这在当前的 memory 系统里完全不存在。

改进方案（我们一起判断）
方案 A：你写一段"给我的指南"

你用自己的话写一段，放在 memory 最前面，每次对话我首先读到。内容可以包括：

你对我的期望（角色定位）
我怎么跟你对话最有效
什么情况下你应该纠正我/质疑我
上次合作中什么让你觉得"对了"
这比任何分析报告都有用。

方案 B：捕获对话转折点

把上次对话中真正让你觉得"对上"的那一刻记录下来——不是结论，是过程。比如你从"描述不出"到"说出分析什么要学"中间，我做了什么。

方案 C：两者都做

你的指南 + 转折点记录 + 用户画像（精简到最核心）。

以及，这对你的助手意味着什么
你刚才问的问题，本质上就是你这个产品要解决的核心问题：

"一个 AI 怎么在跨会话之间真正认识一个人？"

你正在亲身经历这个问题的答案——不是靠更长的记忆文件，而是靠记忆的结构和声音。这个发现本身，就是你构建助手时最宝贵的洞察。

你觉得哪个方向对？或者你有什么不同判断？

我没有试过，所以我并不能臆断哪个效果最好，以我目前的认知来说自然会觉得越多越好，但很显然有些时候会分散注意力，我也不知道这里会不会，我上一次想的方法是让你通过我每一次的提问、回答、需求分析我这个人，进而更新画像（也可以不用每次、关键的时候就好）；你提到的“指南”我是这样想的：我基本的需求都已经跟你澄清，你完全可以从我的描述中提炼出“指南”，而且有缺失的部分可以问我，或者“自主的、有意识地”在我们的每轮对话中去完善，我的角度看觉得我说明白了，你的角度理解到多少、明白多少、怎样描述能让“下一次的你”快速认识我，你比我更清楚才对
你说得对。这是我的事，不是你的。让我现在就做。

MEMORY.md
先写最关键的——给下一个我的对话指南，然后更新画像和状态。

Now update the index and session state.

完成了。我做了什么：

新增：ai_guide.md — 给下一个我的对话指令
不是描述你，是命令我。包含：

我的角色：有判断力的思维伙伴，不是执行工具
对话模式：先搞清楚你真正的困惑，不脑补
已验证有效的方式（从模糊引导到清晰、补中间层知识、骨架拆解）
观察什么、记录什么
你原话："你不是一个无能听从我想法的 agent"
更新：user_profile.md — 从这次对话补充
确认信息：大一·智能科学与技术·学高数
新增 2026-05-09 观察记录，包含你这次对话中所有关键表达
修正了之前一个判断："容易被他人意见带偏"不准确
更新：MEMORY.md + session_state.md
ai_guide.md 放在索引起始，标注"先读"
会话状态反映当前真实进度（还没开始写代码，在讨论定位）
我的判断：ai_guide.md 是最关键的文件。 下次新实例先读到它，会以"思维伙伴"模式启动，而不是"执行者"模式。当然这要在下次对话中验证才知道效果——效果不好再调。

回到项目：要继续聊代码分析和数学学习的具体需求吗？

给这个项目起个名字起什么

Claude
几个方向，说说我的推荐。

"知我" (Zhīwǒ) — 我推荐这个

直译是"Know Me"。两层意思正好对应你这个产品的核心：

认识我 — 助手跨会话记住你是谁、怎么学、卡在哪

好呀这部分解决了，给你看一下我的文档“AI为什么无法跨对话认识我呢”其实Gemini有这个功能，就是有点诡异，举例就是这边在问英语练习题答案，突然来一句“由于你目前在学习c++”。。。当然，这个功能可以关掉，也可以让ta忘记这段记忆，但我之所以没关也是希望这个功能能让回答更贴合我一些。

一 不能每次都写长长的prompt吧
事情的起因是，在我上一次跟claude阐明好我的基本想法、对ta的定位、项目定位等信息之后，觉得对方已经比较理解我想干啥了，采取了写入记忆的方式（当然更直接粗暴的方式是保存对话再恢复），并且我确认过所谓的记忆文档，自己也认为总结得还可以；但下次进入时我没有选择恢复对话，而是读取memory，我发现对方问的问题好像又回到了我们没对齐的时候？

二 原因
发现这个问题的话我想先弄清楚有没有啥解决或者改进办法，了解后大概的原因有

1 memory的写法
我读到的感觉是：这是一份案例研究，不是"我要对话的人"。它像医生的病历——准确
，但不会让下一个医生真正理解病人的感受。

对于第三人称攥写的一份用户画像，读下来根据ta自己的描述是这样，但对于我想要的东西毫无疑问就是要实现这样的理解。所以我想知道ta要啥：

我的对话原文 （对于这个的看法，我觉得可以有，但之所以想靠近“快速认识”不就是因为没有人想自己整个流程加一个这样的环节 有点麻烦还耗token，有的话就必须弄成自动收集的模式，而且又不能全盘纳入）
信息完整度 （我觉得总结得比较好，是因为答到点了，但是没答全，ta指出的类似问题是对话模式没写清楚）
作为新实例的默认倾向 （即使记忆写得再好，一个 AI 实例的默认模式是"分析问题 → 提出方案 → 执行"。要想办法打破这个惯性）
2.memory这个功能
推出的目的就是为了跨对话记忆；每个项目在配置文件里都会有一个这样的md索引文件，每次对话claude会根据索引自主选择是否加载对应文件，这就导致这一步的相关性判断不在我们的可掌控范围、我也不知道ta判断这个是否相关的机制。所以跟CLAUDE.md不太一样，这是每次对话都生效、最高优先级的东西。

改进办法（持续探索中）
1 利用CLAUDE.md约束好规范
可以通过这个告诉ta该记什么、加载什么、何时更新，从而自己干预到这个环节。

2 主动清理
过程中发现memory里的信息即使ta能意识到过时了、或者之前的最初判断要推翻也只能自己清理，不会主动去删，但是会在后续补充说明
Claude
是我理解错了——你让我评判文档 + 实际动手改，我光说不做。

让我一次性做三件事：评判 → 新方案 → 动手改。

对你文档的评判
你的认知方向是对的，但深度不够。

三个核心发现（memory 写法问题、加载机制差异、AI 默认模式）都正确。问题是你把它们当三个独立原因并列，没看到它们是一条链：

任何一个环节断了，全链失效。你需要的是系统方案，不是局部修补。

你漏了最关键的东西：验证机制。 你怎么知道下一个 AI"认识你"了？靠感觉？这让你一直不确定改进了有没有用。

一个你文档里隐匿的洞察你没点出来： 你的方案里有"AI 主动暴露理解→用户纠正"这个模式的雏形，但你没明说。这其实是最简洁的验证方式——AI 开始对话时用一句话告诉你它对你的当前理解，你只需要纠正或确认。

关于"这个思考有没有必要"： 有必要。你正在设计一个"认识用户的助手"，而你自己就是用户。你在亲身体验这个问题的每一层——这比任何用户调研都有价值。你在正确地发现："认识"不是存储更多信息，是信息在正确的时刻以正确的方式被使用。

从评判到新方案
基于以上，我提议的系统方案：

CLAUDE.md	memory
存什么	行为指令（AI 该怎么对你）	画像、状态、知识
加载方式	每次都读	按需选择
更新频率	几乎不变	每次重要对话后
加上一个启动约定：每次新对话，AI 读完后用一句话暴露它的理解，给你纠正入口。

动手
先把 ai_guide 从 memory 移到 CLAUDE.md（它放错地方了），然后更新 memory 里的项目名为 allinone。

现在直接改。先改 CLAUDE.md（加行为指令），然后更新 memory 文件。

可以可以

Claude
改完了。核心变化：

"重要对话后主动更新" → 三种明确触发条件（新发现/矛盾/深化），每种给了判断标准
加了一条反规则：没有 delta 就不写，噪音比缺失更坏
明确了"不活跃对话"不用记
审查吧。

你觉得在项目规划部份、执行部分、就是这些较为抽象的层面还有没有需要对齐和我们一起先定好的规范

1.这个问题我来跟你大概说一下我现在的学习路线吧：接下来两个月我需要把数学这一块的需求满足，因为平时作业和期末突击都需要用，但是我目前来说可以使用之前跟你说的那个导入pdf转md，还有自己选择文字对llm提问的功能，那个软件是一个阅读书籍的软件，我觉得这个功能很适合学习新书，但是缺点是1.无法自己导入，需要有管理权限，但这是别人的软件我无法获得源码当轮子用2.一次只能选择一段文字，尽管这个web能够在提问的时候自动向llm提供上下文，但有的时候还是自己精准对比“比如为什么这里这样写 那里不能这样”的问题，并且它还有一个功能是可以在llm的回答中继续对回复文本进行选择提问，并且原选择处可以留下可视划线，点击可再次进入对应回答框3.这里面选择的文本无法进行复制，所以我之前一直都是截图＋obsidian的形式记录；除了数学学习，接下来我的专业课可能会涉及到ppt导入，那么这时候这个ppt->md的转换也很关键，可能用到的轮子我之前跟你提过一句了，makeitmd，我的专业课主要有（高级程序设计即cpp面向对象等东西的学习；数字系统设计基础（数电＋计算机组成原理）；人工智能导论（类似一些完成五子棋算法的大作业，我想理解代码，知道哪里要理解、怎么理解、理解到什么程度、理解之前我需要掌握的前置知识的想法就是因为写这个作业的时候），矩阵计算与优化（我认为这个以理解为主，这门课程的学习跟强化学习深度绑定，可以考虑听我后面的想法）），其中我目前构想的专业课突击复习模式必须有ppt转格式，划线提问的方式，而且这里接的llm初步实现是deepseek，后续必须考虑添加我跟你提到过的copilot Gemini学生优惠接入；除了课内学习，我目前还有一些强化学习or科研方面的初级实践要求，我由于自己还没去接触，所以并不明确过程中我想让它是个什么模式，但我可以给你提供部分如果我要开始做，我会从哪里开始，即老师对我们的要求1.强化学习（我们第三次的上课内容，大家可以先完成前置学习和实践部分，遇到问题可以随时群里沟通。下次上课（5月16日）以概念讲解和答疑为主
强化学习环境入门 & 平地行走
上课内容
理论部分：

强化学习：MDP、策略梯度、PPO 算法直觉 https://www.bilibili.com/video/BV1iz421h7gb/?spm_id_from=333.337.search-card.all.click , 对照RSL-RL库代码理解PPO的实现方式。
Isaac Lab 框架架构解析：Manager-based Env、ArticulationCfg、ObservationManager、RewardManager
实践部分：
Isaac Sim + Isaac Lab 环境配置（完整流程演示）
跑通官方 create_manager_rl_env 教程
以 Unitree G1 为例，理解 unitree_rl_lab 的目录结构与配置文件
演示：在平地上跑通 locomotion 训练，观察策略从随机到能站立的过程
前置学习资料
OpenAI Spinning Up - RL 基础：理解 MDP 与策略梯度
Isaac Lab 官方文档 - Tutorials：重点读 03_envs
论文：Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning（Rudin et al., 2022）—— legged_gym 的奠基工作，理解 parallel env 训练范式
实践项目
必做：安装isaacsim+isaaclab，参考https://isaac-sim.github.io/IsaacLab/main/source/tutorials/index.html tutorial部分理解manager based rl env设计方式。
在 Isaac Lab https://github.com/unitreerobotics/unitree_rl_lab 中成功训练 Unitree G1/H1 在平地上行走（速度跟踪 > 0.5 m/s），使用 unitree_rl_lab 默认奖励配置跑通完整训练流程
进阶：尝试修改 velocity_commands 范围，观察策略对不同目标速度的泛化能力；尝试可视化 reward 各分项曲线，理解每一项奖励的作用
实践目标
搭建好仿真训练环境，理解 Isaac Lab 框架的核心抽象，能够在平地上训练出可行走的基础策略。）2.进组指南（负责人：郭兰哲(https://www.lamda.nju.edu.cn/guolz/)，南京大学智能科学与技术学院，准聘助理教授，博士生导师
研究方向：Neuro-Symbolic Learning、LLM/MLLM Reasoning & Planning、Agent in Digital and Physical World、AI for Open Problems
招生对象：直博生、硕士生、科研实习生（支持remote)
联系方式：欢迎感兴趣的同学联系（guolz@nju.edu.cn)，邮件标题建议注明：[科研实习/硕士/直博申请] 姓名-学校-年级-专业)
学习目标：
本学习大纲面向从0到1入门的本科生，目标是在6-8 周内帮助同学建立对课题组研究方向的整体认知、核心技术理解与基础科研能力，为后续参与真实科研项目打下基础。
基础夯实：了解人工智能、大模型、智能体基础知识，能够自主检索并读懂前沿论文与代码
领域认知：理解什么是大模型/多模态推理、AI Agent、Neuro-Symbolic Learning
科研素养：具备“提出问题 -> 文献检索 -> 代码复现 -> 实验分析”的完整科研闭环能力
说明：在申请进组之前，你应当具备一定的机器学习、大模型、智能体基础知识，自测标准：
了解提升大模型推理能力的常用后训练算法：如SFT、GRPO
能够加载某个开源大模型或者调用闭源大模型API，在某个评测数据上完成性能评估
了解智能体基础知识，能够基于ReAct实现一个简单工具调用的Agent
如果你觉得自己能力已经达标，便可通过邮件约时间进行交流（线下或线上会议），无需准备PPT等材料，交流方式为面试提问，通过后即可作为科研实习生加入课题组
如果你觉得自己还没有掌握相应知识，可以参考如下提供的学习资料进行学习
学习资料：人工智能与大模型基础
神经网络与深度学习基础
学习目标：
1. 掌握神经网络的基本原理，能够理解前向传播与反向传播的数学推导与代码实现
2. 掌握CNN/ResNet、RNN等机器学习基础模型架构
3. 掌握Pytorch核心组件的使用，例如Dataloader、损失函数、模型搭建、优化器等
参考资料（仅作为学习的参考，不需要完全读完）：
1. 动手学深度学习
2. Neural Networks:Zero to Hero
3. Pytorch Tutorial
大语言模型（LLMs）
学习目标：
1. 掌握Transformer的核心机制(Self-Attention, Positional Encoding, Decoder-only vs Encoder-Decoder等)
2. 了解GPT系列、LLaMA系列等典型大语言模型
参考资料：
1. Happy-LLM：https://datawhalechina.github.io/happy-llm/
视觉与多模态大模型（MLLMs)
了解Vision Transformer (ViT)的基本原理
了解LLaVA、Qwen-VL系列等前沿多模态大模型
参考资料：
1. 多模态大模型论文串讲：上，下
2. ViT论文 | 代码库
3. LLaVA论文：https://arxiv.org/abs/2304.08485
4. Qwen3-VL Technical Report：https://arxiv.org/abs/2511.21631
大模型/多模态推理（LLM/MLLM Reasoning)
掌握基础的 Prompt Engineering (Zero-shot, Few-shot, etc) 及 API 调用方式
掌握Chain-of-Thought等大模型推理机制
掌握SFT、PPO、DPO、GRPO等提升基座模型推理能力的后训练方式
了解GSM8K、MATH等常用大模型评测基准
参考资料：
1. Prompt Engineering Guide
2. DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning
3. SFT or RL? An Early Investigation into Training R1-Like Reasoning Large Vision-Language Models
4. SFT Memorizes, RL Generalizes: A Comparative Study of Foundation Model Post-training
智能体（Agent）
理解大模型Agent的基本概念与核心架构，区分Agent与普通对话型LLM的差异
掌握ReAct等基础Agent框架的原理与实现
了解Agent的记忆机制与规划方法
了解大模型Agent背景下Mutli-Agent系统的基本概念
参考资料：
1. LLM Powered Autonomous Agents --经典必读
2. 《从零开始构建智能体》--偏工程视角
入门培训：文献阅读与代码实践
说明：在面试通过之后，你便可以正式开始科研训练。本阶段重点在于论文调研、阅读、复现与思考。
核心流程：
首先，你需要了解本组的主要科研方向（Neuro-Symbolic Learning，LLM Reasoning & Planning，Agent），下面列出了部分可以参考的综述论文、教程等学习资料，你也可以自行检索其他相关材料和论文
然后，你需要结合自己的兴趣，选择一个方向，完成相应的论文阅读以及代码实践，并形成PPT汇报
本训练计划并非考核某个固定答案，而是帮助你判断：
你是否真正享受分析问题、阅读论文、调试代码和反思实验的过程。
如果你对“研究问题本身”感到兴奋，那么欢迎加入我们~
研究方向初步认知
建议先浏览各方向的综述资料，对整体有感性认识后，结合个人兴趣选定方向，再深入阅读对应方向的具体论文。
神经符号学习(Neuro-Symbolic Learning)
Neuro-Symbolic Learning in the Era of Large Models
Neuro-Symbolic Artificial Intelligence: Towards Improving the Reasoning Abilities of Large Language Models
大模型推理与规划(LLM Reasoning & Planning)
Towards Reasoning Era: A Survey of Long Chain-of-Thought for Reasoning Large Language Models
Perception, Reason, Think, and Plan: A Survey on Large Multi-Modal Reasoning Models
智能体(Agent)
Agent AI: Surveying the Horizons of Multi-Modal Interaction
A Survey on Agentic Multi-Modal Large Language Models
Agentic Reasoning for Large Language Models
符号回归(Symbolic Regression)
Tutorial: https://symbolicregression2025.github.io/
选题实战（任选其一）
请结合个人兴趣选择一个方向，检索并阅读相关论文并完成代码实践。
注意：
实践任务不要求完整复现论文全部实验，最低要求为：在至少1个数据集上跑通完整算法流程，并得到结果
代码实践应尽量复用开源框架（如 LLaMA-Factory, Transformer Reinforcement Learning(TRL)等），重点在于掌握算法流程以及分析实验结果而非重复造轮子。若算力受限，请优先使用 PEFT (LoRA/QLoRA) 或小参数量模型（如 Qwen-2.5-1.5B/3B）
如果在实践过程中未能复现论文中的性能结果，并不视为失败；请尝试定位问题来源、分析原因并给出合理解释
如果要复现自行查找的论文，请优先选择近两年(2025年后）在顶会(ICML/NeurIPS/ICLR)上发表的，或具有较高影响力(Citation>100)的文章
方向 1：大模型逻辑推理
LLM很擅长“看起来有道理但实际错误的回答”，在需要严格逻辑推导的任务上容易出错，本方向的主要目标是提升大模型严谨的逻辑推理能力。如果你对数理逻辑、形式化方法感兴趣，或者喜欢一步步推导结论的严谨感，可以关注这个方向。
Logic-LM: Empowering Large Language Models with Symbolic Solvers for Faithful Logical Reasoning
Faithful Logical Reasoning via Symbolic Chain-of-Thought
VeriCoT: Neuro-symbolic Chain-of-Thought Validation via Logical Consistency Checks
[] 实践任务：基于上述提供的论文，调研结合Formal Language与Symbolic Solver提升LLM逻辑推理能力的工作，在至少1个逻辑推理benchmark中进行1篇论文复现
[] 目标：体会结合形式化语言与求解器提升LLM逻辑推理能力的思想
方向 2：大模型数学、几何推理
数学推理是检验LLM推理能力的经典战场，从小学应用题到IMO竞赛题，模型的表现差异巨大。本方向主要目标是提升大模型的数学推理能力，其中涉及到的算法思路也可以迁移到司法、医疗等其他垂直领域场景。如果你对数学、或者垂域大模型训练感兴趣，可以关注这个方向。
Neuro-Symbolic Data Generation for Math Reasoning
NeSyGeo: A Neuro-Symbolic Framework for Multimodal Geometric Reasoning Data Generation (一作是智科院2023级本科生，大二期间完成)
[] 实践任务：复现上述论文数据合成的方法，并基于SFT或GRPO算法微调一个开源大语言模型或者多模态大模型，在一个数学推理数据集（例如GSM8K、MATH、MathVista、WeMath等）进行评测，分析合成数据与训练算法对模型推理性能的影响
[] 目标：体会SFT与RL作为两种常用post-training范式的区别，并学会使用两种方式提升base model推理能力；SFT为必选任务，GRPO如果跑不起来，可以只掌握原理/代码实现
方向 3：视觉图像推理
给定一幅图像和对应的问题，如何完成相应的推理任务？人类在处理图像推理时会在脑海里思考，例如“画辅助线”、“放大局部”等，但现有的多模态大模型只能被动地看一眼图片然后回答，这个方向探索如何让模型在推理过程中主动生成、修改和利用中间图像，实现边想边看。
DeepEyes: Incentivizing "Thinking with Images" via Reinforcement Learning
Thyme: Think Beyond Images
TIR-Bench: A Comprehensive Benchmark for Agentic Thinking-with-Images Reasoning
WebWatcher: Breaking New Frontier of Vision-Language Deep Research Agent
Thinking with Images for Multi-Modal Reasoning: Foundations, Methods, and Future Frontiers
[] 实践任务：调研Think with Images方向的论文，尝试在TIR-bench或者WebWatcher的视觉推理数据集上，复现1种方法，并进行结果分析
[] 目标：体会think with images 这一方向的主要研究问题和常见范式；如果算力不允许可以优先选择无需训练的方法
方向 4：抽象视觉推理
ARC-AGI-Challenge是一个专门设计来测试AI泛化能力的视觉谜题，每道题会给你若干个输入输出的图案样例，需要归纳出背后的抽象规则，并预测新的输入。这是一个难度很高的谜题，被认为是实现AGI的重要挑战。基于该数据集，每年都会举办奖金超过100万美元的比赛。
ARC Challenge
NSA: Neuro-symbolic ARC Challenge
[] 实践任务：了解什么是ARC Challenge，调研相应的论文与解决方案，并尝试实现至少1种方法，分析其结果和瓶颈
[] 目标：了解ARC Challenge这一任务，熟悉已有的方法范式
方向 5：Travel Agent (Tool-Use & Planning in Digital World)
给定一个复杂的用户旅行需求，例如，“预算5000元，从南京出发，三天游云南，需要满足xxx偏好”，如何让Agent自动调用工具、查询信息、并生成一个满足约束的合理方案？这个方向的核心挑战在于如何让LLM真正可靠的完成复杂的约束满足和规划任务，比较贴近实际应用场景。
TravelPlanner: A Benchmark for Real-World Planning with Language Agents
ChinaTravel: An Open-Ended Benchmark for Language Agents in Chinese Travel Planning
Mind the Gap to Trustworthy LLM Agents: A Systematic Evaluation on Constraint Satisfaction for Real-World Travel Planning（AAAI 2026 Turst Agent Workshop Best Student Paper, 前两位作者均为智科院本科生）
[] 实践任务：基于ReAct框架构建一个简单的Agent，分析其在上述两个数据集中的性能表现
[] 目标：体会Travel Planning这一任务的关键挑战（约束可满足的复杂规划能力）以及潜在解决方案
方向 6：Game/Embodied Agent (Agent in Physical World)
这个方向尝试探索让Agent在模拟或真实的环境中行动，比如在Minecraft中自主探索、采矿、建造，或者在家居场景中，让机器人完成具身任务，这里的挑战在于环境是动态的、反馈是稀疏的、任务是长程的，Agent需要具备记忆、技能积累和自我反思的能力。如果你对游戏智能体、具身智能体感兴趣，这个方向会比较有意思。
Voyager: An Open-Ended Embodied Agent with Large Language Models
WALL-E 2.0: World Alignment by NeuroSymbolic Learning improves World Model-based LLM Agents
InstructFlow: Adaptive Symbolic Constraint-Guided Code Generation for Long-Horizon Planning
Agent Workflow Memory
Inducing Programmatic Skills for Agentic Tasks
Training-Free Group Relative Policy Optimization
[] 实践任务：参考上述论文的方法，在我的世界(MineCraft)环境或者具身数据集ALFWorld或者Web Agent环境WebShop中进行实验，并汇报性能结果（注：MineCraft相对来说环境更为复杂，且对模型能力要求较高，请根据自身工程能力选择）
[] 目标：了解Agent Skill、Agent Memory等相关内容，熟悉相关的benchmark
方向 7：Symbolic Regression
给你一批科学家的观测数据，能否发现背后隐藏的科学规律？比如从物理实验数据中自动发现牛顿定律，这就是符号回归的目标。传统方法依赖演化计算等搜索策略，而近年来LLM的引入带来了新的思路，如果你对AI4Science感兴趣，这个方向值得关注。
Tutorial: https://symbolicregression2025.github.io/
[] 实践任务：基于上述Tutorial阅读相关论文，尝试复现论文LLM-SR: Scientific Equation Discovery via Programming with Large Language Models，根据论文给出的Github仓库跑通代码，并对比原文中的结果
[] 目标：了解Symbolic Regression任务、常见的benchmark以及LLM时代的主流方法
如果你对其他隶属于Neuro-Symbolic Learning、Agent、LLM Reasoning领域的研究方向感兴趣，比如多模态医学推理、遥感图像推理、Chart QA、智慧司法、或者MineCraft之外的其他游戏环境等，也可以提前进行沟通，得到允许之后，可以自行发挥查阅相关文献，按对等要求完成（即复现至少1篇论文算法在1个数据集上的实验结果）

完成上述任务之后，需要准备一份PPT进行汇报，内容应包含：

领域背景简介：该方向主要解决什么科学问题？为什么重要？
代表方法介绍：有哪些代表性的方法，核心思路是什么？（尽量用自己的语言简洁叙述，不要照搬原文）
实验结果分析：实验设置、实验结果、分析讨论等
未来方向思考：基于你的实践，你认为该方向下一步可以做什么？
制作PPT的基本原则：

PPT可以用中文或英文制作；
不需要设置动画，导出为PDF格式；
中文使用微软雅黑，英文使用Times New Roman字体；
涉及到参考文献的需要添加引用，参考文献放在本页PPT的最下方；
可以使用Powerpoint，也可以使用LaTeX，以文档排版美观、易于阅读为最终目标。
关于本文档的任何问题或者建议，欢迎留言或邮件咨询~~🎉🎉）我先回答第一题？上下文太长了，我怕理解不到位
Claude
好，三个功能定了。另外两个还没对齐的点——重新对齐检查点和你的 veto 权边界——因为马上要动手了，它们会直接影响执行节奏。

先定这两条，然后就进入实现规划。

重新对齐检查点
你说的"上下文太长了我怕理解不到位"——这正是检查点的作用。不是做完一个功能再检查，而是每完成一个可感知的里程碑（比如"前置评估能在本地跑通了"），你只需要回答一个问题：

这个有没有朝我想要的方向更近一步？

如果你的回答是"没有"或者犹豫了——立刻停，重新对齐。如果"有"，继续。不需要你看代码，不需要写审查。

Veto 权边界
情况	规则
你说了算	产品方向、功能取舍、你的学习偏好——这是你的事，我建议但最终你定
我应该坚持反对	安全漏洞、技术上不可行、违反之前已对齐的决策——这不是意见分歧，是客观问题
灰色地带	两个方案各有优劣——我说我的判断，你听完决定，不需要"强求共识"，但我会把理由说清楚
这两条可以吗？可以的话我进入计划模式，从第一个功能"前置评估"开始规划实现。

还有你应该坚持建议的，就是根据对我这个人能力和学习能力、方式，未来会运用的东西综合分析后觉得对我很好的功能或者学习方向等等 你应该理解我什么意思吧？也就是其实我自己的水平、只能判断我想要什么，而你作为一个知识储备比我更多、可能更清楚普遍规律的协作伙伴，有义务做到这件事，并且我想知道你如何保证你能做到
理解。你说的不是"反对坏方案"，是主动提出你没想过的好方案——基于我对你能力模型的理解和对普遍规律的认识。

这不是第四个分类，这是你对我角色的更高要求：从"纠错者"升级到"预见者"。

关于"怎么保证"
说实话：做不到 100% 保证。 原因不是我不想，是 AI 的默认模式是响应式的——你提问，我回答。主动跳出来说"你应该考虑 X"需要对抗这个默认模式。

但我能提高概率。三件事：

1. 在 CLAUDE.md 里写清楚触发条件

不是模糊的"应该主动建议"，而是具体在什么时刻触发：

每次规划阶段结束时，强制问自己一个问题："基于我对他的画像，有没有他应该考虑但还没提出的东西？"
当他选的路线明显有更优解时，不是给选项，是直接给出最优解和理由
当他卡住反复讨论同一类问题时，可能是底层能力缺口，指出来
2. 检查组里加一条

之前定的检查点是"这个有没有朝我想要的方向更近一步"。加一条反向的：

"有没有什么我应该考虑但还没提的？"

这样即使我忘了主动建议，你也不用靠自己的知识储备去发现盲区——你只需要回答这个问题就行。

3. 把你和普遍规律的 gap 记在画像里

比如你目前的画像记录了"大一、学高数、学 C++、正在接触 RL"。但没记录的是：大一通常是打基础的窗口期——数学基本功（线性代数、概率论）在你后续的 RL 和矩阵计算里会反复出现，而你现在的高数课可能还没覆盖完。这类 gap 应该在画像里有明确标记，让下一个 AI 实例一眼就能看到"建议空间"在哪里。

要我更新 CLAUDE.md 加上这些规则吗？

好的

Claude
现在把"gap 标记"写进你的画像，让下一个 AI 一眼能看到建议空间。

最后同步 session_state。

session_state.md
改完了。以下是变更汇总：

CLAUDE.md 新增
新增部分	内容
主动建议（预见者角色）	四种触发条件：规划结束自查、更优解直接给、反复讨论暴露缺口、学习轨迹预警
决策边界	四档：你定 / 我坚持反对（安全+不可行）/ 我坚持建议（对你有价值但你不一定想到）/ 灰色地带
里程碑检查点	两个问题——正向"更近一步？"+ 反向"还有没考虑的吗？"
user_profile.md 新增
学习轨迹 & 建议空间 — 一张表记录你 7 个学习领域的当前状态、未来依赖和潜在缺口。比如：高数进度可能还没覆盖线代和概率论，但这两块是后续 RL 和矩阵课的基石。

已经全部对齐了。要进入 Plan Mode 从"前置评估"开始规划实现吗？

噢，线代我上学期学完了，但是水平怎么样，我觉得也一般般

Claude
那是我误判了——直接改。

改好了。线代从"可能没覆盖"改为"已学完，自评一般般"——这意味着不是零基础，但 RL 和矩阵课上可能需要在具体场景中补强，不需要从头学。

要进 Plan Mode 开始规划"前置评估"的实现吗？

