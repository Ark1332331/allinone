import type {
  BackgroundMaterialAssignment,
  BackgroundRole,
  ImportedMaterialDraftInput,
  LearningMaterialRecord,
  LearningMaterialRole,
  ReadingSnippet,
  ReadingViewMode,
  SubjectWorkspace,
} from '@/types/learning-workspace';
import type { LearningChatMessage } from '@/types/learning-chat';
import type { LearningEntryImportResponse } from '@/types/learning-entry';

const DEFAULT_TARGET_TITLE = '当前目标';
const STORAGE_PREFIX = 'allinone-subject-workspace';

function getExtensionFromFilename(filename: string) {
  const extension = filename.includes('.')
    ? `.${filename.split('.').pop() ?? ''}`.toLowerCase()
    : '';
  return extension || '.pdf';
}

function getTitleFromFilename(filename: string) {
  const cleanName = filename.trim() || '未命名资料';
  return cleanName.replace(/\.[^.]+$/, '') || cleanName;
}

function getDefaultReadingViewMode(
  sourceType: ImportedMaterialDraftInput['source_type']
): ReadingViewMode {
  return sourceType === 'note_md' || sourceType === 'other_md'
    ? 'structured'
    : 'original';
}

function inferRoles(
  subjectSlug: string,
  sourceType: ImportedMaterialDraftInput['source_type'],
  title: string
): {
  primaryRole: LearningMaterialRole;
  secondaryRoles: LearningMaterialRole[];
} {
  const loweredTitle = title.toLowerCase();

  if (sourceType === 'ppt_md') {
    if (
      loweredTitle.includes('复习') ||
      loweredTitle.includes('重点') ||
      loweredTitle.includes('期末')
    ) {
      return {
        primaryRole: 'review_slides',
        secondaryRoles: ['key_points'],
      };
    }

    return {
      primaryRole: 'new_slides',
      secondaryRoles: [],
    };
  }

  if (sourceType === 'pdf_md') {
    if (loweredTitle.includes('卷') || loweredTitle.includes('exam')) {
      return {
        primaryRole: 'past_exam',
        secondaryRoles: [],
      };
    }

    return {
      primaryRole: subjectSlug === 'major-course' ? 'review_notes' : 'textbook',
      secondaryRoles: [],
    };
  }

  if (sourceType === 'note_md') {
    if (
      subjectSlug === 'major-course' &&
      (loweredTitle.includes('重点') || loweredTitle.includes('提纲'))
    ) {
      return {
        primaryRole: 'key_points',
        secondaryRoles: [],
      };
    }

    return {
      primaryRole: 'review_notes',
      secondaryRoles: [],
    };
  }

  return {
    primaryRole: 'review_notes',
    secondaryRoles: [],
  };
}

export function createInitialSubjectWorkspace(
  subjectSlug: SubjectWorkspace['subjectSlug']
): SubjectWorkspace {
  return {
    subjectSlug,
    currentTarget: {
      id: 'default-target',
      title: DEFAULT_TARGET_TITLE,
      backgroundMaterials: [],
    },
    materials: [],
  };
}

export function createOriginalFileImportResponse(input: {
  filename: string;
  mimeType?: string;
}): LearningEntryImportResponse {
  const filename = input.filename.trim() || '未命名资料.pdf';
  const extension = getExtensionFromFilename(filename);

  return {
    title: getTitleFromFilename(filename),
    source_type: extension === '.pdf' ? 'pdf_md' : 'other_md',
    full_content:
      `原文件：${filename}\n\n` +
      '这份材料以原文件优先模式快速导入，尚未生成结构化文本。' +
      '你可以先在原文件阅读器中查看、框选截图并提问。',
    filename,
    mime_type: input.mimeType,
    detected_extension: extension,
    converter_used: 'original_file',
    import_summary: '已跳过结构化文本转换，优先进入原文件阅读。',
    warnings: ['尚未生成结构化文本；前置评估和全文上下文能力会受限。'],
  };
}

export function migrateSubjectWorkspace(
  workspace: SubjectWorkspace,
  nextSubjectSlug: string,
  nextSubjectTitle?: string
): SubjectWorkspace {
  return {
    ...workspace,
    subjectSlug: nextSubjectSlug,
    subjectTitle: nextSubjectTitle ?? workspace.subjectTitle,
    materials: workspace.materials.map((material) => ({
      ...material,
      subjectSlug: nextSubjectSlug,
    })),
  };
}

