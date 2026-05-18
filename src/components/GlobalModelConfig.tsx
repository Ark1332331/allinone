'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  activateModelConfigPreset,
  DEFAULT_MODEL_CONFIG,
  deleteModelConfigPreset,
  getActiveModelConfigPresetId,
  loadModelConfig,
  loadModelConfigPresets,
  MODEL_CONFIG_UPDATED_EVENT,
  normalizeModelConfig,
  saveModelConfig,
  saveModelConfigPreset,
  type ModelConfigPreset,
  type PersistedModelConfig,
} from '@/lib/model-config';

function getSummaryLabel(config: PersistedModelConfig) {
  const provider = config.provider || DEFAULT_MODEL_CONFIG.provider;
  const model = config.model || '未设置模型';
  return `${provider} / ${model}`;
}

export default function GlobalModelConfig() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState<PersistedModelConfig>(DEFAULT_MODEL_CONFIG);
  const [presets, setPresets] = useState<ModelConfigPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState('');
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    setConfig(loadModelConfig());
    setPresets(loadModelConfigPresets());
    setActivePresetId(getActiveModelConfigPresetId());

    const syncConfig = (event?: Event) => {
      const customEvent = event as CustomEvent<PersistedModelConfig> | undefined;
      if (customEvent?.detail) {
        setConfig(normalizeModelConfig(customEvent.detail));
        setPresets(loadModelConfigPresets());
        setActivePresetId(getActiveModelConfigPresetId());
        return;
      }
      setConfig(loadModelConfig());
      setPresets(loadModelConfigPresets());
      setActivePresetId(getActiveModelConfigPresetId());
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      MODEL_CONFIG_UPDATED_EVENT,
      syncConfig as EventListener
    );
    window.addEventListener('storage', syncConfig);
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener(
        MODEL_CONFIG_UPDATED_EVENT,
        syncConfig as EventListener
      );
      window.removeEventListener('storage', syncConfig);
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const summaryLabel = useMemo(() => getSummaryLabel(config), [config]);

  const updateField = <K extends keyof PersistedModelConfig>(
    key: K,
    value: PersistedModelConfig[K]
  ) => {
    const next = normalizeModelConfig({
      ...config,
      [key]: value,
    });
    setConfig(next);
    saveModelConfig(next);
  };

  const refreshPresets = () => {
    setPresets(loadModelConfigPresets());
    setActivePresetId(getActiveModelConfigPresetId());
  };

  const handleActivatePreset = (presetId: string) => {
    if (!presetId) {
      setActivePresetId('');
      return;
    }

    const activated = activateModelConfigPreset(presetId);
    if (activated) {
      setConfig(activated);
      setPresetName(activated.name);
      refreshPresets();
    }
  };

  const saveAsPreset = () => {
    const preset = saveModelConfigPreset({
      ...config,
      name: presetName || getSummaryLabel(config),
    });
    activateModelConfigPreset(preset.id);
    setPresetName(preset.name);
    setConfig(preset);
    refreshPresets();
  };

  const updateActivePreset = () => {
    const activePreset = presets.find((preset) => preset.id === activePresetId);
    if (!activePreset) {
      saveAsPreset();
      return;
    }

    const preset = saveModelConfigPreset({
      ...config,
      id: activePreset.id,
      name: presetName || activePreset.name,
    });
    activateModelConfigPreset(preset.id);
    setPresetName(preset.name);
    setConfig(preset);
    refreshPresets();
  };

  const removeActivePreset = () => {
    if (!activePresetId) {
      return;
    }

    const nextPresets = deleteModelConfigPreset(activePresetId);
    setPresets(nextPresets);
    setActivePresetId('');
    setPresetName('');
  };

  const resetDefaults = () => {
    setConfig(DEFAULT_MODEL_CONFIG);
    saveModelConfig(DEFAULT_MODEL_CONFIG);
    setActivePresetId('');
    setPresetName('');
  };

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
      <div ref={containerRef} className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label="打开模型配置"
          className="flex min-h-11 items-center gap-3 rounded-full border border-[var(--border-color)] bg-[var(--card-bg)]/96 px-4 py-2 text-left shadow-custom backdrop-blur-md transition hover:border-[var(--accent-primary)]/45"
        >
          <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]" />
          <span className="hidden text-xs font-medium text-[var(--muted)] sm:block">
            模型配置
          </span>
          <span className="max-w-[11rem] truncate text-sm font-medium text-[var(--foreground)]">
            {summaryLabel}
          </span>
        </button>

        {isOpen ? (
          <div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-1.5rem))] rounded-[24px] border border-[var(--border-color)] bg-[var(--card-bg)]/98 p-4 shadow-custom backdrop-blur-xl">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                模型配置
              </p>
              <p className="text-xs leading-5 text-[var(--muted)]">
                这里的配置会全局保存。学习入口、前置评估和正文追问都会优先使用这一套模型设置。
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  配置档案
                </span>
                <select
                  className="input-japanese min-h-11 w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={activePresetId}
                  onChange={(event) => handleActivatePreset(event.target.value)}
                >
                  <option value="">当前未绑定保存档案</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  档案名称
                </span>
                <input
                  className="input-japanese min-h-11 w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="例如：DeepSeek 默认 / MiMo 2.5"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Provider
                </span>
                <select
                  className="input-japanese min-h-11 w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={config.provider}
                  onChange={(event) => updateField('provider', event.target.value)}
                >
                  <option value="openai">openai / openai-compatible</option>
                  <option value="google">google</option>
                  <option value="copilot_proxy">copilot_proxy</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Model
                </span>
                <input
                  className="input-japanese min-h-11 w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={config.model}
                  onChange={(event) => updateField('model', event.target.value)}
                  placeholder="deepseek-chat / gpt-4o / gemini-2.5-flash"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Base URL
                </span>
                <input
                  className="input-japanese min-h-11 w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                  value={config.base_url}
                  onChange={(event) => updateField('base_url', event.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  API Key
                </span>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="input-japanese min-h-11 w-full rounded-2xl px-4 py-3 text-[var(--foreground)]"
                    value={config.api_key}
                    onChange={(event) => updateField('api_key', event.target.value)}
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((prev) => !prev)}
                    className="min-h-11 shrink-0 rounded-2xl border border-[var(--border-color)] px-4 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                  >
                    {showApiKey ? '隐藏' : '显示'}
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveAsPreset}
                className="btn-japanese inline-flex items-center justify-center rounded-full px-4 py-2 text-sm"
              >
                保存为新档案
              </button>
              <button
                type="button"
                onClick={updateActivePreset}
                className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                更新当前档案
              </button>
              <button
                type="button"
                onClick={removeActivePreset}
                disabled={!activePresetId}
                className="rounded-full border border-rose-500/25 px-4 py-2 text-sm text-rose-700 transition hover:border-rose-500 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300"
              >
                删除档案
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--muted)]">
                保存成档案后，下次只需从下拉框切换。
              </p>
              <button
                type="button"
                onClick={resetDefaults}
                className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              >
                恢复默认
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
