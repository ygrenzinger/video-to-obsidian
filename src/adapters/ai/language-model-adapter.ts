import { generateObject, streamText, type LanguageModel } from 'ai';
import type { z } from 'zod';

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

export type LanguageModelAdapter = {
  streamText(input: {
    model: LanguageModel;
    system: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): {
    textStream: AsyncIterable<string>;
    finishReason: Promise<string>;
    totalUsage: Promise<TokenUsage>;
  };
  generateObject<T>(input: {
    model: LanguageModel;
    temperature?: number;
    schema: z.ZodType<T>;
    system: string;
    prompt: string;
  }): Promise<{
    object: T;
    finishReason: string;
    usage: TokenUsage;
  }>;
};

export const aiLanguageModelAdapter: LanguageModelAdapter = {
  streamText(input) {
    return streamText(input) as ReturnType<LanguageModelAdapter['streamText']>;
  },
  async generateObject(input) {
    return generateObject(input) as Promise<{
      object: typeof input.schema._output;
      finishReason: string;
      usage: TokenUsage;
    }>;
  }
};
