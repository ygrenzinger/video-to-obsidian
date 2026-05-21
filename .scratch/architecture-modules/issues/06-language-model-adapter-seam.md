# Introduce a Language model adapter seam

Status: ready-for-agent
Type: AFK
User stories covered: 35-41, 47-54

## What to build

Introduce a narrow Language model adapter contract that hides direct AI SDK calls from Transcript chat, chat answer title generation, and Video note generation. Business modules should depend on this contract, and the concrete adapter should contain provider SDK details, structured generation calls, streaming text calls, finish reasons, usage metadata, and error normalization/logging details.

This should make chat and generation behavior testable without real provider calls or broad SDK mocking.

## Acceptance criteria

- [ ] Direct AI SDK calls are concentrated in a concrete adapter rather than scattered through chat and Video note generation modules.
- [ ] Transcript chat, chat answer title generation, and Video note generation depend on a fakeable Language model contract.
- [ ] Tests verify streaming chat chunks, persisted conversation messages, generated chat title sanitization, structured Video note generation, usage logging, and provider error propagation with fake model behavior.
- [ ] Runtime logs still include model provider/model ID context and useful finish or failure information.
- [ ] Existing provider selection behavior remains unchanged from the user's perspective.

## Blocked by

- `.scratch/architecture-modules/issues/05-rename-and-deepen-video-note-generation.md`

## Comments
