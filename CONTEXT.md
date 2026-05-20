# Video To Obsidian

Video To Obsidian turns subtitle-bearing videos into traceable Obsidian notes that preserve source context while generating reusable knowledge notes.

## Language

**Video note**:
A source note for one video that contains video metadata, transcript material, chat history, and generated summaries.
_Avoid_: Source note, transcript note

**Atomic knowledge note**:
A focused Obsidian note for one extracted idea, linked back to the originating **Video note** and supporting timestamped claims.
_Avoid_: Knowledge, insight, card

**Transcript**:
The timestamp-preserving subtitle-derived text used as the evidence base for chat and extraction.
_Avoid_: Captions, subtitles, stripped text, SRT content

**Timestamped claim**:
A statement grounded in the **Transcript** with a source timestamp that lets the user return to the video moment.
_Avoid_: Citation, quote, reference

## Relationships

- A video URL has at most one **Video note**.
- A **Video note** belongs to exactly one video URL.
- A **Video note** contains one **Transcript**.
- A **Video note** can produce zero or more **Atomic knowledge notes**.
- An **Atomic knowledge note** links back to exactly one **Video note**.
- An **Atomic knowledge note** should cite one or more **Timestamped claims** when possible.

## Example Dialogue

> **Dev:** "When the user asks the plugin to create knowledge, do we only save the chat?"
> **Domain expert:** "No. Create a **Video note** as the source record, then create **Atomic knowledge notes** for reusable ideas that link back to timestamped evidence."

## Flagged Ambiguities

- "Knowledge" was used broadly; resolved: generated knowledge means **Atomic knowledge notes** backed by a **Video note** and **Timestamped claims**.
- "Transcript" could mean stripped subtitle text; resolved: a **Transcript** preserves timestamps so generated answers and notes can stay traceable.
