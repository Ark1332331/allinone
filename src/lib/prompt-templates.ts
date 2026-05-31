export type PromptTemplate = {
  id: string;
  title: string;
  body: string;
  color: string;
  order: number;
};

export const CUSTOM_TEMPLATE_ID = 'tpl-custom';
export const STAGE_TEMPLATE_ID = 'tpl-stage';

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  { id: 'tpl-explain', title: '解释', body: '解释这段内容的含义和关键概念。', color: '#0B6E4F', order: 0 },
  { id: 'tpl-why', title: '为什么', body: '解释这部分为什么成立、推导逻辑是什么。', color: '#4A5568', order: 1 },
  { id: 'tpl-example', title: '举例', body: '用具体例子说明这个概念或公式。', color: '#2563EB', order: 2 },
  { id: 'tpl-step', title: '推导步骤', body: '展开详细推导步骤。', color: '#B84D20', order: 3 },
  { id: CUSTOM_TEMPLATE_ID, title: '自定义', body: '', color: '#6B7280', order: 4 },
  { id: STAGE_TEMPLATE_ID, title: '加入片段', body: '', color: '#9333EA', order: 5 },
];

export function buildTemplatePrompt(template: PromptTemplate, selectedText: string): string {
  if (!template.body) {
    return selectedText;
  }
  return `${template.body}\n\n引用选区：\n${selectedText}`;
}
