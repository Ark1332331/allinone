import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addImportedMaterial,
  addSnippet,
  createImportedMaterialDraft,
  createInitialSubjectWorkspace,
  createOriginalFileImportResponse,
  getMaterialSnippetHistory,
  migrateSubjectWorkspace,
  removeSnippetAtIndex,
  removeMaterial,
  toggleMaterialBackgroundRole,
  updateCurrentTargetTitle,
  updateMaterialStudyState,
} from '../../src/lib/learning-workspace.ts';
import {
  buildReadingQuestionContext,
  clampFloatingBox,
  clampSelectionBox,
  createSelectionSnippetDraft,
  getFloatingThreadPosition,
  getSelectionFallbackPosition,
  getSelectionMenuPosition,
  annotateContentWithSnippetAnchors,
  getVisibleSelectionRect,
  getFloatingLayerZIndex,
  getReadableApiErrorMessage,
  shouldIgnoreGlobalSelectionForLocalOwner,
  shouldSkipGlobalSelectionMenuUpdate,
  openFloatingThread,
  closeFloatingThread,
  reconcileFloatingThreadsAfterSnippetRemoval,
  stripRenderedSnippetMarkup,
} from '../../src/lib/reading-interactions.ts';
import { getMarkdownCodeRenderMode } from '../../src/lib/markdown-code.ts';
import { looksLikeInlineMathCode, renderMarkdownMath } from '../../src/lib/markdown-math.ts';

test('createImportedMaterialDraft defaults ppt materials to original mode', () => {
  const draft = createImportedMaterialDraft({
    subjectSlug: 'major-course',
    title: 'Final review slides',
    source_type: 'ppt_md',
    full_content: 'review points and exam structure',
    filename: 'review-slides.pptx',
    detected_extension: '.pptx',
    converter_used: 'markitdown',
    import_summary: 'ok',
    warnings: [],
  });

  assert.equal(draft.preferredViewMode, 'original');
  assert.equal(draft.primaryRole, 'new_slides');
  assert.deepEqual(draft.secondaryRoles, []);
});

test('migrateSubjectWorkspace moves a legacy subject workspace to a concrete course slug', () => {
  const legacy = createInitialSubjectWorkspace('major-course');
  legacy.materials.push({
    id: 'slides-1',
    subjectSlug: 'major-course',
    title: '数字系统复习课件',
    sourceType: 'ppt_md',
    preferredViewMode: 'original',
    primaryRole: 'review_slides',
    secondaryRoles: [],
    fullContent: 'slides',
    filename: 'slides.pptx',
    detectedExtension: '.pptx',
    converterUsed: 'markitdown',
    importSummary: 'ok',
    warnings: [],
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
    latestPreAssessment: null,
  });

  const migrated = migrateSubjectWorkspace(legacy, 'major-course:digital-system');

  assert.equal(migrated.subjectSlug, 'major-course:digital-system');
  assert.equal(migrated.materials[0].subjectSlug, 'major-course:digital-system');
  assert.equal(migrated.materials[0].title, '数字系统复习课件');
});

test('createImportedMaterialDraft defaults pdf materials to original mode', () => {
  const draft = createImportedMaterialDraft({
    subjectSlug: 'major-course',
    title: 'chapter 1',
    source_type: 'pdf_md',
    full_content: 'definition and theorem',
    filename: 'chapter-1.pdf',
    detected_extension: '.pdf',
    converter_used: 'markitdown',
    import_summary: 'ok',
    warnings: [],
  });

  assert.equal(draft.preferredViewMode, 'original');
});

test('createImportedMaterialDraft creates URL-safe ids for concrete course imports', () => {
  const draft = createImportedMaterialDraft({
    subjectSlug: 'major-course:digital-system',
    title: 'chapter 1',
    source_type: 'pdf_md',
    full_content: 'definition and theorem',
    filename: 'chapter-1.pdf',
    detected_extension: '.pdf',
    converter_used: 'markitdown',
    import_summary: 'ok',
    warnings: [],
  });

  assert.match(draft.id, /^major-course-digital-system-\d+-[a-z0-9]+$/);
  assert.equal(draft.id.includes(':'), false);
});

test('createOriginalFileImportResponse creates a fast original-first pdf payload', () => {
  const payload = createOriginalFileImportResponse({
    filename: 'Digital System.pdf',
    mimeType: 'application/pdf',
  });

  assert.equal(payload.title, 'Digital System');
  assert.equal(payload.source_type, 'pdf_md');
  assert.equal(payload.detected_extension, '.pdf');
  assert.equal(payload.converter_used, 'original_file');
  assert.match(payload.full_content, /尚未生成结构化文本/);
});

