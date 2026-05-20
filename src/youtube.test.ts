import { describe, expect, it } from 'vitest';
import { createYouTubeTimestampUrl, extractYouTubeVideoId } from './youtube';

describe('youtube helpers', () => {
  it('extracts IDs from standard and short YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('builds timestamp URLs from display timestamps', () => {
    expect(createYouTubeTimestampUrl('https://youtu.be/dQw4w9WgXcQ', '01:05')).toBe(
      'https://youtu.be/dQw4w9WgXcQ?t=65'
    );
  });
});
