import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import type { ModelConfiguration, SupportedProvider, VideoToObsidianSettings } from './domain';

const DEFAULT_MODEL_IDS: Record<SupportedProvider, string> = {
  mistral: 'mistral-small-latest',
  google: 'gemini-2.0-flash',
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini'
};

export function selectModel(settings: VideoToObsidianSettings): ModelConfiguration {
  const provider = settings.aiProvider;
  const apiKey = settings.aiApiKey.trim();
  const modelId = settings.aiModelId.trim() || DEFAULT_MODEL_IDS[provider];

  if (!apiKey) {
    throw new Error(`Set the ${provider} API key in the plugin settings.`);
  }

  switch (provider) {
    case 'mistral': {
      const instance = createMistral({ apiKey });
      return { provider, modelId, model: instance(modelId) };
    }
    case 'google': {
      const instance = createGoogleGenerativeAI({ apiKey });
      return { provider, modelId, model: instance(modelId) };
    }
    case 'anthropic': {
      const instance = createAnthropic({ apiKey });
      return { provider, modelId, model: instance(modelId) };
    }
    case 'openai': {
      const instance = createOpenAI({ apiKey });
      return { provider, modelId, model: instance(modelId) };
    }
  }
}

export function configuredProviderLabel(settings: VideoToObsidianSettings): string {
  try {
    const config = selectModel(settings);
    return `${config.provider} (${config.modelId})`;
  } catch {
    return `${settings.aiProvider} (not configured)`;
  }
}
