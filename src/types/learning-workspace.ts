import type { LearningEntryImportResponse } from '@/types/learning-entry';
import type { LearningChatMessage } from '@/types/learning-chat';
import type { PreAssessmentResponse } from '@/types/pre-assessment';

export type SubjectSlug =
  | 'advanced-math'
  | 'probability'
  | 'deep-learning'
  | 'major-course';

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

export type ReadingViewMode = 'structured' | 'original';
export type ReadingSnippetSource =
  | 'text'
  | 'pdf_text'
  | 'pdf_screenshot'
  | 'assistant_reply';

export interface ReadingSnippetRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReadingSnippet {
  id?: string;
  materialId: string;
  text: string;
  anchorLabel: string;
  source?: ReadingSnippetSource;
  parentSnippetId?: string;
  imageDataUrl?: string;
  pageNumber?: number;
  region?: ReadingSnippetRegion;
  messages?: LearningChatMessage[];
}

export interface BackgroundMaterialAssignment {
  materialId: string;
  backgroundRole: BackgroundRole;
}

export interface LearningTarget {
  id: string;
  title: string;
  backgroundMaterials: BackgroundMaterialAssignment[];
}

export interface LearningMaterialRecord {
  id: string;
  subjectSlug: SubjectSlug | string;
  title: string;
  sourceType: LearningEntryImportResponse['source_type'];
  preferredViewMode: ReadingViewMode;
  primaryRole: LearningMaterialRole;
  secondaryRoles: LearningMaterialRole[];
  fullContent: string;
  filename: string;
  mimeType?: string;
  detectedExtension: string;
  converterUsed: string;
  importSummary: string;
  warnings: string[];
  createdAt: number;
  updatedAt: number;
  lastReadAt: number | null;
  latestPreAssessment?: PreAssessmentResponse | null;
  savedSnippets?: ReadingSnippet[];
  chatHistory?: LearningChatMessage[];
}

export interface SubjectWorkspace {
  subjectSlug: SubjectSlug | string;
  subjectTitle?: string;
  currentTarget: LearningTarget;
  materials: LearningMaterialRecord[];
}

export interface ImportedMaterialDraftInput
  extends Omit<LearningEntryImportResponse, 'mime_type'> {
  subjectSlug: SubjectSlug | string;
  mime_type?: string;
}
