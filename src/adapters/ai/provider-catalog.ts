import type { SupportedProvider } from '../../domain';

export type ProviderOption = {
  id: SupportedProvider;
  defaultModelId: string;
};

export const providerOptions: ProviderOption[] = [
  { id: 'mistral', defaultModelId: 'mistral-small-latest' },
  { id: 'google', defaultModelId: 'gemini-2.0-flash' },
  { id: 'anthropic', defaultModelId: 'claude-3-5-haiku-latest' },
  { id: 'openai', defaultModelId: 'gpt-4o-mini' }
];

export function providerDefaultModelId(provider: SupportedProvider): string {
  return providerOptions.find((option) => option.id === provider)?.defaultModelId ?? providerOptions[0].defaultModelId;
}
