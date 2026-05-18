import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activateModelConfigPreset,
  loadModelConfig,
  loadModelConfigPresets,
  saveModelConfigPreset,
} from '../../src/lib/model-config.ts';

function installLocalStorage() {
  const store = new Map<string, string>();
  const windowStub = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    dispatchEvent: () => true,
  };

  Object.defineProperty(globalThis, 'window', {
    value: windowStub,
    configurable: true,
  });
}

test('model config presets can be saved and activated without refilling fields', () => {
  installLocalStorage();

  const deepseek = saveModelConfigPreset({
    name: 'DeepSeek 默认',
    provider: 'openai',
    model: 'deepseek-chat',
    base_url: 'https://api.deepseek.com/v1',
    api_key: 'sk-deepseek',
  });
  const mimo = saveModelConfigPreset({
    name: 'MiMo 2.5',
    provider: 'openai',
    model: 'mimo-v2.5',
    base_url: 'https://api.example.com/v1',
    api_key: 'sk-mimo',
  });

  assert.deepEqual(
    loadModelConfigPresets().map((preset) => preset.name),
    ['DeepSeek 默认', 'MiMo 2.5']
  );

  activateModelConfigPreset(deepseek.id);
  assert.equal(loadModelConfig().model, 'deepseek-chat');

  activateModelConfigPreset(mimo.id);
  assert.deepEqual(loadModelConfig(), {
    provider: 'openai',
    model: 'mimo-v2.5',
    base_url: 'https://api.example.com/v1',
    api_key: 'sk-mimo',
  });
});
