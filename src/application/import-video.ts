import type { Transcript, TranscriptSource, VideoMetadata, VideoSession, VideoToObsidianSettings } from '../domain';
import { isValidYouTubeUrl } from '../domain/youtube';

export type TranscriptAcquisition = {
  discoverBestTranscriptSource(url: string): Promise<{
    metadata: VideoMetadata;
    source: TranscriptSource;
  }>;
  downloadTranscript(source: TranscriptSource): Promise<Transcript>;
};

export type CreateVideoNoteInput = {
  settings: VideoToObsidianSettings;
  metadata: VideoMetadata;
  transcriptSource: TranscriptSource;
  transcript: Transcript;
  providerLabel: string;
};

export type VideoNoteStore = {
  findReusableVideoNote(settings: VideoToObsidianSettings, metadata: VideoMetadata, inputUrl: string): string | null;
  readTranscript(videoNotePath: string): Promise<Transcript | null>;
  createVideoNote(input: CreateVideoNoteInput): Promise<string>;
};

export type VideoImportResult = VideoSession & {
  reused: boolean;
};

export async function importVideo(input: {
  url: string;
  settings: VideoToObsidianSettings;
  transcriptAcquisition: TranscriptAcquisition;
  videoNoteStore: VideoNoteStore;
  providerLabel: string;
}): Promise<VideoImportResult> {
  if (!isValidYouTubeUrl(input.url)) {
    throw new Error('Enter a valid YouTube URL.');
  }

  const { metadata, source } = await input.transcriptAcquisition.discoverBestTranscriptSource(input.url);
  const existingPath = input.videoNoteStore.findReusableVideoNote(input.settings, metadata, input.url);
  if (existingPath) {
    const existingTranscript = await input.videoNoteStore.readTranscript(existingPath);
    if (existingTranscript) {
      return {
        metadata,
        subtitle: { code: source.code, name: source.name, type: source.type },
        transcript: existingTranscript,
        videoNotePath: existingPath,
        reused: true
      };
    }
  }

  const transcript = await input.transcriptAcquisition.downloadTranscript(source);
  const videoNotePath = await input.videoNoteStore.createVideoNote({
    settings: input.settings,
    metadata,
    transcriptSource: source,
    transcript,
    providerLabel: input.providerLabel
  });

  return {
    metadata,
    subtitle: { code: source.code, name: source.name, type: source.type },
    transcript,
    videoNotePath,
    reused: false
  };
}
