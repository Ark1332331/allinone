import type { ReadingSnippet } from '@/types/learning-workspace';

type RectLike = {
  left: number;
  top?: number;
  width: number;
  height?: number;
  bottom: number;
};

type Point = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

type FloatingBox = Point &
  Size;

const VIEWPORT_MARGIN = 12;
const MENU_GAP = 10;
const DEFAULT_MENU_SIZE: Size = {
  width: 336,
  height: 190,
};
const MIN_SELECTION_MENU_SIZE: Size = {
  width: 280,
  height: 190,
};
const DEFAULT_FLOATING_THREAD_SIZE: Size = {
  width: 384,
  height: 460,
};
const MIN_FLOATING_THREAD_SIZE: Size = {
  width: 320,
  height: 280,
};

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function getRectTop(rect: RectLike) {
  return rect.top ?? rect.bottom - (rect.height ?? 0);
}

function getRectHeight(rect: RectLike) {
  return rect.height ?? rect.bottom - getRectTop(rect);
}

function isUsableRect(rect: RectLike) {
  return rect.width > 0 && getRectHeight(rect) > 0;
}

function intersectsViewport(rect: RectLike, viewport: Size) {
  const top = getRectTop(rect);
  return (
    rect.bottom >= 0 &&
    top <= viewport.height &&
    rect.left + rect.width >= 0 &&
    rect.left <= viewport.width
  );
}

function getRectDistanceToPoint(rect: RectLike, point: Point) {
  const top = getRectTop(rect);
  const right = rect.left + rect.width;
  const centerY = top + getRectHeight(rect) / 2;
  const dx =
    point.x < rect.left ? rect.left - point.x : point.x > right ? point.x - right : 0;
  const dy = Math.abs(centerY - point.y);

  return dx + dy;
}

export function getVisibleSelectionRect(input: {
  rect?: RectLike | null;
  rects?: RectLike[];
  pointer?: Point | null;
  viewport?: Size;
}): RectLike | null {
  const viewport =
    input.viewport ??
    (typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 1024, height: 768 });
  const rects = (input.rects ?? []).filter(isUsableRect);
  const visibleRects = rects.filter((rect) => intersectsViewport(rect, viewport));

  if (visibleRects.length > 0) {
    if (input.pointer) {
      return [...visibleRects].sort(
        (a, b) =>
          getRectDistanceToPoint(a, input.pointer as Point) -
          getRectDistanceToPoint(b, input.pointer as Point)
      )[0];
    }

    const viewportCenterY = viewport.height / 2;
    return [...visibleRects].sort((a, b) => {
      const aCenter = getRectTop(a) + getRectHeight(a) / 2;
      const bCenter = getRectTop(b) + getRectHeight(b) / 2;
      return Math.abs(aCenter - viewportCenterY) - Math.abs(bCenter - viewportCenterY);
    })[0];
  }

  return input.rect && isUsableRect(input.rect) ? input.rect : null;
}

export function getSelectionMenuPosition(input: {
  rect?: RectLike | null;
  rects?: RectLike[];
  pointer?: Point | null;
  viewport?: Size;
  menu?: Size;
}): Point {
  const viewport =
    input.viewport ??
    (typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 1024, height: 768 });
  const menu = input.menu ?? DEFAULT_MENU_SIZE;
  const anchorRect = getVisibleSelectionRect({
    rect: input.rect,
    rects: input.rects,
    pointer: input.pointer,
    viewport,
  });
  const anchorX =
    input.pointer && anchorRect
      ? clamp(
          input.pointer.x,
          anchorRect.left,
          anchorRect.left + anchorRect.width
        )
      : anchorRect
        ? anchorRect.left + anchorRect.width / 2
        : input.pointer?.x ?? VIEWPORT_MARGIN;
  const rawX = anchorX - menu.width / 2;

  const anchorTop = anchorRect ? getRectTop(anchorRect) : input.pointer?.y ?? VIEWPORT_MARGIN;
  const anchorBottom = anchorRect?.bottom ?? input.pointer?.y ?? VIEWPORT_MARGIN;
  const belowY = anchorBottom + MENU_GAP;
  const aboveY = anchorTop - menu.height - MENU_GAP;
  const rawY =
    belowY + menu.height <= viewport.height - VIEWPORT_MARGIN
      ? belowY
      : aboveY >= VIEWPORT_MARGIN
        ? aboveY
        : belowY;

  return {
    x: clamp(rawX, VIEWPORT_MARGIN, viewport.width - menu.width - VIEWPORT_MARGIN),
    y: clamp(rawY, VIEWPORT_MARGIN, viewport.height - menu.height - VIEWPORT_MARGIN),
  };
}

