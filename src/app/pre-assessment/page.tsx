'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import PreAssessmentCards from '@/components/PreAssessmentCards';
import {
  loadModelConfig,
  MODEL_CONFIG_UPDATED_EVENT,
  type PersistedModelConfig,
} from '@/lib/model-config';
import { LearningEntryImportResponse } from '@/types/learning-entry';
import { PreAssessmentRequest, PreAssessmentResponse } from '@/types/pre-assessment';

const defaultForm: PreAssessmentRequest = {
  source_type: 'note_md',
  title: '',
  full_content: '',
  selected_excerpt: '',
  excerpt_context_before: '',
  excerpt_context_after: '',
  user_goal_hint: '',
  profile_overrides: {},
  provider: 'openai',
  model: 'deepseek-chat',
  api_key: '',
  base_url: '',
};

const quickGoalHints = [
  '我想先知道这份材料值不值得现在硬读。',
  '我想知道读之前要先补哪些前置概念。',
  '我想先抓骨架，再决定哪些细节暂时跳过。',
];

const supportNotes = [
  '直接支持：.md .markdown .txt',
  '实验支持：.pdf .ppt .pptx .doc .docx .xls .xlsx .csv .html',
];

function previewContent(content: string, maxLength = 260) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

const subjectLabels: Record<string, string> = {
  'advanced-math': '高等数学',
  probability: '概率论',
  'deep-learning': '深度学习',
  'major-course': '专业课',
};

const entryLabels: Record<string, string> = {
  book: '书籍 / 教材',
  exercise: '习题 / 题集',
  slides: '课件 / PPT',
  paper: '讲义 / Lecture Notes',
  exam: '往年卷 / 重点提纲',
  note: '笔记 / 摘要 / LLM 回复',
};

