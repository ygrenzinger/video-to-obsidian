import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type VideoToObsidianPlugin from './main';
import type { SupportedProvider } from './domain';

const PROVIDERS: SupportedProvider[] = ['mistral', 'google', 'anthropic', 'openai'];

const COOKIE_BROWSER_OPTIONS: Record<string, string> = {
  '': 'None',
  chrome: 'Chrome',
  safari: 'Safari',
  firefox: 'Firefox',
  edge: 'Edge',
  chromium: 'Chromium',
  brave: 'Brave',
  opera: 'Opera',
  vivaldi: 'Vivaldi'
};

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
      .setName('YouTube cookies from browser')
      .setDesc('Optional. Use this when YouTube asks yt-dlp to sign in or confirm you are not a bot.')
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(COOKIE_BROWSER_OPTIONS)) {
          dropdown.addOption(value, label);
        }

        const currentValue = this.plugin.settings.ytdlpCookiesFromBrowser;
        if (currentValue && !(currentValue in COOKIE_BROWSER_OPTIONS)) {
          dropdown.addOption(currentValue, currentValue);
        }

        dropdown.setValue(currentValue).onChange(async (value) => {
          this.plugin.settings.ytdlpCookiesFromBrowser = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Atomic knowledge notes folder')
      .addText((text) =>
        text.setValue(this.plugin.settings.atomicNotesFolder).onChange(async (value) => {
          this.plugin.settings.atomicNotesFolder = value.trim() || 'Atomic knowledge notes';
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Maximum Atomic knowledge notes')
      .setDesc('The model can return fewer notes when the Transcript has fewer strong ideas.')
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.maxAtomicNotes)
          .onChange(async (value) => {
            this.plugin.settings.maxAtomicNotes = value;
            await this.plugin.saveSettings();
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
