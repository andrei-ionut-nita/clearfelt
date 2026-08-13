# ADR 0019: Model-judged command routing, not a `commands/` directory

**Status:** Decided
**Date:** 2026-08-13

## Context

A review of the skill against Anthropic's skill-authoring guidance asked why `/clearfelt setup`, `audit`, `rewrite`, `write`, and `explain` are dispatched by `SKILL.md`'s "Routing" section, where the model matches the user's request against a synonym list and loads the matching `reference/*.md` file, rather than by five real Claude Code slash commands under `commands/`. Real commands get harness-level dispatch: tab-completion, argument hints, and a match that doesn't depend on the model's judgment.

## Decision

Keep model-judged routing. Do not add a `commands/` directory.

## Why

`CLAUDE.md`'s "Claude Code only, v1" rule already draws this exact line for `scripts/hook.mjs` and `scripts/pin.mjs`: those two are allowed to be Claude-Code-specific because they need Claude Code's actual config format (`.claude/settings.local.json`) to do their job at all. Everything else in the skill, explicitly including `/clearfelt audit`/`rewrite`/`write`/`setup`, is called out as "plain instructions any agent can follow" on a harness installed via `skills add`, and that portability is framed as a real, low-cost win worth keeping, not an accident.

A `commands/*.md` directory is a Claude Code-specific mechanism, the same category CLAUDE.md already restricts to hook.mjs and pin.mjs for a stated reason. Moving the five commands there would trade that cross-agent portability for dispatch reliability inside Claude Code specifically, without a new ADR revisiting the "Claude Code only, v1" scope decision on purpose, which CLAUDE.md already requires before changing it.

The dispatch-reliability concern is real but narrower than "convert to commands": `SKILL.md`'s routing section already handles the common cases (an explicit command name, a listed synonym, no argument at all falls back to the menu). The residual risk is a request phrased in a way the synonym list doesn't anticipate. That's a description/synonym-coverage problem, addressed by the description-precision check in this same review round, not a dispatch-mechanism problem.

## What would change this

If clearfelt ever drops the "Claude Code only, v1" scope rule for the interactive commands specifically (a new ADR, per CLAUDE.md's own process), real `commands/*.md` files become the better default: they'd get harness-guaranteed dispatch for the Claude Code case without costing anything, since `SKILL.md` would stay as the fallback entry point for other agents either way.
