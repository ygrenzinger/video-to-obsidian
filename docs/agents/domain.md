# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root
- `docs/adr/` at the repo root, if it exists

If any of these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront.

## File Structure

This repo uses a single-context domain layout:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use The Glossary's Vocabulary

When output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If the concept needed is not in the glossary yet, either reconsider the language or note the gap for a future documentation pass.

## Flag ADR Conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it.
