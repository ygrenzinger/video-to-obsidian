# Make reused Video notes rehydrate equivalent Transcripts

Status: ready-for-agent
Type: AFK
User stories covered: 15-17, 35-43

## What to build

When a reusable **Video note** is found, reading its stored **Transcript** should reconstruct enough timestamp structure that downstream chat and generated note section behavior is equivalent to a fresh import. A reused session should not silently lose timestamp information just because the Transcript came from Markdown instead of a downloaded source file.

The rehydration contract should preserve the existing no-redownload behavior for reusable Video notes that still contain a stored Transcript.

## Acceptance criteria

- [ ] Reading a stored Transcript reconstructs timestamped cues from the saved Transcript Markdown when possible.
- [ ] Reused Video note sessions expose Transcript timestamps to chat and generated note section flows in the same shape expected by fresh imports.
- [ ] Unsupported or malformed Transcript lines are handled without breaking reuse of valid timestamped lines.
- [ ] Tests cover reusing a stored Transcript, preserving timestamped claims during generation, and chatting against a reused Transcript.
- [ ] Reusing an indexed Video note still avoids downloading the Transcript again.

## Blocked by

- `.scratch/architecture-modules/issues/02-video-note-store-business-contract.md`

## Comments