export function createImportedMaterialDraft(
  input: ImportedMaterialDraftInput
): LearningMaterialRecord {
  const now = Date.now();
  const roles = inferRoles(input.subjectSlug, input.source_type, input.title);
  const idSubjectSlug = input.subjectSlug.replace(/[^a-zA-Z0-9_-]+/g, '-');

  return {
    id: `${idSubjectSlug}-${now}-${Math.random().toString(36).slice(2, 8)}`,
    subjectSlug: input.subjectSlug,
    title: input.title,
    sourceType: input.source_type,
    preferredViewMode: getDefaultReadingViewMode(input.source_type),
    primaryRole: roles.primaryRole,
    secondaryRoles: roles.secondaryRoles,
    fullContent: input.full_content,
    filename: input.filename,
    mimeType: input.mime_type,
    detectedExtension: input.detected_extension,
    converterUsed: input.converter_used,
    importSummary: input.import_summary,
    warnings: input.warnings,
    createdAt: now,
    updatedAt: now,
    lastReadAt: null,
    latestPreAssessment: null,
  };
}

export function toggleMaterialBackgroundRole(
  workspace: SubjectWorkspace,
  materialId: string,
  backgroundRole?: BackgroundRole
): SubjectWorkspace {
  const existing = workspace.currentTarget.backgroundMaterials.find(
    (item) => item.materialId === materialId
  );

  let nextBackgrounds: BackgroundMaterialAssignment[];

  if (existing) {
    nextBackgrounds = workspace.currentTarget.backgroundMaterials.filter(
      (item) => item.materialId !== materialId
    );
  } else if (backgroundRole) {
    nextBackgrounds = [
      ...workspace.currentTarget.backgroundMaterials,
      { materialId, backgroundRole },
    ];
  } else {
    nextBackgrounds = workspace.currentTarget.backgroundMaterials;
  }

  return {
    ...workspace,
    currentTarget: {
      ...workspace.currentTarget,
      backgroundMaterials: nextBackgrounds,
    },
  };
}

export function updateCurrentTargetTitle(
  workspace: SubjectWorkspace,
  title: string
): SubjectWorkspace {
  const nextTitle = title.trim() || DEFAULT_TARGET_TITLE;

  return {
    ...workspace,
    currentTarget: {
      ...workspace.currentTarget,
      title: nextTitle,
    },
  };
}

