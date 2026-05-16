# Learning Reading Shell V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable learning flow: import material into a subject shelf, toggle target background on cards, open a direct reading page, and ask questions with selected snippets plus target/profile context.

**Architecture:** Keep subject/material state on the frontend in localStorage for this V1 loop, but move model-dependent judgment and answering to backend routes. Extract pure TypeScript workspace logic so the new shelf/reading behavior can be tested without introducing a full frontend test framework first.

**Tech Stack:** Next.js App Router, React 19, TypeScript, localStorage persistence, FastAPI, existing OpenAI-compatible backend clients, Node built-in test runner with `--experimental-strip-types`

---

### Task 1: Define learning workspace state and test it first

**Files:**
- Create: `src/types/learning-workspace.ts`
- Create: `src/lib/learning-workspace.ts`
- Create: `tests/node/learning-workspace.test.ts`

- [ ] **Step 1: Write the failing Node test for role inference, target state, and snippet accumulation**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addSnippet,
  createImportedMaterialDraft,
  createInitialSubjectWorkspace,
  toggleMaterialBackgroundRole,
} from '../../src/lib/learning-workspace.ts';

test('createImportedMaterialDraft infers review-friendly defaults from source type', () => {
  const draft = createImportedMaterialDraft({
    subjectSlug: 'major-course',
    title: '高数期末复习课',
    source_type: 'ppt_md',
    full_content: '复习材料',
    filename: '高数期末复习课.pptx',
    detected_extension: '.pptx',
    converter_used: 'markitdown',
    import_summary: 'ok',
    warnings: [],
  });

  assert.equal(draft.primaryRole, 'review_slides');
  assert.deepEqual(draft.secondaryRoles, ['key_points']);
});

test('toggleMaterialBackgroundRole adds and removes target background assignment', () => {
  const workspace = createInitialSubjectWorkspace('advanced-math');
  workspace.materials.push({
    id: 'm1',
    subjectSlug: 'advanced-math',
    title: '2024 期末卷',
    sourceType: 'pdf_md',
    primaryRole: 'past_exam',
    secondaryRoles: [],
    fullContent: '试卷正文',
    filename: '2024.pdf',
    detectedExtension: '.pdf',
    converterUsed: 'markitdown',
    importSummary: 'ok',
    warnings: [],
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
  });

  const added = toggleMaterialBackgroundRole(workspace, 'm1', 'evidence');
  assert.equal(added.currentTarget.backgroundMaterialIds.length, 1);
  assert.equal(added.currentTarget.backgroundMaterialIds[0].backgroundRole, 'evidence');

  const removed = toggleMaterialBackgroundRole(added, 'm1');
  assert.equal(removed.currentTarget.backgroundMaterialIds.length, 0);
});

test('addSnippet appends unique snippets from the same material only', () => {
  const snippets = addSnippet([], {
    materialId: 'm1',
    text: '定义 1',
    anchorLabel: '第 1 段',
  });

  const duplicate = addSnippet(snippets, {
    materialId: 'm1',
    text: '定义 1',
    anchorLabel: '第 1 段',
  });

  assert.equal(duplicate.length, 1);
});
```

- [ ] **Step 2: Run the Node test to verify it fails**

Run:

```powershell
node --test --experimental-strip-types tests/node/learning-workspace.test.ts
```

Expected: FAIL because `src/lib/learning-workspace.ts` and `src/types/learning-workspace.ts` do not exist yet.

- [ ] **Step 3: Write minimal workspace types and pure helpers**

```ts
export type LearningMaterialRole =
  | 'textbook'
  | 'new_slides'
  | 'review_slides'
  | 'key_points'
  | 'exam_outline'
  | 'past_exam'
  | 'exercise_set'
  | 'review_notes';

export type BackgroundRole = 'standard' | 'evidence' | 'explanation';

