# Architecture Improvement Proposals

These proposals come from a read-only architecture review using the project glossary from `CONTEXT.md`.

## 1. Deepen The Video Note Document Module

**Files:**

- `src/markdown/video-note-markdown.ts`
- `src/adapters/obsidian/vault-storage.ts`
- `src/adapters/obsidian/vault-storage.test.ts`

**Problem:**

The **Video note** Markdown format is split across modules. `video-note-markdown.ts` renders headings, but `vault-storage.ts` edits by hardcoded string markers like `## Summary`, `## Chat history`, and `## Transcript`.

**Solution:**

Make a deeper **Video note document** module that owns create, extract, replace, and append operations for the Markdown document. `VaultStorage` should mostly read and write vault files.

**Benefits:**

Better locality for all Markdown rules. Tests can verify the **Video note** contract without Obsidian stubs.

## 2. Collapse Shallow VaultStorage Pass-Throughs

**Files:**

- `src/adapters/obsidian/vault-storage.ts`
- `src/application/import-video.ts`

**Problem:**

`VaultStorage` now exposes both old names and new contract names:

- `findReusableVideoNote()` delegates to `getExistingVideoNotePath()`
- `readTranscript()` delegates to `readTranscriptFromVideoNote()`
- `createVideoNote()` delegates to `createOrReuseVideoNote()`

Deletion test: deleting either set would reduce confusion, not lose real behavior.

**Solution:**

Keep one public interface. Prefer the business-facing `VideoNoteStore` names and make legacy methods private or remove them.

**Benefits:**

Smaller interface, less caller knowledge, cleaner tests against the real seam.

## 3. Make Transcript Acquisition Contract-First

**Files:**

- `src/adapters/ytdlp/ytdlp-service.ts`
- `src/application/import-video.ts`
- `src/adapters/ytdlp/ytdlp-service.test.ts`

**Problem:**

`YtdlpService` now has the new contract methods, but still exposes older methods: `downloadBestTranscript`, `getBestTranscriptSource`, and `downloadTranscriptFromSubtitleUrl`. Tests still rely on older vocabulary.

**Solution:**

Treat `discoverBestTranscriptSource()` and `downloadTranscript()` as the public seam. Keep subtitle and caption details internal to the yt-dlp adapter.

**Benefits:**

Better domain language, fewer public methods, tests align with the use-case interface.

## 4. Clarify Chat State Ownership

**Files:**

- `src/application/transcript-chat.ts`
- `src/ui/VideoToObsidianApp.tsx`
- `src/application/ui-workflow.ts`

**Problem:**

`ChatService` owns messages, but the UI also creates and owns `ChatMessage[]`. `TranscriptChatSession.getMessages()` exists but the UI does not use it meaningfully.

**Solution:**

Pick one owner:

- Either `ChatService` owns chat turns and the UI renders session state.
- Or the UI owns display state and chat becomes a stateless answer stream.

**Benefits:**

Fewer duplicate states, clearer failure and retry behavior, better tests for saved question-and-answer turns.

## 5. Strengthen Timestamped Claim Validation

**Files:**

- `src/application/video-note-generation.ts`
- `src/application/video-note-generation.test.ts`

**Problem:**

A **Timestamped claim** survives if its timestamp exists in the **Transcript**, even if the claim text is unsupported by nearby Transcript text.

**Solution:**

Make “supported claim” stricter. Start simple: exact timestamp plus cue-context validation.

**Benefits:**

Stronger traceability guarantee. Tests can catch valid-timestamp hallucinations.

## 6. Improve Workflow Return Values

**Files:**

- `src/application/ui-workflow.ts`
- `src/adapters/obsidian/plugin.ts`
- `src/ui/VideoToObsidianApp.tsx`

**Problem:**

`generateVideoNoteContent()` returns `void`, so the UI cannot show domain facts like generated note section count or dropped **Timestamped claims**.

**Solution:**

Return a small result object from workflow operations.

**Benefits:**

More leverage at the workflow interface, better user feedback, easier workflow-level tests.

## 7. Finish Domain Language Cleanup

**Files:**

- `src/domain/index.ts`
- `src/application/video-note-generation.ts`
- `src/markdown/video-note-markdown.ts`
- `src/ui/VideoToObsidianApp.tsx`

**Problem:**

Some names still say `GeneratedVideoNoteContent`, `generateSummary`, `Generated notes`, and `SubtitleLanguage`. These partially conflict with `CONTEXT.md` terms: **Generated note section**, **Transcript**, and **Timestamped claim**.

**Solution:**

Rename carefully where it does not break persisted Markdown expectations. Consider whether the persisted heading should become `## Generated note sections`.

**Benefits:**

Better AI-navigability and fewer mismatches between product language and code.
