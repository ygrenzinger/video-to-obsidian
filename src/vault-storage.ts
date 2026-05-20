import { TFile, Vault } from 'obsidian';
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

    const path = await this.nextAvailablePath(sanitizeFileName(metadata.title));
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
      const generatedMarkdown = this.generatedSectionsMarkdown(metadata, generatedContent);
      const startMarker = '## Summary';
      const endMarker = '\n## Chat history\n';
      const startIndex = content.indexOf(startMarker);
      const endIndex = content.indexOf(endMarker);

      if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        const transcriptHeading = '\n## Transcript\n';
        const transcriptIndex = content.indexOf(transcriptHeading);
        const generatedBlock = this.generatedContentMarkdown(metadata, generatedContent);

        if (transcriptIndex === -1) return `${content.trimEnd()}\n\n${generatedBlock}\n`;
        return `${content.slice(0, transcriptIndex).trimEnd()}\n\n${generatedBlock}\n${content.slice(transcriptIndex)}`;
      }

      return `${content.slice(0, startIndex)}${generatedMarkdown}${content.slice(endIndex)}`;
    });
  }

  private async nextAvailablePath(basename: string): Promise<string> {
    let candidate = `${basename}.md`;
    let index = 2;

    while (this.vault.getAbstractFileByPath(candidate)) {
      candidate = `${basename} ${index}.md`;
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
      const tags = section.tags
        .map((tag) => tag.replace(/^#/, '').trim())
        .filter(Boolean)
        .map((tag) => `#${tag}`)
        .join(' ');
      const claims = section.claims.map((claim) => {
        const timestampUrl = createYouTubeTimestampUrl(metadata.url, claim.timestamp);
        const timestamp = timestampUrl ? `[${claim.timestamp}](${timestampUrl})` : claim.timestamp;
        return `- ${claim.text} (${timestamp})`;
      });

      return `### ${section.title}\n\n${section.summary}${tags ? `\n\n${tags}` : ''}${claims.length > 0 ? `\n\n#### Timestamped claims\n\n${claims.join('\n')}` : ''}`;
    }).join('\n\n');
  }
}
