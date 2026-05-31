'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist';

import Markdown from '@/components/Markdown';
import type { ReadingSnippet, ReadingSnippetRegion } from '@/types/learning-workspace';

type ScreenshotPayload = {
  text: string;
  question: string;
  imageDataUrl: string;
  pageNumber: number;
  region: ReadingSnippetRegion;
  mode: 'direct' | 'stage';
};

type ScreenshotQuestionResult = {
  answer?: string;
  error?: string;
};

type Props = {
  fileUrl: string;
  title: string;
  filename: string;
  mimeType?: string;
  snippets: ReadingSnippet[];
  onScreenshotQuestion: (
    payload: ScreenshotPayload
  ) => Promise<ScreenshotQuestionResult | void> | ScreenshotQuestionResult | void;
  onOpenSnippet: (index: number) => void;
};

type DragState = {
  pageNumber: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type CaptureFollowUp = {
  id: string;
  selectedText: string;
  question: string;
  answer: string;
  error: string;
  isOpen: boolean;
  isLoading: boolean;
  box: FloatingBoxState;
};

type PendingCaptureState = {
  pageNumber: number;
  region: ReadingSnippetRegion;
  imageDataUrl: string;
  snippetIndex?: number;
};

type FloatingBoxState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CaptureBoxDragState = {
  mode: 'move' | 'resize' | 'resize-left';
  startX: number;
  startY: number;
  box: FloatingBoxState;
};

type FollowUpDragState = {
  id: string;
  mode: 'move' | 'resize' | 'resize-left';
  startX: number;
  startY: number;
  box: FloatingBoxState;
};

function isPdf(mimeType?: string, filename?: string) {
  return mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf');
}

function isImage(mimeType?: string) {
  return typeof mimeType === 'string' && mimeType.startsWith('image/');
}

function getRegionFromDrag(drag: DragState): ReadingSnippetRegion {
  const x = Math.min(drag.startX, drag.currentX);
  const y = Math.min(drag.startY, drag.currentY);
  const width = Math.abs(drag.currentX - drag.startX);
  const height = Math.abs(drag.currentY - drag.startY);

  return { x, y, width, height };
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: ReactMouseEvent<HTMLElement, MouseEvent>
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function cropCanvas(
  canvas: HTMLCanvasElement,
  region: ReadingSnippetRegion
): string | null {
  const width = Math.max(1, Math.round(region.width));
  const height = Math.max(1, Math.round(region.height));
  if (width < 12 || height < 12) {
    return null;
  }

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;

  const context = output.getContext('2d');
  if (!context) {
    return null;
  }

  context.drawImage(
    canvas,
    Math.round(region.x),
    Math.round(region.y),
    width,
    height,
    0,
    0,
    width,
    height
  );

  return output.toDataURL('image/png');
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampBox(box: FloatingBoxState): FloatingBoxState {
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const width = clamp(box.width, 360, Math.max(360, viewportWidth - 24));
  const height = clamp(box.height, 320, Math.max(320, viewportHeight - 64));

  return {
    x: clamp(box.x, 12, viewportWidth - width - 12),
    y: clamp(box.y, 12, viewportHeight - height - 12),
    width,
    height,
  };
}

function clampSmallBox(box: FloatingBoxState): FloatingBoxState {
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const width = clamp(box.width, 280, Math.max(280, viewportWidth - 24));
  const height = clamp(box.height, 190, Math.max(190, viewportHeight - 40));

  return {
    x: clamp(box.x, 12, viewportWidth - width - 12),
    y: clamp(box.y, 12, viewportHeight - height - 12),
    width,
    height,
  };
}

function clampFollowUpBox(box: FloatingBoxState): FloatingBoxState {
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
  const width = clamp(box.width, 340, Math.max(340, viewportWidth - 24));
  const height = clamp(box.height, 260, Math.max(260, viewportHeight - 40));

  return {
    x: clamp(box.x, 12, viewportWidth - width - 12),
    y: clamp(box.y, 12, viewportHeight - height - 12),
    width,
    height,
  };
}

type PdfPageProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoomScale: number;
  capturePageNumber: number | null;
  drag: DragState | null;
  snippets: Array<{ snippet: ReadingSnippet; index: number }>;
  registerCanvas: (pageNumber: number, canvas: HTMLCanvasElement | null) => void;
  onStartCapture: (pageNumber: number) => void;
  onCancelCapture: () => void;
  onOpenSnippet: (index: number) => void;
  onPointerDown: (
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) => void;
  onPointerMove: (
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) => void;
  onPointerUp: (
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) => void;
};

function PdfPage({
  pdf,
  pageNumber,
  zoomScale,
  capturePageNumber,
  drag,
  snippets,
  registerCanvas,
  onStartCapture,
  onCancelCapture,
  onOpenSnippet,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    setIsRendered(false);
    registerCanvas(pageNumber, canvas);

    void pdf.getPage(pageNumber).then((page) => {
      if (cancelled) {
        return;
      }

      const viewport = page.getViewport({ scale: zoomScale });
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const task = page.render({
        canvasContext: context,
        viewport,
      });
      renderTask = task;

      return task.promise
        .then(() => {
          if (!cancelled) {
            setIsRendered(true);
          }
        })
        .catch((error: unknown) => {
          if (
            !cancelled &&
            error instanceof Error &&
            error.name !== 'RenderingCancelledException'
          ) {
            throw error;
          }
        });
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
      registerCanvas(pageNumber, null);
    };
  }, [pageNumber, pdf, registerCanvas, zoomScale]);

  const region =
    drag && drag.pageNumber === pageNumber ? getRegionFromDrag(drag) : null;
  const canvas = canvasRef.current;
  const scaleX = canvas ? canvas.getBoundingClientRect().width / canvas.width : 1;
  const scaleY = canvas ? canvas.getBoundingClientRect().height / canvas.height : 1;
  const captureMode = capturePageNumber === pageNumber;

  return (
    <div
      className={`relative mx-auto w-fit max-w-full overflow-auto rounded-[18px] border border-[var(--border-color)] bg-white shadow-sm ${
        captureMode ? 'cursor-crosshair' : ''
      }`}
      onMouseDown={(event) => onPointerDown(pageNumber, event)}
      onMouseMove={(event) => onPointerMove(pageNumber, event)}
      onMouseUp={(event) => onPointerUp(pageNumber, event)}
      onMouseLeave={(event) => onPointerUp(pageNumber, event)}
    >
      {!isRendered ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/72 px-4 py-2 text-sm text-white shadow-sm">
          正在渲染第 {pageNumber} 页...
        </div>
      ) : null}
      <canvas ref={canvasRef} className="block max-w-none" />
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        {captureMode ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCancelCapture();
            }}
            className="rounded-full bg-black/68 px-3 py-1.5 text-xs text-white shadow-sm transition hover:bg-black/82"
          >
            退出框选
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStartCapture(pageNumber);
            }}
            className="rounded-full bg-black/68 px-3 py-1.5 text-xs text-white shadow-sm opacity-82 transition hover:bg-black/82 hover:opacity-100"
          >
            框选提问
          </button>
        )}
      </div>
      {region ? (
        <div
          className="pointer-events-none absolute border-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/14"
          style={{
            left: `${region.x * scaleX}px`,
            top: `${region.y * scaleY}px`,
            width: `${region.width * scaleX}px`,
            height: `${region.height * scaleY}px`,
          }}
        />
      ) : null}
      {snippets.map(({ snippet, index }) => {
        if (!snippet.region) {
          return null;
        }

        const anchorLeft = snippet.region.x * scaleX;
        const anchorTop = snippet.region.y * scaleY;
        const anchorWidth = Math.max(24, snippet.region.width * scaleX);
        const anchorHeight = Math.max(18, snippet.region.height * scaleY);

        return (
          <button
            key={snippet.id ?? `${snippet.anchorLabel}-${index}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenSnippet(index);
            }}
            className="group absolute z-10 rounded-[6px] bg-[var(--accent-primary)]/10 outline-none transition hover:bg-[var(--accent-primary)]/16 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            style={{
              left: `${anchorLeft}px`,
              top: `${anchorTop}px`,
              width: `${anchorWidth}px`,
              height: `${anchorHeight}px`,
            }}
            aria-label={`打开${snippet.anchorLabel}的问答小框`}
            title={snippet.anchorLabel}
          >
            <span className="pointer-events-none absolute inset-x-0 bottom-0 border-b-2 border-[var(--accent-primary)]" />
            <span className="pointer-events-none absolute bottom-0 left-0 h-4 border-l-2 border-[var(--accent-primary)]" />
            <span className="pointer-events-none absolute bottom-0 right-0 h-4 border-r-2 border-[var(--accent-primary)]" />
            <span className="pointer-events-none absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-white bg-[var(--accent-primary)] px-1 text-[10px] font-semibold leading-none text-white opacity-0 shadow-custom transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {index + 1}
            </span>
          </button>
        );
      })}
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
        {pageNumber}
      </span>
    </div>
  );
}

export default function PdfReadingSurface({
  fileUrl,
  title,
  filename,
  mimeType,
  snippets,
  onScreenshotQuestion,
  onOpenSnippet,
}: Props) {
  const pdf = isPdf(mimeType, filename);
  const image = isImage(mimeType);

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [capturePageNumber, setCapturePageNumber] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingCapture, setPendingCapture] = useState<PendingCaptureState | null>(null);
  const [captureQuestion, setCaptureQuestion] = useState('');
  const [captureAnswer, setCaptureAnswer] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [isCaptureSending, setIsCaptureSending] = useState(false);
  const [answerSelection, setAnswerSelection] = useState('');
  const [answerFollowUpQuestion, setAnswerFollowUpQuestion] = useState('');
  const [answerSelectionMenu, setAnswerSelectionMenu] =
    useState<FloatingBoxState | null>(null);
  const [isCaptureContextExpanded, setIsCaptureContextExpanded] = useState(true);
  const [captureFollowUps, setCaptureFollowUps] = useState<CaptureFollowUp[]>([]);
  const [contextPaneWidth, setContextPaneWidth] = useState(160);
  const [isResizingContextPane, setIsResizingContextPane] = useState(false);
  const [captureBox, setCaptureBox] = useState<FloatingBoxState>({
    x: 0,
    y: 96,
    width: 544,
    height: 520,
  });
  const [captureBoxDrag, setCaptureBoxDrag] = useState<CaptureBoxDragState | null>(null);
  const [answerSelectionMenuDrag, setAnswerSelectionMenuDrag] =
    useState<CaptureBoxDragState | null>(null);
  const [followUpDrag, setFollowUpDrag] = useState<FollowUpDragState | null>(null);

  const answerRef = useRef<HTMLDivElement | null>(null);
  const captureBoxRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());

  useEffect(() => {
    setCaptureBox((box) =>
      clampBox({
        ...box,
        x:
          box.x > 0
            ? box.x
            : (typeof window === 'undefined' ? 1024 : window.innerWidth) -
              box.width -
              16,
      })
    );
  }, []);

  useEffect(() => {
    if (!captureBoxDrag) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - captureBoxDrag.startX;
      const deltaY = event.clientY - captureBoxDrag.startY;
      const { box, mode } = captureBoxDrag;

      if (mode === 'move') {
        setCaptureBox(
          clampBox({
            ...box,
            x: box.x + deltaX,
            y: box.y + deltaY,
          })
        );
        return;
      }

      if (mode === 'resize-left') {
        setCaptureBox(
          clampBox({
            x: box.x + deltaX,
            y: box.y,
            width: box.width - deltaX,
            height: box.height,
          })
        );
        return;
      }

      setCaptureBox(
        clampBox({
          ...box,
          width: box.width + deltaX,
          height: box.height + deltaY,
        })
      );
    };

    const handlePointerUp = () => setCaptureBoxDrag(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [captureBoxDrag]);

  useEffect(() => {
    if (!followUpDrag) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - followUpDrag.startX;
      const deltaY = event.clientY - followUpDrag.startY;
      const { box, mode } = followUpDrag;
      setCaptureFollowUps((current) =>
        current.map((followUp) =>
          followUp.id === followUpDrag.id
            ? {
                ...followUp,
                box:
                  mode === 'move'
                    ? clampFollowUpBox({
                        ...box,
                        x: box.x + deltaX,
                        y: box.y + deltaY,
                      })
                    : mode === 'resize-left'
                      ? clampFollowUpBox({
                          x: box.x + deltaX,
                          y: box.y,
                          width: box.width - deltaX,
                          height: box.height,
                        })
                      : clampFollowUpBox({
                          ...box,
                          width: box.width + deltaX,
                          height: box.height + deltaY,
                        }),
              }
            : followUp
        )
      );
    };

    const handlePointerUp = () => setFollowUpDrag(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [followUpDrag]);

  useEffect(() => {
    if (!answerSelectionMenuDrag) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - answerSelectionMenuDrag.startX;
      const deltaY = event.clientY - answerSelectionMenuDrag.startY;
      const { box, mode } = answerSelectionMenuDrag;

      if (mode === 'move') {
        setAnswerSelectionMenu(
          clampSmallBox({
            ...box,
            x: box.x + deltaX,
            y: box.y + deltaY,
          })
        );
        return;
      }

      if (mode === 'resize-left') {
        setAnswerSelectionMenu(
          clampSmallBox({
            x: box.x + deltaX,
            y: box.y,
            width: box.width - deltaX,
            height: box.height,
          })
        );
        return;
      }

      setAnswerSelectionMenu(
        clampSmallBox({
          ...box,
          width: box.width + deltaX,
          height: box.height + deltaY,
        })
      );
    };

    const handlePointerUp = () => setAnswerSelectionMenuDrag(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [answerSelectionMenuDrag]);

  useEffect(() => {
    if (!pdf) {
      return;
    }

    GlobalWorkerOptions.workerSrc = '/api/pdf-worker';

    let cancelled = false;
    setPdfDocument(null);
    setLoadError(null);

    const task = getDocument({ url: fileUrl, password: '' });
    void task.promise
      .then((loadedPdf) => {
        if (!cancelled) {
          setPdfDocument(loadedPdf);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'PDF 原文加载失败。'
          );
        }
      });

    return () => {
      cancelled = true;
      void task.destroy();
      canvasRefs.current.clear();
    };
  }, [fileUrl, pdf]);

  useEffect(() => {
    if (!isResizingContextPane) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const box = captureBoxRef.current;
      if (!box) {
        return;
      }

      const rect = box.getBoundingClientRect();
      setContextPaneWidth(Math.min(320, Math.max(96, event.clientX - rect.left - 16)));
    };

    const stopResizing = () => setIsResizingContextPane(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
    };
  }, [isResizingContextPane]);

  const registerCanvas = useCallback((pageNumber: number, canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvasRefs.current.set(pageNumber, canvas);
    } else {
      canvasRefs.current.delete(pageNumber);
    }
  }, []);

  const beginDrag = (
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (capturePageNumber !== pageNumber) {
      return;
    }

    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    setPendingCapture(null);
    setCaptureQuestion('');
    setCaptureAnswer('');
    setCaptureError('');
    setAnswerSelection('');
    setAnswerFollowUpQuestion('');
    setAnswerSelectionMenu(null);
    setIsCaptureContextExpanded(true);
    setCaptureFollowUps([]);
    setDrag({
      pageNumber,
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    });
  };

  const updateDrag = (
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!drag || drag.pageNumber !== pageNumber) {
      return;
    }

    const canvas = canvasRefs.current.get(pageNumber);
    if (!canvas) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    setDrag({
      ...drag,
      currentX: Math.max(0, Math.min(canvas.width, point.x)),
      currentY: Math.max(0, Math.min(canvas.height, point.y)),
    });
  };

  const finishDrag = (
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!drag || drag.pageNumber !== pageNumber) {
      return;
    }

    const canvas = canvasRefs.current.get(pageNumber);
    setDrag(null);
    if (!canvas) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    const finalDrag = {
      ...drag,
      currentX: Math.max(0, Math.min(canvas.width, point.x)),
      currentY: Math.max(0, Math.min(canvas.height, point.y)),
    };
    const region = getRegionFromDrag(finalDrag);
    const imageDataUrl = cropCanvas(canvas, region);

    if (!imageDataUrl) {
      return;
    }

    setPendingCapture({
      pageNumber,
      region,
      imageDataUrl,
    });
    setCaptureQuestion('');
    setCaptureAnswer('');
    setCaptureError('');
    setAnswerSelection('');
    setAnswerFollowUpQuestion('');
    setAnswerSelectionMenu(null);
    setIsCaptureContextExpanded(true);
    setCaptureFollowUps([]);
  };

  const submitCapture = async (mode: ScreenshotPayload['mode']) => {
    if (!pendingCapture) {
      return;
    }

    const payload = {
      ...pendingCapture,
      mode,
      text: `PDF 第 ${pendingCapture.pageNumber} 页截图区域`,
      question: captureQuestion.trim(),
    };

    if (mode === 'direct') {
      setIsCaptureSending(true);
      setCaptureAnswer('');
      setCaptureError('');
      setAnswerSelection('');
      setAnswerFollowUpQuestion('');
      setAnswerSelectionMenu(null);
      setIsCaptureContextExpanded(true);
      setCaptureFollowUps([]);
      setCapturePageNumber(null);

      try {
        const result = await onScreenshotQuestion(payload);
        if (result?.error) {
          setCaptureError(result.error);
        } else {
          setPendingCapture(null);
          setCaptureQuestion('');
          setIsCaptureContextExpanded(true);
        }
      } catch (error) {
        setCaptureError(
          error instanceof Error ? error.message : '截图提问暂时失败，请稍后重试。'
        );
      } finally {
        setIsCaptureSending(false);
      }
      return;
    }

    void onScreenshotQuestion(payload);
    setPendingCapture(null);
    setCaptureQuestion('');
    setCaptureAnswer('');
    setCaptureError('');
    setAnswerSelection('');
    setAnswerFollowUpQuestion('');
    setAnswerSelectionMenu(null);
    setIsCaptureContextExpanded(true);
    setCaptureFollowUps([]);
    setCapturePageNumber(null);
  };

  const openSnippetCaptureBox = (_snippet: ReadingSnippet, index: number) => {
    onOpenSnippet(index);
  };

  const captureAnswerSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    const anchorNode = selection?.anchorNode;

    if (
      !text ||
      !anchorNode ||
      !answerRef.current ||
      !answerRef.current.contains(anchorNode)
    ) {
      return;
    }

    const rect =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).getBoundingClientRect()
        : null;

    setAnswerSelection(text);
    setAnswerFollowUpQuestion('');
    setAnswerSelectionMenu((current) =>
      clampSmallBox({
      x: clamp(
        rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        12,
        window.innerWidth - 340
      ),
      y: clamp(rect ? rect.bottom + 10 : 80, 12, window.innerHeight - 190),
        width: current?.width ?? 320,
        height: current?.height ?? 220,
      })
    );
  };

  const askAboutAnswerSelection = async () => {
    if (!pendingCapture || !answerSelection.trim()) {
      return;
    }

    const followUpId = `capture-follow-up-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const selectedText = answerSelection.trim();
    const question = answerFollowUpQuestion.trim();
    const sourceBox =
      answerSelectionMenu ??
      clampSmallBox({
        x: window.innerWidth - 380,
        y: 120,
        width: 320,
        height: 220,
      });
    const followUpBox = clampFollowUpBox({
      x: sourceBox.x,
      y: sourceBox.y + 12,
      width: Math.max(380, sourceBox.width),
      height: 320,
    });

    const prompt = answerFollowUpQuestion.trim()
      ? `${answerFollowUpQuestion.trim()}\n\n引用刚才回答中的片段：\n${answerSelection}`
      : `请基于刚才回答中的这段内容继续解释：\n${answerSelection}`;

    setIsCaptureSending(true);
    setCaptureError('');
    setCaptureFollowUps((current) => [
      ...current,
      {
        id: followUpId,
        selectedText,
        question,
        answer: '',
        error: '',
        isOpen: true,
        isLoading: true,
        box: followUpBox,
      },
    ]);
    setAnswerSelection('');
    setAnswerFollowUpQuestion('');
    setAnswerSelectionMenu(null);
    window.getSelection()?.removeAllRanges();

    try {
      const result = await onScreenshotQuestion({
        ...pendingCapture,
        mode: 'direct',
        text: `PDF 第 ${pendingCapture.pageNumber} 页截图区域`,
        question: prompt,
      });

      if (result?.error) {
        setCaptureFollowUps((current) =>
          current.map((followUp) =>
            followUp.id === followUpId
              ? { ...followUp, error: result.error ?? '', isLoading: false }
              : followUp
          )
        );
      } else if (result?.answer) {
        setCaptureFollowUps((current) =>
          current.map((followUp) =>
            followUp.id === followUpId
              ? { ...followUp, answer: result.answer ?? '', isLoading: false }
              : followUp
          )
        );
        setAnswerSelection('');
        setAnswerFollowUpQuestion('');
        window.getSelection()?.removeAllRanges();
      }
    } catch (error) {
      setCaptureFollowUps((current) =>
        current.map((followUp) =>
          followUp.id === followUpId
            ? {
                ...followUp,
                error:
                  error instanceof Error
                    ? error.message
                    : '截图追问暂时失败，请稍后重试。',
                isLoading: false,
              }
            : followUp
        )
      );
    } finally {
      setIsCaptureSending(false);
    }
  };

  const annotatedCaptureAnswer = captureFollowUps
    .filter((followUp) => followUp.selectedText)
    .reduce((content, followUp) => {
      const text = followUp.selectedText.trim();
      if (!text) {
        return content;
      }

      const mark = `<mark data-capture-follow-up-id="${followUp.id}" style="background: transparent; color: inherit; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 0.22em; text-decoration-color: var(--accent-primary); cursor: pointer;">${escapeHtml(
        text
      )}</mark>`;

      return content.replace(new RegExp(escapeRegExp(text)), mark);
    }, captureAnswer);

  const snippetsByPage = (pageNumber: number) =>
    snippets
      .map((snippet, index) => ({ snippet, index }))
      .filter(
        ({ snippet }) =>
          snippet.source === 'pdf_screenshot' &&
          snippet.pageNumber === pageNumber &&
          snippet.region &&
          (snippet.messages ?? []).length > 0
      );

  const updateZoom = (nextScale: number) => {
    setZoomScale(Math.min(1.6, Math.max(0.7, Number(nextScale.toFixed(2)))));
  };
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;

  return (
    <div className="relative space-y-3">
      <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--background)]/72 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              原文件阅读
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              PDF 会在本页渲染为可框选的页面。读到某页时点页内“框选提问”，拖拽区域即可把截图交给视觉模型。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--foreground)]">
              <button
                type="button"
                onClick={() => updateZoom(zoomScale - 0.1)}
                className="min-h-8 px-3 transition hover:text-[var(--accent-primary)]"
                aria-label="缩小 PDF"
              >
                -
              </button>
              <select
                value={zoomScale.toFixed(2)}
                onChange={(event) => updateZoom(Number(event.target.value))}
                className="min-h-8 bg-transparent px-2 text-xs outline-none"
                aria-label="PDF 缩放比例"
              >
                <option value="0.70">70%</option>
                <option value="0.75">75%</option>
                <option value="0.80">80%</option>
                <option value="0.90">90%</option>
                <option value="1.00">100%</option>
                <option value="1.10">110%</option>
                <option value="1.20">120%</option>
                <option value="1.30">130%</option>
                <option value="1.40">140%</option>
                <option value="1.45">145%</option>
                <option value="1.50">150%</option>
                <option value="1.60">160%</option>
              </select>
              <button
                type="button"
                onClick={() => updateZoom(zoomScale + 0.1)}
                className="min-h-8 px-3 transition hover:text-[var(--accent-primary)]"
                aria-label="放大 PDF"
              >
                +
              </button>
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              单独打开
            </a>
          </div>
        </div>
      </div>

      {pendingCapture ? (
        <div
          ref={captureBoxRef}
          className="fixed z-40 w-96 rounded-2xl border border-[var(--accent-primary)]/28 bg-[var(--card-bg)]/96 p-4 shadow-custom backdrop-blur-sm"
          style={{
            right: '16px',
            top: '96px',
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              第 {pendingCapture.pageNumber} 页截图提问
            </p>
            <button
              type="button"
              onClick={() => {
                setPendingCapture(null);
                setCaptureQuestion('');
                setCaptureAnswer('');
                setCaptureError('');
                setAnswerSelection('');
                setAnswerFollowUpQuestion('');
                setAnswerSelectionMenu(null);
                setCaptureFollowUps([]);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-color)] text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
          <img
            src={pendingCapture.imageDataUrl}
            alt={`第 ${pendingCapture.pageNumber} 页截图`}
            className="mb-3 max-h-32 w-full rounded-xl border border-[var(--border-color)] bg-white object-contain"
          />
          <textarea
            value={captureQuestion}
            onChange={(event) => setCaptureQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submitCapture('direct');
              }
            }}
            rows={2}
            placeholder="写你的问题，回车发送"
            className="input-japanese w-full resize-none rounded-xl px-3 py-2 text-sm leading-6 text-[var(--foreground)]"
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submitCapture('direct')}
              disabled={isCaptureSending}
              className="btn-japanese inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCaptureSending ? '回答中...' : '发送'}
            </button>
            <button
              type="button"
              onClick={() => void submitCapture('stage')}
              disabled={isCaptureSending}
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              加入片段
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingCapture(null);
                setCaptureQuestion('');
                setCaptureAnswer('');
                setCaptureError('');
                setAnswerSelection('');
                setAnswerFollowUpQuestion('');
                setAnswerSelectionMenu(null);
                setCaptureFollowUps([]);
              }}
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
            >
              取消
            </button>
          </div>
          {captureError ? (
            <div className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {captureError}
            </div>
          ) : null}
          {isCaptureSending ? (
            <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--background)]/72 px-3 py-2 text-sm text-[var(--muted)]">
              回答中...
            </div>
          ) : null}
          {captureAnswer ? (
            <div
              ref={answerRef}
              onMouseUp={() => {
                window.setTimeout(captureAnswerSelection, 0);
              }}
              className="mt-3 max-h-60 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--background)]/72 px-3 py-2 text-sm leading-6 text-[var(--foreground)]"
            >
              <Markdown content={annotatedCaptureAnswer} />
            </div>
          ) : null}
        </div>
      ) : null}

      {captureFollowUps
        .filter((followUp) => followUp.isOpen)
        .map((followUp) => (
          <div
            key={followUp.id}
            className="fixed z-30 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]/96 p-3 shadow-custom backdrop-blur-sm"
            style={{
              left: `${followUp.box.x}px`,
              top: `${followUp.box.y}px`,
              width: `${followUp.box.width}px`,
              height: `${followUp.box.height}px`,
            }}
          >
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                setFollowUpDrag({
                  id: followUp.id,
                  mode: 'resize-left',
                  startX: event.clientX,
                  startY: event.clientY,
                  box: followUp.box,
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
                setFollowUpDrag({
                  id: followUp.id,
                  mode: 'move',
                  startX: event.clientX,
                  startY: event.clientY,
                  box: followUp.box,
                });
              }}
            >
              <p className="line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                {followUp.selectedText}
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCaptureFollowUps((current) =>
                      current.map((item) =>
                        item.id === followUp.id ? { ...item, isOpen: false } : item
                      )
                    )
                  }
                  className="rounded-full border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--accent-primary)]"
                >
                  关闭
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCaptureFollowUps((current) =>
                      current.filter((item) => item.id !== followUp.id)
                    )
                  }
                  className="rounded-full border border-rose-500/25 px-2 py-1 text-xs text-rose-600 hover:bg-rose-500/10"
                >
                  删除
                </button>
              </div>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--background)]/72 px-3 py-2 text-sm leading-6 text-[var(--foreground)]">
              {followUp.isLoading ? (
                <p className="text-[var(--muted)]">回答中...</p>
              ) : followUp.error ? (
                <p className="text-rose-600 dark:text-rose-300">{followUp.error}</p>
              ) : (
                <Markdown content={followUp.answer} />
              )}
            </div>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                setFollowUpDrag({
                  id: followUp.id,
                  mode: 'resize',
                  startX: event.clientX,
                  startY: event.clientY,
                  box: followUp.box,
                });
              }}
              className="absolute bottom-2 right-2 h-5 w-5 cursor-nwse-resize rounded-md border-b-2 border-r-2 border-[var(--accent-primary)]/70"
              aria-label="拖动调整追问回答框大小"
              title="拖动调整追问回答框大小"
            />
          </div>
        ))}

      <div className="overflow-hidden rounded-[24px] border border-[var(--border-color)] bg-white">
        {pdf ? (
          <div className="max-h-[82dvh] space-y-4 overflow-auto bg-zinc-100 p-2 md:p-3">
            {loadError ? (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                {loadError}
              </div>
            ) : pdfDocument ? (
              Array.from({ length: pdfDocument.numPages }, (_, index) => (
                <PdfPage
                  key={index + 1}
                  pdf={pdfDocument}
                  pageNumber={index + 1}
                  zoomScale={zoomScale}
                  capturePageNumber={capturePageNumber}
                  drag={drag}
                  snippets={snippetsByPage(index + 1)}
                  registerCanvas={registerCanvas}
                  onStartCapture={(nextPageNumber) => {
                    setCapturePageNumber(nextPageNumber);
                    setPendingCapture(null);
                    setCaptureAnswer('');
                    setCaptureError('');
                    setAnswerSelection('');
                    setAnswerFollowUpQuestion('');
                  }}
                  onCancelCapture={() => {
                    setCapturePageNumber(null);
                    setPendingCapture(null);
                    setCaptureAnswer('');
                    setCaptureError('');
                    setAnswerSelection('');
                    setAnswerFollowUpQuestion('');
                    setDrag(null);
                  }}
                  onOpenSnippet={(snippetIndex) => {
                    const snippet = snippets[snippetIndex];
                    if (snippet) {
                      openSnippetCaptureBox(snippet, snippetIndex);
                    }
                  }}
                  onPointerDown={beginDrag}
                  onPointerMove={updateDrag}
                  onPointerUp={finishDrag}
                />
              ))
            ) : (
              <div className="flex min-h-[26rem] items-center justify-center text-sm text-zinc-600">
                正在加载 PDF...
              </div>
            )}
          </div>
        ) : image ? (
          <div className="flex min-h-[50dvh] items-center justify-center bg-[var(--background)]/40 p-4">
            <img
              src={fileUrl}
              alt={title}
              className="max-h-[78dvh] w-auto max-w-full rounded-[18px] object-contain"
            />
          </div>
        ) : (
          <div className="flex min-h-[22rem] flex-col items-center justify-center gap-4 bg-[var(--background)]/40 p-6 text-center">
            <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
              当前版本优先保证 PDF 原文件阅读和截图提问。这份材料虽然保留了原文件，但浏览器暂时不能稳定直接内嵌预览。
            </p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-japanese inline-flex items-center justify-center rounded-full px-4 py-2 text-sm"
            >
              打开原文件
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