test('note imports default to structured mode and key point role when relevant', () => {
  const draft = createImportedMaterialDraft({
    subjectSlug: 'major-course',
    title: 'Teacher notes',
    source_type: 'note_md',
    full_content: 'key points summary',
    filename: 'notes.md',
    detected_extension: '.md',
    converter_used: 'direct_text',
    import_summary: 'ok',
    warnings: [],
  });

  assert.equal(draft.preferredViewMode, 'structured');
  assert.equal(draft.primaryRole, 'review_notes');
});

test('addImportedMaterial preserves existing materials when adding another import', () => {
  const workspace = createInitialSubjectWorkspace('major-course:digital-system');
  const first = createImportedMaterialDraft({
    subjectSlug: 'major-course:digital-system',
    title: 'Digital system chapter 1',
    source_type: 'pdf_md',
    full_content: 'chapter 1',
    filename: 'chapter-1.pdf',
    detected_extension: '.pdf',
    converter_used: 'markitdown',
    import_summary: 'ok',
    warnings: [],
  });
  const second = createImportedMaterialDraft({
    subjectSlug: 'major-course:digital-system',
    title: 'Digital system chapter 2',
    source_type: 'pdf_md',
    full_content: 'chapter 2',
    filename: 'chapter-2.pdf',
    detected_extension: '.pdf',
    converter_used: 'markitdown',
    import_summary: 'ok',
    warnings: [],
  });

  const withFirst = addImportedMaterial(workspace, first);
  const withSecond = addImportedMaterial(withFirst, second);

  assert.deepEqual(
    withSecond.materials.map((material) => material.title),
    ['Digital system chapter 2', 'Digital system chapter 1']
  );
});

test('toggleMaterialBackgroundRole adds and removes target background assignment', () => {
  const workspace = createInitialSubjectWorkspace('advanced-math');
  workspace.materials.push({
    id: 'm1',
    subjectSlug: 'advanced-math',
    title: '2024 final exam',
    sourceType: 'pdf_md',
    preferredViewMode: 'original',
    primaryRole: 'past_exam',
    secondaryRoles: [],
    fullContent: 'exam text',
    filename: '2024.pdf',
    detectedExtension: '.pdf',
    converterUsed: 'markitdown',
    importSummary: 'ok',
    warnings: [],
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
    latestPreAssessment: null,
  });

  const added = toggleMaterialBackgroundRole(workspace, 'm1', 'evidence');
  assert.equal(added.currentTarget.backgroundMaterials.length, 1);
  assert.equal(added.currentTarget.backgroundMaterials[0].backgroundRole, 'evidence');

  const removed = toggleMaterialBackgroundRole(added, 'm1');
  assert.equal(removed.currentTarget.backgroundMaterials.length, 0);
});

test('removeMaterial deletes the material and clears target background references', () => {
  const workspace = createInitialSubjectWorkspace('advanced-math');
  workspace.materials.push(
    {
      id: 'm1',
      subjectSlug: 'advanced-math',
      title: '2024 final exam',
      sourceType: 'pdf_md',
      preferredViewMode: 'original',
      primaryRole: 'past_exam',
      secondaryRoles: [],
      fullContent: 'exam text',
      filename: '2024.pdf',
      detectedExtension: '.pdf',
      converterUsed: 'markitdown',
      importSummary: 'ok',
      warnings: [],
      createdAt: 1,
      updatedAt: 1,
      lastReadAt: null,
      latestPreAssessment: null,
    },
    {
      id: 'm2',
      subjectSlug: 'advanced-math',
      title: 'chapter 1',
      sourceType: 'pdf_md',
      preferredViewMode: 'original',
      primaryRole: 'textbook',
      secondaryRoles: [],
      fullContent: 'chapter text',
      filename: 'chapter.pdf',
      detectedExtension: '.pdf',
      converterUsed: 'markitdown',
      importSummary: 'ok',
      warnings: [],
      createdAt: 2,
      updatedAt: 2,
      lastReadAt: null,
      latestPreAssessment: null,
    }
  );

  const withBackground = toggleMaterialBackgroundRole(workspace, 'm1', 'evidence');
  const removed = removeMaterial(withBackground, 'm1');

  assert.deepEqual(
    removed.materials.map((material) => material.id),
    ['m2']
  );
  assert.equal(removed.currentTarget.backgroundMaterials.length, 0);
});

