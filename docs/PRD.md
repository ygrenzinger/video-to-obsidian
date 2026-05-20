# PRD: Video To Obsidian MVP

## Problem Statement

People who learn from YouTube videos often want reusable Obsidian notes, but the source material is trapped in video playback. Manually copying transcript fragments, preserving timestamps, asking follow-up questions, and turning useful ideas into durable notes is slow and error-prone. Without a traceable link back to the video moment, generated notes can lose evidence quality and become hard to trust.

Video To Obsidian solves this by turning a subtitle-bearing YouTube video into one traceable Video note, then using that Video note and its Transcript as the evidence base for chat and reviewed Atomic knowledge notes.

## Solution

Build an Obsidian desktop plugin that accepts a YouTube URL, uses the user's configured `yt-dlp` executable to discover video metadata and subtitle sources, downloads a timestamp-preserving Transcript, and creates or reuses one Video note for that video URL.

After import, the user can chat with the Transcript through a configured AI provider. The assistant must ground answers in the Transcript and cite timestamps when making claims about the video. The user can save chat history back to the Video note.

The user can also ask the plugin to extract Atomic knowledge note candidates. Each candidate should represent one focused idea, include timestamped claims when possible, and link back to the originating Video note. The user reviews the candidates and chooses which Atomic knowledge notes to create in the vault.

The MVP is desktop-only. It invokes local process APIs for `yt-dlp`, stores AI provider keys in Obsidian plugin data, and prioritizes setup clarity over mobile support or a companion service.

## User Stories

