import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../domain';
import { configuredProviderLabel, selectModel } from './model-selection';

describe('model selection', () => {
  it('requires the selected provider API key', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.aiProvider = 'openai';

    expect(() => selectModel(settings)).toThrow('Set the openai API key');
    expect(configuredProviderLabel(settings)).toBe('openai (not configured)');
  });

  it('uses the selected provider default model when no model override is set', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.aiProvider = 'google';
    settings.aiApiKey = 'test-key';

    expect(selectModel(settings)).toMatchObject({
      provider: 'google',
      modelId: 'gemini-2.0-flash'
    });
  });

  it('uses the optional model override when set', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.aiProvider = 'anthropic';
    settings.aiApiKey = 'test-key';
    settings.aiModelId = 'claude-custom';

    expect(selectModel(settings)).toMatchObject({
      provider: 'anthropic',
      modelId: 'claude-custom'
    });
  });
});
