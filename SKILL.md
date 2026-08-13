---
name: clearfelt
version: 0.3.0
description: Strip clinical AI writing patterns ("slop") out of text and rewrite it with human warmth. Use when the user asks to check text for AI tells, score how "AI-sounding" a draft is, rewrite a document, remove corporate/robotic phrasing, set up a personal writing voice profile, or see which settings are currently active. Covers commands "/clearfelt setup", "/clearfelt audit", "/clearfelt rewrite", and "/clearfelt explain".
license: MIT
---

clearfelt is deterministic and scored, not vibes-based. `scripts/detect.mjs` parses the Markdown rule files under `rules/` and computes the Human Score in code, so the number is reproducible by anyone who runs the script, not just an LLM's read of the text. Present every result following [reference/output-format.md](reference/output-format.md): tables and headers, not prose paragraphs. [writing.md](writing.md) is the editorial doctrine behind every rule and rewrite decision; [voice.md](voice.md) explains how a user's own voice-profile preference overrides it. Both govern `/clearfelt rewrite` in particular, read them before changing rewrite behavior.

## Commands

| Command | Type | Reference | What it does |
|---|---|---|---|
| `/clearfelt setup` | Onboarding | [reference/setup.md](reference/setup.md) | First-run adaptive interview, freely re-runnable, that builds `.clearfelt/voice-profile.md` (or `.clearfelt/voices/<name>.md` in multi-voice mode) and `.clearfelt/domain.md` for this project. Optional, but recommended first. |
| `/clearfelt audit [path]` | Read-only | [reference/audit.md](reference/audit.md) | Scans a file/directory, reports every hit with line and snippet, prints the Human Score (0-100) and a separate readability report. Never edits the file. |
| `/clearfelt rewrite [path]` | Rewrite | [reference/rewrite.md](reference/rewrite.md) | Runs the 3-pass loop in `prompts/audit_loop.xml`, re-scoring and preservation-checking after each pass, until the score clears the configured threshold or the iteration cap is hit. Shows a before/after and waits for explicit approval before writing anything. Conservative by default. |
| `/clearfelt explain` | Read-only | [reference/explain.md](reference/explain.md) | Prints every currently-resolved setting and where it came from (default, shipped config, or global override), plus active voice/domain profile state and hook status. Never edits anything. |

## Routing

- **Explicit or clearly implied command** (`audit`, `rewrite`, `explain`, `setup`, or a synonym like "score this" / "check for AI slop" / "make this sound human" / "what settings are active"): load that command's reference file and follow it.
- **No argument or ambiguous request**: show the Commands table above as a menu. Do not guess and auto-run a command.
- **First use in a project with no `.clearfelt/voice-profile.md`**: before running `audit` or `rewrite`, mention once that `/clearfelt setup` exists and is the recommended first step, then offer to run the requested command anyway if the user would rather skip it. Never block on it.

## Hooks

`$clearfelt hooks <status|on|off|ignore-rule <category>|ignore-file <glob>|reset>` manages an auto-audit hook that runs `scripts/detect.mjs` after edits to text/markdown files in this project and prints a short score reminder. Load [reference/hooks.md](reference/hooks.md) when the user invokes it with any argument.

## Pin

`node scripts/pin.mjs <pin|unpin> <audit|rewrite|explain|setup>` creates or removes a standalone `$clearfelt-<command>` shortcut skill in the project's harness directories. Report the script's result concisely.

## Configuration

All tunables (score threshold, max iterations, intensity, severity weights, tier thresholds, statistical signal weights, deduction cap, hook settings, confirm-before-write, preservation-checking hard-fail toggles, voice mode, readability target) live in `clearfelt.config.md` at the repo root, a plain Markdown table. Nothing in this skill requires editing JSON. Run `/clearfelt explain` to see every setting's currently-resolved value and which layer it came from.
