import type { ReadingSnippet } from '@/types/learning-workspace';
import type { LearningChatMessage } from '@/types/learning-chat';

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

export type FloatingThreadBox = FloatingBox & {
  snippetIndex: number;
};

const VIEWPORT_MARGIN = 12;
const MENU_GAP = 10;
const ASK_MENU_GAP = 8;

export function getAskMenuPosition(point: { x: number; y: number }) {
  const alignRight = point.x > window.innerWidth / 2;
  const openUp = point.y > window.innerHeight / 2;

  return {
    left: clamp(
      point.x + (alignRight ? -ASK_MENU_GAP : ASK_MENU_GAP),
      VIEWPORT_MARGIN,
      window.innerWidth - VIEWPORT_MARGIN
    ),
    top: clamp(
      point.y + (openUp ? -ASK_MENU_GAP : ASK_MENU_GAP),
      VIEWPORT_MARGIN,
      window.innerHeight - VIEWPORT_MARGIN
    ),
    transform: `${alignRight ? 'translateX(-100%)' : ''}${openUp ? ' translateY(-100%)' : ''}`.trim() || undefined,
  };
}
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
const FLOATING_LAYER_Z_INDEX = {
  currentThread: 50,
  selectionMenu: 120,
} as const;

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function getFloatingLayerZIndex(
  layer: 'current-thread' | 'selection-menu'
) {
  return layer === 'selection-menu'
    ? FLOATING_LAYER_Z_INDEX.selectionMenu
    : FLOATING_LAYER_Z_INDEX.currentThread;
}

export function openFloatingThread(
  threads: FloatingThreadBox[],
  nextThread: FloatingThreadBox
) {
  return [
    ...threads.filter((thread) => thread.snippetIndex !== nextThread.snippetIndex),
    nextThread,
  ];
}

export function closeFloatingThread(
  threads: FloatingThreadBox[],
  snippetIndex: number
) {
  return threads.filter((thread) => thread.snippetIndex !== snippetIndex);
}

export function reconcileFloatingThreadsAfterSnippetRemoval(
  threads: FloatingThreadBox[],
  removedIndex: number
) {
  return threads
    .filter((thread) => thread.snippetIndex !== removedIndex)
    .map((thread) =>
      thread.snippetIndex > removedIndex
        ? { ...thread, snippetIndex: thread.snippetIndex - 1 }
        : thread
    );
}

export function getReadableApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const formatted = detail
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return '';
        }

        const record = item as { loc?: unknown; msg?: unknown };
        const location = Array.isArray(record.loc)
          ? record.loc.map((part) => String(part)).join('.')
          : '';
        const message = typeof record.msg === 'string' ? record.msg : '';
        if (!message) {
          return '';
        }

        return location ? `${location}：${message}` : message;
      })
      .filter(Boolean);

    if (formatted.length > 0) {
      return formatted.join('\n');
    }
  }

  return fallback;
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

export function stripRenderedSnippetMarkup(value: string) {
  return value
    .replace(/<mark\b[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '');
}

function normalizeAnchorText(value: string) {
  return value.replace(/\s+/g, '');
}

function getTextMask(content: string) {
  const mask = Array.from({ length: content.length }, () => true);
  let isInsideTag = false;
  let isInsideInlineCode = false;
  let isInsideMath = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const previousChar = index > 0 ? content[index - 1] : '';
    const nextChar = index + 1 < content.length ? content[index + 1] : '';

    if (isInsideTag) {
      mask[index] = false;
      if (char === '>') {
        isInsideTag = false;
      }
      continue;
    }

    if (char === '<') {
      mask[index] = false;
      isInsideTag = true;
      continue;
    }

    if (!isInsideMath && char === '`') {
      mask[index] = false;
      isInsideInlineCode = !isInsideInlineCode;
      continue;
    }

    if (!isInsideInlineCode && char === '$' && previousChar !== '\\') {
      mask[index] = false;
      if (nextChar === '$') {
        mask[index + 1] = false;
        index += 1;
      }
      isInsideMath = !isInsideMath;
      continue;
    }

    if (isInsideInlineCode || isInsideMath) {
      mask[index] = false;
    }
  }

  return mask;
}

