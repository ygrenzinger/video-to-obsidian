import { describe, expect, it, vi } from 'vitest';
import { TFile, TFolder, type Vault } from 'obsidian';
import { DEFAULT_SETTINGS } from './domain';
import { VaultStorage } from './vault-storage';

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

describe('VaultStorage', () => {
  it('creates a Video note in the default Video notes folder and indexes the video URL', async () => {
    const folders = new Set<string>();
    const files = new Map<string, string>();
    const vault = {
      getAbstractFileByPath: vi.fn((path: string) => {
        if (folders.has(path)) return Object.assign(Object.create(TFolder.prototype) as TFolder, { path });
        if (files.has(path)) return { path };
        return null;
      }),
      getFileByPath: vi.fn((path: string) => (files.has(path) ? { path } : null)),
      createFolder: vi.fn(async (path: string) => {
        folders.add(path);
      }),
      create: vi.fn(async (path: string, content: string) => {
        files.set(path, content);
      })
    } as unknown as Vault;

    const settings = structuredClone(DEFAULT_SETTINGS);

    const path = await new VaultStorage(vault).createOrReuseVideoNote(
      settings,
      { id: 'dQw4w9WgXcQ', title: 'A Video: With Unsafe / Characters', url: 'https://youtu.be/dQw4w9WgXcQ' },
      { code: 'en', name: 'English', type: 'uploaded' },
      { cues: [], rawSrt: '', markdown: '[00:01] A timestamped claim.' },
      'mistral (mistral-small-latest)'
    );

    expect(path).toBe('Video notes/A Video- With Unsafe - Characters.md');
    expect(folders.has('Video notes')).toBe(true);
    expect(settings.videoIndex['https://youtu.be/dQw4w9WgXcQ']).toBe(path);
    expect(files.get(path)).toContain('videoUrl: "https://youtu.be/dQw4w9WgXcQ"');
    expect(files.get(path)).toContain('## Summary\n\n_No generated summary yet._');
    expect(files.get(path)).toContain('## Generated notes\n\n_No generated notes yet._');
    expect(files.get(path)).toContain('[00:01] A timestamped claim.');
    expect(files.get(path)?.trimEnd().endsWith('```')).toBe(true);
  });

  it('creates a Video note in a configured nested folder', async () => {
    const folders = new Set<string>();
    const files = new Map<string, string>();
    const vault = {
      getAbstractFileByPath: vi.fn((path: string) => {
        if (folders.has(path)) return Object.assign(Object.create(TFolder.prototype) as TFolder, { path });
        if (files.has(path)) return { path };
        return null;
      }),
      getFileByPath: vi.fn((path: string) => (files.has(path) ? { path } : null)),
      createFolder: vi.fn(async (path: string) => {
        folders.add(path);
      }),
      create: vi.fn(async (path: string, content: string) => {
        files.set(path, content);
      })
    } as unknown as Vault;

    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.videoNotesFolder = 'Research/Videos';

    const path = await new VaultStorage(vault).createOrReuseVideoNote(
      settings,
      { id: 'dQw4w9WgXcQ', title: 'A Video', url: 'https://youtu.be/dQw4w9WgXcQ' },
      { code: 'en', name: 'English', type: 'uploaded' },
      { cues: [], rawSrt: '', markdown: '[00:01] A timestamped claim.' },
      'mistral (mistral-small-latest)'
    );

    expect(path).toBe('Research/Videos/A Video.md');
    expect(folders.has('Research')).toBe(true);
    expect(folders.has('Research/Videos')).toBe(true);
  });

  it('updates generated content before the Transcript', async () => {
    const path = 'Existing.md';
    const file = Object.assign(Object.create(TFile.prototype) as TFile, { path });
    let content = `# Existing\n\n## Summary\n\n_No generated summary yet._\n\n## Generated notes\n\n_No generated notes yet._\n\n## Chat history\n\n_No saved chat yet._\n\n## Transcript\n\n\`\`\`text\n[00:01] A timestamped claim.\n\`\`\`\n`;
    const vault = {
      getFileByPath: vi.fn((requestedPath: string) => (requestedPath === path ? file : null)),
      process: vi.fn(async (_file: unknown, callback: (current: string) => string) => {
        content = callback(content);
      })
    } as unknown as Vault;

    await new VaultStorage(vault).updateGeneratedContent(
      path,
      { id: 'dQw4w9WgXcQ', title: 'Existing', url: 'https://youtu.be/dQw4w9WgXcQ' },
      generatedContent
    );

    expect(content).toContain('## Summary\n\nThis video explains how to preserve source context');
    expect(content).toContain('tags:\n  - note-taking\n  - source-context\n  - ai-agents\n  - traceability\n  - generated-sections');
    expect(content).toContain('### Preserve source context');
    expect(content).toContain('[00:01](https://youtu.be/dQw4w9WgXcQ?t=1)');
    expect(content).not.toContain('#note-taking');
    expect(content).toContain('## Chat history\n\n_No saved chat yet._');
    expect(content.trimEnd().endsWith('```')).toBe(true);
    expect(content.indexOf('### Preserve source context')).toBeLessThan(content.indexOf('## Transcript'));
  });

  it('replaces existing frontmatter tags with generated slugified tags', async () => {
    const path = 'Existing.md';
    const file = Object.assign(Object.create(TFile.prototype) as TFile, { path });
    let content = `---\ntitle: Existing\ntags:\n  - old-tag\n---\n\n# Existing\n\n## Summary\n\n_No generated summary yet._\n\n## Generated notes\n\n_No generated notes yet._\n\n## Chat history\n\n_No saved chat yet._\n\n## Transcript\n\n\`\`\`text\n[00:01] A timestamped claim.\n\`\`\`\n`;
    const vault = {
      getFileByPath: vi.fn((requestedPath: string) => (requestedPath === path ? file : null)),
      process: vi.fn(async (_file: unknown, callback: (current: string) => string) => {
        content = callback(content);
      })
    } as unknown as Vault;

    await new VaultStorage(vault).updateGeneratedContent(
      path,
      { id: 'dQw4w9WgXcQ', title: 'Existing', url: 'https://youtu.be/dQw4w9WgXcQ' },
      generatedContent
    );

    expect(content).toContain('---\ntitle: Existing\ntags:\n  - note-taking\n  - source-context\n  - ai-agents\n  - traceability\n  - generated-sections\n---');
    expect(content).not.toContain('old-tag');
  });

  it('reuses an existing Video note for the same video URL', async () => {
    const existingPath = 'Video notes/Existing.md';
    const vault = {
      getFileByPath: vi.fn((path: string) => (path === existingPath ? { path } : null)),
      getAbstractFileByPath: vi.fn(),
      createFolder: vi.fn(),
      create: vi.fn()
    } as unknown as Vault;

    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.videoIndex['https://youtu.be/dQw4w9WgXcQ'] = existingPath;

    const path = await new VaultStorage(vault).createOrReuseVideoNote(
      settings,
      { id: 'dQw4w9WgXcQ', title: 'Existing', url: 'https://youtu.be/dQw4w9WgXcQ' },
      { code: 'en', name: 'English', type: 'uploaded' },
      { cues: [], rawSrt: '', markdown: '[00:01] A timestamped claim.' },
      'mistral (mistral-small-latest)'
    );

    expect(path).toBe(existingPath);
    expect(vault.create).not.toHaveBeenCalled();
    expect(vault.createFolder).not.toHaveBeenCalled();
  });

  it('appends chat history before the Transcript so the Transcript remains at the end', async () => {
    const path = 'Existing.md';
    const file = Object.assign(Object.create(TFile.prototype) as TFile, { path });
    let content = `# Existing\n\n## Chat history\n\n_No saved chat yet._\n\n## Transcript\n\n\`\`\`text\n[00:01] A timestamped claim.\n\`\`\`\n`;
    const vault = {
      getFileByPath: vi.fn((requestedPath: string) => (requestedPath === path ? file : null)),
      process: vi.fn(async (_file: unknown, callback: (current: string) => string) => {
        content = callback(content);
      })
    } as unknown as Vault;

    await new VaultStorage(vault).appendChatHistory(path, [
      { id: '1', role: 'user', content: 'What matters?', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', role: 'assistant', content: 'Traceability.', createdAt: '2026-01-01T00:00:01.000Z' }
    ]);

    expect(content).toContain('#### User\n\nWhat matters?');
    expect(content).toContain('#### Assistant\n\nTraceability.');
    expect(content).not.toContain('_No saved chat yet._');
    expect(content.trimEnd().endsWith('```')).toBe(true);
    expect(content.indexOf('### Chat')).toBeLessThan(content.indexOf('## Transcript'));
  });

  it('appends one saved chat turn before the Transcript', async () => {
    const path = 'Existing.md';
    const file = Object.assign(Object.create(TFile.prototype) as TFile, { path });
    let content = `# Existing\n\n## Chat history\n\n_No saved chat yet._\n\n## Transcript\n\n\`\`\`text\n[00:01] A timestamped claim.\n\`\`\`\n`;
    const vault = {
      getFileByPath: vi.fn((requestedPath: string) => (requestedPath === path ? file : null)),
      process: vi.fn(async (_file: unknown, callback: (current: string) => string) => {
        content = callback(content);
      })
    } as unknown as Vault;

    await new VaultStorage(vault).appendChatTurn(path, 'What matters?', 'Traceability.');

    expect(content).toContain('#### Question\n\nWhat matters?');
    expect(content).toContain('#### Answer\n\nTraceability.');
    expect(content).not.toContain('_No saved chat yet._');
    expect(content.trimEnd().endsWith('```')).toBe(true);
    expect(content.indexOf('#### Answer')).toBeLessThan(content.indexOf('## Transcript'));
  });
});