export function getSelectionFallbackPosition(input: {
  viewport?: Size;
  menu?: Size;
} = {}): Point {
  const viewport =
    input.viewport ??
    (typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 1024, height: 768 });
  const menu = input.menu ?? DEFAULT_MENU_SIZE;

  return {
    x: clamp(
      (viewport.width - menu.width) / 2,
      VIEWPORT_MARGIN,
      viewport.width - menu.width - VIEWPORT_MARGIN
    ),
    y: clamp(
      viewport.height - menu.height - 24,
      VIEWPORT_MARGIN,
      viewport.height - menu.height - VIEWPORT_MARGIN
    ),
  };
}

export function getFloatingThreadPosition(input: {
  anchor?: Point | null;
  viewport?: Size;
  box?: Size;
}): Point {
  const viewport =
    input.viewport ??
    (typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 1024, height: 768 });
  const box = input.box ?? DEFAULT_FLOATING_THREAD_SIZE;
  const defaultPoint = {
    x: viewport.width - box.width - 24,
    y: 96,
  };

  if (!input.anchor) {
    return {
      x: clamp(defaultPoint.x, VIEWPORT_MARGIN, viewport.width - box.width - VIEWPORT_MARGIN),
      y: clamp(defaultPoint.y, VIEWPORT_MARGIN, viewport.height - box.height - VIEWPORT_MARGIN),
    };
  }

  return {
    x: clamp(
      input.anchor.x - box.width + 128,
      VIEWPORT_MARGIN,
      viewport.width - box.width - VIEWPORT_MARGIN
    ),
    y: clamp(
      input.anchor.y - 48,
      VIEWPORT_MARGIN,
      viewport.height - box.height - VIEWPORT_MARGIN
    ),
  };
}

export function clampFloatingBox(input: {
  box: FloatingBox;
  viewport?: Size;
  min?: Size;
  max?: Size;
}): FloatingBox {
  const viewport =
    input.viewport ??
    (typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 1024, height: 768 });
  const min = input.min ?? MIN_FLOATING_THREAD_SIZE;
  const max = input.max ?? {
    width: Math.max(min.width, viewport.width - VIEWPORT_MARGIN * 20),
    height: Math.max(min.height, viewport.height - 80),
  };
  const width = clamp(input.box.width, min.width, max.width);
  const height = clamp(input.box.height, min.height, max.height);

  return {
    x: clamp(input.box.x, VIEWPORT_MARGIN, viewport.width - width - VIEWPORT_MARGIN),
    y: clamp(input.box.y, VIEWPORT_MARGIN, viewport.height - height - VIEWPORT_MARGIN),
    width,
    height,
  };
}

export function clampSelectionBox(input: {
  box: FloatingBox;
  viewport?: Size;
  min?: Size;
  max?: Size;
}): FloatingBox {
  return clampFloatingBox({
    box: input.box,
    viewport: input.viewport,
    min: input.min ?? MIN_SELECTION_MENU_SIZE,
    max: input.max,
  });
}

export function createSelectionSnippetDraft(input: {
  materialId: string;
  text: string;
  source?: ReadingSnippet['source'];
  ordinal: number;
}): ReadingSnippet {
  const source = input.source ?? 'text';
  const anchorPrefix =
    source === 'assistant_reply'
      ? '回答片段'
      : source === 'pdf_text' || source === 'pdf_screenshot'
        ? 'PDF 片段'
        : '片段';

  return {
    materialId: input.materialId,
    text: input.text.trim(),
    anchorLabel: `${anchorPrefix} ${input.ordinal}`,
    source,
    messages: [],
  };
}

function toContextSnippet(snippet: ReadingSnippet): ReadingSnippet | null {
  const text = snippet.text.trim();
  const anchorLabel = snippet.anchorLabel.trim();

  if (!text || !anchorLabel) {
    return null;
  }

  return {
    id: snippet.id,
    materialId: snippet.materialId,
    text,
    anchorLabel,
    source: snippet.source,
    imageDataUrl: snippet.imageDataUrl,
    pageNumber: snippet.pageNumber,
    region: snippet.region,
  };
}

export function buildReadingQuestionContext(
  snippets: ReadingSnippet[],
  materialId: string,
  transientSnippet?: {
    text: string;
    anchorLabel: string;
    source?: ReadingSnippet['source'];
    imageDataUrl?: string;
    pageNumber?: number;
    region?: ReadingSnippet['region'];
  } | null
): ReadingSnippet[] {
  const context: ReadingSnippet[] = [];
  const seen = new Set<string>();

  const append = (snippet: ReadingSnippet) => {
    if (snippet.materialId !== materialId) {
      return;
    }

    const normalized = toContextSnippet(snippet);
    if (!normalized) {
      return;
    }

    const key = `${normalized.materialId}:${normalized.text}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    context.push(normalized);
  };

  snippets.forEach(append);

  if (transientSnippet) {
    append({
      materialId,
      text: transientSnippet.text,
      anchorLabel: transientSnippet.anchorLabel,
      source: transientSnippet.source,
      imageDataUrl: transientSnippet.imageDataUrl,
      pageNumber: transientSnippet.pageNumber,
      region: transientSnippet.region,
    });
  }

  return context;
}