export function shouldIgnoreGlobalSelectionForLocalOwner(
  owners: Array<string | null | undefined>,
  ignoredOwner = 'pdf-answer'
) {
  return owners.some((owner) => owner === ignoredOwner);
}

export function shouldSkipGlobalSelectionMenuUpdate(input: {
  localOwners: Array<string | null | undefined>;
  selectionContainers: Array<string | null | undefined>;
}) {
  if (shouldIgnoreGlobalSelectionForLocalOwner(input.localOwners)) {
    return true;
  }

  return input.selectionContainers.some((container) => container === 'current-thread');
}

function getAnchorTextCandidates(value: string) {
  return value
    .split(/\s+/)
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length >= 2)
    .sort((left, right) => right.length - left.length);
}

function findVisibleTextRange(content: string, selectedText: string) {
  const target = normalizeAnchorText(selectedText);
  if (!target) {
    return null;
  }

  const visibleChars: string[] = [];
  const sourceIndices: number[] = [];
  const textMask = getTextMask(content);
  let isInsideTag = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '<') {
      isInsideTag = true;
      continue;
    }

    if (isInsideTag) {
      if (char === '>') {
        isInsideTag = false;
      }
      continue;
    }

    if (!textMask[index]) {
      continue;
    }

    if (/\s/.test(char)) {
      continue;
    }

    if ('*_`~#>![]()\\'.includes(char)) {
      continue;
    }

    visibleChars.push(char);
    sourceIndices.push(index);
  }

  const visibleText = visibleChars.join('');
  const visibleStart = visibleText.indexOf(target);
  if (visibleStart < 0) {
    return null;
  }

  return {
    start: sourceIndices[visibleStart],
    end: sourceIndices[visibleStart + target.length - 1] + 1,
  };
}

function findVisibleTextSegments(content: string, selectedText: string) {
  const visibleRange = findVisibleTextRange(content, selectedText);
  if (!visibleRange) {
    return [];
  }

  const segments: Array<{ start: number; end: number }> = [];
  let segmentStart: number | null = null;
  let isInsideTag = false;
  const textMask = getTextMask(content);

  for (let index = visibleRange.start; index < visibleRange.end; index += 1) {
    const char = content[index];

    if (char === '<') {
      if (segmentStart !== null) {
        segments.push({ start: segmentStart, end: index });
        segmentStart = null;
      }
      isInsideTag = true;
      continue;
    }

    if (isInsideTag) {
      if (char === '>') {
        isInsideTag = false;
      }
      continue;
    }

    if (!textMask[index]) {
      if (segmentStart !== null) {
        segments.push({ start: segmentStart, end: index });
        segmentStart = null;
      }
      continue;
    }

    if (/\s/.test(char) || '*_`~#>![]()\\'.includes(char)) {
      if (segmentStart !== null) {
        segments.push({ start: segmentStart, end: index });
        segmentStart = null;
      }
      continue;
    }

    if (segmentStart === null) {
      segmentStart = index;
    }
  }

  if (segmentStart !== null) {
    segments.push({ start: segmentStart, end: visibleRange.end });
  }

  return segments;
}

function findPlainTextRange(content: string, selectedText: string) {
  const textMask = getTextMask(content);
  let start = content.indexOf(selectedText);

  while (start >= 0) {
    const end = start + selectedText.length;
    const isAllowed = Array.from({ length: selectedText.length }).every(
      (_item, offset) => textMask[start + offset]
    );
    if (isAllowed) {
      return { start, end };
    }

    start = content.indexOf(selectedText, start + 1);
  }

  return null;
}

function hasAllowedText(content: string, text: string) {
  return Boolean(findPlainTextRange(content, text));
}

