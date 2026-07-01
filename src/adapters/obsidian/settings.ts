import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type VideoToObsidianPlugin from './plugin';
import type { SupportedProvider } from '../../domain';
import { providerDefaultModelId, providerOptions } from '../ai/provider-catalog';

export class VideoToObsidianSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: VideoToObsidianPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('yt-dlp executable')
      .setDesc('Set the full path to the yt-dlp executable. The plugin will not search common install locations.')
      .addText((text) =>
        text
          .setPlaceholder('/opt/homebrew/bin/yt-dlp')
          .setValue(this.plugin.settings.ytdlpPath)
          .onChange(async (value) => {
            this.plugin.settings.ytdlpPath = value.trim();
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText('Test').onClick(async () => {
          try {
            const version = await this.plugin.testYtdlp();
            new Notice(`yt-dlp ${version}`);
          } catch (error) {
            new Notice(error instanceof Error ? error.message : 'yt-dlp test failed');
          }
        })
      );

    new Setting(containerEl)
      .setName('Video notes folder')
      .setDesc('Folder where imported Video notes are created.')
      .addText((text) =>
        text
          .setPlaceholder('Video notes')
          .setValue(this.plugin.settings.videoNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.videoNotesFolder = value.trim() || 'Video notes';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName('AI provider').setHeading();

    new Setting(containerEl)
      .setName('Provider')
      .setDesc('Choose the AI API used for chat and generated Video note content.')
      .addDropdown((dropdown) => {
        for (const provider of providerOptions) {
          dropdown.addOption(provider.id, provider.id);
        }

        dropdown.setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
          this.plugin.settings.aiProvider = value as SupportedProvider;
          this.plugin.settings.aiModelId = '';
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(`${this.plugin.settings.aiProvider} API key`)
      .setDesc('Required. Stored in Obsidian secret storage, outside plugin data.json.')
      .addText((text) => {
        text.inputEl.type = 'password';
        text
          .setPlaceholder('Required')
          .setValue(this.plugin.getAiApiKey())
          .onChange(async (value) => {
            this.plugin.setAiApiKey(value);
          });
      });

    new Setting(containerEl)
      .setName('Model ID')
      .setDesc(`Optional. Leave empty to use ${providerDefaultModelId(this.plugin.settings.aiProvider)}.`)
      .addText((text) =>
        text
          .setPlaceholder(providerDefaultModelId(this.plugin.settings.aiProvider))
          .setValue(this.plugin.settings.aiModelId)
          .onChange(async (value) => {
            this.plugin.settings.aiModelId = value.trim();
            await this.plugin.saveSettings();
          })
      );
  }
}