test('addSnippet appends unique snippets from the same material only', () => {
  const snippets = addSnippet([], {
    materialId: 'm1',
    text: 'Key definition 1',
    anchorLabel: 'Snippet 1',
  });

  const duplicate = addSnippet(snippets, {
    materialId: 'm1',
    text: 'Key definition 1',
    anchorLabel: 'Snippet 1',
  });

  assert.equal(duplicate.length, 1);
});

test('addSnippet keeps the same selected text as separate anchors when the source differs', () => {
  const snippets = addSnippet([], {
    materialId: 'm1',
    text: 'same visible text',
    anchorLabel: '片段 1',
    source: 'text',
  });

  const withAssistantReply = addSnippet(snippets, {
    materialId: 'm1',
    text: 'same visible text',
    anchorLabel: '回答片段 2',
    source: 'assistant_reply',
  });

  assert.deepEqual(
    withAssistantReply.map((snippet) => snippet.source),
    ['text', 'assistant_reply']
  );
});

test('addSnippet keeps the same assistant reply text as separate anchors when the parent differs', () => {
  const snippets = addSnippet([], {
    materialId: 'm1',
    text: 'sigmoid',
    anchorLabel: '回答片段 1',
    source: 'assistant_reply',
    parentSnippetId: 'parent-1',
  });

  const withSecondParent = addSnippet(snippets, {
    materialId: 'm1',
    text: 'sigmoid',
    anchorLabel: '回答片段 2',
    source: 'assistant_reply',
    parentSnippetId: 'parent-2',
  });

  assert.deepEqual(
    withSecondParent.map((snippet) => snippet.parentSnippetId),
    ['parent-1', 'parent-2']
  );
});

test('addSnippet keeps only snippets from the current material and trims empty selections', () => {
  const snippets = addSnippet([], {
    materialId: 'm1',
    text: '  Key concept A  ',
    anchorLabel: 'Snippet 2',
  });

  const crossMaterial = addSnippet(snippets, {
    materialId: 'm2',
    text: 'Another file B',
    anchorLabel: 'Snippet 8',
  });

  assert.equal(crossMaterial.length, 1);
  assert.equal(crossMaterial[0].text, 'Key concept A');
});

test('addSnippet preserves screenshot metadata for visual questions', () => {
  const snippets = addSnippet([], {
    materialId: 'pdf-1',
    text: 'PDF screenshot from page 2',
    anchorLabel: 'PDF 截图 1',
    source: 'pdf_screenshot',
    imageDataUrl: 'data:image/png;base64,abc123',
    pageNumber: 2,
    region: {
      x: 10,
      y: 20,
      width: 120,
      height: 80,
    },
  });

  assert.equal(snippets.length, 1);
  assert.match(snippets[0].id ?? '', /^snippet-/);
  assert.equal(snippets[0].source, 'pdf_screenshot');
  assert.equal(snippets[0].imageDataUrl, 'data:image/png;base64,abc123');
  assert.equal(snippets[0].pageNumber, 2);
  assert.deepEqual(snippets[0].region, {
    x: 10,
    y: 20,
    width: 120,
    height: 80,
  });
});

test('getMaterialSnippetHistory returns answered PDF screenshot anchors sorted by page and position', () => {
  const workspace = createInitialSubjectWorkspace('major-course');
  workspace.materials.push({
    id: 'pdf-1',
    subjectSlug: 'major-course',
    title: 'chapter-1',
    sourceType: 'pdf_md',
    preferredViewMode: 'original',
    primaryRole: 'textbook',
    secondaryRoles: [],
    fullContent: 'content',
    filename: 'chapter-1.pdf',
    detectedExtension: '.pdf',
    converterUsed: 'markitdown',
    importSummary: 'ok',
    warnings: [],
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
    latestPreAssessment: null,
    savedSnippets: [
      {
        id: 'later',
        materialId: 'pdf-1',
        text: 'later on page 2',
        anchorLabel: 'PDF 截图 2',
        source: 'pdf_screenshot',
        pageNumber: 2,
        region: { x: 20, y: 120, width: 60, height: 40 },
        messages: [{ role: 'user', content: 'later question' }],
      },
      {
        id: 'earlier',
        materialId: 'pdf-1',
        text: 'earlier on page 1',
        anchorLabel: 'PDF 截图 1',
        source: 'pdf_screenshot',
        pageNumber: 1,
        region: { x: 10, y: 80, width: 60, height: 40 },
        messages: [{ role: 'user', content: 'earlier question' }],
      },
      {
        id: 'unanchored',
        materialId: 'pdf-1',
        text: 'plain text snippet',
        anchorLabel: '片段 3',
        messages: [],
      },
    ],
  });

  const history = getMaterialSnippetHistory(workspace, 'pdf-1');

  assert.deepEqual(
    history.map((snippet) => snippet.id),
    ['earlier', 'later']
  );
});

