import { normalizePath, TFile, TFolder, Vault } from 'obsidian';
import type {
  ChatMessage,
  GeneratedVideoNoteContent,
  SubtitleLanguage,
  Transcript,
  VideoMetadata,
  VideoToObsidianSettings
} from './domain';
import { sanitizeFileName, yamlString } from './filename';
import { createYouTubeTimestampUrl } from './youtube';

export class VaultStorage {
  constructor(private readonly vault: Vault) {}

  getExistingVideoNotePath(settings: VideoToObsidianSettings, metadata: VideoMetadata, inputUrl: string): string | null {
    const path = settings.videoIndex[metadata.url] ?? settings.videoIndex[metadata.id] ?? settings.videoIndex[inputUrl];
    return path && this.vault.getFileByPath(path) ? path : null;
  }

  async readTranscriptFromVideoNote(videoNotePath: string): Promise<Transcript | null> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile)) return null;

    const content = await this.vault.cachedRead(file);
    const match = content.match(/## Transcript\s+```text\n([\s\S]*?)\n```/);
    if (!match) return null;

    return {
      cues: [],
      rawSrt: '',
      markdown: match[1].trim()
    };
  }

  async createOrReuseVideoNote(
    settings: VideoToObsidianSettings,
    metadata: VideoMetadata,
    subtitle: SubtitleLanguage,
    transcript: Transcript,
    providerLabel: string
  ): Promise<string> {
    const existingPath = settings.videoIndex[metadata.url] ?? settings.videoIndex[metadata.id];
    if (existingPath && this.vault.getFileByPath(existingPath)) return existingPath;

    const folder = normalizePath(settings.videoNotesFolder.trim() || 'Video notes');
    await this.ensureFolder(folder);

    const path = await this.nextAvailablePath(folder, sanitizeFileName(metadata.title));
    await this.vault.create(path, this.videoNoteMarkdown(metadata, subtitle, transcript, providerLabel));

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

  async appendChatTurn(videoNotePath: string, question: string, answer: string): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile) || !question.trim() || !answer.trim()) return;

    const markdown = `### Chat ${new Date().toLocaleString()}\n\n#### Question\n\n${question.trim()}\n\n#### Answer\n\n${answer.trim()}`;
    await this.appendBeforeTranscript(file, markdown);
  }

  async updateGeneratedContent(videoNotePath: string, metadata: VideoMetadata, generatedContent: GeneratedVideoNoteContent): Promise<void> {
    const file = this.vault.getFileByPath(videoNotePath);
    if (!(file instanceof TFile)) return;

    await this.vault.process(file, (content) => {
      const contentWithTags = this.updateFrontmatterTags(content, generatedContent.tags);
      const generatedMarkdown = this.generatedSectionsMarkdown(metadata, generatedContent);
      const startMarker = '## Summary';
      const endMarker = '\n## Chat history\n';
      const startIndex = contentWithTags.indexOf(startMarker);
      const endIndex = contentWithTags.indexOf(endMarker);

      if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        const transcriptHeading = '\n## Transcript\n';
        const transcriptIndex = contentWithTags.indexOf(transcriptHeading);
        const generatedBlock = this.generatedContentMarkdown(metadata, generatedContent);

        if (transcriptIndex === -1) return `${contentWithTags.trimEnd()}\n\n${generatedBlock}\n`;
        return `${contentWithTags.slice(0, transcriptIndex).trimEnd()}\n\n${generatedBlock}\n${contentWithTags.slice(transcriptIndex)}`;
      }

      return `${contentWithTags.slice(0, startIndex)}${generatedMarkdown}${contentWithTags.slice(endIndex)}`;
    });
  }

  private updateFrontmatterTags(content: string, tags: string[]): string {
    const yamlTags = this.generatedFrontmatterTags(tags);

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

  private generatedFrontmatterTags(tags: string[]): string {
    return `tags:\n${this.slugifiedGeneratedTags(tags).map((tag) => `  - ${tag}`).join('\n')}`;
  }

  private slugifiedGeneratedTags(tags: string[]): string[] {
    const fallbacks = ['video-note', 'video-summary', 'generated-content', 'transcript', 'youtube'];
    const result: string[] = [];

    for (const tag of [...tags, ...fallbacks]) {
      const slug = this.slugifyTag(tag);
      if (!slug || result.includes(slug)) continue;
      result.push(slug);
      if (result.length === 5) break;
    }

    return result;
  }

  private slugifyTag(tag: string): string {
    return tag
      .replace(/^#+/, '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/'/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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

  private videoNoteMarkdown(
    metadata: VideoMetadata,
    subtitle: SubtitleLanguage,
    transcript: Transcript,
    providerLabel: string
  ): string {
    return `---
videoUrl: ${yamlString(metadata.url)}
videoId: ${yamlString(metadata.id)}
title: ${yamlString(metadata.title)}
subtitleLanguage: ${yamlString(`${subtitle.name} (${subtitle.code})`)}
subtitleType: ${yamlString(subtitle.type)}
aiProvider: ${yamlString(providerLabel)}
createdAt: ${yamlString(new Date().toISOString())}
---

# ${metadata.title}

[Watch video](${metadata.url})

## Summary

_No generated summary yet._

## Generated notes

_No generated notes yet._

## Chat history

_No saved chat yet._

## Transcript

\`\`\`text
${transcript.markdown}
\`\`\`
`;
  }

  private generatedContentMarkdown(
    metadata: VideoMetadata,
    generatedContent: GeneratedVideoNoteContent
  ): string {
    return `${this.generatedSectionsMarkdown(metadata, generatedContent)}\n\n## Chat history\n\n_No saved chat yet._`;
  }

  private generatedSectionsMarkdown(
    metadata: VideoMetadata,
    generatedContent: GeneratedVideoNoteContent
  ): string {
    return `## Summary\n\n${generatedContent.conciseSummary}\n\n## Generated notes\n\n${this.generatedNotesMarkdown(metadata, generatedContent)}`;
  }

  private generatedNotesMarkdown(
    metadata: VideoMetadata,
    generatedContent: GeneratedVideoNoteContent
  ): string {
    if (generatedContent.sections.length === 0) return '_No generated notes._';

    return generatedContent.sections.map((section) => {
      const claims = section.claims.map((claim) => {
        const timestampUrl = createYouTubeTimestampUrl(metadata.url, claim.timestamp);
        const timestamp = timestampUrl ? `[${claim.timestamp}](${timestampUrl})` : claim.timestamp;
        return `- ${claim.text} (${timestamp})`;
      });

      return `### ${section.title}\n\n${section.summary}${claims.length > 0 ? `\n\n#### Timestamped claims\n\n${claims.join('\n')}` : ''}`;
    }).join('\n\n');
  }
}
