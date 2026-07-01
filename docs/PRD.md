# PRD: Video To Obsidian MVP

## Problem Statement

People who learn from YouTube videos with an available Transcript often want durable Obsidian notes, but the source material is trapped inside playback. Manually finding a transcript, preserving timestamps, extracting reusable ideas, asking follow-up questions, and saving useful answers into the right note is slow and error-prone.

Without preserved source context, generated summaries and reusable sections can become hard to trust. Users need a workflow that keeps one traceable Video note per video, stores the full Transcript, and lets generated content remain grounded in timestamped evidence.

Video To Obsidian solves this by turning a YouTube video into one Video note that contains video metadata, generated summary content, generated note sections, saved chat answers, and the full Transcript at the end.

## Solution

Build an Obsidian desktop plugin that accepts a YouTube URL, uses the user's configured `yt-dlp` executable to discover video metadata and the best Transcript source, downloads a timestamp-preserving Transcript, and creates or reuses one Video note for that video URL.

The import flow does not call the LLM. It creates the Video note first, stores the Transcript, and exposes follow-up actions after import. Repeated imports reuse an indexed Video note when it still exists and contains a Transcript.

After import, the user can click `Generate summary` to create structured LLM content for the Video note. That content includes a concise summary and focused generated note sections. The plugin renders generated content deterministically before the Transcript and links timestamped claims to the relevant video moments when possible.

After import, the user can chat with the Transcript through a configured AI provider. The chat prompt uses the Transcript as the primary evidence source, allows external knowledge only when the user explicitly asks for it, and requires unsupported answers to say what is missing. Each completed answer has its own save action, which appends that question-and-answer turn to the Video note before the Transcript.

The MVP is desktop-only. It invokes local process APIs for `yt-dlp`, stores AI provider keys in Obsidian secret storage, and prioritizes traceability, setup clarity, and simple Markdown ownership over mobile support or a companion service.

## User Stories