export default function PreAssessmentPage() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [form, setForm] = useState<PreAssessmentRequest>(defaultForm);
  const [result, setResult] = useState<PreAssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [importedMaterial, setImportedMaterial] =
    useState<LearningEntryImportResponse | null>(null);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

  const updateField = <K extends keyof PreAssessmentRequest>(
    key: K,
    value: PreAssessmentRequest[K]
  ) => {
    setForm((prev) => {
      return { ...prev, [key]: value };
    });
    setResult(null);
  };

  useEffect(() => {
    const applySavedConfig = (config: PersistedModelConfig) => {
      setForm((prev) => ({
        ...prev,
        provider: config.provider,
        model: config.model,
        base_url: config.base_url,
        api_key: config.api_key,
      }));
    };

    applySavedConfig(loadModelConfig());

    const syncSavedConfig = (event?: Event) => {
      const customEvent = event as CustomEvent<PersistedModelConfig> | undefined;
      if (customEvent?.detail) {
        applySavedConfig(customEvent.detail);
        return;
      }

      applySavedConfig(loadModelConfig());
    };

    window.addEventListener(MODEL_CONFIG_UPDATED_EVENT, syncSavedConfig as EventListener);
    window.addEventListener('storage', syncSavedConfig);

    return () => {
      window.removeEventListener(
        MODEL_CONFIG_UPDATED_EVENT,
        syncSavedConfig as EventListener
      );
      window.removeEventListener('storage', syncSavedConfig);
    };
  }, []);

  const resetDragState = () => {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  };

  const applyImportedMaterial = (data: LearningEntryImportResponse) => {
    setImportedMaterial(data);
    setResult(null);
    setForm((prev) => ({
      ...prev,
      source_type: data.source_type,
      title: data.title,
      full_content: data.full_content,
    }));
  };

  const handleSelectedFile = async (selectedFile: File) => {
    setSelectedFilename(selectedFile.name);
    setIsImporting(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('file', selectedFile);

      const response = await fetch('/api/learning-entry/import', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        throw new Error(errorPayload?.detail || '导入失败，请换个文件再试一次。');
      }

      const data = (await response.json()) as LearningEntryImportResponse;
      applyImportedMaterial(data);
    } catch (importError) {
      setImportedMaterial(null);
      setError(
        importError instanceof Error
          ? importError.message
          : '导入失败，请换个文件再试一次。'
      );
    } finally {
      resetDragState();
      setIsImporting(false);
    }
  };

  const handleImportInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    await handleSelectedFile(selectedFile);
  };

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    resetDragState();

    if (!droppedFile) {
      return;
    }

    await handleSelectedFile(droppedFile);
  };

  const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/pre-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          full_content: form.full_content.trim(),
          selected_excerpt: form.selected_excerpt?.trim() || undefined,
          excerpt_context_before:
            form.excerpt_context_before?.trim() || undefined,
          excerpt_context_after: form.excerpt_context_after?.trim() || undefined,
          user_goal_hint: form.user_goal_hint?.trim() || undefined,
          provider: form.provider?.trim() || 'openai',
          model: form.model?.trim() || undefined,
          api_key: form.api_key?.trim() || undefined,
          base_url: form.base_url?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { detail?: string }
          | null;
        throw new Error(payload?.detail || '判断失败，请稍后再试。');
      }

      const data = (await response.json()) as PreAssessmentResponse;
      setResult(data);
    } catch (submitError) {
      setResult(null);
      setError(
        submitError instanceof Error
          ? submitError.message
          : '判断失败，请稍后再试。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const importedPreview = form.full_content
    ? previewContent(form.full_content)
    : '';
  const subjectKey = searchParams.get('subject') || '';
  const entryKey = searchParams.get('entry') || '';
  const subjectLabel = subjectLabels[subjectKey] || '';
  const entryLabel = entryLabels[entryKey] || '';
  const contextLabel =
    subjectLabel && entryLabel
      ? `${subjectLabel} · ${entryLabel}`
      : subjectLabel || entryLabel;

  return (
    <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-primary)]">
                Learning Entry Beta
              </p>
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                先把材料拖进来，再判断现在该不该读、该怎么读。
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
                这里不是让你先自诊断痛点，而是先接住材料，帮你抽骨架、识别前置缺口，再给出更像学习助手的起步判断。
              </p>
              {contextLabel ? (
                <div className="inline-flex w-fit rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-4 py-2 text-sm text-[var(--accent-primary)]">
                  当前入口：{contextLabel}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {supportNotes.map((note) => (
                  <span
                    key={note}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--background)]/70 px-3 py-1 text-xs text-[var(--muted)]"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href={subjectKey ? `/learn/${subjectKey}` : '/learn'}
              className="inline-flex w-fit items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30"
            >
              {subjectKey ? '返回资料架' : '返回学习空间'}
            </Link>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            ['01', '导入材料', '拖拽文件或点击选择，先把内容变成可判断的文本。'],
            ['02', '确认内容', '快速核对标题与正文，必要时手动修正。'],
            ['03', '获得判断', '看现在该补什么、先读什么、哪些先别深究。'],
          ].map(([step, title, description]) => (
            <div
              key={step}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]/88 p-4 shadow-custom"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Step {step}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {description}
              </p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm"
          >
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  1. 导入学习材料
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  这是唯一必须先做的动作。别先写一堆目标，先把材料交给我。
                </p>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={handleDropzoneKeyDown}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                aria-label="拖拽或选择文件导入"
                aria-describedby="learning-entry-dropzone-hint"
                className={`group rounded-[24px] border-2 border-dashed p-6 transition ${
                  isDragActive
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-[0_0_0_6px_rgba(47,107,102,0.08)]'
                    : 'border-[var(--border-strong)] bg-[var(--background)]/75 hover:border-[var(--accent-primary)]/70 hover:bg-[var(--accent-primary)]/4'
                } ${isImporting ? 'cursor-progress opacity-80' : 'cursor-pointer'}`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-white">
                      推荐入口
                    </span>
                    <span className="text-sm text-[var(--muted)]">
                      支持拖拽和点击选择
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                      {isImporting
                        ? '正在导入并转换内容...'
                        : isDragActive
                          ? '松开鼠标，把材料放进来'
                          : '把 PDF、PPT、笔记或 Markdown 拖进来'}
                    </h3>
                    <p
                      id="learning-entry-dropzone-hint"
                      className="max-w-2xl text-sm leading-6 text-[var(--muted)]"
                    >
                      如果你只是想快速试用，也可以跳过导入，直接在下面粘贴文本。但真实使用应该尽量让系统自己接材料，而不是让你先手工整理。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      '.md',
                      '.txt',
                      '.pdf',
                      '.pptx',
                      '.docx',
                      '.xlsx',
                      '.html',
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1 text-xs text-[var(--muted)]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="btn-japanese inline-flex rounded-full px-5 py-2.5 text-sm">
                      {isImporting ? '处理中...' : '选择文件'}
                    </span>
                    <span className="text-sm text-[var(--muted)]">
                      {selectedFilename
                        ? `最近一次选择：${selectedFilename}`
                        : '也可以直接拖到这个区域'}
                    </span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".md,.markdown,.txt,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.html,.htm"
                  onChange={handleImportInput}
                  disabled={isImporting}
                />
              </div>

              {importedMaterial ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        已导入：{importedMaterial.filename}
                      </p>
                      <p className="text-sm leading-6 text-[var(--foreground)]">
                        {importedMaterial.import_summary}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                      {importedMaterial.converter_used} · {importedMaterial.detected_extension}
                    </span>
                  </div>

                  {importedMaterial.warnings.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                      {importedMaterial.warnings.map((warning) => (
                        <li key={warning}>- {warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  2. 确认材料内容
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  导入后只需要快速检查标题和内容，不再额外要求你手动选材料类型。
                </p>
              </div>

              {importedMaterial ? (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/58 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        已自动识别材料类型
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        当前直接使用系统识别结果，不再把“手动选类型”放在主流程里。
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 px-3 py-1 text-sm text-[var(--accent-primary)]">
                      {form.source_type}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/58 p-4 text-sm leading-6 text-[var(--muted)]">
                  如果你这次没有导入文件、而是直接粘贴文本，系统会先按普通笔记/文本处理；等后面我们再做更稳的自动识别。
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  标题
                </span>
                <input
                  className="input-japanese w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="比如：Transformer 论文笔记 / 概率论第 3 章 / 课程讲义第 5 节"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  正文内容
                </span>
                <textarea
                  className="input-japanese min-h-[280px] w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={form.full_content}
                  onChange={(event) =>
                    updateField('full_content', event.target.value)
                  }
                  placeholder="这里会放导入后的 Markdown；如果你没导入文件，也可以直接粘贴内容。"
                  required
                />
              </label>
            </section>

            <section className="space-y-4 rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/56 p-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  3. 可选补充
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  这部分是加分项，不是门槛。你不确定卡点也没关系。
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {quickGoalHints.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => updateField('user_goal_hint', hint)}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                  >
                    {hint}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  目标提示
                </span>
                <textarea
                  className="input-japanese min-h-[96px] w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={form.user_goal_hint}
                  onChange={(event) =>
                    updateField('user_goal_hint', event.target.value)
                  }
                  placeholder="例如：我这周需要读懂大框架；我怕自己卡在数学前置；我想知道先看哪些部分最划算。"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  当前最想问的片段
                </span>
                <textarea
                  className="input-japanese min-h-[120px] w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={form.selected_excerpt}
                  onChange={(event) =>
                    updateField('selected_excerpt', event.target.value)
                  }
                  placeholder="如果某一段最让你困惑，可以贴这里。留空也可以。"
                />
              </label>

              <details className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
                <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
                  展开高级上下文
                </summary>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  只有当你选中的片段前后关系很重要时，再补这一块。
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                      片段前文
                    </span>
                    <textarea
                      className="input-japanese min-h-[100px] w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                      value={form.excerpt_context_before}
                      onChange={(event) =>
                        updateField('excerpt_context_before', event.target.value)
                      }
                      placeholder="选中片段之前的关键上下文"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                      片段后文
                    </span>
                    <textarea
                      className="input-japanese min-h-[100px] w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                      value={form.excerpt_context_after}
                      onChange={(event) =>
                        updateField('excerpt_context_after', event.target.value)
                      }
                      placeholder="选中片段之后的关键上下文"
                    />
                  </label>
                </div>
              </details>
            </section>

            {error ? (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                这一步的目标不是给出完美答案，而是先判断“现在读会不会浪费力气”，并给出更省力的起步顺序。
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-japanese rounded-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '正在判断...' : '开始做前置判断'}
              </button>
            </div>
          </form>

          <div className="space-y-5">
            <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                当前状态
              </h2>

              {!result ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/60 p-4">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      下一步很简单
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      先导入文件，或者先粘贴一段真实材料。只要正文有了，判断就能开始。
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {[
                      '我会先判断这份材料现在读是否划算。',
                      '如果缺前置，我会尽量指出阻塞点，而不是只说“你基础不够”。',
                      '如果可以开始读，我会给你先骨架后细节的阅读顺序。',
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/48 px-4 py-3 text-sm leading-6 text-[var(--foreground)]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  {importedPreview ? (
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          已拿到的内容预览
                        </p>
                        {importedMaterial ? (
                          <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs text-[var(--muted)]">
                            {importedMaterial.converter_used}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                        {importedPreview}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <PreAssessmentCards result={result} />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
