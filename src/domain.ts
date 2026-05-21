import type { LanguageModel } from 'ai';

export type SupportedProvider = 'mistral' | 'google' | 'anthropic' | 'openai';

export type VideoToObsidianSettings = {
  ytdlpPath: string;
  videoNotesFolder: string;
  aiProvider: SupportedProvider;
  aiApiKey: string;
  aiModelId: string;
  videoIndex: Record<string, string>;
};

export type SubtitleLanguage = {
  code: string;
  name: string;
  type: 'uploaded' | 'auto';
};

export type TranscriptCue = {
  start: string;
  end: string;
  text: string;
};

export type Transcript = {
  cues: TranscriptCue[];
  markdown: string;
  rawSrt: string;
};

export type VideoMetadata = {
  id: string;
  title: string;
  url: string;
  duration?: number;
  uploader?: string;
};

export type VideoSession = {
  metadata: VideoMetadata;
  subtitle: SubtitleLanguage;
  transcript: Transcript;
  videoNotePath: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  streamingComplete?: boolean;
};

export type ModelConfiguration = {
  provider: SupportedProvider;
  modelId: string;
  model: LanguageModel;
};

export type TimestampedClaim = {
  text: string;
  timestamp: string;
};

export type GeneratedVideoNoteSection = {
  title: string;
  summary: string;
  tags: string[];
  claims: TimestampedClaim[];
};

export type GeneratedVideoNoteContent = {
  conciseSummary: string;
  sections: GeneratedVideoNoteSection[];
};

export const DEFAULT_SETTINGS: VideoToObsidianSettings = {
  ytdlpPath: '',
  videoNotesFolder: 'Video notes',
  aiProvider: 'mistral',
  aiApiKey: '',
  aiModelId: '',
  videoIndex: {}
};