1. As an Obsidian user, I want to open Video To Obsidian from the Obsidian interface, so that I can import videos without leaving my vault.
2. As an Obsidian user, I want a dedicated Video To Obsidian view, so that import, Transcript preview, chat, generation, and runtime logs live in one workflow.
3. As an Obsidian user, I want to paste a YouTube URL, so that I can start from the video I am currently studying.
4. As an Obsidian user, I want invalid YouTube URLs to be rejected early, so that I understand why import cannot continue.
5. As an Obsidian user, I want the plugin to use my configured `yt-dlp` executable path, so that it works with my local desktop setup.
6. As an Obsidian user, I want a `yt-dlp` test action in settings, so that I can verify the executable before importing a video.
7. As an Obsidian user, I want clear guidance when the `yt-dlp` executable path is missing or not absolute, so that I know how to fix setup.
8. As an Obsidian user, I want the plugin to discover uploaded Transcript sources first, so that the Transcript uses the best available source.
9. As an Obsidian user, I want the plugin to fall back to original automatic Transcript sources, so that videos without uploaded Transcript sources can still be imported when possible.
10. As an Obsidian user, I want unsupported or missing Transcript sources to fail clearly, so that I can retry or choose another video.
11. As an Obsidian user, I want the Transcript to preserve timestamps, so that later answers and generated note sections can stay traceable.
12. As an Obsidian user, I want Transcript timestamps to remain human-readable, so that I can scan the Video note quickly.
13. As an Obsidian user, I want the Transcript stored as Markdown text, so that it remains searchable and portable inside Obsidian.
14. As an Obsidian user, I want the plugin to create one Video note per video URL, so that my vault does not accumulate duplicate source records.
15. As an Obsidian user, I want repeated imports to reuse an existing Video note unchanged, so that manual edits and prior generated content are preserved.
16. As an Obsidian user, I want reuse to depend on the indexed file still existing, so that stale indexes do not point to missing notes.
17. As an Obsidian user, I want an indexed Video note's stored Transcript to be reused, so that the plugin does not redownload material unnecessarily.
18. As an Obsidian user, I want new Video notes to be created with safe file names, so that video titles with unsafe characters do not break vault writes.
19. As an Obsidian user, I want generated Video note names to avoid collisions, so that existing notes are not overwritten.
20. As an Obsidian user, I want new Video notes to be created in a configurable folder that defaults to `Video notes`, so that the import destination is predictable.
21. As an Obsidian user, I want the Video note to contain video metadata, source URL, Transcript source language, Transcript source type, AI provider label, and creation time, so that the note remains understandable outside the plugin UI.
22. As an Obsidian user, I want the Video note to include a link back to the video, so that I can return to the source quickly.
23. As an Obsidian user, I want the Video note to start with placeholders for summary, generated note sections, and chat history, so that I understand what can be added later.
24. As an Obsidian user, I want the full Transcript preserved at the end of the Video note, so that generated content and saved chat can be inserted above it without burying the evidence base.
25. As an Obsidian user, I want to preview the Transcript after import, so that I can verify the plugin imported the right material.
26. As an Obsidian user, I want a `Generate summary` button after import, so that I control when the LLM is called.
27. As an Obsidian user, I want generated summary content to be written into the Video note, so that the source record becomes useful without leaving Obsidian.
28. As an Obsidian user, I want generated note sections inside the Video note, so that reusable ideas stay attached to the source record.
29. As an Obsidian user, I want each generated note section to focus on one idea, pattern, warning, trade-off, example, or lesson, so that sections are reusable later.
30. As an Obsidian user, I want generated Video note content to add five slugified frontmatter tags, so that the note fits Obsidian discovery workflows.
31. As an Obsidian user, I want generated note sections to include timestamped claims when possible, so that each idea remains grounded in the Transcript.
32. As an Obsidian user, I want timestamped claims to link to the video moment when possible, so that I can revisit the exact evidence.
33. As an Obsidian user, I want unsupported generated claims filtered out, so that invented or mismatched timestamps do not enter the Video note.
34. As an Obsidian user, I want generated content to replace prior generated summary and section content, so that rerunning generation updates that part of the Video note predictably.
35. As an Obsidian user, I want chat with the Transcript after import, so that I can ask follow-up questions about the video.
36. As an Obsidian user, I want chat responses to stream into the UI, so that long answers feel responsive.
37. As an Obsidian user, I want chat questions and answers displayed as turns, so that the conversation is easy to scan.
38. As an Obsidian user, I want chat answers to use the Transcript as evidence, so that answers reflect the imported video instead of model memory.
39. As an Obsidian user, I want chat answers to cite exact Transcript timestamps when making claims about the video, so that I can verify them in context.
40. As an Obsidian user, I want the assistant to say when the Transcript does not support an answer, so that unsupported claims are not presented as fact.
41. As an Obsidian user, I want the assistant to label external knowledge when I explicitly ask for it, so that I can distinguish Transcript-supported facts from outside context.
42. As an Obsidian user, I want to save an individual chat answer into the Video note, so that useful interactions remain attached to the source record without saving every exchange.
43. As an Obsidian user, I want saved chat answers appended before the Transcript, so that the Transcript remains the final evidence section.
44. As an Obsidian user, I want saved chat answers to be marked as saved in the UI, so that I do not accidentally save the same answer repeatedly.
45. As an Obsidian user, I want runtime logs for `yt-dlp` and LLM calls, so that I can understand slow or failing operations.
46. As an Obsidian user, I want to clear runtime logs, so that the UI remains readable during multiple attempts.
47. As an Obsidian user, I want to select one AI provider, so that generated Video note content and chat use the API I intend.
48. As an Obsidian user, I want the selected provider API key to be required, so that LLM actions fail early with clear setup guidance when the key is missing.
49. As an Obsidian user, I want the model ID to be optional, so that I can use a sensible default unless I need a specific model.
50. As an Obsidian user, I want support for Mistral, Google, Anthropic, and OpenAI, so that I can use a provider available to my account and budget.
51. As an Obsidian user, I want provider keys stored outside plugin `data.json`, so that I can commit or sync my vault without committing API keys.
52. As an Obsidian user, I want clear failure guidance when the selected provider key is missing, so that I know what to set up.
53. As an Obsidian user, I want all generated knowledge to remain in my vault as Markdown, so that I retain ownership and can edit notes manually.
54. As an Obsidian user, I want generated content to use consistent prompt rules across chat and summary generation, so that both workflows preserve traceability.
55. As an Obsidian user, I want the plugin to avoid creating separate generated notes, so that source context remains consolidated in the Video note.

## Implementation Decisions

Durable architecture decisions are recorded in ADRs:

- [Use Desktop Plugin With Local yt-dlp](./adr/0001-use-desktop-plugin-with-local-ytdlp.md)
- [Keep Generated Knowledge Inside One Video Note](./adr/0002-keep-generated-knowledge-inside-one-video-note.md)
- [Create Video Note Before LLM Generation](./adr/0003-create-video-note-before-llm-generation.md)
- [Store Provider Keys In Obsidian Plugin Data For MVP](./adr/0004-store-provider-keys-in-obsidian-plugin-data-for-mvp.md)

The remaining MVP implementation expectations are:

