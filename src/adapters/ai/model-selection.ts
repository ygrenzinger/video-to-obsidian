import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import type { ModelConfiguration, SupportedProvider, VideoToObsidianSettings } from '../../domain';
import { providerDefaultModelId } from './provider-catalog';

export function selectModel(settings: VideoToObsidianSettings, apiKey: string): ModelConfiguration {
  const provider = settings.aiProvider;
  const trimmedApiKey = apiKey.trim();
  const modelId = settings.aiModelId.trim() || providerDefaultModelId(provider);

  if (!trimmedApiKey) {
    throw new Error(`Set the ${provider} API key in the plugin settings.`);
  }

  switch (provider) {
    case 'mistral': {
      const instance = createMistral({ apiKey: trimmedApiKey });
      return { provider, modelId, model: instance(modelId) };
    }
    case 'google': {
      const instance = createGoogleGenerativeAI({ apiKey: trimmedApiKey });
      return { provider, modelId, model: instance(modelId) };
    }
    case 'anthropic': {
      const instance = createAnthropic({ apiKey: trimmedApiKey });
      return { provider, modelId, model: instance(modelId) };
    }
    case 'openai': {
      const instance = createOpenAI({ apiKey: trimmedApiKey });
      return { provider, modelId, model: instance(modelId) };
    }
  }
}

export function configuredProviderLabel(settings: VideoToObsidianSettings, apiKey: string): string {
  try {
    const config = selectModel(settings, apiKey);
    return `${config.provider} (${config.modelId})`;
  } catch {
    return `${settings.aiProvider} (not configured)`;
  }
}
