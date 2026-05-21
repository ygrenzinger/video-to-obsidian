# Centralize provider defaults in a Provider catalog

Status: ready-for-agent
Type: AFK
User stories covered: 47-52

## What to build

Create one Provider catalog that defines the supported AI providers, their display/order metadata, and their default model IDs. Settings UI and model selection should both read from this catalog so provider defaults cannot drift.

This should not change which providers are supported, which provider is the default, how API keys are stored, or how optional model overrides work.

## Acceptance criteria

- [ ] Supported providers and default model IDs have a single source of truth.
- [ ] Settings UI uses the Provider catalog for dropdown options and model placeholder text.
- [ ] Model selection uses the same Provider catalog for default model IDs.
- [ ] Tests cover missing API key errors, default model selection, explicit model override selection, and provider label rendering.
- [ ] User-visible provider behavior remains unchanged.

## Blocked by

None - can start immediately

## Comments