- The plugin exposes a custom Obsidian view, a ribbon icon, and an open command for the import workflow.
- The import flow starts from a YouTube URL, validates that it resolves to a supported YouTube video ID, then uses the configured `yt-dlp` executable to discover metadata and the best Transcript source.
- `yt-dlp` does not search common install locations. Users must configure the full executable path, and settings include a test action for setup feedback.
- Transcript source selection prefers uploaded sources, then falls back to original automatic sources when available.
- Transcript parsing preserves timestamped cues as Markdown suitable for storage, preview, prompts, and timestamped claims.
- New Video notes are created in the configured Video notes folder using sanitized, collision-safe names.
- Repeated imports reuse an indexed Video note only when the indexed file still exists and contains a stored Transcript.
- Generated Video note content uses structured model output for the concise summary, five tags, generated note sections, and timestamped claims.
- Generated content rendering is deterministic Markdown. Regeneration replaces the summary and generated note section block while preserving saved chat answers and the Transcript.
- Timestamped claims are kept only when their timestamps appear exactly in the Transcript, and parseable timestamps link back to the video moment.
- Chat and generation share Transcript-grounded prompt rules; chat may use external knowledge only when the user explicitly asks and requires that outside context to be labeled.
- AI model selection is centralized around one selected provider, one required API key, and one optional model ID override.
- The React view coordinates user actions and presentation state while delegating import, storage, generation, chat, model selection, Transcript acquisition, and runtime logging to focused services.
- The deepest modules for future evolution are Transcript acquisition, Transcript parsing, Video note storage, prompt composition, chat, and generated Video note content because each hides complex behavior behind a small testable interface.

## Testing Decisions

- Good tests should verify externally observable behavior: returned domain objects, generated Markdown content, vault writes, process arguments, prompt constraints where practical, logging, and user-visible failure guidance.
- Tests should avoid asserting incidental implementation details such as private helper structure, React state variable names, or exact internal control flow.
- Transcript parsing should be tested with representative source input and expected timestamp-preserving Markdown.
- YouTube URL helpers should be tested for supported URL shapes, invalid URLs, video ID extraction, timestamp parsing, and timestamp URL creation.
- `yt-dlp` Transcript acquisition should be tested with fake command runners and fake Transcript source fetchers rather than real processes or network calls.
- `yt-dlp` tests should cover uploaded Transcript source preference, automatic original source fallback, live chat exclusion where applicable, command logging, process throttling, missing executable guidance, permission guidance, bot-check guidance, and empty Transcript failures.
- Vault storage should be tested with an in-memory vault stub and should cover Video note creation in the configured folder, file-name sanitization, note collision handling, Video note reuse, generated Video note Markdown, Transcript reloading, timestamped claim links, generated content replacement, and saved chat answer append behavior.
- Prompt composition should be tested by asserting durable constraints are present, such as Transcript-only evidence by default, exact timestamp requirements, external knowledge labeling for chat, and structured schema expectations for generated content.
- Generated Video note content should be tested with a controllable model adapter or seam that verifies schema-constrained output, timestamp filtering, logging, and error propagation without calling real providers.
- Chat behavior should be tested with a controllable model adapter or seam that verifies streamed output, persisted conversation messages, and Transcript-grounded prompt requirements without calling real providers.
- AI model selection should be tested by providing settings with different selected providers, missing keys, empty model overrides, and explicit model overrides.
- React view behavior should be covered with lightweight interaction tests where it protects user-facing flows: import success, import failure, runtime log clearing, Generate summary, chat send, save chat answer, and duplicate save prevention.
- Existing prior art in the codebase already covers Transcript parsing, YouTube helpers, `yt-dlp` behavior, and vault storage with Vitest.
- New tests should continue using dependency injection for external boundaries rather than mocking global process or network behavior broadly.

## Out of Scope

- Obsidian mobile support.
- Non-YouTube video sources.
- Downloading or storing video/audio files.
- A cloud service or companion server for credential management.
- OAuth-based AI provider authentication.
- Full Transcript editing workflows.
- Multi-video chat or cross-video synthesis.
- Automatic LLM generation during import.
- Browser-cookie authentication configuration.
- Creating separate generated notes outside the Video note.
- Guaranteeing that every generated section contains perfect evidence when the Transcript itself is incomplete or poor quality.
- Guaranteeing that YouTube, `yt-dlp`, or provider APIs remain stable.
- Replacing the user's existing Obsidian note organization system.
- Real-time monitoring of changes made manually to Video notes after import.
- Cross-note refactoring or migration of previously created Video notes.

## Further Notes

- This PRD uses the project glossary: Video note, generated note section, Transcript, Transcript source, Timestamped claim, Saved chat answer, and AI provider.
- The current architecture reflects the ADRs for desktop-local Transcript acquisition, single Video note ownership, explicit post-import LLM calls, and MVP provider key storage.
- The highest-risk external dependencies are YouTube Transcript availability, `yt-dlp` behavior, local executable configuration, and AI provider availability.
- The highest-risk product behavior is preserving trust: generated chat answers and generated note sections must remain grounded in the Transcript and traceable back to timestamps.
- The prompt module is now an important product boundary because it keeps chat and Generate summary aligned on evidence, timestamp, and external-knowledge rules.
- The likely next deepening opportunity is to make AI calls easier to test through a narrow model adapter seam while preserving the current service interfaces.
