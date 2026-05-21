# Expose a UI workflow contract instead of the plugin class

Status: ready-for-agent
Type: AFK
User stories covered: 1, 2, 25-46

## What to build

Make the React view consume a narrow UI workflow contract instead of the full plugin class or concrete chat implementation. The contract should expose the user actions the UI can perform: import a video, generate Video note content, start or use a Transcript chat session, save a chat turn, and receive runtime log events.

The Obsidian view/plugin layer should construct the workflow implementation from the application use cases and adapters. The UI should remain responsible for presentation state, button enablement, streaming display, save status, and runtime log rendering.

## Acceptance criteria

- [ ] The React app no longer imports the plugin class or concrete chat implementation directly.
- [ ] The Obsidian view supplies a workflow implementation that preserves existing import, generate summary, chat, save answer, and runtime log behavior.
- [ ] The UI contract uses Video note, Transcript, and chat turn terminology aligned with the domain glossary.
- [ ] A fake workflow can drive the React app in tests or a lightweight harness without constructing an Obsidian plugin instance.
- [ ] Existing user-visible UI behavior remains unchanged: import status, error display, streaming answers, duplicate save prevention, generated summary status, and log clearing all still work.

## Blocked by

- `.scratch/architecture-modules/issues/01-extract-video-note-import-use-case.md`
- `.scratch/architecture-modules/issues/05-rename-and-deepen-video-note-generation.md`
- `.scratch/architecture-modules/issues/06-language-model-adapter-seam.md`

## Comments
