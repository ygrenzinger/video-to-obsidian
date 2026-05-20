import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type VideoToObsidianPlugin from './main';
import type { SupportedProvider } from './domain';

const PROVIDERS: SupportedProvider[] = ['mistral', 'google', 'anthropic', 'openai'];

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

    new Setting(containerEl).setName('AI providers').setHeading();

    for (const provider of PROVIDERS) {
      new Setting(containerEl)
        .setName(`${provider} API key`)
        .setDesc('Stored in Obsidian plugin data as plain text.')
        .addText((text) => {
          text.inputEl.type = 'password';
          text
            .setValue(this.plugin.settings.providers[provider].apiKey)
            .onChange(async (value) => {
              this.plugin.settings.providers[provider].apiKey = value.trim();
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName(`${provider} model ID`)
        .addText((text) =>
          text.setValue(this.plugin.settings.providers[provider].modelId).onChange(async (value) => {
            this.plugin.settings.providers[provider].modelId = value.trim();
            await this.plugin.saveSettings();
          })
        );
    }
  }
}
