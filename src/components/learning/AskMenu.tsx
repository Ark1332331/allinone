'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getAskMenuPosition } from '@/lib/reading-interactions';
import { DEFAULT_TEMPLATES, CUSTOM_TEMPLATE_ID, STAGE_TEMPLATE_ID, type PromptTemplate } from '@/lib/prompt-templates';

type Props = {
  point: { x: number; y: number };
  onPick: (template: PromptTemplate) => void;
  onClose: () => void;
};

export default function AskMenu({ point, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', escape);
    };
  }, [onClose]);

  const position = getAskMenuPosition(point);

  const menu = (
    <div
      ref={ref}
      className="fixed z-[130] flex flex-col gap-0.5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]/96 p-1.5 shadow-custom backdrop-blur-sm"
      style={position}
      role="menu"
      aria-label="快捷提问菜单"
    >
      {DEFAULT_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(template)}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--accent-primary)]/10"
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: template.color }}
          />
          <span>{template.title}</span>
        </button>
      ))}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(menu, document.body);
}
