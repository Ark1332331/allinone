export interface PersistedModelConfig {
  provider: string;
  model: string;
  base_url: string;
  api_key: string;
}

export interface ModelConfigPreset extends PersistedModelConfig {
  id: string;
  name: string;
  updatedAt: number;
}

export const MODEL_CONFIG_STORAGE_KEY = 'deepwikiDefaultModelConfig';
export const MODEL_CONFIG_PRESETS_STORAGE_KEY = 'deepwikiModelConfigPresets';
export const ACTIVE_MODEL_CONFIG_PRESET_KEY = 'deepwikiActiveModelConfigPresetId';
export const MODEL_CONFIG_UPDATED_EVENT = 'deepwiki:model-config-updated';

export const DEFAULT_MODEL_CONFIG: PersistedModelConfig = {
  provider: 'openai',
  model: 'deepseek-chat',
  base_url: '',
  api_key: '',
};

export function normalizeModelConfig(
  config?: Partial<PersistedModelConfig> | null
): PersistedModelConfig {
  return {
    provider:
      typeof config?.provider === 'string' && config.provider.trim()
        ? config.provider.trim()
        : DEFAULT_MODEL_CONFIG.provider,
    model:
      typeof config?.model === 'string'
        ? config.model.trim()
        : DEFAULT_MODEL_CONFIG.model,
    base_url:
      typeof config?.base_url === 'string'
        ? config.base_url.trim()
        : DEFAULT_MODEL_CONFIG.base_url,
    api_key:
      typeof config?.api_key === 'string'
        ? config.api_key.trim()
        : DEFAULT_MODEL_CONFIG.api_key,
  };
}

export function loadModelConfig(): PersistedModelConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_MODEL_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(MODEL_CONFIG_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_MODEL_CONFIG;
    }

    return normalizeModelConfig(JSON.parse(raw) as Partial<PersistedModelConfig>);
  } catch (error) {
    console.error('Failed to load model config from localStorage:', error);
    return DEFAULT_MODEL_CONFIG;
  }
}

export function saveModelConfig(config: Partial<PersistedModelConfig>): PersistedModelConfig {
  const normalized = normalizeModelConfig(config);

  if (typeof window === 'undefined') {
    return normalized;
  }

  try {
    window.localStorage.setItem(MODEL_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(
      new CustomEvent(MODEL_CONFIG_UPDATED_EVENT, {
        detail: normalized,
      })
    );
  } catch (error) {
    console.error('Failed to save model config to localStorage:', error);
  }

  return normalized;
}

function createPresetId() {
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePreset(
  preset: Partial<ModelConfigPreset> & { name?: string }
): ModelConfigPreset {
  const config = normalizeModelConfig(preset);
  return {
    ...config,
    id:
      typeof preset.id === 'string' && preset.id.trim()
        ? preset.id.trim()
        : createPresetId(),
    name:
      typeof preset.name === 'string' && preset.name.trim()
        ? preset.name.trim()
        : `${config.provider} / ${config.model || '未命名模型'}`,
    updatedAt:
      typeof preset.updatedAt === 'number' && Number.isFinite(preset.updatedAt)
        ? preset.updatedAt
        : Date.now(),
  };
}

export function loadModelConfigPresets(): ModelConfigPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(MODEL_CONFIG_PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Array<Partial<ModelConfigPreset>>;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((preset) => normalizePreset(preset));
  } catch (error) {
    console.error('Failed to load model config presets from localStorage:', error);
    return [];
  }
}

function persistModelConfigPresets(presets: ModelConfigPreset[]): ModelConfigPreset[] {
  if (typeof window === 'undefined') {
    return presets;
  }

  try {
    window.localStorage.setItem(
      MODEL_CONFIG_PRESETS_STORAGE_KEY,
      JSON.stringify(presets)
    );
  } catch (error) {
    console.error('Failed to save model config presets to localStorage:', error);
  }

  return presets;
}

export function saveModelConfigPreset(
  preset: Partial<ModelConfigPreset> & { name: string }
): ModelConfigPreset {
  const normalized = normalizePreset({
    ...preset,
    updatedAt: Date.now(),
  });
  const presets = loadModelConfigPresets();
  const existingIndex = presets.findIndex((item) => item.id === normalized.id);
  const nextPresets =
    existingIndex >= 0
      ? presets.map((item, index) => (index === existingIndex ? normalized : item))
      : [...presets, normalized];

  persistModelConfigPresets(nextPresets);
  return normalized;
}

export function activateModelConfigPreset(presetId: string): ModelConfigPreset | null {
  const preset = loadModelConfigPresets().find((item) => item.id === presetId);
  if (!preset) {
    return null;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACTIVE_MODEL_CONFIG_PRESET_KEY, preset.id);
  }
  saveModelConfig(preset);
  return preset;
}

export function getActiveModelConfigPresetId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(ACTIVE_MODEL_CONFIG_PRESET_KEY) ?? '';
}

export function deleteModelConfigPreset(presetId: string): ModelConfigPreset[] {
  const nextPresets = loadModelConfigPresets().filter(
    (preset) => preset.id !== presetId
  );
  persistModelConfigPresets(nextPresets);

  if (
    typeof window !== 'undefined' &&
    window.localStorage.getItem(ACTIVE_MODEL_CONFIG_PRESET_KEY) === presetId
  ) {
    window.localStorage.removeItem(ACTIVE_MODEL_CONFIG_PRESET_KEY);
  }

  return nextPresets;
}
