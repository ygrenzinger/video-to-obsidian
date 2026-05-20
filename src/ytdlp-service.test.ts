import { describe, expect, it, vi } from 'vitest';
import { YtdlpService, type CommandRunner } from './ytdlp-service';

describe('YtdlpService', () => {
  it('downloads the best subtitle URL from yt-dlp metadata and returns a timestamp-preserving Transcript', async () => {
    const runner: CommandRunner = vi.fn().mockResolvedValue({
      stdout: JSON.stringify({
        id: 'dQw4w9WgXcQ',
        title: 'Example video',
        webpage_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        subtitles: {
          live_chat: [{ ext: 'json', url: 'https://example.test/live-chat.json', name: 'live_chat' }],
          en: [
            { ext: 'json3', url: 'https://example.test/en.json3', name: 'English' },
            { ext: 'vtt', url: 'https://example.test/en.vtt', name: 'English' }
          ]
        },
        automatic_captions: {
          'en-orig': [{ ext: 'vtt', url: 'https://example.test/en-orig.vtt', name: 'English (Original)' }]
        }
      }),
      stderr: ''
    });
    const fetchSubtitle = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => `WEBVTT

00:00:01.000 --> 00:00:04.000
First claim.

00:00:05.000 --> 00:00:07.000
Second claim.
`
    });

    const service = new YtdlpService('yt-dlp', runner, { fetchSubtitle, processDelayMs: 0 });

    await expect(service.downloadBestTranscript('https://youtu.be/dQw4w9WgXcQ')).resolves.toMatchObject({
      metadata: { id: 'dQw4w9WgXcQ', title: 'Example video' },
      subtitle: { code: 'en', name: 'English', type: 'uploaded' },
      transcript: { markdown: '[00:01] First claim.\n[00:05] Second claim.' }
    });

    expect(runner).toHaveBeenCalledOnce();
    expect(runner).toHaveBeenCalledWith('yt-dlp', [
      '--dump-json',
      '--skip-download',
      '--no-playlist',
      'https://youtu.be/dQw4w9WgXcQ'
    ]);
    expect(fetchSubtitle).toHaveBeenCalledWith('https://example.test/en.vtt');
  });

  it('uses original automatic captions when importing without uploaded subtitles', async () => {
    const runner: CommandRunner = vi.fn().mockResolvedValue({
      stdout: JSON.stringify({
        id: 'abc',
        title: 'Automatic captions only',
        automatic_captions: {
          en: [{ ext: 'vtt', url: 'https://example.test/en-translated.vtt', name: 'English' }],
          'fr-orig': [{ ext: 'vtt', url: 'https://example.test/fr-orig.vtt', name: 'French (Original)' }]
        }
      }),
      stderr: ''
    });
    const fetchSubtitle = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => `WEBVTT

00:00:01.000 --> 00:00:02.000
Bonjour.
`
    });
    const service = new YtdlpService('yt-dlp', runner, { fetchSubtitle, processDelayMs: 0 });

    await expect(service.downloadBestTranscript('https://youtu.be/abc')).resolves.toMatchObject({
      subtitle: { code: 'fr-orig', name: 'French (Original)', type: 'auto' },
      transcript: { markdown: '[00:01] Bonjour.' }
    });

    expect(fetchSubtitle).toHaveBeenCalledWith('https://example.test/fr-orig.vtt');
  });

  it('passes browser cookies to yt-dlp when configured', async () => {
    const runner: CommandRunner = vi.fn().mockResolvedValue({
      stdout: JSON.stringify({
        subtitles: {
          en: [{ ext: 'vtt', url: 'https://example.test/en.vtt', name: 'English' }]
        }
      }),
      stderr: ''
    });
    const fetchSubtitle = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => `WEBVTT

00:00:01.000 --> 00:00:02.000
Claim.
`
    });
    const service = new YtdlpService('yt-dlp', runner, {
      cookiesFromBrowser: 'chrome',
      fetchSubtitle,
      processDelayMs: 0
    });

    await service.downloadBestTranscript('https://youtu.be/dQw4w9WgXcQ');

    expect(runner).toHaveBeenCalledWith('yt-dlp', [
      '--cookies-from-browser',
      'chrome',
      '--dump-json',
      '--skip-download',
      '--no-playlist',
      'https://youtu.be/dQw4w9WgXcQ'
    ]);
  });

  it('logs each yt-dlp process command before running it', async () => {
    const onLog = vi.fn();
    const runner: CommandRunner = vi.fn().mockResolvedValue({ stdout: '2026.03.17\n', stderr: '' });
    const service = new YtdlpService('yt-dlp', runner, { onLog, processDelayMs: 0 });

    await service.getVersion();

    expect(onLog).toHaveBeenCalledWith('yt-dlp --version');
  });

  it('waits between yt-dlp process calls', async () => {
    const callTimes: number[] = [];
    const runner: CommandRunner = vi.fn(async () => {
      callTimes.push(Date.now());
      return { stdout: '2026.03.17\n', stderr: '' };
    });
    const service = new YtdlpService('yt-dlp', runner, { processDelayMs: 25 });

    await service.getVersion();
    await service.getVersion();

    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(20);
  });

  it('turns YouTube bot checks into plugin setup guidance', async () => {
    const runner: CommandRunner = vi.fn().mockRejectedValue(
      new Error(
        'ERROR: [youtube] abc: Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies for the authentication.'
      )
    );
    const service = new YtdlpService('yt-dlp', runner, { processDelayMs: 0 });

    await expect(service.downloadBestTranscript('https://youtu.be/dQw4w9WgXcQ')).rejects.toThrow(
      'set "YouTube cookies from browser"'
    );
  });

  it('does not search common install locations when the configured executable is missing', async () => {
    const runner: CommandRunner = vi.fn().mockRejectedValue(
      Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' })
    );
    const service = new YtdlpService('yt-dlp', runner, { processDelayMs: 0 });

    await expect(service.getVersion()).rejects.toThrow('Obsidian could not find "yt-dlp"');

    expect(runner).toHaveBeenCalledOnce();
    expect(runner).toHaveBeenCalledWith('yt-dlp', ['--version']);
  });

  it('turns missing executable errors into setup guidance', async () => {
    const runner: CommandRunner = vi.fn().mockRejectedValue(
      Object.assign(new Error('spawn missing-yt-dlp ENOENT'), { code: 'ENOENT' })
    );
    const service = new YtdlpService('missing-yt-dlp', runner, { processDelayMs: 0 });

    await expect(service.getVersion()).rejects.toThrow(
      'Obsidian could not find "missing-yt-dlp"'
    );
    await expect(service.getVersion()).rejects.toThrow(
      'Set "yt-dlp executable" in plugin settings to the full executable path'
    );
  });
});
