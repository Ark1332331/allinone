'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import Markdown from '@/components/Markdown';
import PdfReadingSurface from '@/components/learning/PdfReadingSurface';
import PreAssessmentCards from '@/components/PreAssessmentCards';
import {
  addSnippet,
  getMaterialSnippetHistory,
  getMaterialById,
  loadSubjectWorkspace,
  markMaterialRead,
  removeSnippetAtIndex,
  saveSubjectWorkspace,
  updateMaterialPreferredViewMode,
  updateMaterialPreAssessment,
  updateMaterialStudyState,
} from '@/lib/learning-workspace';
import {
  loadLearningMaterialSourceFile,
  type StoredLearningSourceArtifact,
} from '@/lib/learning-source-store';
import { loadModelConfig } from '@/lib/model-config';
import type {
  LearningChatMessage,
  LearningChatRequest,
  LearningChatResponse,
} from '@/types/learning-chat';
import type {
  PreAssessmentRequest,
  PreAssessmentResponse,
} from '@/types/pre-assessment';
import type {
  LearningMaterialRecord,
  ReadingSnippet,
  ReadingSnippetRegion,
  ReadingViewMode,
  SubjectWorkspace,
} from '@/types/learning-workspace';

type Props = {
  subjectSlug: string;
  materialId: string;
};

type SelectionMenuState = {
  x: number;
  y: number;
} | null;

type SelectionSource = 'text' | 'pdf_text' | 'pdf_screenshot';
type SelectionTarget = 'material' | 'assistant_reply';

type ScreenshotQuestionPayload = {
  text: string;
  question: string;
  imageDataUrl: string;
  pageNumber: number;
  region: ReadingSnippetRegion;
  mode: 'direct' | 'stage';
};

const backgroundRoleLabels: Record<string, string> = {
  standard: '通用背景',
  evidence: '证据材料',
  explanation: '讲解材料',
};

