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
  extractStoredTranscript,
  generatedContentMarkdown,
  generatedFrontmatterTags,
  generatedSectionsMarkdown,
  safeVideoNoteBasename,
  videoNoteMarkdown
} from '../../markdown/video-note-markdown';

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

    const path = await this.nextAvailablePath(folder, safeVideoNoteBasename(metadata.title));
    await this.vault.create(path, videoNoteMarkdown({ metadata, subtitle, transcript, providerLabel }));

    settings.videoIndex[metadata.url] = path;
    settings.videoIndex[metadata.id] = path;
    return path;
  }

  async appendChatHistory(videoNotePath: string, messages: ChatMessage[]): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile) || messages.length === 0) return;

    const markdown = messages
      .map((message) => {
        const role = message.role === 'user' ? 'User' : 'Assistant';
        return `#### ${role}\n\n${message.content}`;
      })
      .join('\n\n');

    await this.appendBeforeTranscript(file, `### Chat ${new Date().toLocaleString()}\n\n${markdown}`);
  }

  async appendChatTurn(videoNotePath: string, title: string, answer: string): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile) || !title.trim() || !answer.trim()) return;

    const markdown = `### ${title.trim()}\n\n${answer.trim()}`;
    await this.appendBeforeTranscript(file, markdown);
  }

  async updateGeneratedContent(videoNotePath: string, metadata: VideoMetadata, generatedContent: GeneratedVideoNoteContent): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile)) return;

    await this.vault.process(file, (content) => {
      const contentWithTags = this.updateFrontmatterTags(content, generatedContent.tags);
      const generatedMarkdown = generatedSectionsMarkdown(metadata, generatedContent);
      const startMarker = '## Summary';
      const endMarker = '\n## Chat history\n';
      const startIndex = contentWithTags.indexOf(startMarker);
      const endIndex = contentWithTags.indexOf(endMarker);

      if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        const transcriptHeading = '\n## Transcript\n';
        const transcriptIndex = contentWithTags.indexOf(transcriptHeading);
        const generatedBlock = generatedContentMarkdown(metadata, generatedContent);

        if (transcriptIndex === -1) return `${contentWithTags.trimEnd()}\n\n${generatedBlock}\n`;
        return `${contentWithTags.slice(0, transcriptIndex).trimEnd()}\n\n${generatedBlock}\n${contentWithTags.slice(transcriptIndex)}`;
      }

      return `${contentWithTags.slice(0, startIndex)}${generatedMarkdown}${contentWithTags.slice(endIndex)}`;
    });
  }

  private updateFrontmatterTags(content: string, tags: string[]): string {
    const yamlTags = generatedFrontmatterTags(tags);

    if (!content.startsWith('---\n')) {
      return `---\n${yamlTags}\n---\n\n${content.trimStart()}`;
    }

    const endIndex = content.indexOf('\n---', 4);
    if (endIndex === -1) return content;

    const frontmatter = content.slice(4, endIndex);
    const rest = content.slice(endIndex);
    const withoutTags = frontmatter.replace(/^tags:\n(?:  - .*\n?)*/m, '').trimEnd();
    const nextFrontmatter = withoutTags ? `${withoutTags}\n${yamlTags}` : yamlTags;

    return `---\n${nextFrontmatter}${rest}`;
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

  private async appendBeforeTranscript(file: TFile, markdown: string): Promise<void> {
    await this.vault.process(file, (content) => {
      const transcriptHeading = '\n## Transcript\n';
      const contentWithoutPlaceholder = content.replace('\n_No saved chat yet._\n', '\n');
      const transcriptIndex = contentWithoutPlaceholder.indexOf(transcriptHeading);

      if (transcriptIndex === -1) {
        return `${contentWithoutPlaceholder.trimEnd()}\n\n${markdown}\n`;
      }

      return `${contentWithoutPlaceholder.slice(0, transcriptIndex).trimEnd()}\n\n${markdown}\n${contentWithoutPlaceholder.slice(transcriptIndex)}`;
    });
  }

}
