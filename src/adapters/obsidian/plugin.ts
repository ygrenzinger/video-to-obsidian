import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { isAbsolute } from 'node:path';
import { ChatService, generateChatAnswerTitle } from '../../application/transcript-chat';
import {
  DEFAULT_SETTINGS,
  type ChatMessage,
  type VideoSession,
  type VideoToObsidianSettings
} from '../../domain';
import { generateVideoNoteContent } from '../../application/video-note-generation';
import { importVideo as importVideoUseCase } from '../../application/import-video';
import { configuredProviderLabel, selectModel } from '../ai/model-selection';
import { AiCredentialStore } from './ai-credential-store';
import { VideoToObsidianSettingTab } from './settings';
import { VaultStorage } from './vault-storage';
import { VideoToObsidianView, VIEW_TYPE_VIDEO_TO_OBSIDIAN } from './view';
import { YtdlpService } from '../ytdlp/ytdlp-service';
import type { RuntimeLog } from '../../shared/runtime-log';
import type { TranscriptChatSession, VideoToObsidianWorkflow } from '../../application/ui-workflow';

export default class VideoToObsidianPlugin extends Plugin implements VideoToObsidianWorkflow {
  settings: VideoToObsidianSettings = structuredClone(DEFAULT_SETTINGS);
  private credentials!: AiCredentialStore;

  async onload(): Promise<void> {
    this.credentials = new AiCredentialStore(this.app);
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
    const ytdlp = this.createYtdlpService(onLog);
    const storage = new VaultStorage(this.app.vault);
    const result = await importVideoUseCase({
      url,
      settings: this.settings,
      transcriptAcquisition: ytdlp,
      videoNoteStore: storage,
      providerLabel: configuredProviderLabel(this.settings, this.getAiApiKey())
    });

    await this.saveSettings();
    await this.openVideoNote(result.videoNotePath);
    new Notice(result.reused ? `Reusing existing Video note: ${result.videoNotePath}` : `Video note ready: ${result.videoNotePath}`);

    return result;
  }

  createTranscriptChat(session: VideoSession, onLog?: RuntimeLog): TranscriptChatSession {
    return new ChatService(session.metadata.url, session.transcript, this.selectConfiguredModel(), onLog);
  }

  async generateVideoNoteContent(session: VideoSession, onLog?: RuntimeLog): Promise<void> {
    const generatedContent = await generateVideoNoteContent(
      session.metadata,
      session.transcript,
      this.selectConfiguredModel(),
      onLog
    );
    await new VaultStorage(this.app.vault).updateGeneratedContent(
      session.videoNotePath,
      session.metadata,
      generatedContent
    );
    new Notice('Video note summary generated.');
  }

  async saveChatHistory(session: VideoSession, messages: ChatMessage[]): Promise<void> {
    await new VaultStorage(this.app.vault).appendChatHistory(session.videoNotePath, messages);
    new Notice('Chat history appended to the Video note.');
  }

  async saveChatTurn(session: VideoSession, question: string, answer: string, onLog?: RuntimeLog): Promise<void> {
    const title = await generateChatAnswerTitle(question, answer, this.selectConfiguredModel(), onLog);
    await new VaultStorage(this.app.vault).appendChatTurn(session.videoNotePath, title, answer);
    new Notice('Chat answer appended to the Video note.');
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<VideoToObsidianSettings> | null;
    this.settings = mergeSettings(DEFAULT_SETTINGS, loaded ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  getAiApiKey(): string {
    return this.credentials.getApiKey(this.settings.aiProvider);
  }

  setAiApiKey(apiKey: string): void {
    this.credentials.setApiKey(this.settings.aiProvider, apiKey);
  }

  private selectConfiguredModel() {
    return selectModel(this.settings, this.getAiApiKey());
  }

  private createYtdlpService(onLog?: RuntimeLog): YtdlpService {
    return new YtdlpService(this.getYtdlpPath(), undefined, {
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

  private async openVideoNote(path: string): Promise<void> {
    const file = this.app.vault.getFileByPath(path);
    if (!file) return;

    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.openFile(file, { active: true });
    await this.app.workspace.revealLeaf(leaf);
  }
}

function mergeSettings(
  defaults: VideoToObsidianSettings,
  loaded: Partial<VideoToObsidianSettings>
): VideoToObsidianSettings {
  return {
    ytdlpPath: loaded.ytdlpPath ?? defaults.ytdlpPath,
    videoNotesFolder: loaded.videoNotesFolder?.trim() || defaults.videoNotesFolder,
    aiProvider: loaded.aiProvider ?? defaults.aiProvider,
    aiModelId: loaded.aiModelId ?? defaults.aiModelId,
    videoIndex: loaded.videoIndex ?? {}
  };
}
