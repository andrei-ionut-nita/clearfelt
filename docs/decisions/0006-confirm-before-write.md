# ADR 0006: Confirm before writing, always by default

**Status:** Implemented
**Date:** 2026-08-12

## Context

Asked to evaluate clearfelt as an editor at a tech magazine would, the clearest trust blocker that surfaced was `/clearfelt humanize` silently overwriting a file. Neither of the two comparable skills already running for this user solves this with a literal diff: `impeccable` relies on Claude Code's own tool-permission prompts for normal edits, and only gates via a rich visual browser preview for its `live` feature. `write-blog-article` gates via a content preview instead, showing the full draft or metadata block and requiring explicit approval before each phase writes files (`SKILL.md`: "Never skip a gate... explicit user approval before proceeding"). The user then stated the policy directly: never modify or delete a file without explicit permission.

## Decision

`/clearfelt humanize` runs its full 3-pass loop in memory, never touching the target file mid-loop. Once the loop ends, it presents a before/after (the original and rewritten text, or paragraph-by-paragraph blocks for longer files) plus the score delta and pass count, and asks explicit confirmation before writing anything. This is the `write-blog-article` gate pattern, adapted from "show draft, get approval, then write" to "show diff, get approval, then write."

`humanize.require_confirmation` in `clearfelt.config.md` defaults to `true` and is documented as the safe default, not a neutral toggle. A project can set it to `false` for scripted/batch use, but that's an explicit, visible opt-out in the project's own config, not the shipped behavior.

The "never delete" half of the policy is scoped to user content files. `scripts/pin.mjs unpin` and `scripts/hook.mjs reset` keep their existing marker-comment and machine-state conventions, both already safe by construction (unpin never touches a file it didn't create; hook state is clearfelt's own scratch file), so they don't need a new gate.

## Consequences

`reference/humanize.md`'s Flow section splits into "run the loop in memory" and a separate "Confirm before writing" section that every implementation of the command must pass through. No code path in this skill writes a user's file without that gate, short of the explicit per-project opt-out.
