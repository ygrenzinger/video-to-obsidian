import { normalizePath, TFile, TFolder, Vault } from 'obsidian';
import type {
  ChatMessage,
  GeneratedVideoNoteContent,
  SubtitleLanguage,
  Transcript,
  TranscriptSource,
  VideoMetadata,
  VideoToObsidianSettings
} from '../../domain';
import type { CreateVideoNoteInput } from '../../application/import-video';
import {
  appendChatHistory,
  appendSavedChatAnswer,
  createVideoNoteDocument,
  extractStoredTranscript,
  replaceGeneratedNotes
} from '../../markdown/video-note-document';
import { sanitizeFileName } from '../../shared/filename';

export class VaultStorage {
  constructor(private readonly vault: Vault) {}

  findReusableVideoNote(settings: VideoToObsidianSettings, metadata: VideoMetadata, inputUrl: string): string | null {
    return this.getExistingVideoNotePath(settings, metadata, inputUrl);
  }

  async readTranscript(videoNotePath: string): Promise<Transcript | null> {
    return this.readTranscriptFromVideoNote(videoNotePath);
  }

  async createVideoNote(input: CreateVideoNoteInput): Promise<string> {
    return this.createOrReuseVideoNote(
      input.settings,
      input.metadata,
      input.transcriptSource,
      input.transcript,
      input.providerLabel
    );
  }

  getExistingVideoNotePath(settings: VideoToObsidianSettings, metadata: VideoMetadata, inputUrl: string): string | null {
    const path = settings.videoIndex[metadata.url] ?? settings.videoIndex[metadata.id] ?? settings.videoIndex[inputUrl];
    return path && this.vault.getFileByPath(path) ? path : null;
  }

  async readTranscriptFromVideoNote(videoNotePath: string): Promise<Transcript | null> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile)) return null;

    const content = await this.vault.cachedRead(file);
    return extractStoredTranscript(content);
  }

  async createOrReuseVideoNote(
    settings: VideoToObsidianSettings,
    metadata: VideoMetadata,
    subtitle: SubtitleLanguage | TranscriptSource,
    transcript: Transcript,
    providerLabel: string
  ): Promise<string> {
    const existingPath = settings.videoIndex[metadata.url] ?? settings.videoIndex[metadata.id];
    if (existingPath && this.vault.getFileByPath(existingPath)) return existingPath;

    const folder = normalizePath(settings.videoNotesFolder.trim() || 'Video notes');
    await this.ensureFolder(folder);

    const path = await this.nextAvailablePath(folder, sanitizeFileName(metadata.title));
    await this.vault.create(path, createVideoNoteDocument({ metadata, subtitle, transcript, providerLabel }));

    settings.videoIndex[metadata.url] = path;
    settings.videoIndex[metadata.id] = path;
    return path;
  }

  async appendChatHistory(videoNotePath: string, messages: ChatMessage[]): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile) || messages.length === 0) return;

    await this.vault.process(file, (content) => appendChatHistory(content, messages));
  }

  async appendChatTurn(videoNotePath: string, title: string, answer: string): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile) || !title.trim() || !answer.trim()) return;

    await this.vault.process(file, (content) => appendSavedChatAnswer(content, { title, answer }));
  }

  async updateGeneratedContent(videoNotePath: string, metadata: VideoMetadata, generatedContent: GeneratedVideoNoteContent): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile)) return;

    await this.vault.process(file, (content) => replaceGeneratedNotes(content, metadata, generatedContent));
  }

  private async ensureFolder(path: string): Promise<void> {
    if (!path || path === '/') return;

    const parts = path.split('/').filter(Boolean);
    let current = '';

    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const existing = this.vault.getAbstractFileByPath(current);
      if (existing instanceof TFolder) continue;
      if (existing) throw new Error(`${current} exists and is not a folder.`);
      await this.vault.createFolder(current);
    }
  }

  private async nextAvailablePath(folder: string, basename: string): Promise<string> {
    let candidate = normalizePath(`${folder}/${basename}.md`);
    let index = 2;

    while (this.vault.getAbstractFileByPath(candidate)) {
      candidate = normalizePath(`${folder}/${basename} ${index}.md`);
      index += 1;
    }

    return candidate;
  }
}
