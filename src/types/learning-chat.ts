import type { BackgroundRole, LearningMaterialRecord, ReadingSnippet } from '@/types/learning-workspace';

export interface LearningChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LearningChatRequest {
  material: Pick<LearningMaterialRecord, 'id' | 'title' | 'primaryRole' | 'fullContent'>;
  selected_snippets: ReadingSnippet[];
  current_target: {
    title: string;
    backgroundMaterials: Array<{
      materialId: string;
      backgroundRole: BackgroundRole;
    }>;
  };
  background_materials: Array<
    Pick<LearningMaterialRecord, 'id' | 'title' | 'primaryRole' | 'fullContent'>
  >;
  messages: LearningChatMessage[];
  provider?: string;
  model?: string;
  api_key?: string;
  base_url?: string;
}

export interface LearningChatResponse {
  answer: string;
}
