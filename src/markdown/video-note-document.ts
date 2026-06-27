import type { ChatMessage, GeneratedVideoNoteContent, SubtitleLanguage, Transcript, VideoMetadata } from '../domain';
import { parseTranscriptMarkdown } from '../domain/transcript';
import { createYouTubeTimestampUrl } from '../domain/youtube';
import { yamlString } from '../shared/filename';

const SUMMARY_HEADING = '## Summary';
const GENERATED_NOTES_HEADING = '## Generated notes';
const CHAT_HISTORY_HEADING = '## Chat history';
const TRANSCRIPT_HEADING = '## Transcript';
const EMPTY_CHAT_PLACEHOLDER = '_No saved chat yet._';

export function createVideoNoteDocument(input: {
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

${SUMMARY_HEADING}

_No generated summary yet._

${GENERATED_NOTES_HEADING}

_No generated notes yet._

${CHAT_HISTORY_HEADING}

${EMPTY_CHAT_PLACEHOLDER}

${TRANSCRIPT_HEADING}

\`\`\`text
${input.transcript.markdown}
\`\`\`
`;
}

export function extractStoredTranscript(document: string): Transcript | null {
  const match = document.match(/## Transcript\s+```text\n([\s\S]*?)\n```/);
  if (!match) return null;

  return parseTranscriptMarkdown(match[1].trim());
}

export function replaceGeneratedNotes(
  document: string,
  metadata: VideoMetadata,
  generatedContent: GeneratedVideoNoteContent
): string {
  const documentWithTags = updateFrontmatterTags(document, generatedContent.tags);
  const generatedMarkdown = generatedSectionsMarkdown(metadata, generatedContent);
  const startIndex = documentWithTags.indexOf(SUMMARY_HEADING);
  const endIndex = documentWithTags.indexOf(`\n${CHAT_HISTORY_HEADING}\n`);

  if (startIndex !== -1 && endIndex > startIndex) {
    return `${documentWithTags.slice(0, startIndex)}${generatedMarkdown}${documentWithTags.slice(endIndex)}`;
  }

  return insertBeforeTranscript(documentWithTags, generatedContentMarkdown(metadata, generatedContent));
}

export function appendSavedChatAnswer(document: string, input: { title: string; answer: string }): string {
  const title = input.title.trim();
  const answer = input.answer.trim();
  if (!title || !answer) return document;

  return appendBeforeTranscript(document, `### ${title}\n\n${answer}`);
}

export function appendChatHistory(document: string, messages: ChatMessage[], savedAt = new Date()): string {
  if (messages.length === 0) return document;

  const markdown = messages
    .map((message) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      return `#### ${role}\n\n${message.content}`;
    })
    .join('\n\n');

  return appendBeforeTranscript(document, `### Chat ${savedAt.toLocaleString()}\n\n${markdown}`);
}

function generatedContentMarkdown(
  metadata: VideoMetadata,
  generatedContent: GeneratedVideoNoteContent
): string {
  return `${generatedSectionsMarkdown(metadata, generatedContent)}\n\n${CHAT_HISTORY_HEADING}\n\n${EMPTY_CHAT_PLACEHOLDER}`;
}

function generatedSectionsMarkdown(
  metadata: VideoMetadata,
  generatedContent: GeneratedVideoNoteContent
): string {
  return `${SUMMARY_HEADING}\n\n${generatedContent.conciseSummary}\n\n${GENERATED_NOTES_HEADING}\n\n${generatedNotesMarkdown(metadata, generatedContent)}`;
}

function generatedFrontmatterTags(tags: string[]): string {
  return `tags:\n${slugifiedGeneratedTags(tags).map((tag) => `  - ${tag}`).join('\n')}`;
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

function updateFrontmatterTags(document: string, tags: string[]): string {
  const yamlTags = generatedFrontmatterTags(tags);

  if (!document.startsWith('---\n')) {
    return `---\n${yamlTags}\n---\n\n${document.trimStart()}`;
  }

  const endIndex = document.indexOf('\n---', 4);
  if (endIndex === -1) return document;

  const frontmatter = document.slice(4, endIndex);
  const rest = document.slice(endIndex);
  const withoutTags = frontmatter.replace(/^tags:\n(?:  - .*\n?)*/m, '').trimEnd();
  const nextFrontmatter = withoutTags ? `${withoutTags}\n${yamlTags}` : yamlTags;

  return `---\n${nextFrontmatter}${rest}`;
}

function appendBeforeTranscript(document: string, markdown: string): string {
  return insertBeforeTranscript(removeEmptyChatPlaceholder(document), markdown);
}

function removeEmptyChatPlaceholder(document: string): string {
  return document.replace(`\n${EMPTY_CHAT_PLACEHOLDER}\n`, '\n');
}

function insertBeforeTranscript(document: string, markdown: string): string {
  const transcriptIndex = document.indexOf(`\n${TRANSCRIPT_HEADING}\n`);

  if (transcriptIndex === -1) {
    return `${document.trimEnd()}\n\n${markdown}\n`;
  }

  return `${document.slice(0, transcriptIndex).trimEnd()}\n\n${markdown}\n${document.slice(transcriptIndex)}`;
}
