---
name: clearfelt
version: 0.2.0
description: Strip clinical AI writing patterns ("slop") out of text and rewrite it with human warmth. Use when the user asks to check text for AI tells, score how "AI-sounding" a draft is, humanize a document, remove corporate/robotic phrasing, or set up a personal writing voice profile. Covers commands "/clearfelt setup", "/clearfelt audit", and "/clearfelt humanize".
license: MIT
---

clearfelt is deterministic and scored, not vibes-based. `scripts/detect.mjs` parses the Markdown rule files under `rules/` and computes the Empathy Index in code, so the number is reproducible by anyone who runs the script, not just an LLM's read of the text. Present every result following [reference/output-format.md](reference/output-format.md): tables and headers, not prose paragraphs.

## Commands

| Command | Type | Reference | What it does |
|---|---|---|---|
| `/clearfelt setup` | Onboarding | [reference/setup.md](reference/setup.md) | First-run adaptive interview, freely re-runnable, that builds `.clearfelt/voice-profile.md` (or `.clearfelt/voices/<name>.md` in multi-voice mode) and `.clearfelt/domain.md` for this project. Optional, but recommended first. |
| `/clearfelt audit [path]` | Read-only | [reference/audit.md](reference/audit.md) | Scans a file/directory, reports every hit with line and snippet, prints the Empathy Index (0-100) and a separate readability report. Never edits the file. |
| `/clearfelt humanize [path]` | Rewrite | [reference/humanize.md](reference/humanize.md) | Runs the 3-pass loop in `prompts/audit_loop.xml`, re-scoring after each pass, until the score clears the configured threshold or the iteration cap is hit. Shows a before/after and waits for explicit approval before writing anything. Conservative by default. |

## Routing

- **Explicit or clearly implied command** (`audit`, `humanize`, `setup`, or a synonym like "score this" / "check for AI slop" / "make this sound human"): load that command's reference file and follow it.
- **No argument or ambiguous request**: show the Commands table above as a menu. Do not guess and auto-run a command.
- **First use in a project with no `.clearfelt/voice-profile.md`**: before running `audit` or `humanize`, mention once that `/clearfelt setup` exists and is the recommended first step, then offer to run the requested command anyway if the user would rather skip it. Never block on it.

## Hooks

`$clearfelt hooks <status|on|off|ignore-rule <category>|ignore-file <glob>|reset>` manages an auto-audit hook that runs `scripts/detect.mjs` after edits to text/markdown files in this project and prints a short score reminder. Load [reference/hooks.md](reference/hooks.md) when the user invokes it with any argument.

## Pin

`node scripts/pin.mjs <pin|unpin> <audit|humanize|setup>` creates or removes a standalone `$clearfelt-<command>` shortcut skill in the project's harness directories. Report the script's result concisely.

## Configuration

All tunables (score threshold, max iterations, intensity, severity weights, tier thresholds, statistical signal weights, deduction cap, hook settings, confirm-before-write, voice mode, readability target) live in `clearfelt.config.md` at the repo root, a plain Markdown table. Nothing in this skill requires editing JSON.