1. As an Obsidian user, I want to open Video To Obsidian from the Obsidian interface, so that I can import videos without leaving my vault.
2. As an Obsidian user, I want to paste a YouTube URL, so that I can start from the video I am currently studying.
3. As an Obsidian user, I want invalid YouTube URLs to be rejected early, so that I understand why import cannot continue.
4. As an Obsidian user, I want the plugin to use my configured `yt-dlp` executable path, so that it works with my local desktop setup.
5. As an Obsidian user, I want a test action for `yt-dlp`, so that I can verify my setup before importing videos.
6. As an Obsidian user, I want clear guidance when the `yt-dlp` executable is missing, so that I can fix the configured path.
7. As an Obsidian user, I want clear guidance when the `yt-dlp` executable is not executable, so that I can fix file permissions.
8. As an Obsidian user, I want the plugin to support browser cookies when YouTube requires authentication, so that I can import videos blocked by bot checks or sign-in requirements.
9. As an Obsidian user, I want the plugin to discover uploaded subtitle sources first, so that the Transcript uses the best available human-authored text.
10. As an Obsidian user, I want the plugin to fall back to original automatic captions when uploaded subtitles are unavailable, so that more videos can still be imported.
11. As an Obsidian user, I want live chat subtitle tracks ignored, so that chat replay data does not pollute the Transcript.
12. As an Obsidian user, I want the plugin to create one Video note per video URL, so that my vault does not accumulate duplicate source records.
13. As an Obsidian user, I want the plugin to reuse an existing Video note when available, so that repeated imports preserve the same source record.
14. As an Obsidian user, I want the Video note to contain video metadata, so that the note remains understandable outside the plugin UI.
15. As an Obsidian user, I want the Video note to include the video URL, so that I can return to the source video.
16. As an Obsidian user, I want the Video note to include subtitle language and subtitle type, so that I understand the Transcript's origin.
17. As an Obsidian user, I want the Video note to include the AI provider label, so that I can understand which model setup was active when the note was created.
18. As an Obsidian user, I want the Transcript to preserve timestamps, so that later answers and notes can stay traceable.
19. As an Obsidian user, I want Transcript timestamps to be human-readable, so that I can scan the Video note quickly.
20. As an Obsidian user, I want the Transcript stored in Markdown, so that it is searchable and portable inside Obsidian.
21. As an Obsidian user, I want to preview the Transcript after import, so that I can verify the plugin imported the right material.
22. As an Obsidian user, I want runtime logs for `yt-dlp` and LLM calls, so that I can understand slow or failing operations.
23. As an Obsidian user, I want to clear runtime logs, so that the UI remains readable during multiple attempts.
24. As an Obsidian user, I want to configure the folder for Video notes, so that imported sources fit my vault structure.
25. As an Obsidian user, I want to configure the folder for Atomic knowledge notes, so that extracted notes fit my vault structure.
26. As an Obsidian user, I want the plugin to create missing folders, so that imports do not fail because a target folder is absent.
27. As an Obsidian user, I want safe file names for generated notes, so that video titles with unsafe characters do not break vault writes.
28. As an Obsidian user, I want generated note names to avoid collisions, so that existing notes are not overwritten.
29. As an Obsidian user, I want to configure at least one AI provider API key, so that chat and Atomic knowledge note extraction can run.
30. As an Obsidian user, I want support for Mistral, Google, Anthropic, and OpenAI, so that I can choose from common AI providers.
31. As an Obsidian user, I want configurable model IDs, so that I can use the model available to my account and budget.
32. As an Obsidian user, I want the plugin to fail clearly when no AI provider key is configured, so that I know what to set up.
33. As an Obsidian user, I want AI provider keys stored in plugin settings for the MVP, so that setup is simple and does not require a companion service.
34. As an Obsidian user, I want to chat with the Transcript, so that I can ask questions about the video after import.
35. As an Obsidian user, I want chat answers to use the Transcript as evidence, so that the answer reflects the imported video instead of general model memory.
36. As an Obsidian user, I want chat answers to cite exact timestamps when making claims about the video, so that I can verify them in context.
37. As an Obsidian user, I want the assistant to admit when the Transcript does not support an answer, so that unsupported claims are not presented as fact.
38. As an Obsidian user, I want chat responses to stream into the UI, so that long answers feel responsive.
39. As an Obsidian user, I want chat messages shown with user and assistant roles, so that the conversation is readable.
40. As an Obsidian user, I want to save chat history into the Video note, so that useful interactions remain attached to the source record.
41. As an Obsidian user, I want saved chat history appended rather than replacing existing content, so that previous work is preserved.
42. As an Obsidian user, I want to extract Atomic knowledge note candidates from a Video note, so that reusable ideas can become durable notes.
43. As an Obsidian user, I want each Atomic knowledge note candidate to contain one focused idea, so that generated notes are reusable instead of broad summaries.
44. As an Obsidian user, I want Atomic knowledge note candidates to include summaries, so that I can quickly decide what to keep.
45. As an Obsidian user, I want Atomic knowledge note candidates to include tags, so that created notes fit Obsidian organization workflows.
46. As an Obsidian user, I want Atomic knowledge note candidates to include timestamped claims, so that each note stays grounded in the Transcript.
47. As an Obsidian user, I want weak or unsupported ideas skipped, so that the plugin does not fill a quota with low-quality notes.
48. As an Obsidian user, I want to configure the maximum number of Atomic knowledge notes, so that extraction matches my preferred level of granularity.
49. As an Obsidian user, I want the model to be allowed to return fewer Atomic knowledge notes than the maximum, so that quality is prioritized over quantity.
50. As an Obsidian user, I want to review Atomic knowledge note candidates before creation, so that generated notes do not enter my vault unchecked.
51. As an Obsidian user, I want extracted candidates selected by default, so that I can quickly create all useful candidates when the output looks good.
52. As an Obsidian user, I want to deselect individual candidates, so that I can reject weak or duplicate ideas.
53. As an Obsidian user, I want creation blocked when no candidate is selected, so that I do not accidentally run an empty operation.
54. As an Obsidian user, I want each Atomic knowledge note to link back to exactly one Video note, so that every idea has a traceable source record.
55. As an Obsidian user, I want timestamped claims in Atomic knowledge notes to link to the video moment when possible, so that I can revisit the exact evidence.
56. As an Obsidian user, I want Atomic knowledge notes to include source metadata, so that notes remain useful even if viewed outside the plugin UI.
57. As an Obsidian user, I want the plugin to show success notices after major actions, so that I know when imports and note creation completed.
58. As an Obsidian user, I want errors surfaced in the UI, so that I do not have to inspect developer tools for routine failures.
59. As an Obsidian user, I want the plugin to handle network or subtitle download failures clearly, so that I can retry or choose another video.
60. As an Obsidian user, I want all generated knowledge to remain in my vault as Markdown, so that I retain ownership and can edit notes manually.

## Implementation Decisions

