# Extract the Video note import use case

Status: ready-for-agent
Type: AFK
User stories covered: 3, 4, 14-25

## What to build

Move the business orchestration for creating or reusing a **Video note** into an application-level import use case. The use case should accept a video URL, the current settings or settings-facing data it needs, and concrete adapters for Transcript acquisition and Video note storage. It should return a `VideoSession` without importing Obsidian or React concerns.

The plugin shell should keep responsibility for Obsidian lifecycle, notices, settings persistence, and adapter construction only. Existing user-visible import behavior should remain unchanged: invalid YouTube URLs fail early, reusable Video notes are reused when their stored Transcript exists, new Video notes are created without calling the LLM, and runtime logs still reach the UI.

## Acceptance criteria

- [ ] Import orchestration lives in a business use case that does not depend on Obsidian UI classes or React.
- [ ] The plugin delegates import behavior to the use case while preserving existing notices, settings persistence, runtime logging, and returned `VideoSession` behavior.
- [ ] Tests cover invalid URL rejection, reusable Video note reuse, new Video note creation, and failure propagation using fake adapters rather than real Obsidian or yt-dlp calls.
- [ ] Existing tests continue to pass without changing the documented one-Video-note-per-video invariant.

## Blocked by

None - can start immediately

## Comments
