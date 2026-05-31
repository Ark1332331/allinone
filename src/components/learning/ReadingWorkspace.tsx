'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { FaTimes } from 'react-icons/fa';

import Markdown from '@/components/Markdown';
import AskMenu from '@/components/learning/AskMenu';
import PdfReadingSurface from '@/components/learning/PdfReadingSurface';
import PreAssessmentCards from '@/components/PreAssessmentCards';
import {
  CUSTOM_TEMPLATE_ID,
  STAGE_TEMPLATE_ID,
  buildTemplatePrompt,
  type PromptTemplate,
} from '@/lib/prompt-templates';
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
import { createSubjectShelfPath } from '@/lib/learn-content';
import { loadModelConfig } from '@/lib/model-config';
import {
  annotateContentWithSnippetAnchors,
  buildAssistantReplyFollowUpMessages,
  buildCurrentQuestionContext,
  buildReadingQuestionContext,
  clampFloatingBox,
  clampSelectionBox,
  closeFloatingThread,
  createSelectionSnippetDraft,
  openFloatingThread,
  reconcileFloatingThreadsAfterSnippetRemoval,
  getFloatingLayerZIndex,
  getReadableApiErrorMessage,
  getFloatingThreadPosition,
  getSelectionFallbackPosition,
  getSelectionMenuPosition,
  shouldSkipGlobalSelectionMenuUpdate,
  stripRenderedSnippetMarkup,
  type FloatingThreadBox,
} from '@/lib/reading-interactions';
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

type FloatingBoxState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SelectionMenuState = FloatingBoxState | null;
type FloatingThreadState = FloatingThreadBox;

type FloatingThreadDragMode = 'move' | 'resize' | 'resize-left';
type SelectionMenuDragMode = 'move' | 'resize' | 'resize-left';

type FloatingThreadDragState = {
  mode: FloatingThreadDragMode;
  startX: number;
  startY: number;
  box: FloatingThreadState;
};

type SelectionMenuDragState = {
  mode: SelectionMenuDragMode;
  startX: number;
  startY: number;
  box: FloatingBoxState;
};

type SelectionSource = 'text' | 'pdf_text' | 'pdf_screenshot' | 'assistant_reply';
type SelectionTarget = 'material' | 'assistant_reply';
type SelectionMenuPlacement = 'above' | 'below';
type SelectableElement = HTMLElement & {
  dataset: {
    selectionSource?: SelectionSource;
    selectionTarget?: SelectionTarget;
  };
};

type ScreenshotQuestionPayload = {
  text: string;
  question: string;
  imageDataUrl: string;
  pageNumber: number;
  region: ReadingSnippetRegion;
  mode: 'direct' | 'stage';
};

type SendQuestionResult = {
  answer?: string;
  error?: string;
};

type SendQuestionOptions = {
  openPanel?: boolean;
  requestMessages?: LearningChatMessage[];
};

