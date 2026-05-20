import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import type { ModelConfiguration, SupportedProvider, VideoToObsidianSettings } from './domain';

const PROVIDER_PRIORITY: SupportedProvider[] = ['mistral', 'google', 'anthropic', 'openai'];

export function selectModel(settings: VideoToObsidianSettings): ModelConfiguration {
  for (const provider of PROVIDER_PRIORITY) {
    const providerSettings = settings.providers[provider];
    if (!providerSettings.apiKey.trim()) continue;

    switch (provider) {
      case 'mistral': {
        const instance = createMistral({ apiKey: providerSettings.apiKey.trim() });
        return { provider, modelId: providerSettings.modelId, model: instance(providerSettings.modelId) };
      }
      case 'google': {
        const instance = createGoogleGenerativeAI({ apiKey: providerSettings.apiKey.trim() });
        return { provider, modelId: providerSettings.modelId, model: instance(providerSettings.modelId) };
      }
      case 'anthropic': {
        const instance = createAnthropic({ apiKey: providerSettings.apiKey.trim() });
        return { provider, modelId: providerSettings.modelId, model: instance(providerSettings.modelId) };
      }
      case 'openai': {
        const instance = createOpenAI({ apiKey: providerSettings.apiKey.trim() });
        return { provider, modelId: providerSettings.modelId, model: instance(providerSettings.modelId) };
      }
    }
  }

  throw new Error('Configure at least one AI provider API key in the plugin settings.');
}

export function configuredProviderLabel(settings: VideoToObsidianSettings): string {
  try {
    const config = selectModel(settings);
    return `${config.provider} (${config.modelId})`;
  } catch {
    return 'No AI provider configured';
  }
}
