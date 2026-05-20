import type { LanguageModel } from 'ai';

export type SupportedProvider = 'mistral' | 'google' | 'anthropic' | 'openai';

export type ProviderSettings = {
  apiKey: string;
  modelId: string;
};

export type VideoToObsidianSettings = {
  ytdlpPath: string;
  ytdlpCookiesFromBrowser: string;
  videoNotesFolder: string;
  atomicNotesFolder: string;
  maxAtomicNotes: number;
  providers: Record<SupportedProvider, ProviderSettings>;
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

export type AtomicNoteCandidate = {
  title: string;
  summary: string;
  tags: string[];
  claims: TimestampedClaim[];
};

export const DEFAULT_SETTINGS: VideoToObsidianSettings = {
  ytdlpPath: '',
  ytdlpCookiesFromBrowser: '',
  videoNotesFolder: 'Video notes',
  atomicNotesFolder: 'Atomic knowledge notes',
  maxAtomicNotes: 8,
  providers: {
    mistral: { apiKey: '', modelId: 'mistral-small-latest' },
    google: { apiKey: '', modelId: 'gemini-2.0-flash' },
    anthropic: { apiKey: '', modelId: 'claude-3-5-haiku-latest' },
    openai: { apiKey: '', modelId: 'gpt-4o-mini' }
  },
  videoIndex: {}
};
