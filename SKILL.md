---
name: clearfelt
description: Strip clinical AI writing patterns ("slop") out of text and rewrite it with human warmth, or turn a short seed idea into a full human-sounding first draft. Use when the user asks to check text for AI tells, score how "AI-sounding" a draft is, rewrite a document so it reads less like AI output, remove corporate/robotic phrasing, flesh out a rough note into a human-sounding post or article, set up a personal writing voice profile, or see which settings are currently active. Covers commands "/clearfelt setup", "/clearfelt audit", "/clearfelt rewrite", "/clearfelt write", and "/clearfelt explain".
license: MIT
---

clearfelt scores text in code, not in a model's head: `scripts/detect.mjs` parses the Markdown rule files under `rules/` and computes the Human Score directly, so anyone can rerun it and get the same result. Present every result following [reference/format/conventions.md](reference/format/conventions.md) and the per-command template in `reference/format/`: tables and headers, not prose paragraphs. [writing.md](writing.md) is the editorial doctrine behind every rule and rewrite decision; [voice.md](voice.md) explains how a user's own voice-profile preference overrides it. Both govern `/clearfelt rewrite` in particular, read them before changing rewrite behavior.

## Commands

| Command | Type | Reference | What it does |
|---|---|---|---|
| `/clearfelt setup` | Onboarding | [reference/setup.md](reference/setup.md) | First-run adaptive interview, freely re-runnable, that builds `.clearfelt/voice-profile.md` (or `.clearfelt/voices/<name>.md` in multi-voice mode) and `.clearfelt/domain.md` for this project. Optional, but recommended first. |
| `/clearfelt audit [path]` | Read-only | [reference/audit.md](reference/audit.md) | Scans a file or directory, reports every hit with line and snippet, prints the Human Score (0-100) plus a separate readability report. Leaves the target untouched. |
| `/clearfelt rewrite [path]` | Rewrite | [reference/rewrite.md](reference/rewrite.md) | Loops `prompts/audit_loop.xml`'s scrub, re-score, and preservation-check steps until the score clears the configured threshold or the iteration cap is hit. Shows a before/after and waits for explicit approval before writing anything. Conservative by default. |
| `/clearfelt write [seed]` | Generate | [reference/write.md](reference/write.md) | Drafts from a seed (a file path or pasted text) via `prompts/write_loop.xml`, at a chosen length, then scores and preservation-checks the result the same way rewrite does. Always writes to a new file next to the seed, never overwrites it, and waits for approval first. |
| `/clearfelt explain` | Read-only | [reference/explain.md](reference/explain.md) | Prints every currently-resolved setting and its source (default, shipped config, or global override), plus active voice/domain profile state and hook status. Read-only, changes nothing. |

## Routing

- **Explicit or clearly implied command** (`audit`, `rewrite`, `write`, `explain`, `setup`, or a synonym like "score this" / "check for AI slop" / "make this sound human" / "flesh this idea out into a post" / "what settings are active"): load that command's reference file and follow it.
- **No argument or ambiguous request**: show the Commands table above as a menu. Do not guess and auto-run a command.
- **First use in a project with no `.clearfelt/voice-profile.md`**: before running `audit` or `rewrite`, mention once that `/clearfelt setup` exists and is the recommended first step, then offer to run the requested command anyway if the user would rather skip it. Never block on it.

## Hooks

`$clearfelt hooks <status|on|off|ignore-rule <category>|ignore-file <glob>|reset>` manages an auto-audit hook that runs `scripts/detect.mjs` after edits to text/markdown files in this project and prints a short score reminder. Load [reference/hooks.md](reference/hooks.md) when the user invokes it with any argument.

## Pin

`node scripts/pin.mjs <pin|unpin> <audit|rewrite|write|explain|setup>` creates or removes a standalone `$clearfelt-<command>` shortcut skill in the project's harness directories. Report the script's result concisely.

## Configuration

All tunables (score threshold, max iterations, intensity, severity weights, tier thresholds, statistical signal weights, deduction cap, hook settings, confirm-before-write, preservation-checking hard-fail toggles, voice mode, readability target) live in `clearfelt.config.md` at the repo root, a plain Markdown table. Nothing in this skill requires editing JSON. Run `/clearfelt explain` to see every setting's currently-resolved value and which layer it came from.
