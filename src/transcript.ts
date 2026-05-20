import type { Transcript, TranscriptCue } from './domain';

export function parseSrt(srt: string): Transcript {
  const normalized = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const cues: TranscriptCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    const timestampLineIndex = lines.findIndex((line) => line.includes('-->'));
    if (timestampLineIndex === -1) continue;

    const timestampMatch = lines[timestampLineIndex].match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );

    if (!timestampMatch) continue;

    const text = lines
      .slice(timestampLineIndex + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;

    cues.push({
      start: formatSrtTimestamp(timestampMatch[1]),
      end: formatSrtTimestamp(timestampMatch[2]),
      text
    });
  }

  return {
    cues,
    rawSrt: srt,
    markdown: cues.map((cue) => `[${cue.start}] ${cue.text}`).join('\n')
  };
}

function formatSrtTimestamp(timestamp: string): string {
  const withoutMillis = timestamp.replace(',', '.').split('.')[0];
  return withoutMillis.startsWith('00:') ? withoutMillis.slice(3) : withoutMillis;
}
