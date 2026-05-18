import { looksLikeInlineMathCode } from './markdown-math.ts';

export type MarkdownCodeRenderMode =
  | { type: 'mermaid'; language: 'mermaid' }
  | { type: 'syntax-block'; language: string }
  | { type: 'plain-block' }
  | { type: 'inline-math' }
  | { type: 'inline-code' };

interface MarkdownCodeRenderInput {
  inline?: boolean;
  className?: string;
  content: string;
}

export function getMarkdownCodeRenderMode({
  inline,
  className,
  content,
}: MarkdownCodeRenderInput): MarkdownCodeRenderMode {
  const language = /language-(\w+)/.exec(className || '')?.[1];
  const isBlock = inline === false || /\n/.test(content);

  if (isBlock && language === 'mermaid') {
    return { type: 'mermaid', language };
  }

  if (isBlock && language) {
    return { type: 'syntax-block', language };
  }

  if (isBlock) {
    return { type: 'plain-block' };
  }

  if (looksLikeInlineMathCode(content)) {
    return { type: 'inline-math' };
  }

  return { type: 'inline-code' };
}
