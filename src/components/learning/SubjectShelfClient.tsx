'use client';

import Link from 'next/link';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';

import {
  addImportedMaterial,
  createImportedMaterialDraft,
  loadSubjectWorkspace,
  removeMaterial,
  saveSubjectWorkspace,
  toggleMaterialBackgroundRole,
  updateCurrentTargetTitle,
  updateMaterialPreferredViewMode,
} from '@/lib/learning-workspace';
import {
  deleteLearningMaterialSourceFile,
  saveLearningMaterialSourceFile,
} from '@/lib/learning-source-store';
import type { LearningEntryImportResponse } from '@/types/learning-entry';
import type {
  BackgroundRole,
  LearningMaterialRecord,
  SubjectWorkspace,
} from '@/types/learning-workspace';

type SubjectInfo = {
  title: string;
  description: string;
  emphasis: string;
};

type Props = {
  subjectSlug: string;
  subjectInfo: SubjectInfo;
};

type ImportStatusTone = 'info' | 'success' | 'warning';

type ImportStatus = {
  label: string;
  progress: number;
  tone: ImportStatusTone;
};

const backgroundRoleLabels: Record<BackgroundRole, string> = {
  standard: '通用背景',
  evidence: '证据材料',
  explanation: '讲解材料',
};

const roleLabels: Record<string, string> = {
  textbook: '教材 / 讲义',
  new_slides: '新课课件',
  review_slides: '复习课件',
  key_points: '重点整理',
  exam_outline: '考纲 / 考核要求',
  past_exam: '往年卷',
  exercise_set: '习题集',
  review_notes: '复习笔记',
};

function hasDetailMessage(payload: unknown): payload is { detail?: string } {
  return typeof payload === 'object' && payload !== null && 'detail' in payload;
}

function isLearningEntryImportResponse(
  payload: unknown
): payload is LearningEntryImportResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'title' in payload &&
    'source_type' in payload &&
    'full_content' in payload &&
    'filename' in payload
  );
}

