'use client';

import type { ReactNode } from 'react';

import {
  PreAssessmentResponse,
  ReadinessLevel,
} from '@/types/pre-assessment';

interface PreAssessmentCardsProps {
  result: PreAssessmentResponse;
}

const readinessMeta: Record<
  ReadinessLevel,
  {
    label: string;
    border: string;
    badge: string;
    summaryTone: string;
  }
> = {
  ready: {
    label: '可以开始读',
    border: 'border-emerald-500/25',
    badge: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    summaryTone: 'text-[var(--foreground)]',
  },
  needs_preparation: {
    label: '先补一点再读',
    border: 'border-amber-500/25',
    badge: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    summaryTone: 'text-[var(--foreground)]',
  },
  not_now: {
    label: '现在硬读不划算',
    border: 'border-rose-500/25',
    badge: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
    summaryTone: 'text-[var(--foreground)]',
  },
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/58 p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ListBlock({
  items,
  emptyText,
}: {
  items: string[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-[var(--muted)]">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-sm leading-6 text-[var(--foreground)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PreAssessmentCards({
  result,
}: PreAssessmentCardsProps) {
  const meta = readinessMeta[result.readiness.level];

  return (
    <div className="space-y-5">
      <section
        className={`rounded-[24px] border bg-[var(--card-bg)] p-5 shadow-custom ${meta.border}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${meta.badge}`}
          >
            {meta.label}
          </span>
          <span className="text-sm text-[var(--muted)]">
            判断把握度：{result.readiness.confidence}
          </span>
        </div>
        <p className={`mt-4 text-lg leading-8 ${meta.summaryTone}`}>
          {result.readiness.summary}
        </p>
      </section>

      <SectionCard
        title="这份材料到底在讲什么"
        description="先抓主问题和观察坐标，不要一开始就掉进细节。"
      >
        <p className="text-sm leading-7 text-[var(--foreground)]">
          {result.core_frame.what_this_material_is_really_about}
        </p>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
            建议你带着这几个坐标去看
          </p>
          <div className="flex flex-wrap gap-2">
            {result.core_frame.key_axes.length > 0 ? (
              result.core_frame.key_axes.map((axis) => (
                <span
                  key={axis}
                  className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1 text-sm text-[var(--foreground)]"
                >
                  {axis}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--muted)]">
                暂时没有提炼出明确坐标。
              </span>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="先别急着读整篇"
        description="如果这里有阻塞点，先补它们比硬啃原文更省力。"
      >
        {result.blocking_gaps.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            暂时没有识别出明显的前置阻塞，可以直接进入正文。
          </p>
        ) : (
          <div className="space-y-3">
            {result.blocking_gaps.map((gap) => (
              <div
                key={`${gap.concept}-${gap.suggested_preparation}`}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h4 className="text-base font-semibold text-[var(--foreground)]">
                    {gap.concept}
                  </h4>
                  <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs text-[var(--muted)]">
                    依据：{gap.evidence_source}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                  {gap.why_it_blocks}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  先补建议：{gap.suggested_preparation}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="先看什么">
          <ListBlock
            items={result.reading_strategy.focus_first}
            emptyText="暂时没有提炼出优先阅读顺序。"
          />
        </SectionCard>

        <SectionCard title="哪些先略过">
          <ListBlock
            items={result.reading_strategy.skim_or_skip_for_now}
            emptyText="目前没有明确建议跳过的部分。"
          />
        </SectionCard>

        <SectionCard title="读的时候记着问">
          <ListBlock
            items={result.reading_strategy.questions_to_keep_in_mind}
            emptyText="目前没有补充问题。"
          />
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="骨架和细节怎么分"
          description="你不需要同等用力去读所有部分。"
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                更像骨架的内容
              </p>
              <ListBlock
                items={result.core_frame.what_is_foundational}
                emptyText="暂时没有明确骨架项。"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                更像细节或后置内容
              </p>
              <ListBlock
                items={result.core_frame.what_is_detail_or_later}
                emptyText="暂时没有明确后置内容。"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="依据与对你的观察"
          description="结果不是凭空拍脑袋，会尽量留下依据和后续画像线索。"
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                证据说明
              </p>
              {result.evidence_notes.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  暂时没有额外证据说明。
                </p>
              ) : (
                <div className="space-y-3">
                  {result.evidence_notes.map((note) => (
                    <div
                      key={`${note.claim}-${note.basis}`}
                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {note.claim}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {note.basis}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                画像更新建议
              </p>
              {result.profile_update_suggestions.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--muted)]">
                  这次还没有新增明显画像信号。
                </p>
              ) : (
                <div className="space-y-3">
                  {result.profile_update_suggestions.map((suggestion) => (
                    <div
                      key={`${suggestion.type}-${suggestion.content}`}
                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                        {suggestion.type}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                        {suggestion.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
