import { describe, expect, it, vi } from 'vitest';
import { generateVideoNoteContent } from './video-note-generation';
import type { LanguageModelAdapter } from '../adapters/ai/language-model-adapter';

describe('generateVideoNoteContent', () => {
  it('filters generated Timestamped claims that are not present in the Transcript', async () => {
    const onLog = vi.fn();
    const languageModel: LanguageModelAdapter = {
      streamText: vi.fn(),
      generateObject: vi.fn().mockResolvedValue({
        object: {
          conciseSummary: 'A concise summary.',
          tags: ['one', 'two', 'three', 'four', 'five'],
          sections: [
            {
              title: 'Traceable claims',
              summary: 'The video makes traceable claims.',
              claims: [
                { text: 'Supported.', timestamp: '00:01' },
                { text: 'Unsupported.', timestamp: '09:99' }
              ]
            }
          ]
        },
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 }
      })
    };

    await expect(
      generateVideoNoteContent(
        { id: 'dQw4w9WgXcQ', title: 'Example video', url: 'https://youtu.be/dQw4w9WgXcQ' },
        {
          cues: [{ start: '00:01', end: '00:02', text: 'Supported.' }],
          rawSrt: '',
          markdown: '[00:01] Supported.'
        },
        { provider: 'mistral', modelId: 'mistral-small-latest', model: {} as never },
        onLog,
        languageModel
      )
    ).resolves.toMatchObject({
      sections: [
        {
          claims: [{ text: 'Supported.', timestamp: '00:01' }]
        }
      ]
    });

    expect(onLog).toHaveBeenCalledWith('Dropped 1 unsupported timestamped claim without exact Transcript timestamps.');
  });
});