export function annotateContentWithSnippetAnchors(input: {
  content: string;
  snippets: ReadingSnippet[];
  shouldAnnotate?: (snippet: ReadingSnippet) => boolean;
  getMarkAttributes?: (snippet: ReadingSnippet, index: number) => string;
  markStyle?: string;
  parentSnippetId?: string;
}) {
  const shouldAnnotate = input.shouldAnnotate ?? (() => true);
  const getMarkAttributes =
    input.getMarkAttributes ??
    ((_snippet: ReadingSnippet, index: number) => `data-snippet-index="${index}"`);
  const markStyle =
    input.markStyle ??
    'background: rgba(196, 106, 62, 0.18); padding: 0 0.18rem; border-radius: 0.35rem; cursor: pointer;';
  let annotated = input.content;

  input.snippets.forEach((snippet, index) => {
    if (
      input.parentSnippetId &&
      snippet.source === 'assistant_reply' &&
      snippet.parentSnippetId !== input.parentSnippetId
    ) {
      return;
    }

    if (!shouldAnnotate(snippet)) {
      return;
    }

    const text = snippet.text.trim();
    if (!text) {
      return;
    }

    const markAttributes = getMarkAttributes(snippet, index);
    const exactMark = `<mark ${markAttributes} style="${markStyle}">${escapeHtml(
      text
    )}</mark>`;
    const plainRange = findPlainTextRange(annotated, text);
    if (plainRange) {
      annotated = `${annotated.slice(0, plainRange.start)}${exactMark}${annotated.slice(plainRange.end)}`;
      return;
    }

    const visibleSegments = findVisibleTextSegments(annotated, text);
    if (visibleSegments.length > 0) {
      annotated = [...visibleSegments]
        .reverse()
        .reduce(
          (content, segment) =>
            `${content.slice(
              0,
              segment.start
            )}<mark ${markAttributes} style="${markStyle}">${content.slice(
              segment.start,
              segment.end
            )}</mark>${content.slice(segment.end)}`,
          annotated
        );
      return;
    }

    const fallbackText = getAnchorTextCandidates(text).find((candidate) =>
      hasAllowedText(annotated, candidate)
    );
    if (fallbackText) {
      const fallbackRange = findPlainTextRange(annotated, fallbackText);
      if (fallbackRange) {
        annotated = `${annotated.slice(
          0,
          fallbackRange.start
        )}<mark ${markAttributes} style="${markStyle}">${escapeHtml(
          fallbackText
        )}</mark>${annotated.slice(fallbackRange.end)}`;
      }
      return;
    }

  });

  return annotated;
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
  preferredPlacement?: 'above' | 'below';
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
  const canFitBelow = belowY + menu.height <= viewport.height - VIEWPORT_MARGIN;
  const canFitAbove = aboveY >= VIEWPORT_MARGIN;
  const rawY =
    input.preferredPlacement === 'above'
      ? aboveY
      : canFitBelow
        ? belowY
        : canFitAbove
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
  parentSnippetId?: string;
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
    parentSnippetId: input.parentSnippetId,
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
    parentSnippetId: snippet.parentSnippetId,
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
    parentSnippetId?: ReadingSnippet['parentSnippetId'];
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
      parentSnippetId: transientSnippet.parentSnippetId,
      imageDataUrl: transientSnippet.imageDataUrl,
      pageNumber: transientSnippet.pageNumber,
      region: transientSnippet.region,
    });
  }

  return context.slice(-12);
}

export function buildCurrentQuestionContext(input: {
  materialId: string;
  stagedSnippets?: ReadingSnippet[];
  currentSnippet: ReadingSnippet;
  limit?: number;
}): ReadingSnippet[] {
  const limit = input.limit ?? 12;
  const context: ReadingSnippet[] = [];
  const seen = new Set<string>();

  const append = (snippet: ReadingSnippet) => {
    if (snippet.materialId !== input.materialId) {
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

  input.stagedSnippets?.forEach(append);
  append(input.currentSnippet);

  return context.slice(-limit);
}

export function buildAssistantReplyFollowUpMessages(input: {
  parentMessages: LearningChatMessage[];
  nextQuestion: string;
  limit?: number;
}): LearningChatMessage[] {
  const trimmedQuestion = input.nextQuestion.trim();
  const messages = [
    ...input.parentMessages.filter((message) => message.content.trim()),
    ...(trimmedQuestion ? [{ role: 'user' as const, content: trimmedQuestion }] : []),
  ];

  return messages.slice(-(input.limit ?? 20));
}
