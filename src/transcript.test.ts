import { describe, expect, it } from 'vitest';
import { parseSrt } from './transcript';

describe('parseSrt', () => {
  it('preserves timestamps and text as transcript cues', () => {
    const transcript = parseSrt(`1
00:00:01,000 --> 00:00:04,000
Hello world.

2
00:01:05,100 --> 00:01:07,000
Second cue.
`);

    expect(transcript.cues).toEqual([
      { start: '00:01', end: '00:04', text: 'Hello world.' },
      { start: '01:05', end: '01:07', text: 'Second cue.' }
    ]);
    expect(transcript.markdown).toContain('[00:01] Hello world.');
    expect(transcript.markdown).toContain('[01:05] Second cue.');
  });
});
