'use client';

import Link from 'next/link';

export default function WikiProjectsPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 shadow-custom">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Wiki Projects
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          旧的项目列表页依赖已经移除，这里暂时不再作为主要入口。当前建议直接使用首页生成仓库 wiki，或者进入前置评估页面体验新的学习工作流。
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/"
            className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          >
            回到首页
          </Link>
          <Link
            href="/learn"
            className="btn-japanese rounded-full px-4 py-2 text-sm"
          >
            打开学习空间
          </Link>
        </div>
      </div>
    </div>
  );
}