export interface LearningMaterialRecord {
  id: string;
  subjectSlug: string;
  title: string;
  sourceType: 'pdf_md' | 'ppt_md' | 'note_md' | 'other_md';
  primaryRole: LearningMaterialRole;
  secondaryRoles: LearningMaterialRole[];
  fullContent: string;
  filename: string;
  detectedExtension: string;
  converterUsed: string;
  importSummary: string;
  warnings: string[];
  createdAt: number;
  updatedAt: number;
  lastReadAt: number | null;
}
```

```ts
export function createInitialSubjectWorkspace(subjectSlug: string) {
  return {
    subjectSlug,
    currentTarget: {
      id: 'default-target',
      title: '当前目标',
      backgroundMaterialIds: [],
    },
    materials: [],
  };
}
```

- [ ] **Step 4: Re-run the Node test and verify it passes**

Run:

```powershell
node --test --experimental-strip-types tests/node/learning-workspace.test.ts
```

Expected: PASS

---

### Task 2: Replace the fake subject shelf with a real client shelf backed by local state

**Files:**
- Create: `src/components/learning/SubjectShelfClient.tsx`
- Modify: `src/app/learn/[subject]/page.tsx`
- Modify: `src/app/api/learning-entry/import/route.ts`
- Modify: `src/types/learning-entry.ts`
- Modify: `src/types/pre-assessment.ts`
- Modify: `src/lib/learning-workspace.ts`

- [ ] **Step 1: Write a failing test for imported material draft defaults needed by the subject shelf**

Add to `tests/node/learning-workspace.test.ts`:

```ts
test('major-course imports default to current target friendly card metadata', () => {
  const draft = createImportedMaterialDraft({
    subjectSlug: 'major-course',
    title: '老师划重点',
    source_type: 'note_md',
    full_content: '重点内容',
    filename: '重点.md',
    detected_extension: '.md',
    converter_used: 'direct_text',
    import_summary: 'ok',
    warnings: [],
  });

  assert.equal(draft.primaryRole, 'key_points');
});
```

- [ ] **Step 2: Run the Node test to verify the new behavior is not implemented yet**

Run:

```powershell
node --test --experimental-strip-types tests/node/learning-workspace.test.ts
```

Expected: FAIL on the new assertion if role inference is incomplete.

- [ ] **Step 3: Implement the subject shelf client**

```tsx
export default function SubjectShelfClient({ subjectSlug, subjectInfo }: Props) {
  const [workspace, setWorkspace] = useState(() => loadSubjectWorkspace(subjectSlug));
  const [isImporting, setIsImporting] = useState(false);
  const [pendingBackgroundMaterialId, setPendingBackgroundMaterialId] = useState<string | null>(null);

  async function handleImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/learning-entry/import', { method: 'POST', body: formData });
    const payload = await response.json();
    setWorkspace((prev) => addImportedMaterial(prev, createImportedMaterialDraft({ subjectSlug, ...payload })));
  }
}
```

- [ ] **Step 4: Update the subject page to render the client shelf instead of static fake buckets**

```tsx
import SubjectShelfClient from '@/components/learning/SubjectShelfClient';

export default async function SubjectShelfPage({ params }: Props) {
  const { subject } = await params;
  const subjectInfo = subjectMap[subject as keyof typeof subjectMap];
  if (!subjectInfo) notFound();

  return <SubjectShelfClient subjectSlug={subject} subjectInfo={subjectInfo} />;
}
```

- [ ] **Step 5: Re-run the Node test and verify it passes**

Run:

```powershell
node --test --experimental-strip-types tests/node/learning-workspace.test.ts
```

Expected: PASS

---

### Task 3: Build the direct reading page with multi-snippet selection and target-aware Q&A

**Files:**
- Create: `src/app/learn/[subject]/[materialId]/page.tsx`
- Create: `src/components/learning/ReadingWorkspace.tsx`
- Create: `src/app/api/learning-chat/route.ts`
- Create: `src/types/learning-chat.ts`
- Modify: `src/lib/learning-workspace.ts`
- Modify: `tests/node/learning-workspace.test.ts`

- [ ] **Step 1: Write a failing test for snippet selection limits and dedupe**

Add to `tests/node/learning-workspace.test.ts`:

```ts
test('addSnippet keeps only snippets from the current material and trims empty selections', () => {
  const snippets = addSnippet([], {
    materialId: 'm1',
    text: '  定理 A  ',
    anchorLabel: '第 2 段',
  });

  const crossMaterial = addSnippet(snippets, {
    materialId: 'm2',
    text: '例题 B',
    anchorLabel: '第 8 段',
  });

  assert.equal(crossMaterial.length, 1);
  assert.equal(crossMaterial[0].text, '定理 A');
});
```

- [ ] **Step 2: Run the Node test to verify the current helper behavior fails**

Run:

```powershell
node --test --experimental-strip-types tests/node/learning-workspace.test.ts
```

Expected: FAIL if `addSnippet` still allows invalid or cross-material insertion.

- [ ] **Step 3: Implement the reading workspace and learning chat proxy**

```tsx
const selection = window.getSelection()?.toString().trim() ?? '';
if (selection) {
  setPendingSelection(selection);
}
```

```ts
const response = await fetch('/api/learning-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    material,
    selectedSnippets,
    currentTarget,
    backgroundMaterials,
    messages,
    provider: modelConfig.provider,
    model: modelConfig.model,
    api_key: modelConfig.api_key,
    base_url: modelConfig.base_url,
  }),
});
```

- [ ] **Step 4: Re-run the Node test and verify it passes**

Run:

```powershell
node --test --experimental-strip-types tests/node/learning-workspace.test.ts
```

Expected: PASS

---

### Task 4: Add backend learning chat and on-demand pre-assessment support for the reading page

**Files:**
- Create: `api/models/learning_chat.py`
- Create: `api/routes/learning_chat.py`
- Create: `api/services/learning_chat.py`
- Modify: `api/api.py`
- Modify: `api/prompts.py`
- Modify: `src/components/learning/ReadingWorkspace.tsx`

- [ ] **Step 1: Write the failing backend unit test for prompt assembly**

Create `tests/unit/test_learning_chat_service.py`:

```python
from api.services.learning_chat import build_learning_chat_prompt


