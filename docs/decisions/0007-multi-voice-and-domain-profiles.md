# ADR 0007: Opt-in multi-voice profiles, plus a shared domain profile

**Status:** Implemented
**Date:** 2026-08-12

## Context

The same "editor at a tech magazine" evaluation surfaced two related scaling gaps. First, `.clearfelt/voice-profile.md` is singular and project-scoped: a masthead with several writers either gets flattened toward one profile, or someone manually swaps profile files between passes. Second, a flat shared banlist has no way to say "this word is fine here": tech journalism legitimately uses words like "delve into the codebase" or "a robust API" that the shipped rule files would otherwise flag, and the existing tier system (cluster/density) softens but doesn't solve this for genuinely dense technical writing.

## Decision

Two mechanisms, both using the same override-precedence pattern already established by voice-profile.md (ADR 0004): a project-level file, consulted by `scripts/detect.mjs` before flagging, that lets specific terms win over the shipped rule files.

1. **Multi-voice, opt-in.** `voice.mode` in `clearfelt.config.md` defaults to `single` (unchanged behavior, `.clearfelt/voice-profile.md`). Setting it to `multi` moves voice files to `.clearfelt/voices/<name>.md`, selected per invocation with `--voice <name>`. An invocation in multi mode with no `--voice` falls back to bundled defaults rather than guessing or leaking another writer's overrides.
2. **Domain profile, always available.** `.clearfelt/domain.md`, unlike voice, is project-scoped and shared by every writer: it holds a domain description, a list of technical terms exempt from flagging, and an optional target reading-level range (feeding ADR 0008's readability feature). Built via `/clearfelt setup`'s domain section, independent of voice mode.

Both are merged into the same overrides `Set` in `scripts/detect.mjs`'s `findHits`, so a term can be exempted at either the voice or domain level and the effect is identical.

## Consequences

`voice.mode` lives in `clearfelt.config.md`, which is skill-level (shared across every project using a given install), not per-project. Switching to multi-voice is a deliberate, visible edit to shared config, not a silent per-project toggle; `reference/setup.md` explains this rather than flipping it automatically. `.gitignore`'s existing `.clearfelt/` wildcard already covers `voices/` and `domain.md` with no change needed.
