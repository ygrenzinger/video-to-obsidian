import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { isAbsolute } from 'node:path';
import { ChatService } from './chat-service';
import {
  DEFAULT_SETTINGS,
  type AtomicNoteCandidate,
  type ChatMessage,
  type VideoSession,
  type VideoToObsidianSettings
} from './domain';
import { extractAtomicNoteCandidates } from './knowledge-service';
import { configuredProviderLabel, selectModel } from './model-selection';
import { VideoToObsidianSettingTab } from './settings';
import { isValidYouTubeUrl } from './youtube';
import { VaultStorage } from './vault-storage';
import { VideoToObsidianView, VIEW_TYPE_VIDEO_TO_OBSIDIAN } from './view';
import { YtdlpService } from './ytdlp-service';
import type { RuntimeLog } from './runtime-log';

export default class VideoToObsidianPlugin extends Plugin {
  settings: VideoToObsidianSettings = structuredClone(DEFAULT_SETTINGS);

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_VIDEO_TO_OBSIDIAN,
      (leaf) => new VideoToObsidianView(leaf, this)
    );

    this.addRibbonIcon('file-video', 'Video To Obsidian', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-video-to-obsidian',
      name: 'Open Video To Obsidian',
      callback: () => void this.activateView()
    });

    this.addSettingTab(new VideoToObsidianSettingTab(this.app, this));
  }

  async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_VIDEO_TO_OBSIDIAN);
    let leaf: WorkspaceLeaf | null = leaves[0] ?? null;

    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (!leaf) throw new Error('Unable to create a workspace leaf for Video To Obsidian.');
      await leaf.setViewState({ type: VIEW_TYPE_VIDEO_TO_OBSIDIAN, active: true });
    }

    this.app.workspace.revealLeaf(leaf);
  }

  async testYtdlp(onLog?: RuntimeLog): Promise<string> {
    return new YtdlpService(this.getYtdlpPath(), undefined, { onLog }).getVersion();
  }

  async importVideo(url: string, onLog?: RuntimeLog): Promise<VideoSession> {
    if (!isValidYouTubeUrl(url)) {
      throw new Error('Enter a valid YouTube URL.');
    }

    const ytdlp = this.createYtdlpService(onLog);
    const { metadata, subtitle, subtitleUrl } = await ytdlp.getBestTranscriptSource(url);
    const storage = new VaultStorage(this.app.vault);
    const existingPath = storage.getExistingVideoNotePath(this.settings, metadata, url);
    if (existingPath) {
      const existingTranscript = await storage.readTranscriptFromVideoNote(existingPath);
      if (existingTranscript) {
        new Notice(`Reusing existing Video note: ${existingPath}`);
        return { metadata, subtitle, transcript: existingTranscript, videoNotePath: existingPath };
      }
    }

    const transcript = await ytdlp.downloadTranscriptFromSubtitleUrl(subtitleUrl);
    const videoNotePath = await storage.createOrReuseVideoNote(
      this.settings,
      metadata,
      subtitle,
      transcript,
      configuredProviderLabel(this.settings)
    );

    await this.saveSettings();
    new Notice(`Video note ready: ${videoNotePath}`);

    return { metadata, subtitle, transcript, videoNotePath };
  }

  createChatService(session: VideoSession, onLog?: RuntimeLog): ChatService {
    return new ChatService(session.metadata.url, session.transcript, selectModel(this.settings), onLog);
  }

  async extractAtomicNotes(session: VideoSession, onLog?: RuntimeLog): Promise<AtomicNoteCandidate[]> {
    return extractAtomicNoteCandidates(
      session.metadata,
      session.transcript,
      selectModel(this.settings),
      this.settings.maxAtomicNotes,
      onLog
    );
  }

  async saveChatHistory(session: VideoSession, messages: ChatMessage[]): Promise<void> {
    await new VaultStorage(this.app.vault).appendChatHistory(session.videoNotePath, messages);
    new Notice('Chat history appended to the Video note.');
  }

  async createAtomicNotes(session: VideoSession, candidates: AtomicNoteCandidate[]): Promise<string[]> {
    const paths = await new VaultStorage(this.app.vault).createAtomicNotes(
      this.settings,
      session.metadata,
      session.videoNotePath,
      candidates
    );
    new Notice(`Created ${paths.length} Atomic knowledge note${paths.length === 1 ? '' : 's'}.`);
    return paths;
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<VideoToObsidianSettings> | null;
    this.settings = mergeSettings(DEFAULT_SETTINGS, loaded ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private createYtdlpService(onLog?: RuntimeLog): YtdlpService {
    return new YtdlpService(this.getYtdlpPath(), undefined, {
      cookiesFromBrowser: this.settings.ytdlpCookiesFromBrowser,
      onLog
    });
  }

  private getYtdlpPath(): string {
    const path = this.settings.ytdlpPath.trim();
    if (!path || !isAbsolute(path)) {
      throw new Error(
        'Set "yt-dlp executable" in plugin settings to the full executable path, such as /opt/homebrew/bin/yt-dlp.'
      );
    }

    return path;
  }
}

function mergeSettings(
  defaults: VideoToObsidianSettings,
  loaded: Partial<VideoToObsidianSettings>
): VideoToObsidianSettings {
  return {
    ...structuredClone(defaults),
    ...loaded,
    providers: {
      ...structuredClone(defaults.providers),
      ...(loaded.providers ?? {})
    },
    videoIndex: loaded.videoIndex ?? {}
  };
}