test('getMaterialSnippetHistory only lists original PDF screenshot anchors', () => {
  const workspace = createInitialSubjectWorkspace('major-course');
  workspace.materials.push({
    id: 'pdf-1',
    subjectSlug: 'major-course',
    title: 'chapter-1',
    sourceType: 'pdf_md',
    preferredViewMode: 'original',
    primaryRole: 'textbook',
    secondaryRoles: [],
    fullContent: 'content',
    filename: 'chapter-1.pdf',
    detectedExtension: '.pdf',
    converterUsed: 'markitdown',
    importSummary: 'ok',
    warnings: [],
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
    latestPreAssessment: null,
    savedSnippets: [
      {
        id: 'original-pdf',
        materialId: 'pdf-1',
        text: 'PDF screenshot from page 1',
        anchorLabel: 'PDF 截图 1',
        source: 'pdf_screenshot',
        pageNumber: 1,
        region: { x: 10, y: 20, width: 60, height: 40 },
        messages: [{ role: 'user', content: 'original question' }],
      },
      {
        id: 'answer-follow-up',
        materialId: 'pdf-1',
        text: 'assistant answer selection',
        anchorLabel: '回答片段 2',
        source: 'assistant_reply',
        messages: [{ role: 'user', content: 'follow-up question' }],
      },
      {
        id: 'structured-text',
        materialId: 'pdf-1',
        text: 'structured text selection',
        anchorLabel: '片段 3',
        source: 'text',
        messages: [{ role: 'user', content: 'text question' }],
      },
    ],
  });

  const history = getMaterialSnippetHistory(workspace, 'pdf-1');

  assert.deepEqual(
    history.map((snippet) => snippet.id),
    ['original-pdf']
  );
});

test('getMaterialSnippetHistory excludes staged PDF screenshots without answers', () => {
  const workspace = createInitialSubjectWorkspace('major-course');
  workspace.materials.push({
    id: 'pdf-1',
    subjectSlug: 'major-course',
    title: 'chapter-1',
    sourceType: 'pdf_md',
    preferredViewMode: 'original',
    primaryRole: 'textbook',
    secondaryRoles: [],
    fullContent: 'content',
    filename: 'chapter-1.pdf',
    detectedExtension: '.pdf',
    converterUsed: 'markitdown',
    importSummary: 'ok',
    warnings: [],
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
    latestPreAssessment: null,
    savedSnippets: [
      {
        id: 'staged-pdf',
        materialId: 'pdf-1',
        text: 'PDF screenshot from page 1',
        anchorLabel: 'PDF 截图 1',
        source: 'pdf_screenshot',
        pageNumber: 1,
        region: { x: 10, y: 20, width: 60, height: 40 },
        messages: [],
      },
    ],
  });

  assert.deepEqual(getMaterialSnippetHistory(workspace, 'pdf-1'), []);
});

test('removeSnippetAtIndex deletes the selected thread without leaving empty shells', () => {
  const snippets = [
    {
      id: 'first',
      materialId: 'pdf-1',
      text: 'first screenshot',
      anchorLabel: 'PDF 截图 1',
      messages: [],
    },
    {
      id: 'second',
      materialId: 'pdf-1',
      text: 'second screenshot',
      anchorLabel: 'PDF 截图 2',
      messages: [{ role: 'user' as const, content: 'why?' }],
    },
  ];

  const next = removeSnippetAtIndex(snippets, 0);

  assert.deepEqual(
    next.map((snippet) => snippet.id),
    ['second']
  );
});

test('buildReadingQuestionContext includes staged snippets plus a transient selected reply', () => {
  const snippets = [
    {
      id: 'first',
      materialId: 'pdf-1',
      text: 'first definition',
      anchorLabel: '片段 1',
    },
    {
      id: 'second',
      materialId: 'pdf-1',
      text: 'second theorem',
      anchorLabel: '片段 2',
      messages: [{ role: 'user' as const, content: 'why?' }],
    },
  ];

  const context = buildReadingQuestionContext(snippets, 'pdf-1', {
    text: 'assistant reply selection',
    anchorLabel: '助手回复选区',
  });

  assert.deepEqual(
    context.map((snippet) => snippet.text),
    ['first definition', 'second theorem', 'assistant reply selection']
  );
  assert.equal(context[2].materialId, 'pdf-1');
});

