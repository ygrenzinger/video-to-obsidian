# Put Video note persistence behind a business store contract

Status: ready-for-agent
Type: AFK
User stories covered: 14-24, 27-34, 42-44

## What to build

Introduce a `VideoNoteStore` business contract for the operations the application layer needs: find a reusable **Video note**, create a **Video note**, read a stored **Transcript**, replace generated summary and **generated note sections**, and append saved chat content before the **Transcript**.

Keep Obsidian vault details in an adapter, and move deterministic **Video note** Markdown rendering/parsing rules into a separate module. The public contract should speak in project glossary terms rather than vault implementation details.

## Acceptance criteria

- [ ] Application-level flows depend on a `VideoNoteStore` contract rather than directly depending on Obsidian vault storage implementation details.
- [ ] Deterministic Markdown rendering/parsing for Video notes is isolated from vault file I/O.
- [ ] Tests cover Video note creation, safe path generation, note reuse, generated content replacement, tag writing, Transcript preservation at the end, and saved chat insertion before the Transcript.
- [ ] The Obsidian adapter remains responsible for folder creation, file collision handling, index updates, and vault reads/writes.
- [ ] Existing behavior and existing Video note Markdown shape are preserved unless the test update explicitly documents a glossary-alignment rename.

## Blocked by

- `.scratch/architecture-modules/issues/01-extract-video-note-import-use-case.md`

## Comments
