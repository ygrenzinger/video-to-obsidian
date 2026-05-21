import type { GeneratedVideoNoteContent, SubtitleLanguage, Transcript, VideoMetadata } from '../domain';
import { sanitizeFileName, yamlString } from '../shared/filename';
import { parseTranscriptMarkdown } from '../domain/transcript';
import { createYouTubeTimestampUrl } from '../domain/youtube';

export function extractStoredTranscript(content: string): Transcript | null {
  const match = content.match(/## Transcript\s+```text\n([\s\S]*?)\n```/);
  if (!match) return null;

  return parseTranscriptMarkdown(match[1].trim());
}

export function videoNoteMarkdown(input: {
  metadata: VideoMetadata;
  subtitle: SubtitleLanguage;
  transcript: Transcript;
  providerLabel: string;
}): string {
  return `---
videoUrl: ${yamlString(input.metadata.url)}
videoId: ${yamlString(input.metadata.id)}
title: ${yamlString(input.metadata.title)}
subtitleLanguage: ${yamlString(`${input.subtitle.name} (${input.subtitle.code})`)}
subtitleType: ${yamlString(input.subtitle.type)}
aiProvider: ${yamlString(input.providerLabel)}
createdAt: ${yamlString(new Date().toISOString())}
---

# ${input.metadata.title}

[Watch video](${input.metadata.url})

## Summary

_No generated summary yet._

## Generated notes

_No generated notes yet._

## Chat history

_No saved chat yet._

## Transcript

\`\`\`text
${input.transcript.markdown}
\`\`\`
`;
}

export function generatedContentMarkdown(
  metadata: VideoMetadata,
  generatedContent: GeneratedVideoNoteContent
): string {
  return `${generatedSectionsMarkdown(metadata, generatedContent)}\n\n## Chat history\n\n_No saved chat yet._`;
}

export function generatedSectionsMarkdown(
  metadata: VideoMetadata,
  generatedContent: GeneratedVideoNoteContent
): string {
  return `## Summary\n\n${generatedContent.conciseSummary}\n\n## Generated notes\n\n${generatedNotesMarkdown(metadata, generatedContent)}`;
}

export function generatedFrontmatterTags(tags: string[]): string {
  return `tags:\n${slugifiedGeneratedTags(tags).map((tag) => `  - ${tag}`).join('\n')}`;
}

export function safeVideoNoteBasename(title: string): string {
  return sanitizeFileName(title);
}

function generatedNotesMarkdown(
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

function slugifiedGeneratedTags(tags: string[]): string[] {
  const fallbacks = ['video-note', 'video-summary', 'generated-content', 'transcript', 'youtube'];
  const result: string[] = [];

  for (const tag of [...tags, ...fallbacks]) {
    const slug = slugifyTag(tag);
    if (!slug || result.includes(slug)) continue;
    result.push(slug);
    if (result.length === 5) break;
  }

  return result;
}

function slugifyTag(tag: string): string {
  return tag
    .replace(/^#+/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