test('buildReadingQuestionContext keeps the API snippet payload within backend limits', () => {
  const snippets = Array.from({ length: 15 }, (_item, index) => ({
    id: `s${index}`,
    materialId: 'pdf-1',
    text: `selected text ${index}`,
    anchorLabel: `片段 ${index}`,
  }));

  const context = buildReadingQuestionContext(snippets, 'pdf-1');

  assert.equal(context.length, 12);
  assert.deepEqual(
    context.map((snippet) => snippet.text),
    [
      'selected text 3',
      'selected text 4',
      'selected text 5',
      'selected text 6',
      'selected text 7',
      'selected text 8',
      'selected text 9',
      'selected text 10',
      'selected text 11',
      'selected text 12',
      'selected text 13',
      'selected text 14',
    ]
  );
});

test('createSelectionSnippetDraft gives selected assistant replies their own anchor source', () => {
  const draft = createSelectionSnippetDraft({
    materialId: 'pdf-1',
    text: ' assistant reply selection ',
    source: 'assistant_reply',
    ordinal: 3,
  });

  assert.equal(draft.materialId, 'pdf-1');
  assert.equal(draft.text, 'assistant reply selection');
  assert.equal(draft.source, 'assistant_reply');
  assert.equal(draft.anchorLabel, '回答片段 3');
  assert.deepEqual(draft.messages, []);
});

test('createSelectionSnippetDraft records the parent thread for assistant-reply anchors', () => {
  const draft = createSelectionSnippetDraft({
    materialId: 'pdf-1',
    text: 'sigmoid',
    source: 'assistant_reply',
    ordinal: 4,
    parentSnippetId: 'root-thread',
  });

  assert.equal(draft.parentSnippetId, 'root-thread');
});

test('annotateContentWithSnippetAnchors can anchor rendered text selected from markdown formatting', () => {
  const annotated = annotateContentWithSnippetAnchors({
    content: '这里的 **策略梯度** 是核心。',
    snippets: [
      {
        materialId: 'pdf-1',
        text: '策略梯度 是核心',
        anchorLabel: '回答片段 1',
        source: 'assistant_reply',
      },
    ],
    shouldAnnotate: (snippet) => snippet.source === 'assistant_reply',
  });

  assert.match(annotated, /data-snippet-index="0"/);
  assert.match(annotated, /策略梯度/);
});

test('annotateContentWithSnippetAnchors can use custom anchor attributes for PDF answer follow-ups', () => {
  const annotated = annotateContentWithSnippetAnchors({
    content: '先看 **第二步** 的恒等变形，再比较第三步。',
    snippets: [
      {
        materialId: 'pdf-1',
        text: '第二步 的恒等变形',
        anchorLabel: '截图回答追问',
        source: 'assistant_reply',
      },
    ],
    getMarkAttributes: () => 'data-capture-follow-up-id="follow-up-1"',
    markStyle:
      'background: transparent; color: inherit; text-decoration: underline;',
  });

  assert.match(annotated, /data-capture-follow-up-id="follow-up-1"/);
  assert.match(annotated, /text-decoration: underline/);
  assert.match(
    annotated,
    /<mark data-capture-follow-up-id="follow-up-1"[^>]*>第二步<\/mark>/
  );
  assert.match(
    annotated,
    /<mark data-capture-follow-up-id="follow-up-1"[^>]*>的恒等变形<\/mark>/
  );
});

test('annotateContentWithSnippetAnchors limits assistant anchors to the current parent thread', () => {
  const annotated = annotateContentWithSnippetAnchors({
    content: '这里重新提到 sigmoid，但不是当前回答里选出的锚点。',
    snippets: [
      {
        materialId: 'pdf-1',
        text: 'sigmoid',
        anchorLabel: '回答片段 1',
        source: 'assistant_reply',
        parentSnippetId: 'other-thread',
      },
    ],
    parentSnippetId: 'current-thread',
  });

  assert.doesNotMatch(annotated, /<mark/);
});

test('annotateContentWithSnippetAnchors does not insert mark tags inside latex math', () => {
  const annotated = annotateContentWithSnippetAnchors({
    content: '题目中的公式：$P(y=k|x)=w^T x+b_k$，这里解释 x 的含义。',
    snippets: [
      {
        materialId: 'pdf-1',
        text: 'x',
        anchorLabel: '回答片段 2',
        source: 'assistant_reply',
        parentSnippetId: 'root-thread',
      },
    ],
    parentSnippetId: 'root-thread',
  });

  assert.doesNotMatch(annotated, /\$[^$<]*<mark[^$]*\$/);
  assert.match(annotated, /这里解释 <mark/);
});

