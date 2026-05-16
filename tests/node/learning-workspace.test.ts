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
  getVisibleSelectionRect,
} from '../../src/lib/reading-interactions.ts';
import { renderMarkdownMath } from '../../src/lib/markdown-math.ts';

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

test('getMaterialSnippetHistory returns only snippets with messages sorted by page and position', () => {
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
        pageNumber: 2,
        region: { x: 20, y: 120, width: 60, height: 40 },
        messages: [{ role: 'user', content: 'later question' }],
      },
      {
        id: 'earlier',
        materialId: 'pdf-1',
        text: 'earlier on page 1',
        anchorLabel: 'PDF 截图 1',
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
    { x: 12, y: 10, width: 760, height: 620 }
  );
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
