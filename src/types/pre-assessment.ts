export type SourceType = "pdf_md" | "ppt_md" | "note_md" | "other_md";
export type ReadinessLevel = "ready" | "needs_preparation" | "not_now";
export type ConfidenceLevel = "high" | "medium" | "low";
export type EvidenceSource = "material" | "profile" | "both";
export type ProfileSuggestionType =
  | "possible_gap"
  | "learning_preference"
  | "workflow_signal"
  | "strength";

export interface PreAssessmentRequest {
  source_type: SourceType;
  title: string;
  full_content: string;
  selected_excerpt?: string;
  excerpt_context_before?: string;
  excerpt_context_after?: string;
  user_goal_hint?: string;
  profile_overrides: Record<string, unknown>;
  provider?: string;
  model?: string;
  api_key?: string;
  base_url?: string;
}

export interface ReadinessAssessment {
  level: ReadinessLevel;
  confidence: ConfidenceLevel;
  summary: string;
}

export interface BlockingGap {
  concept: string;
  why_it_blocks: string;
  evidence_source: EvidenceSource;
  suggested_preparation: string;
}

export interface CoreFrame {
  what_this_material_is_really_about: string;
  key_axes: string[];
  what_is_foundational: string[];
  what_is_detail_or_later: string[];
}

export interface ReadingStrategy {
  focus_first: string[];
  skim_or_skip_for_now: string[];
  questions_to_keep_in_mind: string[];
}

export interface EvidenceNote {
  claim: string;
  basis: string;
}

export interface ProfileUpdateSuggestion {
  type: ProfileSuggestionType;
  content: string;
}

export interface PreAssessmentResponse {
  readiness: ReadinessAssessment;
  blocking_gaps: BlockingGap[];
  core_frame: CoreFrame;
  reading_strategy: ReadingStrategy;
  evidence_notes: EvidenceNote[];
  profile_update_suggestions: ProfileUpdateSuggestion[];
}