function trimPreview(text: string, maxLength = 160) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength)}...`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAnnotatedContent(content: string, snippets: ReadingSnippet[]) {
  let annotated = content;

  snippets.forEach((snippet, index) => {
    const text = snippet.text.trim();
    if (!text) {
      return;
    }

    const mark = `<mark data-snippet-index="${index}" style="background: rgba(196, 106, 62, 0.18); padding: 0 0.18rem; border-radius: 0.35rem; cursor: pointer;">${escapeHtml(
      text
    )}</mark>`;

    annotated = annotated.replace(new RegExp(escapeRegExp(text)), mark);
  });

  return annotated;
}

function hasDetailMessage(payload: unknown): payload is { detail?: string } {
  return typeof payload === 'object' && payload !== null && 'detail' in payload;
}

function isPreAssessmentResponse(payload: unknown): payload is PreAssessmentResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'readiness' in payload &&
    'reading_strategy' in payload
  );
}

function isLearningChatResponse(payload: unknown): payload is LearningChatResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'answer' in payload &&
    typeof (payload as { answer?: unknown }).answer === 'string'
  );
}

export default function ReadingWorkspace({ subjectSlug, materialId }: Props) {
  const [workspace, setWorkspace] = useState<SubjectWorkspace | null>(null);
  const [viewMode, setViewMode] = useState<ReadingViewMode>('structured');
  const [sourceArtifact, setSourceArtifact] =
    useState<StoredLearningSourceArtifact | null>(null);
  const [sourceArtifactUrl, setSourceArtifactUrl] = useState<string | null>(null);
  const [sourceArtifactNotice, setSourceArtifactNotice] = useState<string | null>(
    null
  );

  const [selectedSnippets, setSelectedSnippets] = useState<ReadingSnippet[]>([]);
  const [activeSnippetIndex, setActiveSnippetIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  const [pendingSelection, setPendingSelection] = useState('');
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>(null);
  const [selectionSource, setSelectionSource] = useState<SelectionSource>('text');
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget>('material');
  const [historySnippetIndex, setHistorySnippetIndex] = useState<number | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const selectionMenuRef = useRef<HTMLDivElement | null>(null);
  const activeThreadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loaded = loadSubjectWorkspace(subjectSlug);
    const updated = markMaterialRead(loaded, materialId);
    saveSubjectWorkspace(updated);
    setWorkspace(updated);
  }, [materialId, subjectSlug]);

  const material = workspace ? getMaterialById(workspace, materialId) : null;
  const latestAssessment = material?.latestPreAssessment ?? null;

  useEffect(() => {
    const nextSnippets = material?.savedSnippets ?? [];
    setSelectedSnippets(nextSnippets);
    setActiveSnippetIndex(nextSnippets.length > 0 ? 0 : null);
    setViewMode(material?.preferredViewMode ?? 'structured');
  }, [material?.id, material?.savedSnippets, material?.preferredViewMode]);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    setSourceArtifact(null);
    setSourceArtifactUrl(null);
    setSourceArtifactNotice(null);

    if (!material) {
      return () => {
        mounted = false;
      };
    }

    void loadLearningMaterialSourceFile(material.id).then((artifact) => {
      if (!mounted) {
        return;
      }

      if (!artifact) {
        setSourceArtifactNotice('当前没有找到这份材料对应的原文件缓存。');
        return;
      }

      setSourceArtifact(artifact);
      objectUrl = URL.createObjectURL(artifact.file);
      setSourceArtifactUrl(objectUrl);
    });

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [material]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        selectionMenuRef.current &&
        event.target instanceof Node &&
        selectionMenuRef.current.contains(event.target)
      ) {
        return;
      }

      setSelectionMenu(null);
      setPendingSelection('');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectionMenu(null);
        setPendingSelection('');
        window.getSelection()?.removeAllRanges();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const persistWorkspace = (nextWorkspace: SubjectWorkspace) => {
    setWorkspace(nextWorkspace);
    saveSubjectWorkspace(nextWorkspace);
  };

  const persistStudyState = (
    nextSnippets: ReadingSnippet[],
    nextActiveIndex: number | null
  ) => {
    if (!workspace || !material) {
      return;
    }

    const activeMessages =
      nextActiveIndex !== null
        ? nextSnippets[nextActiveIndex]?.messages ?? []
        : [];

    persistWorkspace(
      updateMaterialStudyState(workspace, material.id, {
        savedSnippets: nextSnippets,
        chatHistory: activeMessages,
      })
    );
  };

  const backgroundMaterials = useMemo(() => {
    if (!workspace || !material) {
      return [];
    }

    return workspace.currentTarget.backgroundMaterials
      .map((assignment) => ({
        assignment,
        material: getMaterialById(workspace, assignment.materialId),
      }))
      .filter(
        (
          item
        ): item is {
          assignment: SubjectWorkspace['currentTarget']['backgroundMaterials'][number];
          material: LearningMaterialRecord;
        } => item.material !== null && item.material.id !== material.id
      );
  }, [workspace, material]);

  const annotatedContent = useMemo(() => {
    if (!material) {
      return '';
    }
    return buildAnnotatedContent(material.fullContent, selectedSnippets);
  }, [material, selectedSnippets]);

  const activeSnippet =
    activeSnippetIndex !== null ? selectedSnippets[activeSnippetIndex] ?? null : null;
  const activeMessages = activeSnippet?.messages ?? [];
  const historySnippet =
    historySnippetIndex !== null ? selectedSnippets[historySnippetIndex] ?? null : null;
  const historyMessages = historySnippet?.messages ?? [];
  const snippetHistory = useMemo(() => {
    if (!workspace || !material) {
      return [];
    }

    return getMaterialSnippetHistory(workspace, material.id);
  }, [workspace, material]);

  const closeSelectionMenu = () => {
    setSelectionMenu(null);
    setPendingSelection('');
    setSelectionTarget('material');
    window.getSelection()?.removeAllRanges();
  };

  const captureSelection = (
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>,
    source: SelectionSource,
    target: SelectionTarget = 'material'
  ) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    const anchorNode = selection?.anchorNode;

    if (!text || !anchorNode || !event.currentTarget.contains(anchorNode)) {
      setSelectionMenu(null);
      setPendingSelection('');
      return;
    }

    const rect =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).getBoundingClientRect()
        : undefined;

    setSelectionSource(source);
    setSelectionTarget(target);
    setPendingSelection(text);
    setSelectionMenu({
      x: event.clientX || (rect ? rect.left + rect.width / 2 : 0),
      y: event.clientY || (rect ? rect.bottom + 12 : 0),
    });
  };

  const ensureSnippetThread = (
    text: string,
    source: SelectionSource
  ): { nextSnippets: ReadingSnippet[]; index: number } | null => {
    if (!material) {
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const existingIndex = selectedSnippets.findIndex(
      (snippet) =>
        snippet.materialId === material.id && snippet.text.trim() === trimmed
    );

    if (existingIndex >= 0) {
      return {
        nextSnippets: selectedSnippets,
        index: existingIndex,
      };
    }

    const nextSnippets = addSnippet(selectedSnippets, {
      materialId: material.id,
      text: trimmed,
      anchorLabel:
        source === 'pdf_text' || source === 'pdf_screenshot'
          ? `PDF 片段 ${selectedSnippets.length + 1}`
          : `片段 ${selectedSnippets.length + 1}`,
      messages: [],
    }).map((snippet) => ({
      ...snippet,
      messages: snippet.messages ?? [],
    }));

    return {
      nextSnippets,
      index: nextSnippets.length - 1,
    };
  };

  const activateThread = (
    index: number,
    options: { openHistory?: boolean } = {}
  ) => {
    setActiveSnippetIndex(index);
    if (options.openHistory) {
      setHistorySnippetIndex(index);
    }
    setIsSidePanelOpen(true);
    window.setTimeout(() => {
      activeThreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const findSnippetIndex = (snippet: ReadingSnippet) => {
    if (snippet.id) {
      const indexById = selectedSnippets.findIndex(
        (candidate) => candidate.id === snippet.id
      );
      if (indexById >= 0) {
        return indexById;
      }
    }

    return selectedSnippets.findIndex(
      (candidate) =>
        candidate.materialId === snippet.materialId &&
        candidate.text === snippet.text &&
        candidate.anchorLabel === snippet.anchorLabel
    );
  };

  const openSnippetHistory = (index: number) => {
    setActiveSnippetIndex(index);
    setHistorySnippetIndex(index);
    setIsSidePanelOpen(false);
    setIsHistoryPanelOpen(false);
  };

  const addSelectionSnippet = (text: string, source: SelectionSource) => {
    const ensured = ensureSnippetThread(text, source);
    if (!ensured) {
      return;
    }

    setSelectedSnippets(ensured.nextSnippets);
    setActiveSnippetIndex(ensured.index);
    persistStudyState(ensured.nextSnippets, ensured.index);
  };

  const removeSnippetAt = (index: number) => {
    const nextSnippets = removeSnippetAtIndex(selectedSnippets, index);
    const nextActiveIndex =
      activeSnippetIndex === null
        ? null
        : activeSnippetIndex === index
          ? nextSnippets.length > 0
            ? Math.max(0, index - 1)
            : null
          : activeSnippetIndex > index
            ? activeSnippetIndex - 1
            : activeSnippetIndex;

    setSelectedSnippets(nextSnippets);
    setActiveSnippetIndex(nextActiveIndex);
    setHistorySnippetIndex(null);
    persistStudyState(nextSnippets, nextActiveIndex);
  };

  const clearActiveThread = () => {
    if (activeSnippetIndex === null) {
      return;
    }

    removeSnippetAt(activeSnippetIndex);
    setChatError(null);
  };

  const sendQuestion = async (
    nextQuestion: string,
    threadIndex = activeSnippetIndex,
    snippetsSnapshot = selectedSnippets
  ) => {
    if (!material || !workspace || threadIndex === null) {
      return;
    }

    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion) {
      return;
    }

    const thread = snippetsSnapshot[threadIndex];
    if (!thread) {
      return;
    }

    const previousMessages = thread.messages ?? [];
    const nextMessages: LearningChatMessage[] = [
      ...previousMessages,
      { role: 'user', content: trimmedQuestion },
    ];

    const nextSnippetsWithUser = snippetsSnapshot.map((snippet, index) =>
      index === threadIndex ? { ...snippet, messages: nextMessages } : snippet
    );

    const modelConfig = loadModelConfig();
    const requestPayload: LearningChatRequest = {
      material: {
        id: material.id,
        title: material.title,
        primaryRole: material.primaryRole,
        fullContent: material.fullContent,
      },
      selected_snippets: [
        {
          materialId: thread.materialId,
          text: thread.text,
          anchorLabel: thread.anchorLabel,
          source: thread.source,
          imageDataUrl: thread.imageDataUrl,
          pageNumber: thread.pageNumber,
          region: thread.region,
        },
      ],
      current_target: {
        title: workspace.currentTarget.title,
        backgroundMaterials: workspace.currentTarget.backgroundMaterials,
      },
      background_materials: backgroundMaterials.map(({ material: background }) => ({
        id: background.id,
        title: background.title,
        primaryRole: background.primaryRole,
        fullContent: background.fullContent,
      })),
      messages: nextMessages,
      provider: modelConfig.provider,
      model: modelConfig.model || undefined,
      api_key: modelConfig.api_key || undefined,
      base_url: modelConfig.base_url || undefined,
    };

    setIsSending(true);
    setChatError(null);
    setQuestion('');
    setSelectedSnippets(nextSnippetsWithUser);
    persistStudyState(nextSnippetsWithUser, threadIndex);

    try {
      const response = await fetch('/api/learning-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !isLearningChatResponse(data)) {
        throw new Error(
          (hasDetailMessage(data) ? data.detail : undefined) ||
            '学习提问暂时失败，请检查模型配置或稍后重试。'
        );
      }

      const finalMessages: LearningChatMessage[] = [
        ...nextMessages,
        { role: 'assistant', content: data.answer },
      ];

      const nextSnippetsWithAnswer = nextSnippetsWithUser.map((snippet, index) =>
        index === threadIndex ? { ...snippet, messages: finalMessages } : snippet
      );

      setSelectedSnippets(nextSnippetsWithAnswer);
      persistStudyState(nextSnippetsWithAnswer, threadIndex);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : '学习提问暂时失败，请稍后重试。'
      );
      setSelectedSnippets(snippetsSnapshot);
      persistStudyState(snippetsSnapshot, threadIndex);
      setQuestion(trimmedQuestion);
    } finally {
      setIsSending(false);
    }
  };

  const handleDirectAsk = async () => {
    const selectedText = pendingSelection;
    const prefix =
      selectionTarget === 'assistant_reply'
        ? '请基于这段助手回复继续解释、纠正或展开：'
        : '请围绕这段内容解释概念、指出重点，并告诉我下一步该怎么继续读：';

    if (selectionTarget === 'assistant_reply' && activeSnippetIndex !== null) {
      closeSelectionMenu();
      await sendQuestion(`${prefix}\n${selectedText}`, activeSnippetIndex, selectedSnippets);
      return;
    }

    const ensured = ensureSnippetThread(selectedText, selectionSource);
    if (!ensured) {
      return;
    }

    setSelectedSnippets(ensured.nextSnippets);
    setActiveSnippetIndex(ensured.index);
    persistStudyState(ensured.nextSnippets, ensured.index);
    closeSelectionMenu();
    await sendQuestion(
      `${prefix}\n${selectedText}`,
      ensured.index,
      ensured.nextSnippets
    );
  };

  const handleScreenshotQuestion = async (payload: ScreenshotQuestionPayload) => {
    if (!material) {
      return;
    }

    const screenshotText = `${payload.text}（x:${Math.round(payload.region.x)}, y:${Math.round(
      payload.region.y
    )}, w:${Math.round(payload.region.width)}, h:${Math.round(payload.region.height)}）`;

    const nextSnippets = addSnippet(selectedSnippets, {
      materialId: material.id,
      text: screenshotText,
      anchorLabel: `PDF 截图 ${selectedSnippets.length + 1}`,
      source: 'pdf_screenshot',
      imageDataUrl: payload.imageDataUrl,
      pageNumber: payload.pageNumber,
      region: payload.region,
      messages: [],
    }).map((snippet) => ({
      ...snippet,
      messages: snippet.messages ?? [],
    }));
    const index = nextSnippets.length - 1;

    setSelectedSnippets(nextSnippets);
    setActiveSnippetIndex(index);
    setIsSidePanelOpen(true);
    persistStudyState(nextSnippets, index);

    if (payload.mode === 'direct') {
      setHistorySnippetIndex(index);
      await sendQuestion(
        payload.question ||
          `请观察这张 PDF 第 ${payload.pageNumber} 页的截图，解释里面的关键内容。`,
        index,
        nextSnippets
      );
    } else {
      setHistorySnippetIndex(index);
      if (payload.question) {
        setQuestion(payload.question);
      }
    }
  };

  const handleRunPreAssessment = async () => {
    if (!material || !workspace) {
      return;
    }

    setIsAssessmentOpen(true);
    setIsAssessing(true);
    setAssessmentError(null);

    try {
      const modelConfig = loadModelConfig();
      const selectedExcerpt =
        activeSnippet?.text ??
        selectedSnippets.map((snippet) => snippet.text).join('\n\n') ??
        '';

      const payload: PreAssessmentRequest = {
        source_type: material.sourceType,
        title: material.title,
        full_content: material.fullContent,
        selected_excerpt: selectedExcerpt || undefined,
        user_goal_hint: workspace.currentTarget.title,
        profile_overrides: {},
        provider: modelConfig.provider,
        model: modelConfig.model || undefined,
        api_key: modelConfig.api_key || undefined,
        base_url: modelConfig.base_url || undefined,
      };

      const response = await fetch('/api/pre-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as unknown;
      if (!response.ok || !isPreAssessmentResponse(data)) {
        throw new Error(
          (hasDetailMessage(data) ? data.detail : undefined) ||
            '前置评估暂时失败，请稍后重试。'
        );
      }

      persistWorkspace(updateMaterialPreAssessment(workspace, material.id, data));
    } catch (error) {
      setAssessmentError(
        error instanceof Error ? error.message : '前置评估暂时失败，请稍后重试。'
      );
    } finally {
      setIsAssessing(false);
    }
  };

  const handleChangeViewMode = (nextMode: ReadingViewMode) => {
    if (!workspace || !material) {
      return;
    }

    setViewMode(nextMode);
    persistWorkspace(
      updateMaterialPreferredViewMode(workspace, material.id, nextMode)
    );
  };

  if (!workspace) {
    return (
      <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom">
          正在加载阅读工作区...
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            没找到这份材料
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            这份材料可能还没导入成功，或者已经从当前学科资料库中移除。
          </p>
          <Link
            href={`/learn/${subjectSlug}`}
            className="btn-japanese mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
          >
            返回资料库
          </Link>
        </div>
      </div>
    );
  }

  const canRenderOriginalFile =
    viewMode === 'original' && Boolean(sourceArtifact) && Boolean(sourceArtifactUrl);

  return (
    <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Reading Workspace
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                {material.title}
              </h1>
              <p className="text-sm leading-6 text-[var(--muted)]">
                当前目标：{workspace.currentTarget.title}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/learn/${subjectSlug}`}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                返回资料库
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (isAssessmentOpen) {
                    setIsAssessmentOpen(false);
                  } else {
                    void handleRunPreAssessment();
                  }
                }}
                className="btn-japanese inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
              >
                {isAssessmentOpen ? '收起前置评估' : '打开前置评估'}
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryPanelOpen(true)}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                历史记录
              </button>
            </div>
          </div>
        </header>

        {isAssessmentOpen ? (
          <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                  前置评估
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  用当前材料和当前片段判断现在适不适合读、该先抓什么。
                </p>
              </div>
              {isAssessing ? (
                <span className="text-sm text-[var(--muted)]">正在分析...</span>
              ) : null}
            </div>

            {assessmentError ? (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                {assessmentError}
              </div>
            ) : latestAssessment ? (
              <PreAssessmentCards result={latestAssessment} />
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">
                还没有评估结果，点击顶部按钮即可生成。
              </p>
            )}
          </section>
        ) : null}

        <div className="relative">
          <section className="space-y-4 rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-3 shadow-custom backdrop-blur-sm md:p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                  材料阅读
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  原文件里读到哪里就在哪里框选提问；已有问题会在 PDF 对应位置留下锚点。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--background)]/68 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => handleChangeViewMode('structured')}
                    className={`rounded-full px-3 py-1.5 transition ${
                      viewMode === 'structured'
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    结构化阅读
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeViewMode('original')}
                    className={`rounded-full px-3 py-1.5 transition ${
                      viewMode === 'original'
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    原文件优先
                  </button>
                </div>
                <span className="rounded-full border border-[var(--border-color)] bg-[var(--background)]/68 px-4 py-2 text-xs text-[var(--muted)]">
                  提问片段 {selectedSnippets.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSidePanelOpen(true)}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--background)]/68 px-4 py-2 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                >
                  打开问答面板
                </button>
              </div>
            </div>

            {viewMode === 'original' ? (
              <div className="space-y-4">
                {canRenderOriginalFile ? (
                  <PdfReadingSurface
                    fileUrl={sourceArtifactUrl as string}
                    title={material.title}
                    filename={sourceArtifact?.filename ?? material.filename}
                    mimeType={sourceArtifact?.mimeType ?? material.mimeType}
                    snippets={selectedSnippets}
                    onOpenSnippet={openSnippetHistory}
                    onScreenshotQuestion={(payload) => {
                      void handleScreenshotQuestion(payload);
                    }}
                  />
                ) : (
                  <section className="rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/72 p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      当前还没有可展示的原文件
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {sourceArtifactNotice ??
                        '你仍然可以直接使用下面的结构化文本开始学习提问。'}
                    </p>
                  </section>
                )}
              </div>
            ) : (
              <div
                ref={contentRef}
                onMouseUp={(event) => captureSelection(event, 'text')}
                onClick={(event) => {
                  const target = event.target as HTMLElement | null;
                  const mark = target?.closest('[data-snippet-index]');
                  if (!mark) {
                    return;
                  }
                  const value = mark.getAttribute('data-snippet-index');
                  if (value === null) {
                    return;
                  }
                  const index = Number(value);
                  if (!Number.isNaN(index)) {
                    activateThread(index, { openHistory: true });
                  }
                }}
                onContextMenu={(event) => {
                  const selection = window.getSelection();
                  const text = selection?.toString().trim() ?? '';
                  if (!text) {
                    return;
                  }
                  if (
                    !contentRef.current ||
                    !selection?.anchorNode ||
                    !contentRef.current.contains(selection.anchorNode)
                  ) {
                    return;
                  }
                  event.preventDefault();
                  captureSelection(event, 'text');
                }}
                className="rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/72 p-4"
              >
                <Markdown content={annotatedContent} />
              </div>
            )}

            {selectionMenu ? (
              <div
                ref={selectionMenuRef}
                className="fixed z-30 max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-custom backdrop-blur-sm"
                style={{
                  left: `${selectionMenu.x}px`,
                  top: `${selectionMenu.y}px`,
                }}
              >
                <p className="line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                  {trimPreview(pendingSelection)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDirectAsk()}
                    className="btn-japanese inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs"
                  >
                    直接提问
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectionTarget === 'assistant_reply') {
                        setQuestion(`请基于这段回复继续追问：\n${pendingSelection}`);
                        setIsSidePanelOpen(true);
                      } else {
                        addSelectionSnippet(pendingSelection, selectionSource);
                      }
                      closeSelectionMenu();
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                  >
                    建立片段
                  </button>
                  <button
                    type="button"
                    onClick={closeSelectionMenu}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
                  >
                    关闭
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {isSidePanelOpen ? (
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setIsSidePanelOpen(false);
                }
              }}
            />
          ) : null}

          <aside
            className={`fixed right-4 top-4 z-50 max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] space-y-4 overflow-auto rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/96 p-4 shadow-custom backdrop-blur-sm transition-transform ${
              isSidePanelOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Reading Tools
              </p>
              <button
                type="button"
                onClick={() => setIsSidePanelOpen(false)}
                className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                收起
              </button>
            </div>
            <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-5 shadow-custom backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Background
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                当前目标背景
              </h2>

              <div className="mt-4 space-y-3">
                {backgroundMaterials.length > 0 ? (
                  backgroundMaterials.map(({ assignment, material: background }) => (
                    <div
                      key={background.id}
                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/68 p-4"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {background.title}
                      </p>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        {backgroundRoleLabels[assignment.backgroundRole] ??
                          assignment.backgroundRole}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    还没有给当前目标挂任何背景资料。
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-5 shadow-custom backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                Threads
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                片段入口
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                每个片段就是一个可回看的小问答线程。
              </p>

              <div className="mt-4 space-y-3">
                {selectedSnippets.length > 0 ? (
                  selectedSnippets.map((snippet, index) => (
                    <button
                      key={`${snippet.anchorLabel}-${index}`}
                      type="button"
                      onClick={() => activateThread(index, { openHistory: true })}
                      className={`block w-full rounded-2xl border p-4 text-left transition ${
                        activeSnippetIndex === index
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/8'
                          : 'border-[var(--border-color)] bg-[var(--background)]/68 hover:border-[var(--accent-primary)]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                          {snippet.anchorLabel}
                        </p>
                        <span className="text-xs text-[var(--muted)]">
                          {(snippet.messages ?? []).length} 条消息
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                        {trimPreview(snippet.text)}
                      </p>
                      {snippet.imageDataUrl ? (
                        <img
                          src={snippet.imageDataUrl}
                          alt={snippet.anchorLabel}
                          className="mt-3 max-h-28 w-full rounded-xl border border-[var(--border-color)] bg-white object-contain"
                        />
                      ) : null}
                    </button>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    先在正文里选一段再提问，就会生成可回看的片段入口。
                  </p>
                )}
              </div>
            </section>

            <section
              ref={activeThreadRef}
              className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-5 shadow-custom backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                    Ask While Reading
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                    片段问答
                  </h2>
                </div>
                {activeSnippet ? (
                  <button
                    type="button"
                    onClick={clearActiveThread}
                    className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                  >
                    删除该对话
                  </button>
                ) : null}
              </div>

              {activeSnippet ? (
                <>
                  <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/68 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                      {activeSnippet.anchorLabel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                      {activeSnippet.text}
                    </p>
                    {activeSnippet.imageDataUrl ? (
                      <img
                        src={activeSnippet.imageDataUrl}
                        alt={activeSnippet.anchorLabel}
                        className="mt-3 max-h-56 w-full rounded-2xl border border-[var(--border-color)] bg-white object-contain"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeSnippetAt(activeSnippetIndex as number)}
                      className="mt-3 text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
                    >
                      删除这个片段入口
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {activeMessages.length > 0 ? (
                      activeMessages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={`rounded-2xl border p-4 ${
                            message.role === 'assistant'
                              ? 'border-[var(--border-color)] bg-[var(--background)]/72'
                              : 'border-[var(--accent-primary)]/18 bg-[var(--accent-primary)]/8'
                          }`}
                        >
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                            {message.role === 'assistant' ? '助手' : '我'}
                          </p>
                          {message.role === 'assistant' ? (
                            <div
                              onMouseUp={(event) =>
                                captureSelection(event, 'text', 'assistant_reply')
                              }
                              onContextMenu={(event) => {
                                const selection = window.getSelection();
                                const text = selection?.toString().trim() ?? '';
                                if (!text) {
                                  return;
                                }
                                event.preventDefault();
                                captureSelection(event, 'text', 'assistant_reply');
                              }}
                            >
                              <Markdown content={message.content} />
                            </div>
                          ) : (
                            <p className="text-sm leading-6 text-[var(--foreground)]">
                              {message.content}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-[var(--muted)]">
                        这段还没有提问历史。现在就可以围绕它开始连续追问。
                      </p>
                    )}
                  </div>

                  {chatError ? (
                    <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                      {chatError}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      rows={4}
                      placeholder="继续追问这段：这句和上一页有什么关系？为什么这里这样定义？如果考试怎么考？"
                      className="input-japanese w-full rounded-[24px] px-4 py-3 text-sm leading-6 text-[var(--foreground)]"
                    />
                    <button
                      type="button"
                      onClick={() => void sendQuestion(question)}
                      disabled={isSending}
                      className="btn-japanese inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSending ? '正在提问...' : '围绕该片段继续问'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                  先在正文中选一段并提问，或者点击一段已经高亮的原文，右侧就会打开这段对应的历史。
                </p>
              )}
            </section>
          </aside>
      </div>
      </div>

      {historySnippet ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/48 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${historySnippet.anchorLabel} 历史问答`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setHistorySnippetIndex(null);
            }
          }}
        >
          <div className="max-h-[88dvh] w-full max-w-3xl overflow-auto rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-custom">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                  History
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  {historySnippet.anchorLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistorySnippetIndex(null)}
                className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                关闭
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/68 p-4">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                {historySnippet.text}
              </p>
              {historySnippet.imageDataUrl ? (
                <img
                  src={historySnippet.imageDataUrl}
                  alt={historySnippet.anchorLabel}
                  className="mt-3 max-h-[22rem] w-full rounded-2xl border border-[var(--border-color)] bg-white object-contain"
                />
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {historyMessages.length > 0 ? (
                historyMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-2xl border p-4 ${
                      message.role === 'assistant'
                        ? 'border-[var(--border-color)] bg-[var(--background)]/72'
                        : 'border-[var(--accent-primary)]/18 bg-[var(--accent-primary)]/8'
                    }`}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                      {message.role === 'assistant' ? '助手' : '我'}
                    </p>
                    {message.role === 'assistant' ? (
                      <div
                        onMouseUp={(event) =>
                          captureSelection(event, 'text', 'assistant_reply')
                        }
                        onContextMenu={(event) => {
                          const selection = window.getSelection();
                          const text = selection?.toString().trim() ?? '';
                          if (!text) {
                            return;
                          }
                          event.preventDefault();
                          captureSelection(event, 'text', 'assistant_reply');
                        }}
                      >
                        <Markdown content={message.content} />
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-[var(--foreground)]">
                        {message.content}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/68 p-4 text-sm leading-6 text-[var(--muted)]">
                  这个片段还没有历史问答。
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isHistoryPanelOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/28"
          role="dialog"
          aria-modal="true"
          aria-label="全部历史记录"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsHistoryPanelOpen(false);
            }
          }}
        >
          <div className="h-full w-[min(34rem,100vw)] overflow-auto border-l border-[var(--border-color)] bg-[var(--card-bg)] p-5 shadow-custom">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                  History
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  全部提问记录
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  按页码和页面位置排列。点一条记录，可以回到对应片段的历史问答。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryPanelOpen(false)}
                className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                关闭
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {snippetHistory.length > 0 ? (
                snippetHistory.map((snippet) => {
                  const index = findSnippetIndex(snippet);
                  const firstQuestion =
                    snippet.messages?.find((message) => message.role === 'user')
                      ?.content ?? snippet.text;

                  return (
                    <button
                      key={snippet.id ?? `${snippet.anchorLabel}-${snippet.text}`}
                      type="button"
                      onClick={() => {
                        if (index >= 0) {
                          openSnippetHistory(index);
                        }
                      }}
                      className="block w-full rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/68 p-4 text-left transition hover:border-[var(--accent-primary)]/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                          {snippet.pageNumber ? `第 ${snippet.pageNumber} 页` : '结构化片段'}
                        </p>
                        <span className="text-xs text-[var(--muted)]">
                          {(snippet.messages ?? []).length} 条消息
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[6rem_1fr]">
                        {snippet.imageDataUrl ? (
                          <img
                            src={snippet.imageDataUrl}
                            alt={snippet.anchorLabel}
                            className="h-20 w-full rounded-xl border border-[var(--border-color)] bg-white object-contain"
                          />
                        ) : (
                          <div className="flex h-20 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--muted)]">
                            文本
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {snippet.anchorLabel}
                          </p>
                          <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                            {trimPreview(firstQuestion, 120)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/68 p-5 text-sm leading-6 text-[var(--muted)]">
                  还没有历史记录。读 PDF 时点当前页的“框选提问”，就会在这里沉淀。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
