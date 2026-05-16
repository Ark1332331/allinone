import Link from 'next/link';

import {
  LEARNING_FLOW_STEPS,
  LEARNING_SUBJECTS,
} from '@/lib/learn-content';

export default function LearnHomePage() {
  return (
    <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-primary)]">
                Learning Space Beta
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
                先把资料放进来，再直接进正文阅读
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
                这个入口现在只服务一条主线：按学科进入资料库，打开资料卡直接读正文，在阅读里划线追问。
                `pre-assessment` 还在，但退到阅读页顶部，变成可选辅助。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                返回首页
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {LEARNING_FLOW_STEPS.map((step, index) => (
            <article
              key={step.title}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]/88 p-4 shadow-custom"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Step {index + 1}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {step.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Subjects
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)] md:text-3xl">
                先按学科进资料库
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                每个学科先共用同一套阅读工作流，区别只在于资料类型和你挂上的背景资料不同。
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {LEARNING_SUBJECTS.map((subject) => (
              <article
                key={subject.slug}
                className="rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/72 p-5 transition hover:border-[var(--accent-primary)]/40 hover:shadow-custom"
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--accent-primary)]">
                    {subject.caption}
                  </p>
                  <h3 className="text-2xl font-semibold text-[var(--foreground)]">
                    {subject.title}
                  </h3>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    {subject.summary}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {subject.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1 text-xs text-[var(--muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/learn/${subject.slug}`}
                    className="btn-japanese inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
                  >
                    进入资料库
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
