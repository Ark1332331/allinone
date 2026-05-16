'use client';

import { useEffect, useState } from 'react';

import {
  AssistantMemoryContextResponse,
  AssistantMemoryPurpose,
} from '@/types/assistant-memory';

const purposeLabels: Record<AssistantMemoryPurpose, string> = {
  general: '通用助手记忆',
  pre_assessment: '前置评估记忆',
};

interface AssistantMemoryCardProps {
  purpose?: AssistantMemoryPurpose;
  title?: string;
  description?: string;
}

export default function AssistantMemoryCard({
  purpose = 'general',
  title,
  description,
}: AssistantMemoryCardProps) {
  const [data, setData] = useState<AssistantMemoryContextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/assistant-memory/context?purpose=${purpose}`,
          {
            cache: 'no-store',
          }
        );
        const payload = (await response.json().catch(() => null)) as
          | AssistantMemoryContextResponse
          | { detail?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            (payload as { detail?: string } | null)?.detail ||
              '加载助手记忆失败。'
          );
        }

        if (!cancelled) {
          setData(payload as AssistantMemoryContextResponse);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : '加载助手记忆失败。'
          );
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [purpose]);

  const sectionCount = data?.sections.length ?? 0;

  return (
    <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/94 p-5 shadow-custom md:p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          Assistant Memory
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {title || purposeLabels[purpose]}
            </h2>
            <p className="text-sm leading-6 text-[var(--muted)]">
              {description ||
                '这里展示当前助手在发起模型请求前，会自动带上的记忆层。它不需要你每次手动转发上下文。'}
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-3 py-1 text-xs text-[var(--accent-primary)]">
            <span>{purposeLabels[purpose]}</span>
            <span>·</span>
            <span>{sectionCount} 份主记忆</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/58 p-4 text-sm text-[var(--muted)]">
          正在读取当前助手记忆…
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/58 p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {data.summary}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                目的：{purposeLabels[data.purpose]}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/58 p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                这意味着什么
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                这些文件会在后端统一读取，再注入到提示词里。也就是说，个性化并不是靠你手动转发，而是靠这组主记忆持续供给。
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.sections.map((section) => (
              <div
                key={section.key}
                className="rounded-[22px] border border-[var(--border-color)] bg-[var(--background)]/62 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {section.label}
                  </p>
                  <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[11px] text-[var(--accent-primary)]">
                    {section.char_count} chars
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {section.description}
                </p>
                <p className="mt-3 text-xs text-[var(--muted)]">{section.path}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
