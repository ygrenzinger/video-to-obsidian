import { describe, expect, it } from 'vitest';
import { linkifyTranscriptTimestamps } from './chat-service';

describe('linkifyTranscriptTimestamps', () => {
  it('turns chat timestamp citations into YouTube timestamp links', () => {
    expect(
      linkifyTranscriptTimestamps(
        'https://youtu.be/dQw4w9WgXcQ',
        'Role Definition [06:01]-[06:05] and follow-up [01:02:03].'
      )
    ).toBe(
      'Role Definition [06:01](https://youtu.be/dQw4w9WgXcQ?t=361)-[06:05](https://youtu.be/dQw4w9WgXcQ?t=365) and follow-up [01:02:03](https://youtu.be/dQw4w9WgXcQ?t=3723).'
    );
  });
});
