import { describe, expect, it, vi } from 'vitest';
import { ChatService, linkifyTranscriptTimestamps } from './transcript-chat';
import type { LanguageModelAdapter } from '../adapters/ai/language-model-adapter';

describe('linkifyTranscriptTimestamps', () => {
  it('turns chat timestamp citations into YouTube timestamp links', () => {
    expect(
      linkifyTranscriptTimestamps(
        'https://youtu.be/dQw4w9WgXcQ',
        'Role Definition [06:01]-[06:05] and follow-up [01:02:03].'
      )
    ).toBe(
      'Role Definition [06:01](https://youtu.be/dQw4w9WgXcQ?t=361)-[06:05](https://youtu.be/dQw4w9WgXcQ?t=365) and follow-up [01:02:03](https://youtu.be/dQw4w9WgXcQ?t=3723).'
    );
  });
});

describe('ChatService', () => {
  it('streams a Transcript-grounded answer through a fake Language model adapter', async () => {
    const languageModel: LanguageModelAdapter = {
      streamText: vi.fn().mockReturnValue({
        textStream: (async function* () {
          yield 'Supported [00:01]';
        })(),
        finishReason: Promise.resolve('stop'),
        totalUsage: Promise.resolve({ inputTokens: 1, outputTokens: 2, totalTokens: 3 })
      }),
      generateObject: vi.fn()
    };
    const service = new ChatService(
      'https://youtu.be/dQw4w9WgXcQ',
      {
        cues: [{ start: '00:01', end: '00:02', text: 'Supported.' }],
        rawSrt: '',
        markdown: '[00:01] Supported.'
      },
      { provider: 'mistral', modelId: 'mistral-small-latest', model: {} as never },
      undefined,
      languageModel
    );

    const chunks: string[] = [];
    for await (const chunk of service.sendMessage('What is supported?')) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Supported [00:01](https://youtu.be/dQw4w9WgXcQ?t=1)');
    expect(service.getMessages()).toMatchObject([
      { role: 'user', content: 'What is supported?' },
      { role: 'assistant', content: 'Supported [00:01](https://youtu.be/dQw4w9WgXcQ?t=1)', streamingComplete: true }
    ]);
  });
});
