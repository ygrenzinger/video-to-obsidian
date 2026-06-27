# Video To Obsidian

Video To Obsidian turns subtitle-bearing videos into traceable Obsidian notes that preserve source context and can generate reusable **Generated notes** on demand.

## Language

**Video note**:
A source note for one video that contains video metadata, transcript material, chat history, and generated summaries.
_Avoid_: Source note, transcript note

**Generated note section**:
A focused section inside a **Video note** for one extracted idea, backed by supporting timestamped claims when possible.
_Avoid_: Atomic note, knowledge card, separate insight note

**Generated notes**:
The generated notes block inside a **Video note** that contains a summary and one or more **Generated note sections**.
_Avoid_: Generated knowledge, generated content, separate generated notes

**Transcript**:
The timestamp-preserving subtitle-derived text used as the evidence base for chat and **Generated notes**.
_Avoid_: Captions, subtitles, stripped text, SRT content

**Transcript source**:
The selected video text source that becomes a **Transcript**, including its language and whether it was uploaded or automatically generated.
_Avoid_: Subtitle, caption, subtitle language

**Timestamped claim**:
A statement grounded in the **Transcript** with a source timestamp that lets the user return to the video moment.
_Avoid_: Citation, quote, reference

**Saved chat answer**:
A completed user question and assistant answer that the user intentionally keeps inside the **Video note**.
_Avoid_: Chat log, conversation export, saved message

**AI provider**:
The external model service selected to generate chat answers and **Generated notes** from a **Transcript**.
_Avoid_: LLM backend, model vendor, API service

## Relationships

- A video URL has at most one **Video note**.
- A **Video note** belongs to exactly one video URL.
- A **Video note** contains one **Transcript**.
- A **Transcript** comes from one **Transcript source**.
- A **Video note** contains **Generated notes** before its Transcript.
- **Generated notes** contain zero or more generated note sections.
- A generated note section belongs to exactly one **Video note**.
- A generated note section should cite one or more **Timestamped claims** when possible.
- A **Saved chat answer** belongs to exactly one **Video note**.

## Example Dialogue

> **Dev:** "When the user imports a video, do we call the LLM immediately?"
> **Domain expert:** "No. Create a **Video note** with the full Transcript at the end, then let the user generate **Generated notes** on demand."

## Flagged Ambiguities

- "Knowledge" was used broadly; resolved: generated knowledge now lives as **Generated notes** inside the **Video note**, backed by **Timestamped claims** when possible.
- "Transcript" could mean stripped subtitle text; resolved: a **Transcript** preserves timestamps so generated answers and notes can stay traceable.
- "Subtitle" and "caption" describe acquisition details; resolved: the domain term is **Transcript source** until the material becomes a **Transcript**.
