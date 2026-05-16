export type AssistantMemoryPurpose = 'general' | 'pre_assessment';

export interface AssistantMemorySection {
  key: string;
  label: string;
  description: string;
  path: string;
  char_count: number;
}

export interface AssistantMemoryContextResponse {
  purpose: AssistantMemoryPurpose;
  summary: string;
  context_text: string;
  sections: AssistantMemorySection[];
}
