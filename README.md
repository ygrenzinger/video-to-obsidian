# Video To Obsidian

Video To Obsidian is an Obsidian desktop plugin that turns YouTube subtitles into traceable Obsidian notes.

## Features

- Accepts a YouTube URL in a React custom view.
- Uses the installed `yt-dlp` executable once per import to discover metadata and subtitle URLs.
- Preserves timestamps in the Transcript used for chat and note extraction.
- Uses the Vercel AI SDK with Mistral, Google, Anthropic, or OpenAI.
- Creates one Video note per video URL.
- Extracts reviewed Atomic knowledge notes linked back to timestamped claims.

## Requirements

- Obsidian desktop.
- `yt-dlp` installed and configured by full executable path in plugin settings, such as `/opt/homebrew/bin/yt-dlp`.
- If YouTube asks `yt-dlp` to sign in or confirm you are not a bot, configure browser cookies from a browser where you are signed in to YouTube.
- At least one AI provider API key configured in plugin settings.

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
- `YouTube cookies from browser`: optional browser name passed to `yt-dlp --cookies-from-browser`, for example `chrome`, `safari`, `firefox`, or `edge`.
- `Video notes folder`: defaults to `Video notes`.
- `Atomic knowledge notes folder`: defaults to `Atomic knowledge notes`.
- `Maximum Atomic knowledge notes`: defaults to 8.
- Provider API keys and model IDs for Mistral, Google, Anthropic, and OpenAI.

Provider keys are stored in Obsidian plugin data as plain text.
