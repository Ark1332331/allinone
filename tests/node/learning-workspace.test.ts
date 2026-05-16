import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addSnippet,
  createImportedMaterialDraft,
  createInitialSubjectWorkspace,
  getMaterialSnippetHistory,
  removeSnippetAtIndex,
  removeMaterial,
  toggleMaterialBackgroundRole,
  updateCurrentTargetTitle,
  updateMaterialStudyState,
} from '../../src/lib/learning-workspace.ts';

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

test('getMaterialSnippetHistory returns anchored snippets sorted by page and position', () => {
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
      },
      {
        id: 'earlier',
        materialId: 'pdf-1',
        text: 'earlier on page 1',
        anchorLabel: 'PDF 截图 1',
        pageNumber: 1,
        region: { x: 10, y: 80, width: 60, height: 40 },
      },
      {
        id: 'unanchored',
        materialId: 'pdf-1',
        text: 'plain text snippet',
        anchorLabel: '片段 3',
      },
    ],
  });

  const history = getMaterialSnippetHistory(workspace, 'pdf-1');

  assert.deepEqual(
    history.map((snippet) => snippet.id),
    ['earlier', 'later', 'unanchored']
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