test('global selection handling ignores PDF-local answer selections', () => {
  assert.equal(
    shouldIgnoreGlobalSelectionForLocalOwner(['pdf-answer', undefined, undefined]),
    true
  );
  assert.equal(
    shouldIgnoreGlobalSelectionForLocalOwner([undefined, 'pdf-answer', undefined]),
    true
  );
  assert.equal(
    shouldIgnoreGlobalSelectionForLocalOwner([undefined, undefined, 'pdf-answer']),
    true
  );
  assert.equal(
    shouldIgnoreGlobalSelectionForLocalOwner([undefined, 'reading', undefined]),
    false
  );
});

test('global selection handling lets the current Q&A box own its local selections', () => {
  assert.equal(
    shouldSkipGlobalSelectionMenuUpdate({
      localOwners: [undefined, undefined, undefined],
      selectionContainers: ['current-thread', undefined, undefined],
    }),
    true
  );
  assert.equal(
    shouldSkipGlobalSelectionMenuUpdate({
      localOwners: [undefined, undefined, undefined],
      selectionContainers: [undefined, 'reading-surface', undefined],
    }),
    false
  );
});

test('getSelectionMenuPosition prefers the selection rectangle and clamps inside the viewport', () => {
  const position = getSelectionMenuPosition({
    rect: {
      left: 780,
      top: 520,
      width: 80,
      height: 24,
      bottom: 544,
    },
    pointer: { x: 120, y: 120 },
    viewport: { width: 900, height: 600 },
    menu: { width: 320, height: 120 },
  });

  assert.deepEqual(position, {
    x: 568,
    y: 390,
  });
});

test('getSelectionMenuPosition places the temporary question box above when below is blocked', () => {
  const position = getSelectionMenuPosition({
    rect: {
      left: 520,
      top: 650,
      width: 120,
      height: 24,
      bottom: 674,
    },
    pointer: { x: 580, y: 662 },
    viewport: { width: 1000, height: 760 },
    menu: { width: 352, height: 252 },
  });

  assert.deepEqual(position, {
    x: 404,
    y: 388,
  });
});

test('getSelectionMenuPosition can force the temporary question box above selected answers', () => {
  const position = getSelectionMenuPosition({
    rect: {
      left: 720,
      top: 610,
      width: 180,
      height: 24,
      bottom: 634,
    },
    pointer: { x: 820, y: 622 },
    viewport: { width: 1180, height: 1180 },
    menu: { width: 352, height: 252 },
    preferredPlacement: 'above',
  });

  assert.deepEqual(position, {
    x: 644,
    y: 348,
  });
});

test('getSelectionMenuPosition keeps selected answer popups above instead of falling below when space is tight', () => {
  const position = getSelectionMenuPosition({
    rect: {
      left: 720,
      top: 180,
      width: 180,
      height: 24,
      bottom: 204,
    },
    pointer: { x: 820, y: 192 },
    viewport: { width: 1180, height: 760 },
    menu: { width: 352, height: 252 },
    preferredPlacement: 'above',
  });

  assert.deepEqual(position, {
    x: 644,
    y: 12,
  });
});

test('getFloatingThreadPosition keeps the current Q&A box visible near an anchor or upper right', () => {
  assert.deepEqual(
    getFloatingThreadPosition({
      anchor: { x: 860, y: 180 },
      viewport: { width: 1000, height: 700 },
      box: { width: 360, height: 420 },
    }),
    { x: 628, y: 132 }
  );

  assert.deepEqual(
    getFloatingThreadPosition({
      viewport: { width: 1000, height: 700 },
      box: { width: 360, height: 420 },
    }),
    { x: 616, y: 96 }
  );
});

test('openFloatingThread keeps previous Q&A boxes open while adding a new one', () => {
  const threads = openFloatingThread(
    [{ snippetIndex: 0, x: 500, y: 96, width: 360, height: 420 }],
    { snippetIndex: 1, x: 560, y: 132, width: 360, height: 420 }
  );

  assert.deepEqual(
    threads.map((thread) => thread.snippetIndex),
    [0, 1]
  );
});

