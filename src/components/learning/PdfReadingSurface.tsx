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

import type { ReadingSnippet, ReadingSnippetRegion } from '@/types/learning-workspace';

type ScreenshotPayload = {
  text: string;
  question: string;
  imageDataUrl: string;
  pageNumber: number;
  region: ReadingSnippetRegion;
  mode: 'direct' | 'stage';
};

type Props = {
  fileUrl: string;
  title: string;
  filename: string;
  mimeType?: string;
  snippets: ReadingSnippet[];
  onScreenshotQuestion: (payload: ScreenshotPayload) => void;
  onOpenSnippet: (index: number) => void;
};

type DragState = {
  pageNumber: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
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

type PdfPageProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
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

      const viewport = page.getViewport({ scale: 1.45 });
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
  }, [pageNumber, pdf, registerCanvas]);

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

        const anchorLeft = (snippet.region.x + snippet.region.width) * scaleX;
        const anchorTop = snippet.region.y * scaleY;

        return (
          <button
            key={snippet.id ?? `${snippet.anchorLabel}-${index}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenSnippet(index);
            }}
            className="absolute z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--accent-primary)] text-xs font-semibold text-white shadow-custom transition hover:scale-105"
            style={{
              left: `${Math.max(8, anchorLeft - 16)}px`,
              top: `${Math.max(8, anchorTop - 16)}px`,
            }}
            aria-label={`打开${snippet.anchorLabel}的历史问答`}
            title={snippet.anchorLabel}
          >
            {index + 1}
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
  const [capturePageNumber, setCapturePageNumber] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingCapture, setPendingCapture] = useState<{
    pageNumber: number;
    region: ReadingSnippetRegion;
    imageDataUrl: string;
  } | null>(null);
  const [captureQuestion, setCaptureQuestion] = useState('');

  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());

  useEffect(() => {
    if (!pdf) {
      return;
    }

    GlobalWorkerOptions.workerSrc = '/api/pdf-worker';

    let cancelled = false;
    setPdfDocument(null);
    setLoadError(null);

    const task = getDocument(fileUrl);
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
  };

  const submitCapture = (mode: ScreenshotPayload['mode']) => {
    if (!pendingCapture) {
      return;
    }

    onScreenshotQuestion({
      ...pendingCapture,
      mode,
      text: `PDF 第 ${pendingCapture.pageNumber} 页截图区域`,
      question: captureQuestion.trim(),
    });
    setPendingCapture(null);
    setCaptureQuestion('');
    setCapturePageNumber(null);
  };

  const snippetsByPage = (pageNumber: number) =>
    snippets
      .map((snippet, index) => ({ snippet, index }))
      .filter(({ snippet }) => snippet.pageNumber === pageNumber && snippet.region);

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
        <div className="absolute right-4 top-24 z-20 w-[min(34rem,calc(100%-2rem))] rounded-[24px] border border-[var(--accent-primary)]/28 bg-[var(--card-bg)]/96 p-4 shadow-custom backdrop-blur-sm">
          <div className="grid gap-4 md:grid-cols-[minmax(0,10rem)_1fr]">
            <img
              src={pendingCapture.imageDataUrl}
              alt={`第 ${pendingCapture.pageNumber} 页截图`}
              className="max-h-40 w-full rounded-2xl border border-[var(--border-color)] bg-white object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                已框选第 {pendingCapture.pageNumber} 页截图
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                先写你真正想问的问题。也可以先存成片段，稍后再围绕它连续追问。
              </p>
              <textarea
                value={captureQuestion}
                onChange={(event) => setCaptureQuestion(event.target.value)}
                rows={3}
                placeholder="例如：为什么这里可以这样变形？这张图和上面的公式是什么关系？"
                className="input-japanese mt-3 w-full rounded-2xl px-3 py-2 text-sm leading-6 text-[var(--foreground)]"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => submitCapture('direct')}
                  className="btn-japanese inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs"
                >
                  直接截图提问
                </button>
                <button
                  type="button"
                  onClick={() => submitCapture('stage')}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                >
                  建立截图片段
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingCapture(null);
                    setCaptureQuestion('');
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--accent-primary)]"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                  capturePageNumber={capturePageNumber}
                  drag={drag}
                  snippets={snippetsByPage(index + 1)}
                  registerCanvas={registerCanvas}
                  onStartCapture={(nextPageNumber) => {
                    setCapturePageNumber(nextPageNumber);
                    setPendingCapture(null);
                  }}
                  onCancelCapture={() => {
                    setCapturePageNumber(null);
                    setPendingCapture(null);
                    setDrag(null);
                  }}
                  onOpenSnippet={onOpenSnippet}
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
