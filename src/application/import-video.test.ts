import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Transcript, type VideoMetadata } from '../domain';
import { importVideo } from './import-video';

const metadata: VideoMetadata = {
  id: 'dQw4w9WgXcQ',
  title: 'Example video',
  url: 'https://youtu.be/dQw4w9WgXcQ'
};

const transcript: Transcript = {
  cues: [{ start: '00:01', end: '00:02', text: 'A timestamped claim.' }],
  rawSrt: '1\n00:00:01.000 --> 00:00:02.000\nA timestamped claim.',
  markdown: '[00:01] A timestamped claim.'
};

describe('importVideo', () => {
  it('reuses an existing Video note with a stored Transcript without downloading again', async () => {
    const transcriptAcquisition = {
      discoverBestTranscriptSource: vi.fn().mockResolvedValue({
        metadata,
        source: { code: 'en', name: 'English', type: 'uploaded', url: 'https://example.test/en.srt' }
      }),
      downloadTranscript: vi.fn()
    };
    const videoNoteStore = {
      findReusableVideoNote: vi.fn().mockReturnValue('Video notes/Example video.md'),
      readTranscript: vi.fn().mockResolvedValue(transcript),
      createVideoNote: vi.fn()
    };

    await expect(
      importVideo({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        settings: structuredClone(DEFAULT_SETTINGS),
        transcriptAcquisition,
        videoNoteStore,
        providerLabel: 'mistral (mistral-small-latest)'
      })
    ).resolves.toMatchObject({
      metadata,
      transcript,
      videoNotePath: 'Video notes/Example video.md'
    });

    expect(transcriptAcquisition.downloadTranscript).not.toHaveBeenCalled();
    expect(videoNoteStore.createVideoNote).not.toHaveBeenCalled();
  });

  it('creates a new Video note when no reusable stored Transcript exists', async () => {
    const transcriptAcquisition = {
      discoverBestTranscriptSource: vi.fn().mockResolvedValue({
        metadata,
        source: { code: 'en', name: 'English', type: 'uploaded', url: 'https://example.test/en.srt' }
      }),
      downloadTranscript: vi.fn().mockResolvedValue(transcript)
    };
    const videoNoteStore = {
      findReusableVideoNote: vi.fn().mockReturnValue(null),
      readTranscript: vi.fn(),
      createVideoNote: vi.fn().mockResolvedValue('Video notes/Example video.md')
    };

    await expect(
      importVideo({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        settings: structuredClone(DEFAULT_SETTINGS),
        transcriptAcquisition,
        videoNoteStore,
        providerLabel: 'mistral (mistral-small-latest)'
      })
    ).resolves.toMatchObject({
      metadata,
      transcript,
      videoNotePath: 'Video notes/Example video.md'
    });

    expect(transcriptAcquisition.downloadTranscript).toHaveBeenCalledWith({
      code: 'en',
      name: 'English',
      type: 'uploaded',
      url: 'https://example.test/en.srt'
    });
    expect(videoNoteStore.createVideoNote).toHaveBeenCalledWith(
      expect.objectContaining({ metadata, transcript })
    );
  });

  it('rejects invalid YouTube URLs before touching adapters', async () => {
    const transcriptAcquisition = {
      discoverBestTranscriptSource: vi.fn(),
      downloadTranscript: vi.fn()
    };
    const videoNoteStore = {
      findReusableVideoNote: vi.fn(),
      readTranscript: vi.fn(),
      createVideoNote: vi.fn()
    };

    await expect(
      importVideo({
        url: 'not a youtube url',
        settings: structuredClone(DEFAULT_SETTINGS),
        transcriptAcquisition,
        videoNoteStore,
        providerLabel: 'mistral (mistral-small-latest)'
      })
    ).rejects.toThrow('Enter a valid YouTube URL.');

    expect(transcriptAcquisition.discoverBestTranscriptSource).not.toHaveBeenCalled();
    expect(videoNoteStore.findReusableVideoNote).not.toHaveBeenCalled();
  });
});