export function addSnippet(
  snippets: ReadingSnippet[],
  nextSnippet: ReadingSnippet
): ReadingSnippet[] {
  const text = nextSnippet.text.trim();
  const anchorLabel = nextSnippet.anchorLabel.trim();

  if (!text || !anchorLabel) {
    return snippets;
  }

  if (
    snippets.some(
      (snippet) =>
        snippet.materialId === nextSnippet.materialId && snippet.text === text
    )
  ) {
    return snippets;
  }

  if (
    snippets.length > 0 &&
    snippets.some((snippet) => snippet.materialId !== nextSnippet.materialId)
  ) {
    return snippets;
  }

  return [
    ...snippets,
    {
      id: nextSnippet.id ?? `snippet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      materialId: nextSnippet.materialId,
      text,
      anchorLabel,
      source: nextSnippet.source,
      imageDataUrl: nextSnippet.imageDataUrl,
      pageNumber: nextSnippet.pageNumber,
      region: nextSnippet.region,
      messages: nextSnippet.messages,
    },
  ];
}

export function getMaterialSnippetHistory(
  workspace: SubjectWorkspace,
  materialId: string
): ReadingSnippet[] {
  const material = getMaterialById(workspace, materialId);
  const snippets = material?.savedSnippets ?? [];

  return snippets.filter((snippet) => (snippet.messages ?? []).length > 0).sort((left, right) => {
    const leftPage = left.pageNumber ?? Number.MAX_SAFE_INTEGER;
    const rightPage = right.pageNumber ?? Number.MAX_SAFE_INTEGER;
    if (leftPage !== rightPage) {
      return leftPage - rightPage;
    }

    const leftY = left.region?.y ?? Number.MAX_SAFE_INTEGER;
    const rightY = right.region?.y ?? Number.MAX_SAFE_INTEGER;
    if (leftY !== rightY) {
      return leftY - rightY;
    }

    const leftX = left.region?.x ?? Number.MAX_SAFE_INTEGER;
    const rightX = right.region?.x ?? Number.MAX_SAFE_INTEGER;
    return leftX - rightX;
  });
}

export function removeSnippetAtIndex(
  snippets: ReadingSnippet[],
  indexToRemove: number
): ReadingSnippet[] {
  return snippets.filter((_, index) => index !== indexToRemove);
}

export function addImportedMaterial(
  workspace: SubjectWorkspace,
  material: LearningMaterialRecord
): SubjectWorkspace {
  return {
    ...workspace,
    materials: [material, ...workspace.materials],
  };
}

export function removeMaterial(
  workspace: SubjectWorkspace,
  materialId: string
): SubjectWorkspace {
  return {
    ...workspace,
    currentTarget: {
      ...workspace.currentTarget,
      backgroundMaterials: workspace.currentTarget.backgroundMaterials.filter(
        (item) => item.materialId !== materialId
      ),
    },
    materials: workspace.materials.filter((material) => material.id !== materialId),
  };
}

export function getMaterialById(
  workspace: SubjectWorkspace,
  materialId: string
): LearningMaterialRecord | null {
  return workspace.materials.find((material) => material.id === materialId) ?? null;
}

export function markMaterialRead(
  workspace: SubjectWorkspace,
  materialId: string,
  readAt = Date.now()
): SubjectWorkspace {
  return {
    ...workspace,
    materials: workspace.materials.map((material) =>
      material.id === materialId
        ? {
            ...material,
            lastReadAt: readAt,
            updatedAt: readAt,
          }
        : material
    ),
  };
}

export function updateMaterialPreAssessment(
  workspace: SubjectWorkspace,
  materialId: string,
  preAssessment: LearningMaterialRecord['latestPreAssessment']
): SubjectWorkspace {
  const updatedAt = Date.now();

  return {
    ...workspace,
    materials: workspace.materials.map((material) =>
      material.id === materialId
        ? {
            ...material,
            latestPreAssessment: preAssessment ?? null,
            updatedAt,
          }
        : material
    ),
  };
}

export function updateMaterialPreferredViewMode(
  workspace: SubjectWorkspace,
  materialId: string,
  preferredViewMode: ReadingViewMode
): SubjectWorkspace {
  const updatedAt = Date.now();

  return {
    ...workspace,
    materials: workspace.materials.map((material) =>
      material.id === materialId
        ? {
            ...material,
            preferredViewMode,
            updatedAt,
          }
        : material
    ),
  };
}

export function updateMaterialStudyState(
  workspace: SubjectWorkspace,
  materialId: string,
  updates: {
    savedSnippets?: ReadingSnippet[];
    chatHistory?: LearningChatMessage[];
  }
): SubjectWorkspace {
  const updatedAt = Date.now();

  return {
    ...workspace,
    materials: workspace.materials.map((material) =>
      material.id === materialId
        ? {
            ...material,
            savedSnippets:
              updates.savedSnippets !== undefined
                ? updates.savedSnippets
                : material.savedSnippets ?? [],
            chatHistory:
              updates.chatHistory !== undefined
                ? updates.chatHistory
                : material.chatHistory ?? [],
            updatedAt,
          }
        : material
    ),
  };
}

function getStorageKey(subjectSlug: string) {
  return `${STORAGE_PREFIX}:${subjectSlug}`;
}

export function saveSubjectWorkspace(workspace: SubjectWorkspace): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getStorageKey(workspace.subjectSlug),
    JSON.stringify(workspace)
  );
}

export function loadSubjectWorkspace(subjectSlug: string): SubjectWorkspace {
  if (typeof window === 'undefined') {
    return createInitialSubjectWorkspace(subjectSlug);
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(subjectSlug));
    if (!raw) {
      return createInitialSubjectWorkspace(subjectSlug);
    }

    const parsed = JSON.parse(raw) as SubjectWorkspace;
    return {
      ...createInitialSubjectWorkspace(subjectSlug),
      ...parsed,
      subjectSlug,
      subjectTitle: parsed.subjectTitle,
      currentTarget: {
        ...createInitialSubjectWorkspace(subjectSlug).currentTarget,
        ...parsed.currentTarget,
        backgroundMaterials: parsed.currentTarget?.backgroundMaterials ?? [],
      },
      materials:
        parsed.materials?.map((material) => ({
          ...material,
          preferredViewMode:
            material.preferredViewMode ??
            getDefaultReadingViewMode(material.sourceType),
          savedSnippets: material.savedSnippets ?? [],
          chatHistory: material.chatHistory ?? [],
        })) ?? [],
    };
  } catch {
    return createInitialSubjectWorkspace(subjectSlug);
  }
}
