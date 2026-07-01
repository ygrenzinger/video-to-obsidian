# Store Provider Keys In Obsidian Secret Storage

AI provider keys are stored in Obsidian secret storage instead of plugin `data.json`. Normal plugin settings remain in Obsidian plugin data, but API keys are kept outside the vault files users commonly commit or sync.

This is a breaking settings change. Existing API keys previously saved in plugin data are ignored and must be entered again through the plugin settings.
