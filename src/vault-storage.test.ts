import { describe, expect, it, vi } from 'vitest';
import type { Vault } from 'obsidian';
import { DEFAULT_SETTINGS } from './domain';
import { VaultStorage } from './vault-storage';

describe('VaultStorage', () => {
  it('creates a Video note at the vault root and indexes the video URL', async () => {
    const files = new Map<string, string>();
    const vault = {
      getAbstractFileByPath: vi.fn((path: string) => {
        if (files.has(path)) return { path };
        return null;
      }),
      getFileByPath: vi.fn((path: string) => (files.has(path) ? { path } : null)),
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

    expect(path).toBe('A Video- With Unsafe - Characters.md');
    expect(settings.videoIndex['https://youtu.be/dQw4w9WgXcQ']).toBe(path);
    expect(files.get(path)).toContain('videoUrl: "https://youtu.be/dQw4w9WgXcQ"');
    expect(files.get(path)).toContain('[00:01] A timestamped claim.');
  });

  it('reuses an existing Video note for the same video URL', async () => {
    const existingPath = 'Existing.md';
    const vault = {
      getFileByPath: vi.fn((path: string) => (path === existingPath ? { path } : null)),
      getAbstractFileByPath: vi.fn(),
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
  });
});
