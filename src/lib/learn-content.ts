export type LearnSubjectSlug =
  | 'advanced-math'
  | 'probability'
  | 'deep-learning'
  | 'major-course';

export type LearnSubjectCard = {
  slug: LearnSubjectSlug;
  title: string;
  caption: string;
  summary: string;
  tags: string[];
};

export type LearnSubjectInfo = {
  title: string;
  description: string;
  emphasis: string;
};

export const LEARNING_FLOW_STEPS = [
  {
    title: '导入资料',
    detail: '把教材、课件、笔记、往年卷先放进对应学科，不要求你一开始就准确描述自己卡在哪。',
  },
  {
    title: '进入正文',
    detail: '从资料卡直接打开正文阅读，前置评估变成阅读中的辅助按钮，而不是强制入口。',
  },
  {
    title: '边读边问',
    detail: '在当前资料里划线追问，同时带上当前目标和你手动挂上的背景资料来判断。',
  },
] as const;

export const LEARNING_SUBJECTS: LearnSubjectCard[] = [
  {
    slug: 'advanced-math',
    title: '高等数学',
    caption: '适合教材、例题、整章习题和证明推导',
    summary:
      '更强调定义、定理、推导链条和题型迁移。适合一边读正文一边拆步骤、补前置概念、追问为什么这样做。',
    tags: ['教材阅读', '题目推导', '多步追问'],
  },
  {
    slug: 'probability',
    title: '概率论',
    caption: '适合概念辨析、公式理解和题型比较',
    summary:
      '更适合把同类随机变量、分布、期望方差和常见题型放在一起对照，边读边问差别与使用条件。',
    tags: ['概念辨析', '公式条件', '题型比较'],
  },
  {
    slug: 'deep-learning',
    title: '深度学习',
    caption: '适合 lecture notes、论文式资料和方法理解',
    summary:
      '更强调方法背后的动机、模块之间的关系，以及哪些内容值得深挖、哪些内容可以先知道位置再回头补。',
    tags: ['方法理解', '阅读辅助', '研究型学习'],
  },
  {
    slug: 'major-course',
    title: '专业课',
    caption: '适合复习课件、重点整理、考纲和往年卷',
    summary:
      '更强调“为了这次考试该抓什么”。你可以把考纲、重点、往年卷手动挂成背景资料，再回到正文里做针对性追问。',
    tags: ['复习导向', '考核背景', '往年卷联动'],
  },
];

export const SUBJECT_INFO_MAP: Record<LearnSubjectSlug, LearnSubjectInfo> = {
  'advanced-math': {
    title: '高等数学',
    description:
      '这里更适合放教材、整章讲义、例题解析和习题材料。目标不是只看答案，而是把推导链条和题型迁移读明白。',
    emphasis:
      '如果你接下来要验收，优先试“导入一份数学材料 -> 进入正文 -> 划线问某一步为什么成立”。',
  },
  probability: {
    title: '概率论',
    description:
      '这里更适合放概念密集的课件、公式整理、题型讲解和往年题。追问重点通常是使用条件、区别和常见误判。',
    emphasis:
      '如果你验收这个学科，优先试“同一个问题围绕当前片段连续追问两三轮，看上下文能不能接住”。',
  },
  'deep-learning': {
    title: '深度学习',
    description:
      '这里更适合 lecture、论文式 PDF、方法总结和实验背景资料。它更偏理解路线，而不是单纯冲分式复习。',
    emphasis:
      '如果你验收这个学科，优先试“挂一份背景资料，再在正文里问这段方法为什么值得读”。',
  },
  'major-course': {
    title: '专业课',
    description:
      '这里更适合复习课件、重点整理、考纲、往年卷和老师强调过的材料。它更偏考试导向的筛重点和追问。',
    emphasis:
      '如果你验收这个学科，优先试“把重点或往年卷挂成背景资料，再看正文追问会不会更有针对性”。',
  },
};