function trimPreview(text: string, maxLength = 160) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength)}...`;
}

function buildAnnotatedContent(
  content: string,
  snippets: ReadingSnippet[],
  shouldAnnotate: (snippet: ReadingSnippet) => boolean = () => true
) {
  return annotateContentWithSnippetAnchors({
    content,
    snippets,
    shouldAnnotate,
  });
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

function getElementFromNode(node: Node | null | undefined) {
  if (!node) {
    return null;
  }

  return node instanceof Element ? node : node.parentElement;
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
  const [stagedQuestionSnippets, setStagedQuestionSnippets] = useState<
    ReadingSnippet[]
  >([]);
  const [activeSnippetIndex, setActiveSnippetIndex] = useState<number | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  const [pendingSelection, setPendingSelection] = useState('');
  const [selectionQuestion, setSelectionQuestion] = useState('');
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>(null);
  const [selectionSource, setSelectionSource] = useState<SelectionSource>('text');
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget>('material');
  const [selectionParentSnippetId, setSelectionParentSnippetId] = useState<string | null>(null);
  const [selectionMenuFallback, setSelectionMenuFallback] = useState(false);
  const [selectionMenuDrag, setSelectionMenuDrag] =
    useState<SelectionMenuDragState | null>(null);
  const [floatingThreads, setFloatingThreads] = useState<FloatingThreadState[]>([]);
  const [floatingThreadDrag, setFloatingThreadDrag] =
    useState<FloatingThreadDragState | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [askMenu, setAskMenu] = useState<{
    point: { x: number; y: number };
    text: string;
    source: SelectionSource;
    target: SelectionTarget;
    parentSnippetId: string | null;
  } | null>(null);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const selectionMenuRef = useRef<HTMLDivElement | null>(null);
  const floatingThreadRefs = useRef<Record<number, HTMLElement | null>>({});

  const createFloatingThreadBox = (
    snippetIndex: number,
    anchor?: { x: number; y: number } | null,
    current?: FloatingThreadState | null
  ): FloatingThreadState => {
    const size = current
      ? { width: current.width, height: current.height }
      : { width: 420, height: 520 };
    const position = getFloatingThreadPosition({ anchor, box: size });

    const box = clampFloatingBox({
      box: {
        x: position.x,
        y: position.y,
        ...size,
      },
    });

    return {
      snippetIndex,
      ...box,
    };
  };

  const createSelectionMenuBox = (
    position: { x: number; y: number },
    current?: SelectionMenuState
  ): FloatingBoxState =>
    clampSelectionBox({
      box: {
        x: position.x,
        y: position.y,
        width: current?.width ?? 352,
        height: current?.height ?? 252,
      },
    });

  useEffect(() => {
    if (!selectionMenuDrag) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - selectionMenuDrag.startX;
      const deltaY = event.clientY - selectionMenuDrag.startY;
      const { box, mode } = selectionMenuDrag;

      if (mode === 'move') {
        setSelectionMenu(
          clampSelectionBox({
            box: {
              ...box,
              x: box.x + deltaX,
              y: box.y + deltaY,
            },
          })
        );
        setSelectionMenuFallback(false);
        return;
      }

      if (mode === 'resize-left') {
        setSelectionMenu(
          clampSelectionBox({
            box: {
              x: box.x + deltaX,
              y: box.y,
              width: box.width - deltaX,
              height: box.height,
            },
          })
        );
        setSelectionMenuFallback(false);
        return;
      }

      setSelectionMenu(
        clampSelectionBox({
          box: {
            ...box,
            width: box.width + deltaX,
            height: box.height + deltaY,
          },
        })
      );
      setSelectionMenuFallback(false);
    };

    const handlePointerUp = () => setSelectionMenuDrag(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [selectionMenuDrag]);

  useEffect(() => {
    if (!floatingThreadDrag) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - floatingThreadDrag.startX;
      const deltaY = event.clientY - floatingThreadDrag.startY;
      const { box, mode } = floatingThreadDrag;

      if (mode === 'move') {
        setFloatingThreads((threads) =>
          openFloatingThread(threads, {
            ...box,
            ...clampFloatingBox({
              box: {
                ...box,
                x: box.x + deltaX,
                y: box.y + deltaY,
              },
            }),
          })
        );
        return;
      }

      if (mode === 'resize-left') {
        setFloatingThreads((threads) =>
          openFloatingThread(threads, {
            ...box,
            ...clampFloatingBox({
              box: {
                x: box.x + deltaX,
                y: box.y,
                width: box.width - deltaX,
                height: box.height,
              },
            }),
          })
        );
        return;
      }

      setFloatingThreads((threads) =>
        openFloatingThread(threads, {
          ...box,
          ...clampFloatingBox({
            box: {
              ...box,
              width: box.width + deltaX,
              height: box.height + deltaY,
            },
          }),
        })
      );
    };

    const handlePointerUp = () => setFloatingThreadDrag(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [floatingThreadDrag]);

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
    setStagedQuestionSnippets([]);
    setActiveSnippetIndex(nextSnippets.length > 0 ? 0 : null);
    setViewMode(material?.preferredViewMode ?? 'structured');
  }, [material?.id]);

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
        setSourceArtifactNotice('没有找到这份材料对应的原文件缓存。');
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
  }, [material?.id]);

  const updateSelectionMenuFromDocument = (
    pointer?: { x: number; y: number },
    preferredSelectable?: SelectableElement | null,
    preferredPlacement?: SelectionMenuPlacement
  ) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    const anchorNode = selection?.anchorNode;
    const focusNode = selection?.focusNode;

    if (!selection || !text || !anchorNode || !focusNode || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const anchorElement = getElementFromNode(anchorNode);
    const focusElement = getElementFromNode(focusNode);
    const commonElement = getElementFromNode(range.commonAncestorContainer);
    const localSelectionOwners = [
      anchorElement
        ?.closest('[data-local-selection-owner]')
        ?.getAttribute('data-local-selection-owner'),
      focusElement
        ?.closest('[data-local-selection-owner]')
        ?.getAttribute('data-local-selection-owner'),
      commonElement
        ?.closest('[data-local-selection-owner]')
        ?.getAttribute('data-local-selection-owner'),
    ];

    const selectionContainers = [
      anchorElement
        ?.closest('[data-selection-container]')
        ?.getAttribute('data-selection-container'),
      focusElement
        ?.closest('[data-selection-container]')
        ?.getAttribute('data-selection-container'),
      commonElement
        ?.closest('[data-selection-container]')
        ?.getAttribute('data-selection-container'),
    ];

    if (
      !preferredSelectable &&
      shouldSkipGlobalSelectionMenuUpdate({
        localOwners: localSelectionOwners,
        selectionContainers,
      })
    ) {
      return;
    }

    const candidates = [
      preferredSelectable,
      anchorElement?.closest('[data-selection-scope="reading"]'),
      focusElement?.closest('[data-selection-scope="reading"]'),
      commonElement?.closest('[data-selection-scope="reading"]'),
    ].filter(Boolean) as SelectableElement[];
    const selectable =
      candidates.find((candidate) => {
        try {
          return range.intersectsNode(candidate);
        } catch {
          return false;
        }
      }) ?? null;

    if (!selectable || !anchorElement || !focusElement) {
      setSelectionSource(preferredSelectable?.dataset.selectionSource ?? 'text');
      setSelectionTarget(preferredSelectable?.dataset.selectionTarget ?? 'material');
      setPendingSelection(text);
      setSelectionMenu((current) =>
        createSelectionMenuBox(getSelectionFallbackPosition(), current)
      );
      setSelectionMenuFallback(true);
      return;
    }

    const anchorInside = selectable.contains(anchorElement);
    const focusInside = selectable.contains(focusElement);
    const selectionIntersectsScope = (() => {
      try {
        return range.intersectsNode(selectable);
      } catch {
        return false;
      }
    })();

    if ((!anchorInside || !focusInside) && !selectionIntersectsScope) {
      setSelectionSource(selectable.dataset.selectionSource ?? 'text');
      setSelectionTarget(selectable.dataset.selectionTarget ?? 'material');
      setPendingSelection(text);
      setSelectionMenu((current) =>
        createSelectionMenuBox(getSelectionFallbackPosition(), current)
      );
      setSelectionMenuFallback(true);
      return;
    }

    const rect = range.getBoundingClientRect();
    const rects = Array.from(range.getClientRects()).map((clientRect) => ({
      left: clientRect.left,
      top: clientRect.top,
      width: clientRect.width,
      height: clientRect.height,
      bottom: clientRect.bottom,
    }));
    const selectionContainer = selectable.closest('[data-selection-container]');
    const containerRect = selectionContainer?.getBoundingClientRect();
    const openThreadElements = Object.values(floatingThreadRefs.current).filter(
      (element): element is HTMLElement => element !== null
    );
    const isInsideCurrentThread =
      containerRect && openThreadElements.includes(selectionContainer as HTMLElement);
    const viewport =
      isInsideCurrentThread
        ? {
            width: Math.max(320, containerRect.right - 12),
            height: Math.max(260, containerRect.bottom - 12),
          }
        : undefined;
    const menuSize = {
      width: selectionMenu?.width ?? 352,
      height: selectionMenu?.height ?? 252,
    };
    const position = getSelectionMenuPosition({
      rect,
      rects,
      pointer,
      viewport,
      menu: menuSize,
      preferredPlacement:
        preferredPlacement ?? (isInsideCurrentThread ? 'above' : undefined),
    });

    setSelectionSource(selectable.dataset.selectionSource ?? 'text');
    setSelectionTarget(selectable.dataset.selectionTarget ?? 'material');
    setPendingSelection(text);
    setSelectionMenu((current) => createSelectionMenuBox(position, current));
    setSelectionMenuFallback(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        selectionMenuRef.current &&
        event.target instanceof Node &&
        selectionMenuRef.current.contains(event.target)
      ) {
        return;
      }
      if (
        event.target instanceof Node &&
        Object.values(floatingThreadRefs.current).some((element) =>
          element?.contains(event.target as Node)
        )
      ) {
        return;
      }

      setSelectionMenu(null);
      setPendingSelection('');
      setSelectionQuestion('');
      setSelectionMenuFallback(false);
      setAskMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectionMenu(null);
        setPendingSelection('');
        setSelectionQuestion('');
        setSelectionMenuFallback(false);
        setAskMenu(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    const handlePointerUp = (event: MouseEvent) => {
      if (selectionMenuDrag || floatingThreadDrag) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest('[data-local-selection-owner="pdf-answer"]') ||
        target?.closest('[data-selection-container="current-thread"]')
      ) {
        return;
      }

      window.setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() ?? '';
        if (!text) {
          return;
        }
        setAskMenu({
          point: { x: event.clientX, y: event.clientY },
          text,
          source: 'text',
          target: 'material',
          parentSnippetId: null,
        });
      }, 0);
    };

    const refreshSelectionMenuPosition = () => {
      if (!selectionMenu) {
        return;
      }

      window.setTimeout(() => {
        setSelectionMenu((current) =>
          current ? clampSelectionBox({ box: current }) : current
        );
      }, 0);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', refreshSelectionMenuPosition, true);
    window.addEventListener('resize', refreshSelectionMenuPosition);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', refreshSelectionMenuPosition, true);
      window.removeEventListener('resize', refreshSelectionMenuPosition);
    };
  }, [floatingThreadDrag, selectionMenu, selectionMenuDrag]);

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
    return buildAnnotatedContent(
      material.fullContent,
      selectedSnippets,
      (snippet) => snippet.source !== 'assistant_reply'
    );
  }, [material, selectedSnippets]);

  const getAnnotatedAssistantContent = (
    content: string,
    parentSnippetId?: string
  ) =>
    buildAnnotatedContent(
      stripRenderedSnippetMarkup(content),
      selectedSnippets,
      (snippet) => snippet.source === 'assistant_reply' &&
        Boolean(parentSnippetId) &&
        snippet.parentSnippetId === parentSnippetId
    );

  const activeSnippet =
    activeSnippetIndex !== null ? selectedSnippets[activeSnippetIndex] ?? null : null;
  const activeMessages = activeSnippet?.messages ?? [];
  const snippetHistory = useMemo(() => {
    if (!workspace || !material) {
      return [];
    }

    return getMaterialSnippetHistory(workspace, material.id);
  }, [workspace, material]);

  const closeSelectionMenu = () => {
    setSelectionMenu(null);
    setPendingSelection('');
    setSelectionQuestion('');
    setSelectionMenuFallback(false);
    setSelectionTarget('material');
    setSelectionParentSnippetId(null);
    window.getSelection()?.removeAllRanges();
  };

  const captureSelection = (
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>,
    source: SelectionSource,
    target: SelectionTarget = 'material',
    parentSnippetId?: string
  ) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    if (!text) return;

    setAskMenu({
      point: { x: event.clientX, y: event.clientY },
      text,
      source,
      target,
      parentSnippetId: parentSnippetId ?? null,
    });
  };

  const ensureSnippetThread = (
    text: string,
    source: SelectionSource,
    parentSnippetId?: string | null
  ): { nextSnippets: ReadingSnippet[]; index: number } | null => {
    if (!material) {
      return null;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }
    const cleanedText = stripRenderedSnippetMarkup(trimmed);

    const existingIndex = selectedSnippets.findIndex(
      (snippet) =>
        snippet.materialId === material.id &&
        snippet.text.trim() === cleanedText &&
        (snippet.source ?? 'text') === source &&
        (source !== 'assistant_reply' ||
          (snippet.parentSnippetId ?? null) === (parentSnippetId ?? null))
    );

    if (existingIndex >= 0) {
      return {
        nextSnippets: selectedSnippets,
        index: existingIndex,
      };
    }

    const nextSnippetDraft = createSelectionSnippetDraft({
      materialId: material.id,
      text: cleanedText,
      source,
      parentSnippetId: parentSnippetId ?? undefined,
      ordinal: selectedSnippets.length + 1,
    });

    const nextSnippets = addSnippet(selectedSnippets, nextSnippetDraft).map((snippet) => ({
      ...snippet,
      messages: snippet.messages ?? [],
    }));

    return {
      nextSnippets,
      index: nextSnippets.length - 1,
    };
  };

  const openSnippetInCurrentBox = (
    index: number,
    anchor?: { x: number; y: number } | null
  ) => {
    setActiveSnippetIndex(index);
    setFloatingThreads((currentThreads) => {
      const existingThread =
        currentThreads.find((thread) => thread.snippetIndex === index) ?? null;
      return openFloatingThread(
        currentThreads,
        createFloatingThreadBox(index, anchor, existingThread)
      );
    });
    setIsHistoryPanelOpen(false);
  };

  const handleAnnotatedSnippetClick = (target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    const mark = element?.closest('[data-snippet-index]');
    if (!mark) {
      return;
    }

    const value = mark.getAttribute('data-snippet-index');
    if (value === null) {
      return;
    }

    const index = Number(value);
    if (!Number.isNaN(index)) {
      const rect = mark.getBoundingClientRect();
      openSnippetInCurrentBox(index, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
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

  const addSelectionSnippet = (text: string, source: SelectionSource) => {
    const ensured = ensureSnippetThread(text, source, selectionParentSnippetId);
    if (!ensured) {
      return;
    }

    const snippet = ensured.nextSnippets[ensured.index];
    setSelectedSnippets(ensured.nextSnippets);
    setActiveSnippetIndex(ensured.index);
    if (snippet) {
      setStagedQuestionSnippets((current) =>
        buildCurrentQuestionContext({
          materialId: snippet.materialId,
          stagedSnippets: current,
          currentSnippet: snippet,
        })
      );
    }
    persistStudyState(ensured.nextSnippets, ensured.index);
  };

  const openThreadBox = (
    threadIndex: number,
    anchor?: { x: number; y: number } | null
  ) => {
    setFloatingThreads((currentThreads) => {
      const existingThread =
        currentThreads.find((thread) => thread.snippetIndex === threadIndex) ?? null;
      return openFloatingThread(
        currentThreads,
        createFloatingThreadBox(
          threadIndex,
          anchor,
          existingThread
        )
      );
    });
    setIsHistoryPanelOpen(false);
  };

  const closeThreadBox = (threadIndex: number) => {
    setFloatingThreads((currentThreads) =>
      closeFloatingThread(currentThreads, threadIndex)
    );
  };

  const removeSnippetAt = (index: number) => {
    const removedSnippet = selectedSnippets[index];
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
    if (removedSnippet) {
      setStagedQuestionSnippets((current) =>
        current.filter((snippet) =>
          removedSnippet.id
            ? snippet.id !== removedSnippet.id
            : !(
                snippet.materialId === removedSnippet.materialId &&
                snippet.text === removedSnippet.text &&
                snippet.anchorLabel === removedSnippet.anchorLabel
              )
        )
      );
    }
    setActiveSnippetIndex(nextActiveIndex);
    setFloatingThreads((currentThreads) =>
      reconcileFloatingThreadsAfterSnippetRemoval(currentThreads, index)
    );
    persistStudyState(nextSnippets, nextActiveIndex);
  };

  const sendQuestion = async (
    nextQuestion: string,
    threadIndex = activeSnippetIndex,
    snippetsSnapshot = selectedSnippets,
    contextSnippetsSnapshot?: ReadingSnippet[],
    options: SendQuestionOptions = {}
  ): Promise<SendQuestionResult> => {
    if (!material || !workspace || threadIndex === null) {
      return {};
    }

    const trimmedQuestion = stripRenderedSnippetMarkup(nextQuestion.trim());
    if (!trimmedQuestion) {
      return {};
    }

    const thread = snippetsSnapshot[threadIndex];
    if (!thread) {
      return {};
    }

    setActiveSnippetIndex(threadIndex);
    setIsHistoryPanelOpen(false);
    if (options.openPanel !== false) {
      openThreadBox(threadIndex);
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
    const selectedSnippetContext =
      contextSnippetsSnapshot && contextSnippetsSnapshot.length > 0
        ? contextSnippetsSnapshot
        : buildReadingQuestionContext(snippetsSnapshot, thread.materialId);
    const requestPayload: LearningChatRequest = {
      material: {
        id: material.id,
        title: material.title,
        primaryRole: material.primaryRole,
        fullContent: material.fullContent,
      },
      selected_snippets: selectedSnippetContext,
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
      messages: options.requestMessages ?? nextMessages,
      provider: modelConfig.provider,
      model: modelConfig.model || undefined,
      api_key: modelConfig.api_key || undefined,
      base_url: modelConfig.base_url || undefined,
    };

    setIsSending(true);
    setChatError(null);
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
          getReadableApiErrorMessage(
            data,
            '学习提问暂时失败，请检查模型配置或稍后重试。'
          )
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
      return { answer: data.answer };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '学习提问暂时失败，请稍后重试。';
      setChatError(
        error instanceof Error ? error.message : '学习提问暂时失败，请稍后重试。'
      );
      setSelectedSnippets(snippetsSnapshot);
      persistStudyState(snippetsSnapshot, threadIndex);
      return { error: message };
    } finally {
      setIsSending(false);
    }
  };

  const handleDirectAsk = async () => {
    const selectedText = stripRenderedSnippetMarkup(pendingSelection);
    const prefix =
      selectionTarget === 'assistant_reply'
        ? '请基于这段模型回答继续解释、纠正或展开：'
        : '请围绕这段内容解释概念、指出重点，并告诉我下一步该怎么继续读：';

    const ensured = ensureSnippetThread(
      selectedText,
      selectionSource,
      selectionParentSnippetId
    );
    if (!ensured || !material) {
      return;
    }

    const prompt = selectionQuestion.trim()
      ? `${selectionQuestion.trim()}\n\n引用选区：\n${selectedText}`
      : `${prefix}\n${selectedText}`;

    setSelectedSnippets(ensured.nextSnippets);
    setActiveSnippetIndex(ensured.index);
    persistStudyState(ensured.nextSnippets, ensured.index);
    openThreadBox(
      ensured.index,
      selectionMenu
        ? {
            x: selectionMenu.x,
            y: selectionMenu.y,
          }
        : null
    );
    closeSelectionMenu();
    const currentSnippet = ensured.nextSnippets[ensured.index];
    const parentSnippet =
      selectionTarget === 'assistant_reply' && selectionParentSnippetId
        ? ensured.nextSnippets.find((snippet) => snippet.id === selectionParentSnippetId)
        : null;
    const requestMessages =
      parentSnippet && (parentSnippet.messages ?? []).length > 0
        ? buildAssistantReplyFollowUpMessages({
            parentMessages: parentSnippet.messages ?? [],
            nextQuestion: prompt,
          })
        : undefined;
    const result = await sendQuestion(
      prompt,
      ensured.index,
      ensured.nextSnippets,
      currentSnippet
        ? buildCurrentQuestionContext({
            materialId: material.id,
            stagedSnippets: stagedQuestionSnippets,
            currentSnippet,
          })
        : buildReadingQuestionContext(ensured.nextSnippets, material.id),
      { openPanel: false, requestMessages }
    );
    if (!result.error) {
      setStagedQuestionSnippets([]);
    }
  };

  const handleAskMenuPick = (template: PromptTemplate) => {
    if (!askMenu) return;
    const { text, source, target, parentSnippetId, point } = askMenu;
    setAskMenu(null);

    if (template.id === STAGE_TEMPLATE_ID) {
      addSelectionSnippet(text, source);
      window.getSelection()?.removeAllRanges();
      return;
    }

    setPendingSelection(text);
    setSelectionSource(source);
    setSelectionTarget(target);
    setSelectionParentSnippetId(parentSnippetId);
    setSelectionQuestion(template.body);
    setSelectionMenu(createSelectionMenuBox(point));
    setSelectionMenuFallback(false);
  };

  const handleScreenshotQuestion = async (
    payload: ScreenshotQuestionPayload
  ): Promise<SendQuestionResult> => {
    if (!material) {
      return {};
    }

    const screenshotText = `${payload.text} (x:${Math.round(payload.region.x)}, y:${Math.round(payload.region.y)}, w:${Math.round(payload.region.width)}, h:${Math.round(payload.region.height)})`;

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
    const currentSnippet = nextSnippets[index];

    setSelectedSnippets(nextSnippets);
    setActiveSnippetIndex(index);
    persistStudyState(nextSnippets, index);

    if (payload.mode === 'direct') {
      const result = await sendQuestion(
        payload.question || `请解释 PDF 第 ${payload.pageNumber} 页这块截图里的关键内容。`,
        index,
        nextSnippets,
        currentSnippet
          ? buildCurrentQuestionContext({
              materialId: material.id,
              stagedSnippets: stagedQuestionSnippets,
              currentSnippet,
            })
          : buildReadingQuestionContext(nextSnippets, material.id),
        { openPanel: true }
      );
      if (!result.error) {
        setStagedQuestionSnippets([]);
      }
      return result;
    } else {
      if (currentSnippet) {
        setStagedQuestionSnippets((current) =>
          buildCurrentQuestionContext({
            materialId: material.id,
            stagedSnippets: current,
            currentSnippet,
          })
        );
      }
      setIsHistoryPanelOpen(false);
    }

    return {};
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
          getReadableApiErrorMessage(data, '初步判断暂时失败，请稍后再试。')
        );
      }

      persistWorkspace(updateMaterialPreAssessment(workspace, material.id, data));
    } catch (error) {
      setAssessmentError(
        error instanceof Error ? error.message : '初步判断暂时失败，请稍后再试。'
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

  const canRenderOriginalFile =
    viewMode === 'original' && Boolean(sourceArtifact) && Boolean(sourceArtifactUrl);

  const selectionMenuBox = selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition());
  const selectionMenuNode = pendingSelection ? (
    <div
      ref={selectionMenuRef}
      className="fixed z-[120] flex w-80 flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]/96 p-3 shadow-custom backdrop-blur-sm"
      style={{
        left: `${selectionMenuBox.x}px`,
        top: `${selectionMenuBox.y}px`,
      }}
      role="dialog"
      aria-label="选区提问框"
    >
      <p className="line-clamp-1 text-xs leading-5 text-[var(--muted)]">
        {trimPreview(pendingSelection, 60)}
      </p>
      <textarea
        value={selectionQuestion}
        onChange={(event) => setSelectionQuestion(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleDirectAsk();
          }
        }}
        placeholder="可以直接回车发送，或修改后再发"
        rows={2}
        className="input-japanese mt-2 w-full resize-none rounded-xl px-3 py-2 text-xs leading-5 text-[var(--foreground)]"
        autoFocus
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void handleDirectAsk()}
          className="btn-japanese inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs"
        >
          发送
        </button>
        <button
          type="button"
          onClick={closeSelectionMenu}
          className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
        >
          取消
        </button>
      </div>
    </div>
  ) : null;

  if (!workspace) {
    return (
      <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom">
          正在打开学习空间...
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
            这份材料可能还没有导入完成，或者已经从资料架里移除了。
          </p>
          <Link
            href={createSubjectShelfPath(subjectSlug)}
            className="btn-japanese mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
          >
            返回资料架
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    {selectionMenuNode && typeof document !== 'undefined'
      ? createPortal(selectionMenuNode, document.body)
      : null}
    {askMenu ? (
      <AskMenu
        point={askMenu.point}
        onPick={handleAskMenuPick}
        onClose={() => setAskMenu(null)}
      />
    ) : null}
    <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                阅读工作区
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
                href={createSubjectShelfPath(subjectSlug)}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                返回资料架
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
                {isAssessmentOpen ? '收起初步判断' : '生成初步判断'}
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
                  初步判断
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  基于当前材料和选区，判断接下来应该怎么读。
                </p>
              </div>
              {isAssessing ? (
                <span className="text-sm text-[var(--muted)]">分析中...</span>
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
                还没有初步判断，可以点击上方按钮生成。
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
                  选中文字就在当前位置提问，回答会留在轻量问答小框里，不打断阅读。
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
                    结构化文本
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
                    原文件
                  </button>
                </div>
                <span className="rounded-full border border-[var(--border-color)] bg-[var(--background)]/68 px-4 py-2 text-xs text-[var(--muted)]">
                  片段 {selectedSnippets.length}
                </span>
                <button
                  type="button"
                  onClick={() => openSnippetInCurrentBox(activeSnippetIndex ?? 0)}
                  disabled={activeSnippetIndex === null || !activeSnippet}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--background)]/68 px-4 py-2 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                >
                  当前问答
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
                    onOpenSnippet={openSnippetInCurrentBox}
                    onScreenshotQuestion={handleScreenshotQuestion}
                  />
                ) : (
                  <section className="rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/72 p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      当前没有可预览的原文件。
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {sourceArtifactNotice ??
                        '你仍然可以使用结构化文本开始阅读和提问。'}
                    </p>
                  </section>
                )}
              </div>
            ) : (
              <div
                ref={contentRef}
                data-selection-scope="reading"
                data-selection-source="text"
                data-selection-target="material"
                onMouseUp={(event) => captureSelection(event, 'text')}
                onClick={(event) => handleAnnotatedSnippetClick(event.target)}
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

            {false && pendingSelection ? (
              <div
                ref={selectionMenuRef}
                className={`fixed z-[110] flex flex-col rounded-2xl border bg-[var(--card-bg)] p-3 shadow-custom backdrop-blur-sm ${
                  selectionMenuFallback
                    ? 'border-[var(--accent-primary)]'
                    : 'border-[var(--border-color)]'
                }`}
                style={{
                  left: `${(selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition())).x}px`,
                  top: `${(selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition())).y}px`,
                  width: `${(selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition())).width}px`,
                  height: `${(selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition())).height}px`,
                }}
                role="dialog"
                aria-label="选区提问框"
              >
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setSelectionMenuDrag({
                      mode: 'resize-left',
                      startX: event.clientX,
                      startY: event.clientY,
                      box: selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition()),
                    });
                  }}
                  className="absolute left-0 top-10 h-[calc(100%-3.25rem)] w-2 -translate-x-1 cursor-ew-resize rounded-full bg-transparent transition hover:bg-[var(--accent-primary)]/60"
                  aria-label="拖动调整左侧宽度"
                  title="拖动调整左侧宽度"
                />
                <div
                  className="flex cursor-move items-start justify-between gap-3"
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return;
                    }
                    const target = event.target as HTMLElement | null;
                    if (target?.closest('button, textarea, input, a')) {
                      return;
                    }
                    event.preventDefault();
                    setSelectionMenuDrag({
                      mode: 'move',
                      startX: event.clientX,
                      startY: event.clientY,
                      box: selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition()),
                    });
                  }}
                >
                  <div className="min-w-0">
                    {selectionMenuFallback ? (
                      <p className="mb-1 text-xs font-semibold text-[var(--accent-primary)]">
                        已选中文字，可以在这里提问
                      </p>
                    ) : null}
                    <p className="line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                      {trimPreview(pendingSelection)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeSelectionMenu}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] text-[0.65rem] text-[var(--muted)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                    aria-label="关闭选区提问框"
                    title="关闭"
                  >
                    <FaTimes aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 min-h-0 flex-1">
                  <textarea
                    value={selectionQuestion}
                    onChange={(event) => setSelectionQuestion(event.target.value)}
                    placeholder="在这里写你的问题。留空则默认解释这段内容。"
                    className="input-japanese h-full min-h-20 w-full resize-none rounded-2xl px-3 py-2 text-xs leading-5 text-[var(--foreground)]"
                  />
                </div>
                <div className="mt-3 flex shrink-0 flex-wrap gap-2">
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
                      addSelectionSnippet(pendingSelection, selectionSource);
                      closeSelectionMenu();
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                  >
                    先加入片段
                  </button>
                  <button
                    type="button"
                    onClick={closeSelectionMenu}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
                  >
                    关闭
                  </button>
                </div>
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setSelectionMenuDrag({
                      mode: 'resize',
                      startX: event.clientX,
                      startY: event.clientY,
                      box: selectionMenu ?? createSelectionMenuBox(getSelectionFallbackPosition()),
                    });
                  }}
                  className="absolute bottom-2 right-2 h-5 w-5 cursor-nwse-resize rounded-md border-b-2 border-r-2 border-[var(--accent-primary)]/70"
                  aria-label="拖动调整选区提问框大小"
                  title="拖动调整选区提问框大小"
                />
              </div>
            ) : null}
          </section>

          {floatingThreads.map((floatingThread, openOrder) => {
            const threadIndex = floatingThread.snippetIndex;
            const threadSnippet = selectedSnippets[threadIndex];
            if (!threadSnippet) {
              return null;
            }

            const threadMessages = threadSnippet.messages ?? [];

            return (
              <aside
                key={`${threadSnippet.id ?? threadSnippet.anchorLabel}-${threadIndex}`}
                ref={(element) => {
                  if (element) {
                    floatingThreadRefs.current[threadIndex] = element;
                  } else {
                    delete floatingThreadRefs.current[threadIndex];
                  }
                }}
                data-selection-container="current-thread"
                className="fixed flex flex-col rounded-[20px] border border-[var(--border-color)] bg-[var(--card-bg)]/96 p-4 shadow-custom backdrop-blur-sm"
                style={{
                  left: `${floatingThread.x}px`,
                  top: `${floatingThread.y}px`,
                  width: `${floatingThread.width}px`,
                  height: `${floatingThread.height}px`,
                  zIndex: getFloatingLayerZIndex('current-thread') + openOrder,
                }}
                role="dialog"
                aria-label="当前问答小框"
              >
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setFloatingThreadDrag({
                      mode: 'resize-left',
                      startX: event.clientX,
                      startY: event.clientY,
                      box: floatingThread,
                    });
                  }}
                  className="absolute left-0 top-12 h-[calc(100%-4rem)] w-2 -translate-x-1 cursor-ew-resize rounded-full bg-transparent transition hover:bg-[var(--accent-primary)]/60"
                  aria-label="拖动调整左侧宽度"
                  title="拖动调整左侧宽度"
                />
                <div
                  className="flex cursor-move items-center justify-between gap-3"
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return;
                    }
                    const target = event.target as HTMLElement | null;
                    if (target?.closest('button, textarea, input, a, summary')) {
                      return;
                    }
                    event.preventDefault();
                    setActiveSnippetIndex(threadIndex);
                    setFloatingThreadDrag({
                      mode: 'move',
                      startX: event.clientX,
                      startY: event.clientY,
                      box: floatingThread,
                    });
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                    当前问答小框
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-xs text-[var(--muted)] sm:inline">
                      拖右下角调大小
                    </span>
                    <button
                      type="button"
                      onClick={() => closeThreadBox(threadIndex)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-color)] text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                      aria-label="关闭当前问答"
                      title="关闭"
                    >
                      <FaTimes aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <section className="mt-3 flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                        边读边问
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                        片段问答
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSnippetIndex(threadIndex);
                        removeSnippetAt(threadIndex);
                        setChatError(null);
                      }}
                      className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                    >
                      删除对话
                    </button>
                  </div>

                  <details className="mt-4 shrink-0 rounded-2xl border border-[var(--border-color)] bg-[var(--background)]/68 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-primary)]">
                      {threadSnippet.anchorLabel}
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                      {threadSnippet.text}
                    </p>
                    {threadSnippet.imageDataUrl ? (
                      <img
                        src={threadSnippet.imageDataUrl}
                        alt={threadSnippet.anchorLabel}
                        className="mt-3 max-h-44 w-full rounded-2xl border border-[var(--border-color)] bg-white object-contain"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeSnippetAt(threadIndex)}
                      className="mt-3 text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
                    >
                      删除这个锚点
                    </button>
                  </details>

                  <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto pr-1">
                    {threadMessages.length > 0 ? (
                      threadMessages.map((message, index) => (
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
                              data-selection-scope="reading"
                              data-selection-source="assistant_reply"
                              data-selection-target="assistant_reply"
                              onMouseUp={(event) => {
                                setActiveSnippetIndex(threadIndex);
                                captureSelection(
                                  event,
                                  'assistant_reply',
                                  'assistant_reply',
                                  threadSnippet.id
                                );
                              }}
                              onClick={(event) => handleAnnotatedSnippetClick(event.target)}
                              onContextMenu={(event) => {
                                const selection = window.getSelection();
                                const text = selection?.toString().trim() ?? '';
                                if (!text) {
                                  return;
                                }
                                event.preventDefault();
                                setActiveSnippetIndex(threadIndex);
                                captureSelection(
                                  event,
                                  'assistant_reply',
                                  'assistant_reply',
                                  threadSnippet.id
                                );
                              }}
                            >
                              <Markdown
                                content={getAnnotatedAssistantContent(
                                  message.content,
                                  threadSnippet.id
                                )}
                              />
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
                        这个片段还没有问答。选中原文或回答里的文字后，可以在旁边的小框直接提问。
                      </p>
                    )}
                  </div>

                  {chatError && activeSnippetIndex === threadIndex ? (
                    <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                      {chatError}
                    </div>
                  ) : null}
                </section>
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setFloatingThreadDrag({
                      mode: 'resize',
                      startX: event.clientX,
                      startY: event.clientY,
                      box: floatingThread,
                    });
                  }}
                  className="absolute bottom-2 right-2 h-5 w-5 cursor-nwse-resize rounded-md border-b-2 border-r-2 border-[var(--accent-primary)]/70"
                  aria-label="拖动调整问答框大小"
                  title="拖动调整问答框大小"
                />
              </aside>
            );
          })}
        </div>
      </div>

      {isHistoryPanelOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/28"
          role="dialog"
          aria-modal="true"
          aria-label="PDF 截图提问历史"
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
                  历史
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  PDF 截图提问历史
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  这里只保留原始 PDF 框选提问。点一条记录，只恢复对应片段的小问答框。
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
                      onClick={(event) => {
                        if (index >= 0) {
                          openSnippetInCurrentBox(index, {
                            x: event.clientX,
                            y: event.clientY,
                          });
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
                  还没有 PDF 截图提问历史。原文框选提问后，会出现在这里。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}