- The product is an Obsidian desktop plugin, not a web app or mobile-first feature.
- The desktop-only constraint is accepted because the plugin invokes the user's installed `yt-dlp` executable through local process APIs.
- AI provider credentials are configured in Obsidian plugin settings and stored in Obsidian plugin data as plain text for MVP usability.
- The import flow starts from a YouTube URL and validates that the URL resolves to a supported YouTube video ID.
- The `yt-dlp` integration is a deep module with a small interface for testing the executable, discovering the best Transcript source, and downloading the Transcript.
- The `yt-dlp` integration does not search common install locations. Users must configure the full executable path.
- Browser cookie support is passed through to `yt-dlp` only when configured.
- `yt-dlp` process calls are gated to avoid rapid repeated process execution.
- Subtitle selection prefers uploaded subtitles over automatic captions.
- Automatic caption fallback only uses original automatic captions rather than translated tracks.
- The Transcript parser is a deep module that turns subtitle text into timestamped cues, raw subtitle text, and Markdown suitable for storage and LLM prompts.
- The vault storage module is a deep module responsible for creating folders, generating safe note paths, creating or reusing Video notes, appending chat history, and creating Atomic knowledge notes.
- The one-Video-note-per-video invariant is enforced through a persisted video index keyed by canonical video URL and video ID when available.
- Reusing a Video note depends on both an index entry and the continued existence of the indexed vault file.
- If an indexed Video note exists and contains a Transcript section, the plugin reuses that stored Transcript instead of downloading it again.
- Video notes contain frontmatter metadata, a source video link, a Transcript section, and a Chat history section.
- Atomic knowledge notes contain source metadata, tags, a concise note body, and a Timestamped claims section.
- Atomic knowledge notes link back to the originating Video note using an Obsidian link.
- Timestamped claims link to the relevant YouTube timestamp when the timestamp can be parsed.
- AI model selection is centralized behind a provider-priority decision, choosing the first configured provider key in the supported provider order.
- The chat module owns conversation state and streams assistant responses from the selected model.
- Chat prompts instruct the model to use only the Transcript as evidence unless the user explicitly asks for external knowledge.
- Chat prompts instruct the model to cite exact timestamps that appear in the Transcript and avoid inventing timestamps.
- The Atomic knowledge extraction module uses structured generation so candidate notes have predictable title, summary, tag, and timestamped claim fields.
- Atomic knowledge extraction prompts prioritize focused reusable ideas and allow fewer results than the configured maximum.
- The React view coordinates user actions and presentation state but delegates import, chat, storage, and extraction behavior to plugin services.
- Runtime logging is passed as a callback to long-running process and LLM operations so the UI can show progress without coupling lower-level modules to React.
- Major modules to maintain or extend are the plugin shell, settings, YouTube URL helpers, `yt-dlp` Transcript acquisition, Transcript parsing, vault storage, AI model selection, Transcript chat, Atomic knowledge extraction, runtime logging, and the React custom view.
- The deepest modules for future evolution are Transcript acquisition, Transcript parsing, vault storage, chat, and Atomic knowledge extraction because each hides complex behavior behind a small testable interface.

## Testing Decisions

- Good tests should verify externally observable behavior: returned domain objects, generated Markdown content, vault writes, process arguments, prompt constraints where practical, and user-visible failure guidance.
- Tests should avoid asserting incidental implementation details such as private helper structure, React state variable names, or exact internal control flow.
- Transcript parsing should be tested with representative subtitle input and expected timestamp-preserving Markdown.
- YouTube URL helpers should be tested for supported URL shapes, invalid URLs, video ID extraction, timestamp parsing, and timestamp URL creation.
- `yt-dlp` Transcript acquisition should be tested with fake command runners and fake subtitle fetchers rather than real processes or network calls.
- `yt-dlp` tests should cover uploaded subtitle preference, automatic original caption fallback, live chat exclusion, authentication cookie arguments, command logging, process throttling, missing executable guidance, permission guidance, bot-check guidance, and empty Transcript failures.
- Vault storage should be tested with an in-memory vault stub and should cover Video note creation, folder creation, file-name sanitization, note collision handling, Video note reuse, Transcript reloading, chat history append behavior, and Atomic knowledge note Markdown creation.
- AI model selection should be tested by providing settings with different configured providers and asserting the selected provider metadata or setup error.
- Chat behavior should be tested with a controllable model adapter or seam that verifies streamed output, persisted conversation messages, and Transcript-grounded prompt requirements without calling real providers.
- Atomic knowledge extraction should be tested with a controllable model adapter or seam that verifies schema-constrained candidates, max-note behavior, logging, and error propagation without calling real providers.
- React view behavior should be covered with lightweight interaction tests only where it protects user-facing flows: import success, import failure, chat send, save chat, extraction review, candidate selection, and empty-selection error.
- Existing prior art in the codebase already covers Transcript parsing, YouTube helpers, `yt-dlp` behavior, and vault storage with Vitest.
- New tests should continue using dependency injection for external boundaries rather than mocking global process or network behavior broadly.

## Out of Scope

- Obsidian mobile support.
- Non-YouTube video sources.
- Downloading or storing video/audio files.
- A cloud service or companion server for credential management.
- OAuth-based AI provider authentication.
- Encrypted storage for AI provider keys in the MVP.
- Full transcript editing workflows.
- Multi-video chat or cross-video synthesis.
- Automatic creation of Atomic knowledge notes without user review.
- Guaranteeing that every generated note contains perfect evidence when the Transcript itself is incomplete or poor quality.
- Replacing the user's existing Obsidian note organization system.
- Real-time monitoring of changes made manually to Video notes after import.

## Further Notes

- This PRD uses the project glossary: Video note, Atomic knowledge note, Transcript, and Timestamped claim.
- The current architecture already reflects the desktop plugin and settings-managed AI key decision.
- The highest-risk external dependencies are YouTube subtitle availability, `yt-dlp` behavior, local executable configuration, browser cookie access, and AI provider availability.
- The highest-risk product behavior is preserving trust: generated chat answers and Atomic knowledge notes must remain grounded in the Transcript and traceable back to timestamps.
- The likely next deepening opportunity is to make AI calls easier to test through a narrow model adapter seam while preserving the current service interfaces.
