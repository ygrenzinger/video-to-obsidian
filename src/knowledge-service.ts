import { generateObject } from 'ai';
import { z } from 'zod';
import type { AtomicNoteCandidate, ModelConfiguration, Transcript, VideoMetadata } from './domain';
import { formatLogError, formatTokenUsage, type RuntimeLog } from './runtime-log';

const noteSchema = z.object({
  title: z.string().min(1).describe('Concise Obsidian note title for one reusable idea.'),
  summary: z.string().min(1).describe('1-3 concise sentences explaining the core idea and why it matters.'),
  tags: z.array(z.string().min(1)).default([]).describe('3-6 lowercase tags without # prefixes.'),
  claims: z.array(
    z.object({
      text: z.string().min(1).describe('Specific claim or supporting detail grounded in the Transcript.'),
      timestamp: z.string().min(1).describe('Exact timestamp copied verbatim from the Transcript, without brackets.')
    })
  )
});

const SYSTEM_PROMPT = `You are an expert technical conference knowledge extractor and Obsidian knowledge builder.

Extract reusable Atomic knowledge notes from a timestamped video Transcript.

The goal is not to summarize the video. The goal is to create high-quality permanent notes that can be reused later for thinking, writing, product work, engineering decisions, or learning.

Strict rules:
- Each note must contain exactly one focused idea.
- Do not create broad summaries.
- Do not fill the quota with weak notes.
- Skip vague, obvious, motivational, or unsupported ideas.
- Use only ideas supported by the Transcript. Do not use outside knowledge.
- Every important claim must be grounded in the Transcript with an exact timestamp.
- Only use timestamps that appear verbatim in the Transcript inside square brackets, such as [12:34] or [01:02:03].
- Put the timestamp value in the timestamp field without brackets, exactly as written in the Transcript.
- Do not invent, normalize, round, convert, or approximate timestamps.
- If you cannot find an exact timestamp for a claim, omit that claim.
- If a note would have no exact timestamped claims, skip the note.
- Preserve technical nuance, trade-offs, and constraints.
- Prefer reusable concepts, advice, best practices, patterns, warnings, trade-offs, examples, and mental models.
- Ignore introductions, jokes, speaker biography, sponsor mentions, and filler unless they clarify a technical point.
- If practical advice is inferred rather than explicitly stated, begin the summary sentence with "Inferred advice:".
- Do not hallucinate tools, frameworks, examples, or conclusions that are not present in the Transcript.

Selection criteria:
Choose notes that capture one or more of the following:
- A key technical concept
- A reusable engineering pattern
- A practical recommendation
- A mistake or anti-pattern to avoid
- A decision-making principle
- A trade-off
- A system design lesson
- A concrete demo or example that illustrates a broader idea
- A prediction or future-facing concept, only if clearly supported

Quality bar:
A note is good if it can stand alone outside the video and still be useful.
A note is bad if it only says that the speaker talked about a topic without extracting a reusable idea.

Return structured data matching the requested schema. Return fewer notes than the maximum when the Transcript does not support enough high-quality notes.`;

export async function extractAtomicNoteCandidates(
  metadata: VideoMetadata,
  transcript: Transcript,
  modelConfig: ModelConfiguration,
  maxNotes: number,
  onLog?: RuntimeLog
): Promise<AtomicNoteCandidate[]> {
  const schema = z.object({
    notes: z.array(noteSchema).max(maxNotes)
  });

  onLog?.(`LLM Atomic knowledge note extraction started (${modelConfig.provider}/${modelConfig.modelId}; max ${maxNotes}).`);

  try {
    const result = await generateObject({
      model: modelConfig.model,
      temperature: 0,
      schema,
      system: SYSTEM_PROMPT,
      prompt: `Video title: ${metadata.title}
Video URL: ${metadata.url}
Maximum notes: ${maxNotes}

<Transcript>
${transcript.markdown}
</Transcript>`
    });

    onLog?.(
      `LLM Atomic knowledge note extraction finished (${result.finishReason}; ${result.object.notes.length} candidate${result.object.notes.length === 1 ? '' : 's'}; ${formatTokenUsage(result.usage)}).`
    );

    return keepOnlySupportedCandidates(result.object.notes, transcript, onLog);
  } catch (caught) {
    onLog?.(`LLM Atomic knowledge note extraction failed: ${formatLogError(caught)}`);
    throw caught;
  }
}

function keepOnlySupportedCandidates(
  candidates: AtomicNoteCandidate[],
  transcript: Transcript,
  onLog?: RuntimeLog
): AtomicNoteCandidate[] {
  const timestamps = extractTranscriptTimestamps(transcript);
  if (timestamps.size === 0) return [];

  const supportedCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      claims: candidate.claims.filter((claim) => timestamps.has(claim.timestamp.trim()))
    }))
    .filter((candidate) => candidate.claims.length > 0);

  const droppedClaims = candidates.reduce((count, candidate) => count + candidate.claims.length, 0)
    - supportedCandidates.reduce((count, candidate) => count + candidate.claims.length, 0);
  const droppedCandidates = candidates.length - supportedCandidates.length;

  if (droppedClaims > 0 || droppedCandidates > 0) {
    onLog?.(
      `Dropped ${droppedClaims} unsupported timestamped claim${droppedClaims === 1 ? '' : 's'} and ${droppedCandidates} candidate${droppedCandidates === 1 ? '' : 's'} without exact Transcript timestamps.`
    );
  }

  return supportedCandidates;
}

function extractTranscriptTimestamps(transcript: Transcript): Set<string> {
  const timestamps = new Set(transcript.cues.map((cue) => cue.start));

  for (const match of transcript.markdown.matchAll(/^\[([^\]]+)\]/gm)) {
    timestamps.add(match[1]);
  }

  return timestamps;
}
