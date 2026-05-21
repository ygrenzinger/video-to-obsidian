import { generateObject } from 'ai';
import { z } from 'zod';
import type { GeneratedVideoNoteContent, ModelConfiguration, Transcript, VideoMetadata } from './domain';
import { buildTranscriptSystemPrompt, GENERATE_VIDEO_TOPIC_SUMMARIES_TASK_PROMPT } from './prompts';
import { formatLogError, formatTokenUsage, type RuntimeLog } from './runtime-log';

const sectionSchema = z.object({
  title: z.string().min(1).describe('Concise heading for one useful idea, pattern, trade-off, or lesson.'),
  summary: z.string().min(1).describe('1-3 concise sentences explaining the idea and why it matters.'),
  claims: z.array(
    z.object({
      text: z.string().min(1).describe('Specific claim or supporting detail grounded in the Transcript.'),
      timestamp: z.string().min(1).describe('Exact timestamp copied verbatim from the Transcript, without brackets.')
    })
  )
});

const videoNoteContentSchema = z.object({
  conciseSummary: z.string().min(1).describe('A concise 3-6 sentence summary of the video.'),
  tags: z.array(z.string().min(1)).length(5).describe('Exactly 5 tags for the whole Video note, without # prefixes.'),
  sections: z.array(sectionSchema).describe('Useful, reusable notes extracted from the Transcript.')
});

const SYSTEM_PROMPT = buildTranscriptSystemPrompt(GENERATE_VIDEO_TOPIC_SUMMARIES_TASK_PROMPT);

export async function generateVideoNoteContent(
  metadata: VideoMetadata,
  transcript: Transcript,
  modelConfig: ModelConfiguration,
  onLog?: RuntimeLog
): Promise<GeneratedVideoNoteContent> {
  onLog?.(`LLM Video note generation started (${modelConfig.provider}/${modelConfig.modelId}).`);

  try {
    const result = await generateObject({
      model: modelConfig.model,
      temperature: 0,
      schema: videoNoteContentSchema,
      system: SYSTEM_PROMPT,
      prompt: `Video title: ${metadata.title}
Video URL: ${metadata.url}

<Transcript>
${transcript.markdown}
</Transcript>`
    });

    onLog?.(
      `LLM Video note generation finished (${result.finishReason}; ${result.object.sections.length} section${result.object.sections.length === 1 ? '' : 's'}; ${formatTokenUsage(result.usage)}).`
    );

    return keepOnlySupportedClaims(result.object, transcript, onLog);
  } catch (caught) {
    onLog?.(`LLM Video note generation failed: ${formatLogError(caught)}`);
    throw caught;
  }
}

function keepOnlySupportedClaims(
  content: GeneratedVideoNoteContent,
  transcript: Transcript,
  onLog?: RuntimeLog
): GeneratedVideoNoteContent {
  const timestamps = extractTranscriptTimestamps(transcript);
  if (timestamps.size === 0) return { ...content, sections: content.sections.map((section) => ({ ...section, claims: [] })) };

  const sections = content.sections.map((section) => ({
    ...section,
    claims: section.claims.filter((claim) => timestamps.has(claim.timestamp.trim()))
  }));

  const droppedClaims = content.sections.reduce((count, section) => count + section.claims.length, 0)
    - sections.reduce((count, section) => count + section.claims.length, 0);

  if (droppedClaims > 0) {
    onLog?.(`Dropped ${droppedClaims} unsupported timestamped claim${droppedClaims === 1 ? '' : 's'} without exact Transcript timestamps.`);
  }

  return { ...content, sections };
}

function extractTranscriptTimestamps(transcript: Transcript): Set<string> {
  const timestamps = new Set(transcript.cues.map((cue) => cue.start));

  for (const match of transcript.markdown.matchAll(/^\[([^\]]+)\]/gm)) {
    timestamps.add(match[1]);
  }

  return timestamps;
}