test('openFloatingThread focuses an already-open Q&A box without duplicating it', () => {
  const threads = openFloatingThread(
    [
      { snippetIndex: 0, x: 500, y: 96, width: 360, height: 420 },
      { snippetIndex: 1, x: 560, y: 132, width: 360, height: 420 },
    ],
    { snippetIndex: 0, x: 620, y: 160, width: 380, height: 440 }
  );

  assert.deepEqual(
    threads.map((thread) => thread.snippetIndex),
    [1, 0]
  );
  assert.deepEqual(threads[1], {
    snippetIndex: 0,
    x: 620,
    y: 160,
    width: 380,
    height: 440,
  });
});

test('closeFloatingThread only closes the chosen Q&A box', () => {
  const threads = closeFloatingThread(
    [
      { snippetIndex: 0, x: 500, y: 96, width: 360, height: 420 },
      { snippetIndex: 1, x: 560, y: 132, width: 360, height: 420 },
    ],
    0
  );

  assert.deepEqual(
    threads.map((thread) => thread.snippetIndex),
    [1]
  );
});

test('reconcileFloatingThreadsAfterSnippetRemoval removes the deleted thread and shifts later indices', () => {
  const threads = reconcileFloatingThreadsAfterSnippetRemoval(
    [
      { snippetIndex: 0, x: 500, y: 96, width: 360, height: 420 },
      { snippetIndex: 1, x: 560, y: 132, width: 360, height: 420 },
      { snippetIndex: 2, x: 620, y: 160, width: 360, height: 420 },
    ],
    1
  );

  assert.deepEqual(
    threads.map((thread) => thread.snippetIndex),
    [0, 1]
  );
  assert.equal(threads[1].x, 620);
});

test('clampFloatingBox keeps draggable and resizable Q&A boxes usable', () => {
  assert.deepEqual(
    clampFloatingBox({
      box: { x: -80, y: 40, width: 900, height: 900 },
      viewport: { width: 1000, height: 700 },
    }),
    { x: 12, y: 40, width: 760, height: 620 }
  );

  assert.deepEqual(
    clampFloatingBox({
      box: { x: 900, y: 660, width: 100, height: 100 },
      viewport: { width: 1000, height: 700 },
    }),
    { x: 668, y: 408, width: 320, height: 280 }
  );
});

test('clampSelectionBox keeps selection question popups usable while dragging and resizing', () => {
  assert.deepEqual(
    clampSelectionBox({
      box: { x: 900, y: 640, width: 120, height: 80 },
      viewport: { width: 1000, height: 700 },
    }),
    { x: 708, y: 498, width: 280, height: 190 }
  );

  assert.deepEqual(
    clampSelectionBox({
      box: { x: -60, y: 10, width: 900, height: 900 },
      viewport: { width: 1000, height: 700 },
    }),
    { x: 12, y: 12, width: 760, height: 620 }
  );
});

test('selection question popup layer stays above the current Q&A layer', () => {
  assert.ok(getFloatingLayerZIndex('selection-menu') > getFloatingLayerZIndex('current-thread'));
});

test('getReadableApiErrorMessage formats FastAPI validation detail objects', () => {
  const message = getReadableApiErrorMessage(
    {
      detail: [
        {
          loc: ['body', 'selected_snippets', 0, 'source'],
          msg: "Input should be 'text', 'pdf_text' or 'pdf_screenshot'",
          type: 'literal_error',
        },
      ],
    },
    'fallback'
  );

  assert.equal(
    message,
    "body.selected_snippets.0.source：Input should be 'text', 'pdf_text' or 'pdf_screenshot'"
  );
});

test('stripRenderedSnippetMarkup removes leaked anchor tags from stored assistant text', () => {
  const cleaned = stripRenderedSnippetMarkup(
    '<mark data-snippet-index="4" style="background: red;">sigmoid</mark> 没搞清'
  );

  assert.equal(cleaned, 'sigmoid 没搞清');
});

test('renderMarkdownMath renders dollar and bracket latex wrappers', () => {
  const dollar = String.fromCharCode(36);
  const output = renderMarkdownMath(
    `行内 ${dollar}a+b${dollar}，显示 ${dollar}${dollar}c+d${dollar}${dollar}，括号 \\\\(x+y\\\\)，方括号 \\\\[m+n\\\\]`
  );

  assert.match(output, /katex/);
  assert.doesNotMatch(output, /\$a\+b\$/);
  assert.doesNotMatch(output, /\\\(x\+y\\\)/);
  assert.doesNotMatch(output, /\\\[m\+n\\\]/);
});