def test_build_learning_chat_prompt_includes_target_background_and_profile():
    prompt = build_learning_chat_prompt(
        material_title="高数复习课",
        material_content="正文",
        selected_snippets=["定义A", "例题B"],
        current_target_title="高数下期末",
        background_summaries=["[标准类] 考纲", "[证据类] 2024期末卷"],
        profile_context="[User Profile]\\n先骨架后深入",
        messages=[{"role": "user", "content": "这两段为什么联系起来？"}],
    )

    assert "高数下期末" in prompt
    assert "定义A" in prompt
    assert "2024期末卷" in prompt
    assert "先骨架后深入" in prompt
```

- [ ] **Step 2: Run the backend unit test to verify it fails before implementation**

Run:

```powershell
python tests/run_tests.py --unit
```

Expected: FAIL because `api.services.learning_chat` does not exist yet.

- [ ] **Step 3: Implement the learning chat prompt builder and route**

```python
def build_learning_chat_prompt(...):
    return f"""{LEARNING_CHAT_SYSTEM_PROMPT}

<CURRENT_TARGET>
{current_target_title}
</CURRENT_TARGET>

<BACKGROUND>
{chr(10).join(background_summaries)}
</BACKGROUND>

<SELECTED_SNIPPETS>
{chr(10).join(selected_snippets)}
</SELECTED_SNIPPETS>
"""
```

- [ ] **Step 4: Re-run backend unit tests and verify the new path passes**

Run:

```powershell
python tests/run_tests.py --unit
```

Expected: PASS for the new learning chat test and no regression in existing unit tests.

---

### Task 5: Verify the end-to-end V1 shell

**Files:**
- Modify: `docs/active/handoff.md`
- Modify: `docs/active/current-focus.md`

- [ ] **Step 1: Run frontend lint or type verification for touched files**

Run one of:

```powershell
cmd /c npm run build
```

or, if build is too heavy,

```powershell
node --test --experimental-strip-types tests/node/learning-workspace.test.ts
python tests/run_tests.py --unit
```

Expected: No failures in touched logic paths.

- [ ] **Step 2: Manually verify the shelf and reading loop**

Manual checklist:

```text
1. 进入 /learn/[subject] 后能看到真实资料卡，而不是只有静态说明。
2. 导入文件后资料卡立即出现，并展示主定位/辅助定位/背景状态。
3. 点击资料卡直接进入 /learn/[subject]/[materialId] 正文阅读页。
4. 阅读页里可添加多处当前资料选区。
5. 切换背景资料后，右侧问答区能显示背景已参与。
6. 顶部 pre-assessment 按钮能按当前资料触发短判断。
```

- [ ] **Step 3: Update active docs with real implementation status**

Add a short note to `docs/active/handoff.md` summarizing:

```md
- V1 reading shell implemented: subject shelf is now stateful, cards open direct reading, and reading Q&A consumes snippets + target background + profile context.
```

---

Plan saved for inline execution. Because the user explicitly asked to enter implementation, proceed with inline execution unless a blocker appears.
