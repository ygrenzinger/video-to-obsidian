import type { ChatMessage, VideoSession } from '../domain';
import type { RuntimeLog } from '../shared/runtime-log';

export type TranscriptChatSession = {
  sendMessage(message: string): AsyncIterable<string>;
  getMessages(): ChatMessage[];
  clearMessages(): void;
};

export type VideoToObsidianWorkflow = {
  importVideo(url: string, onLog?: RuntimeLog): Promise<VideoSession>;
  createTranscriptChat(session: VideoSession, onLog?: RuntimeLog): TranscriptChatSession;
  generateVideoNoteContent(session: VideoSession, onLog?: RuntimeLog): Promise<void>;
  saveChatTurn(session: VideoSession, question: string, answer: string, onLog?: RuntimeLog): Promise<void>;
};
