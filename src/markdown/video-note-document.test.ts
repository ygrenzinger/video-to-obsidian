import { describe, expect, it, vi } from 'vitest';
import {
  appendChatHistory,
  appendSavedChatAnswer,
  createVideoNoteDocument,
  extractStoredTranscript,
  replaceGeneratedNotes
} from './video-note-document';

const metadata = {
  id: 'dQw4w9WgXcQ',
  title: 'Example video',
  url: 'https://youtu.be/dQw4w9WgXcQ'
};

const transcript = {
  cues: [{ start: '00:01', end: '00:02', text: 'A timestamped claim.' }],
  rawSrt: '',
  markdown: '[00:01] A timestamped claim.'
};

const generatedContent = {
  conciseSummary: 'This video explains how to preserve source context while creating useful notes.',
  tags: ['Note Taking', 'Source Context', '#AI / Agents', 'Traceability', 'Generated Sections'],
  sections: [
    {
      title: 'Preserve source context',
      summary: 'Notes are more useful when generated ideas remain connected to their evidence.',
      claims: [{ text: 'The Transcript preserves a timestamped claim.', timestamp: '00:01' }]
    }
  ]
};

describe('Video note document', () => {
  it('creates a Video note document with generated notes, chat history, and Transcript sections', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const document = createVideoNoteDocument({
      metadata,
      subtitle: { code: 'en', name: 'English', type: 'uploaded' },
      transcript,
      providerLabel: 'mistral (mistral-small-latest)'
    });

    expect(document).toContain('videoUrl: "https://youtu.be/dQw4w9WgXcQ"');
    expect(document).toContain('createdAt: "2026-01-01T00:00:00.000Z"');
    expect(document).toContain('## Summary\n\n_No generated summary yet._');
    expect(document).toContain('## Generated notes\n\n_No generated notes yet._');
    expect(document).toContain('## Chat history\n\n_No saved chat yet._');
    expect(document).toContain('## Transcript\n\n```text\n[00:01] A timestamped claim.\n```');

    vi.useRealTimers();
  });

  it('extracts a stored Transcript from a Video note document', () => {
    const document = `# Existing

## Transcript

\`\`\`text
[00:01] First claim.
[01:02:03] Later claim.
Plain line without timestamp.
\`\`\`
`;

    expect(extractStoredTranscript(document)).toMatchObject({
      cues: [
        { start: '00:01', end: '00:01', text: 'First claim.' },
        { start: '01:02:03', end: '01:02:03', text: 'Later claim.' }
      ],
      markdown: '[00:01] First claim.\n[01:02:03] Later claim.\nPlain line without timestamp.'
    });
  });

  it('replaces generated notes and frontmatter tags before the Transcript', () => {
    const document = `---
title: Existing
tags:
  - old-tag
---

# Existing

## Summary

_No generated summary yet._

## Generated notes

_No generated notes yet._

## Chat history

_No saved chat yet._

## Transcript

\`\`\`text
[00:01] A timestamped claim.
\`\`\`
`;

    const updated = replaceGeneratedNotes(document, metadata, generatedContent);

    expect(updated).toContain('tags:\n  - note-taking\n  - source-context\n  - ai-agents\n  - traceability\n  - generated-sections');
    expect(updated).not.toContain('old-tag');
    expect(updated).toContain('## Summary\n\nThis video explains how to preserve source context');
    expect(updated).toContain('### Preserve source context');
    expect(updated).toContain('[00:01](https://youtu.be/dQw4w9WgXcQ?t=1)');
    expect(updated).toContain('## Chat history\n\n_No saved chat yet._');
    expect(updated.indexOf('### Preserve source context')).toBeLessThan(updated.indexOf('## Transcript'));
  });

  it('inserts generated notes before the Transcript when generated markers are missing', () => {
    const document = `# Existing

Some manual content.

## Transcript

\`\`\`text
[00:01] A timestamped claim.
\`\`\`
`;

    const updated = replaceGeneratedNotes(document, metadata, generatedContent);

    expect(updated).toContain('Some manual content.\n\n## Summary');
    expect(updated.indexOf('## Summary')).toBeLessThan(updated.indexOf('## Transcript'));
  });

  it('appends a Saved chat answer before the Transcript and removes the empty placeholder', () => {
    const document = `# Existing

## Chat history

_No saved chat yet._

## Transcript

\`\`\`text
[00:01] A timestamped claim.
\`\`\`
`;

    const updated = appendSavedChatAnswer(document, {
      title: 'Why Traceability Matters',
      answer: 'Traceability.'
    });

    expect(updated).toContain('### Why Traceability Matters\n\nTraceability.');
    expect(updated).not.toContain('_No saved chat yet._');
    expect(updated.indexOf('### Why Traceability Matters')).toBeLessThan(updated.indexOf('## Transcript'));
  });

  it('appends legacy chat history before the Transcript', () => {
    const document = `# Existing

## Chat history

_No saved chat yet._

## Transcript

\`\`\`text
[00:01] A timestamped claim.
\`\`\`
`;

    const updated = appendChatHistory(
      document,
      [
        { id: '1', role: 'user', content: 'What matters?', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: '2', role: 'assistant', content: 'Traceability.', createdAt: '2026-01-01T00:00:01.000Z' }
      ],
      new Date('2026-01-01T00:00:02.000Z')
    );

    expect(updated).toContain('#### User\n\nWhat matters?');
    expect(updated).toContain('#### Assistant\n\nTraceability.');
    expect(updated).not.toContain('_No saved chat yet._');
    expect(updated.indexOf('### Chat')).toBeLessThan(updated.indexOf('## Transcript'));
  });
});