test('looksLikeInlineMathCode detects formulas that the model wrapped as inline code', () => {
  assert.equal(looksLikeInlineMathCode('log L(θ) = \\sum_i log P(y_i | x_i; θ)'), true);
  assert.equal(looksLikeInlineMathCode('P(Y=y_i | X_i; θ)'), true);
  assert.equal(looksLikeInlineMathCode('L(β)'), true);
  assert.equal(looksLikeInlineMathCode('ℓ(β)'), true);
  assert.equal(looksLikeInlineMathCode('npm run dev'), false);
  assert.equal(looksLikeInlineMathCode('const value = total + 1'), false);
});

test('markdown code rendering treats language-free multiline fences as neutral blocks', () => {
  assert.deepEqual(
    getMarkdownCodeRenderMode({
      inline: false,
      className: undefined,
      content: 'w^T x + b\nP(Y=y | X=x)',
    }),
    {
      type: 'plain-block',
    }
  );
});

test('markdown code rendering keeps single-line formulas as inline math only', () => {
  assert.deepEqual(
    getMarkdownCodeRenderMode({
      inline: true,
      className: undefined,
      content: 'w^T x + b',
    }),
    {
      type: 'inline-math',
    }
  );

  assert.deepEqual(
    getMarkdownCodeRenderMode({
      inline: true,
      className: undefined,
      content: 'npm run dev',
    }),
    {
      type: 'inline-code',
    }
  );
});

test('getSelectionFallbackPosition keeps the selection question bar visible', () => {
  assert.deepEqual(
    getSelectionFallbackPosition({
      viewport: { width: 1000, height: 700 },
      menu: { width: 420, height: 150 },
    }),
    { x: 290, y: 526 }
  );

  assert.deepEqual(
    getSelectionFallbackPosition({
      viewport: { width: 320, height: 300 },
      menu: { width: 420, height: 150 },
    }),
    { x: 12, y: 126 }
  );
});

test('getVisibleSelectionRect chooses the visible rect nearest the pointer', () => {
  const rect = getVisibleSelectionRect({
    rect: { left: 0, top: 0, width: 800, height: 260, bottom: 260 },
    rects: [
      { left: 20, top: -80, width: 420, height: 20, bottom: -60 },
      { left: 32, top: 120, width: 380, height: 22, bottom: 142 },
      { left: 44, top: 240, width: 360, height: 22, bottom: 262 },
    ],
    pointer: { x: 60, y: 245 },
    viewport: { width: 900, height: 600 },
  });

  assert.deepEqual(rect, {
    left: 44,
    top: 240,
    width: 360,
    height: 22,
    bottom: 262,
  });
});

test('updateCurrentTargetTitle lets the user rename the current target explicitly', () => {
  const workspace = createInitialSubjectWorkspace('major-course');
  const defaultTitle = workspace.currentTarget.title;

  const renamed = updateCurrentTargetTitle(workspace, 'Final review round 1');
  assert.equal(renamed.currentTarget.title, 'Final review round 1');

  const fallback = updateCurrentTargetTitle(renamed, '   ');
  assert.equal(fallback.currentTarget.title, defaultTitle);
});

test('updateMaterialStudyState stores chat history and saved snippets on the material', () => {
  const workspace = createInitialSubjectWorkspace('major-course');
  workspace.materials.push({
    id: 'pdf-1',
    subjectSlug: 'major-course',
    title: 'chapter-1',
    sourceType: 'pdf_md',
    preferredViewMode: 'original',
    primaryRole: 'textbook',
    secondaryRoles: [],
    fullContent: 'content',
    filename: 'chapter-1.pdf',
    detectedExtension: '.pdf',
    converterUsed: 'markitdown',
    importSummary: 'ok',
    warnings: [],
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
    latestPreAssessment: null,
  });

  const updated = updateMaterialStudyState(workspace, 'pdf-1', {
    savedSnippets: [
      {
        materialId: 'pdf-1',
        text: 'definition',
        anchorLabel: 'Snippet 1',
      },
    ],
    chatHistory: [
      {
        role: 'user',
        content: 'What does this definition mean?',
      },
      {
        role: 'assistant',
        content: 'It defines the core concept.',
      },
    ],
  });

  assert.equal(updated.materials[0].savedSnippets?.length, 1);
  assert.equal(updated.materials[0].chatHistory?.length, 2);
  assert.equal(updated.materials[0].savedSnippets?.[0].text, 'definition');
  assert.equal(updated.materials[0].chatHistory?.[1].role, 'assistant');
});