function formatTime(timestamp: number | null) {
  if (!timestamp) {
    return '还没读过';
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBackgroundAssignment(
  workspace: SubjectWorkspace,
  materialId: string
) {
  return workspace.currentTarget.backgroundMaterials.find(
    (item) => item.materialId === materialId
  );
}

export default function SubjectShelfClient({
  subjectSlug,
  subjectInfo,
}: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [workspace, setWorkspace] = useState(() =>
    loadSubjectWorkspace(subjectSlug)
  );
  const [targetTitleDraft, setTargetTitleDraft] = useState(
    loadSubjectWorkspace(subjectSlug).currentTarget.title
  );
  const [isImporting, setIsImporting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [pendingRoleMaterialId, setPendingRoleMaterialId] = useState<
    string | null
  >(null);

  const materialCount = workspace.materials.length;

  const sortedMaterials = useMemo(
    () =>
      [...workspace.materials].sort(
        (left, right) => right.updatedAt - left.updatedAt
      ),
    [workspace.materials]
  );

  const updateWorkspace = (nextWorkspace: SubjectWorkspace) => {
    setWorkspace(nextWorkspace);
    saveSubjectWorkspace(nextWorkspace);
  };

  const commitTargetTitle = () => {
    const nextWorkspace = updateCurrentTargetTitle(workspace, targetTitleDraft);
    updateWorkspace(nextWorkspace);
    setTargetTitleDraft(nextWorkspace.currentTarget.title);
  };

  const handleImportedPayload = async (
    payload: LearningEntryImportResponse,
    file: File
  ): Promise<boolean> => {
    const material = createImportedMaterialDraft({
      subjectSlug,
      ...payload,
      mime_type: payload.mime_type,
    });

    updateWorkspace(addImportedMaterial(workspace, material));

    try {
      await saveLearningMaterialSourceFile(material.id, file);
      return true;
    } catch (storeError) {
      console.warn('Failed to persist original file for reading mode:', storeError);
      return false;
    }
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    setError(null);
    setImportStatus({
      label: `正在导入 ${file.name}`,
      progress: 15,
      tone: 'info',
    });

    try {
      window.setTimeout(() => {
        setImportStatus((current) =>
          current && current.progress < 60
            ? {
                label: '正在解析文件内容...',
                progress: 55,
                tone: 'info',
              }
            : current
        );
      }, 250);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/learning-entry/import', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | LearningEntryImportResponse
        | { detail?: string }
        | null;

      if (!response.ok || !isLearningEntryImportResponse(payload)) {
        throw new Error(
          (hasDetailMessage(payload) ? payload.detail : undefined) ||
            '导入失败，请稍后重试。'
        );
      }

      setImportStatus({
        label: '正在写入资料库...',
        progress: 80,
        tone: 'info',
      });

      const sourceSaved = await handleImportedPayload(payload, file);
      setImportStatus(
        sourceSaved
          ? {
              label: `已导入 ${payload.title}`,
              progress: 100,
              tone: 'success',
            }
          : {
              label: `${payload.title} 已导入，但原文件缓存保存失败`,
              progress: 100,
              tone: 'warning',
            }
      );

      window.setTimeout(() => {
        setImportStatus(null);
      }, 1500);
    } catch (importError) {
      setImportStatus(null);
      setError(
        importError instanceof Error
          ? importError.message
          : '导入失败，请稍后重试。'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    await handleImportFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!isDraggingFile) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    await handleImportFile(file);
  };

  const handleChooseBackgroundRole = (
    materialId: string,
    backgroundRole: BackgroundRole
  ) => {
    updateWorkspace(
      toggleMaterialBackgroundRole(workspace, materialId, backgroundRole)
    );
    setPendingRoleMaterialId(null);
  };

  const handleToggleBackground = (material: LearningMaterialRecord) => {
    const existing = getBackgroundAssignment(workspace, material.id);

    if (existing) {
      updateWorkspace(toggleMaterialBackgroundRole(workspace, material.id));
      return;
    }

    setPendingRoleMaterialId(material.id);
  };

  const handleToggleViewMode = (
    material: LearningMaterialRecord,
    nextMode: 'structured' | 'original'
  ) => {
    updateWorkspace(
      updateMaterialPreferredViewMode(workspace, material.id, nextMode)
    );
  };

  const handleDeleteMaterial = async (material: LearningMaterialRecord) => {
    const confirmed = window.confirm(`删除「${material.title}」？相关片段和原文件缓存也会移除。`);
    if (!confirmed) {
      return;
    }

    updateWorkspace(removeMaterial(workspace, material.id));
    await deleteLearningMaterialSourceFile(material.id);
  };

  return (
    <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-primary)]">
                Subject Shelf
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
                {subjectInfo.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
                {subjectInfo.description}
              </p>
              <p className="max-w-2xl text-sm leading-6 text-[var(--foreground)]">
                {subjectInfo.emphasis}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/learn"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                返回学科列表
              </Link>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="btn-japanese inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImporting ? '正在导入...' : '选择文件导入'}
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Current Target
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)] md:text-3xl">
                {workspace.currentTarget.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                这里写你当前这一轮学习最想解决的目标。后续阅读提问和前置评估都会带上它。
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/64 px-4 py-3 text-sm text-[var(--foreground)]">
              已挂背景资料 {workspace.currentTarget.backgroundMaterials.length} 份
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={targetTitleDraft}
              onChange={(event) => setTargetTitleDraft(event.target.value)}
              onBlur={commitTargetTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitTargetTitle();
                }
              }}
              placeholder="例如：搞懂第三章卷积的核心直觉，并能做题"
              className="input-japanese w-full rounded-full px-4 py-3 text-sm text-[var(--foreground)]"
            />
            <button
              type="button"
              onClick={commitTargetTitle}
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-3 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              保存目标
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <section
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => void handleDrop(event)}
          className={`rounded-[28px] border bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm transition ${
            isDraggingFile
              ? 'border-[var(--accent-primary)] shadow-[0_0_0_4px_rgba(196,106,62,0.12)]'
              : 'border-[var(--border-color)]'
          }`}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Import
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)] md:text-3xl">
                导入资料
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                现在先优先支持你把 PDF 导进来开始学习。拖进这个区域，或者点按钮选文件都可以。
              </p>
            </div>
            <p className="text-sm text-[var(--muted)]">
              支持：`pdf` `md` `txt` `ppt` `pptx` `doc` `docx`
            </p>
          </div>

          {importStatus ? (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 ${
                importStatus.tone === 'warning'
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200'
                  : importStatus.tone === 'success'
                    ? 'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/8 text-[var(--foreground)]'
                    : 'border-[var(--border-color)] bg-[var(--background)]/70 text-[var(--foreground)]'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-sm">
                <span>{importStatus.label}</span>
                <span className="tabular-nums text-xs text-[var(--muted)]">
                  {importStatus.progress}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                  style={{ width: `${importStatus.progress}%` }}
                />
              </div>
            </div>
          ) : null}

          <label
            htmlFor={fileInputId}
            className={`mt-5 block cursor-pointer rounded-[24px] border border-dashed p-8 text-center transition ${
              isDraggingFile
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/8'
                : 'border-[var(--border-strong)] bg-[var(--background)]/68 hover:border-[var(--accent-primary)]/60'
            }`}
          >
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {isDraggingFile ? '松开鼠标开始导入' : '拖拽文件到这里'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              或者点击这里打开文件选择器。
            </p>
            <span className="btn-japanese mt-5 inline-flex rounded-full px-5 py-2.5 text-sm">
              选择文件
            </span>
          </label>

          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".md,.markdown,.txt,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.html,.htm"
            onChange={handleFileInput}
          />
        </section>

        <section className="space-y-4 rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Material Shelf
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)] md:text-3xl">
                当前资料库
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                点进任何一份材料，就能进入原文件阅读和连续提问。
              </p>
            </div>
            <p className="text-sm text-[var(--muted)]">
              共 {materialCount} 份资料
            </p>
          </div>

          {sortedMaterials.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/68 p-8 text-center">
              <p className="text-lg font-semibold text-[var(--foreground)]">
                还没有资料
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                先导入一个 PDF，我们就能开始走学习提问主线。
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedMaterials.map((material) => {
                const backgroundAssignment = getBackgroundAssignment(
                  workspace,
                  material.id
                );

                return (
                  <article
                    key={material.id}
                    className="rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/72 p-5 transition hover:border-[var(--accent-primary)]/40 hover:shadow-custom"
                  >
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold text-[var(--foreground)]">
                        {material.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1 text-xs text-[var(--foreground)]">
                          {roleLabels[material.primaryRole] ?? material.primaryRole}
                        </span>
                        {material.secondaryRoles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1 text-xs text-[var(--muted)]"
                          >
                            {roleLabels[role] ?? role}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm leading-6 text-[var(--muted)]">
                        最近阅读：{formatTime(material.lastReadAt)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        默认阅读模式：
                        {material.preferredViewMode === 'original'
                          ? '原文件优先'
                          : '结构化阅读'}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/learn/${subjectSlug}/${material.id}`}
                        className="btn-japanese inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
                      >
                        进入阅读
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleViewMode(
                            material,
                            material.preferredViewMode === 'original'
                              ? 'structured'
                              : 'original'
                          )
                        }
                        className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                      >
                        切到
                        {material.preferredViewMode === 'original'
                          ? '结构化阅读'
                          : '原文件优先'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBackground(material)}
                        className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                      >
                        {backgroundAssignment
                          ? `已挂背景：${backgroundRoleLabels[backgroundAssignment.backgroundRole]}`
                          : '挂到当前目标'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteMaterial(material)}
                        className="inline-flex items-center justify-center rounded-full border border-rose-500/25 px-4 py-2 text-sm text-rose-700 transition hover:border-rose-500 hover:bg-rose-500/10 dark:text-rose-300"
                      >
                        删除资料
                      </button>
                    </div>

                    {pendingRoleMaterialId === material.id ? (
                      <div className="mt-4 rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/8 p-4">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          这份资料作为哪种背景使用？
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(Object.keys(backgroundRoleLabels) as BackgroundRole[]).map(
                            (role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() =>
                                  handleChooseBackgroundRole(material.id, role)
                                }
                                className="rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                              >
                                {backgroundRoleLabels[role]}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
