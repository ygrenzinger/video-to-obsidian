import { describe, expect, it } from 'vitest';
import { providerOptions, providerDefaultModelId } from './provider-catalog';

describe('provider catalog', () => {
  it('is the single source for provider order and default model IDs', () => {
    expect(providerOptions.map((provider) => provider.id)).toEqual([
      'mistral',
      'google',
      'anthropic',
      'openai'
    ]);
    expect(providerDefaultModelId('google')).toBe('gemini-2.0-flash');
  });
});
