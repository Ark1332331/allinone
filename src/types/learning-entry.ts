import type { SourceType } from '@/types/pre-assessment';

export interface LearningEntryImportResponse {
  title: string;
  source_type: SourceType;
  full_content: string;
  filename: string;
  mime_type?: string;
  detected_extension: string;
  converter_used: string;
  import_summary: string;
  warnings: string[];
}
