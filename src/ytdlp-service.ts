import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { SubtitleLanguage, Transcript, VideoMetadata } from './domain';
import { parseSrt } from './transcript';
import { extractYouTubeVideoId } from './youtube';

const execFileAsync = promisify(execFile);

type ExecResult = {
  stdout: string;
  stderr: string;
};

const YTDLP_CALL_DELAY_MS = 2000;

export type CommandRunner = (command: string, args: string[]) => Promise<ExecResult>;

export type SubtitleFetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
}>;

export type YtdlpOptions = {
  fetchSubtitle?: SubtitleFetcher;
  onLog?: (message: string) => void;
  processDelayMs?: number;
};

type YtdlpSubtitleFormat = {
  ext?: string;
  url?: string;
  name?: string;
};

type YtdlpInfoJson = {
  id?: string;
  title?: string;
  webpage_url?: string;
  duration?: number;
  uploader?: string;
  subtitles?: Record<string, YtdlpSubtitleFormat[]>;
  automatic_captions?: Record<string, YtdlpSubtitleFormat[]>;
};

type SubtitleSource = SubtitleLanguage & {
  url: string;
};

const defaultRunner: CommandRunner = (command, args) =>
  execFileAsync(command, args, {
    maxBuffer: 20 * 1024 * 1024,
    encoding: 'utf8'
  }) as Promise<ExecResult>;

let nextYtdlpCallAt = 0;
let ytdlpCallGate: Promise<void> = Promise.resolve();

export class YtdlpService {
  constructor(
    private readonly executablePath: string,
    private readonly runner: CommandRunner = defaultRunner,
    private readonly options: YtdlpOptions = {}
  ) {}

  async getVersion(): Promise<string> {
    const result = await this.exec(['--version']);
    return result.stdout.trim();
  }

  async downloadBestTranscript(url: string): Promise<{
    metadata: VideoMetadata;
    subtitle: SubtitleLanguage;
    transcript: Transcript;
  }> {
    const { metadata, subtitle, subtitleUrl } = await this.getBestTranscriptSource(url);
    return {
      metadata,
      subtitle,
      transcript: await this.downloadTranscriptFromSubtitleUrl(subtitleUrl)
    };
  }

  async getBestTranscriptSource(url: string): Promise<{
    metadata: VideoMetadata;
    subtitle: SubtitleLanguage;
    subtitleUrl: string;
  }> {
    const result = await this.exec(['--dump-json', '--skip-download', '--no-playlist', url]);
    const parsed = JSON.parse(result.stdout) as YtdlpInfoJson;
    const subtitle = selectBestSubtitle(parsed);
    if (!subtitle) {
      throw new Error('No uploaded subtitles or matching automatic captions were found.');
    }

    return {
      metadata: metadataFromInfoJson(parsed, url),
      subtitle: { code: subtitle.code, name: subtitle.name, type: subtitle.type },
      subtitleUrl: subtitle.url
    };
  }

  async downloadTranscriptFromSubtitleUrl(subtitleUrl: string): Promise<Transcript> {
    const response = await (this.options.fetchSubtitle ?? fetch)(subtitleUrl);
    if (!response.ok) {
      throw new Error(
        `Unable to download subtitle file (${response.status} ${response.statusText}).`
      );
    }

    const transcript = parseSrt(await response.text());
    if (transcript.cues.length === 0) {
      throw new Error('Downloaded subtitle file did not contain parseable timestamped cues.');
    }

    return transcript;
  }

  private async exec(args: string[]): Promise<ExecResult> {
    try {
      await waitForYtdlpCallSlot(this.options.processDelayMs ?? YTDLP_CALL_DELAY_MS);
      this.log(formatCommand(this.executablePath, args));
      return await this.runner(this.executablePath, args);
    } catch (error) {
      throw normalizeExecutionError(error, this.executablePath);
    }
  }

  private log(message: string): void {
    this.options.onLog?.(message);
  }
}

async function waitForYtdlpCallSlot(delayMs: number): Promise<void> {
  if (delayMs <= 0) return;

  const previousGate = ytdlpCallGate;
  let releaseGate: () => void = () => undefined;
  ytdlpCallGate = new Promise((resolve) => {
    releaseGate = resolve;
  });

  await previousGate;

  const waitMs = Math.max(0, nextYtdlpCallAt - Date.now());
  if (waitMs > 0) await delay(waitMs);
  nextYtdlpCallAt = Date.now() + Math.max(0, delayMs);
  releaseGate();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function metadataFromInfoJson(parsed: YtdlpInfoJson, url: string): VideoMetadata {
  return {
    id: parsed.id ?? extractYouTubeVideoId(url) ?? url,
    title: parsed.title ?? 'Untitled video',
    url: parsed.webpage_url ?? url,
    duration: parsed.duration,
    uploader: parsed.uploader
  };
}

function selectBestSubtitle(info: YtdlpInfoJson): SubtitleSource | null {
  const uploaded = subtitleSources(info.subtitles, 'uploaded').filter(
    (subtitle) => subtitle.code !== 'live_chat'
  );
  if (uploaded.length > 0) return uploaded[0];

  const automaticOriginal = subtitleSources(info.automatic_captions, 'auto').filter(
    (subtitle) => subtitle.code !== 'live_chat' && subtitle.code.endsWith('-orig')
  );
  return automaticOriginal[0] ?? null;
}

function subtitleSources(
  subtitles: Record<string, YtdlpSubtitleFormat[]> | undefined,
  type: SubtitleLanguage['type']
): SubtitleSource[] {
  if (!subtitles) return [];

  return Object.entries(subtitles).flatMap(([code, formats]) => {
    const format = bestSubtitleFormat(formats);
    return format?.url ? [{ code, name: format.name ?? code, type, url: format.url }] : [];
  });
}

function bestSubtitleFormat(formats: YtdlpSubtitleFormat[]): YtdlpSubtitleFormat | undefined {
  return (
    formats.find((format) => format.ext === 'srt' && format.url) ??
    formats.find((format) => format.ext === 'vtt' && format.url) ??
    formats.find((format) => format.url)
  );
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map(shellQuote).join(' ');
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function normalizeExecutionError(error: unknown, configuredPath: string): Error {
  const code = getErrorCode(error);
  if (code === 'ENOENT') {
    return new Error(
      `Unable to run yt-dlp. Obsidian could not find "${configuredPath}". Set "yt-dlp executable" in plugin settings to the full executable path, such as /opt/homebrew/bin/yt-dlp.`
    );
  }

  if (code === 'EACCES') {
    return new Error(
      `Unable to run yt-dlp at "${configuredPath}" because it is not executable. Check the configured path and file permissions.`
    );
  }

  if (isYouTubeAuthenticationError(error)) {
    return new Error(
      'YouTube asked yt-dlp to authenticate this request. Browser-cookie authentication is not configurable in the plugin right now. Try another video or retry later.'
    );
  }

  return error instanceof Error ? error : new Error('yt-dlp failed unexpectedly.');
}

function isYouTubeAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    /YouTube asked yt-dlp to authenticate/i.test(error.message) ||
    /Sign in to confirm/i.test(error.message) ||
    /--cookies-from-browser/i.test(error.message) ||
    /pass cookies to yt-dlp/i.test(error.message)
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
