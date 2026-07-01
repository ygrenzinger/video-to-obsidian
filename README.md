# Video To Obsidian

Video To Obsidian is an Obsidian desktop plugin that turns YouTube subtitles into traceable Obsidian notes.

## Features

- Accepts a YouTube URL in a React custom view.
- Uses the installed `yt-dlp` executable once per import to discover metadata and subtitle URLs.
- Preserves timestamps in the Transcript used for chat and generated Video note content.
- Uses the Vercel AI SDK with Mistral, Google, Anthropic, or OpenAI.
- Creates one Video note per video URL, then can generate a concise summary and reusable note sections on demand.

## Requirements

- Obsidian desktop.
- `yt-dlp` installed and configured by full executable path in plugin settings, such as `/opt/homebrew/bin/yt-dlp`.
- One AI provider selected in plugin settings, with its required API key configured.

## Development

This repo uses `pnpm` and commits `pnpm-lock.yaml`. Supply-chain hardening settings live in `pnpm-workspace.yaml`.

```bash
pnpm install
pnpm run dev
```

For production build:

```bash
pnpm run build
```

The Obsidian plugin release assets are:

- `main.js`
- `manifest.json`
- `styles.css`

## Settings

- `yt-dlp executable`: full path to the executable. The plugin does not search common install locations.
- `Video notes folder`: folder where imported Video notes are created. Defaults to `Video notes`.
- `AI provider`: select Mistral, Google, Anthropic, or OpenAI.
- `API key`: required key for the selected provider.
- `Model ID`: optional override. Leave empty to use the selected provider's default model.

Provider API keys are stored in Obsidian secret storage, outside the plugin `data.json` file.
