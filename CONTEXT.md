# Video To Obsidian

Video To Obsidian turns subtitle-bearing videos into traceable Obsidian notes that preserve source context and can generate reusable knowledge sections on demand.

## Language

**Video note**:
A source note for one video that contains video metadata, transcript material, chat history, and generated summaries.
_Avoid_: Source note, transcript note

**Generated note section**:
A focused section inside a **Video note** for one extracted idea, backed by supporting timestamped claims when possible.
_Avoid_: Atomic note, knowledge card, separate insight note

**Transcript**:
The timestamp-preserving subtitle-derived text used as the evidence base for chat and generated note sections.
_Avoid_: Captions, subtitles, stripped text, SRT content

**Timestamped claim**:
A statement grounded in the **Transcript** with a source timestamp that lets the user return to the video moment.
_Avoid_: Citation, quote, reference

## Relationships

- A video URL has at most one **Video note**.
- A **Video note** belongs to exactly one video URL.
- A **Video note** contains one **Transcript**.
- A **Video note** contains generated note sections before its Transcript.
- A generated note section belongs to exactly one **Video note**.
- A generated note section should cite one or more **Timestamped claims** when possible.

## Example Dialogue

> **Dev:** "When the user imports a video, do we call the LLM immediately?"
> **Domain expert:** "No. Create a **Video note** with the full Transcript at the end, then let the user generate the summary and generated note sections on demand."

## Flagged Ambiguities

- "Knowledge" was used broadly; resolved: generated knowledge now lives as generated note sections inside the **Video note**, backed by **Timestamped claims** when possible.
- "Transcript" could mean stripped subtitle text; resolved: a **Transcript** preserves timestamps so generated answers and notes can stay traceable.
