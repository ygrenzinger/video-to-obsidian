# Hide yt-dlp behind a Transcript acquisition contract

Status: ready-for-agent
Type: AFK
User stories covered: 5-13, 25

## What to build

Introduce a business-facing Transcript acquisition contract that can discover the best **Transcript source** for a video URL and download a timestamp-preserving **Transcript** from that source. The application layer should use the contract vocabulary, while the yt-dlp adapter keeps subtitle, caption, process, and fetch details private.

This should preserve the current source selection policy: uploaded Transcript sources first, original automatic sources as fallback, live chat excluded, and clear setup guidance for missing executables, permissions, bot checks, missing sources, and empty downloaded Transcript files.

## Acceptance criteria

- [ ] Application code depends on a Transcript acquisition contract using domain language such as Transcript source and Transcript.
- [ ] yt-dlp-specific subtitle/caption terms are contained inside the yt-dlp adapter or tests for that adapter.
- [ ] Import behavior still discovers metadata before reuse checks and downloads the Transcript only when a reusable stored Transcript is unavailable.
- [ ] Tests cover uploaded source preference, automatic original source fallback, command logging, process throttling, setup guidance errors, missing Transcript source errors, and empty Transcript failures.
- [ ] Existing user-facing runtime logs and error messages remain at least as helpful as before.

## Blocked by

- `.scratch/architecture-modules/issues/01-extract-video-note-import-use-case.md`

## Comments
