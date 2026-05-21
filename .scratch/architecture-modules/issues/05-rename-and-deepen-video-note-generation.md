# Rename and deepen Video note generation

Status: ready-for-agent
Type: AFK
User stories covered: 26-34, 53-55

## What to build

Replace the vague generated-knowledge seam with a business module for **Video note** generation. The module should generate the concise summary, tags, and **generated note sections** for one imported **Transcript**, then filter unsupported **Timestamped claims** before anything is written to the Video note.

Use the glossary terms from `CONTEXT.md` in module names, tests, prompts where appropriate, and user-visible labels where the persisted Markdown contract can change safely.

## Acceptance criteria

- [ ] The generation module and its tests use Video note, generated note section, Transcript, and Timestamped claim terminology instead of broad knowledge terminology.
- [ ] The generation contract returns business data before Markdown rendering; storage remains responsible for deterministic Video note writes.
- [ ] Unsupported Timestamped claims are filtered against exact Transcript timestamps before persistence.
- [ ] Tests cover structured output handling, prompt constraints that protect traceability, timestamp filtering, runtime logging, and error propagation with a controllable model seam or fake.
- [ ] Regenerating content still replaces only the generated summary and generated note section block while preserving chat history and the Transcript at the end.

## Blocked by

- `.scratch/architecture-modules/issues/02-video-note-store-business-contract.md`

## Comments
