import { normalizePath, TFile, TFolder, Vault } from 'obsidian';
import type {
  AtomicNoteCandidate,
  ChatMessage,
  SubtitleLanguage,
  Transcript,
  VideoMetadata,
  VideoToObsidianSettings
} from './domain';
import { markdownLinkTarget, sanitizeFileName, yamlString } from './filename';
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

    const path = await this.nextAvailableRootPath(sanitizeFileName(metadata.title));
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

    await this.vault.process(file, (content) => {
      return `${content.trimEnd()}\n\n### Chat ${new Date().toLocaleString()}\n\n${markdown}\n`;
    });
  }

  async createAtomicNotes(
    settings: VideoToObsidianSettings,
    metadata: VideoMetadata,
    videoNotePath: string,
    candidates: AtomicNoteCandidate[]
  ): Promise<string[]> {
    const folder = normalizePath(settings.atomicNotesFolder);
    await this.ensureFolder(folder);

    const createdPaths: string[] = [];
    for (const candidate of candidates) {
      const path = await this.nextAvailablePath(folder, sanitizeFileName(candidate.title));
      await this.vault.create(path, this.atomicNoteMarkdown(metadata, videoNotePath, candidate));
      createdPaths.push(path);
    }

    return createdPaths;
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

  private async nextAvailableRootPath(basename: string): Promise<string> {
    let candidate = `${basename}.md`;
    let index = 2;

    while (this.vault.getAbstractFileByPath(candidate)) {
      candidate = `${basename} ${index}.md`;
      index += 1;
    }

    return candidate;
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

## Transcript

\`\`\`text
${transcript.markdown}
\`\`\`

## Chat history
`;
  }

  private atomicNoteMarkdown(
    metadata: VideoMetadata,
    videoNotePath: string,
    candidate: AtomicNoteCandidate
  ): string {
    const videoNoteLink = `[[${markdownLinkTarget(videoNotePath)}]]`;
    const tags = ['video-to-obsidian', 'atomic-knowledge', ...candidate.tags]
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean);

    const claims = candidate.claims
      .map((claim) => {
        const timestampUrl = createYouTubeTimestampUrl(metadata.url, claim.timestamp);
        const timestamp = timestampUrl ? `[${claim.timestamp}](${timestampUrl})` : claim.timestamp;
        return `- ${claim.text} (${timestamp}) from ${videoNoteLink}`;
      })
      .join('\n');

    return `---
sourceVideo: ${yamlString(videoNoteLink)}
sourceUrl: ${yamlString(metadata.url)}
createdAt: ${yamlString(new Date().toISOString())}
tags: [${tags.map(yamlString).join(', ')}]
---

# ${candidate.title}

${candidate.summary}

## Timestamped claims

${claims || '- No timestamped claims were extracted.'}
`;
  }
}
