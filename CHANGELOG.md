# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-08-12

### Added

- `docs/SOURCES.md`: bibliography for the rule dictionary, in three tiers: academic and institutional sources with real URLs, community prior-art tools credited by name, and an honest "referenced but unresolved" table for claims that came up in research but couldn't be traced to an actual paper.
- `docs/RESEARCH.md`: condensed synthesis of the human-vs-AI-text research behind the rule dictionary.
- `docs/decisions/0005-sourced-rules.md`: the ADR for requiring a disclosed source on every rule.
- `docs/DEVELOP.md`, `docs/STYLE.md`, `docs/RELEASE.md`, and `CLAUDE.md`: development, style, release-process, and Claude-session-orientation docs.
- Five research-sourced lexicon entries: `camaraderie`, `palpable`, `intricate`, `furthermore`, `leverage`.

### Changed

- Every bullet in `rules/antipatterns/*.md` and `rules/banned_words/*.md` now carries a `source:` field resolved against `docs/SOURCES.md`. `rules/*.local.example.md` templates document the field for personal overrides (optional there).
- `scripts/detect.mjs` passes the `source` field through into every hit in `--mode report` output.
- `CONTRIBUTING.md` now requires a real `source:` key on any new shared rule, with `clearfelt-heuristic` and `unresolved-*` as the honest fallbacks instead of a fabricated citation.
- README's "Evidence base" section points at the actual bibliography instead of making an unlinked claim.
- LICENSE and README author attribution corrected.

## [0.1.0] - 2026-08-12

### Added

- `/clearfelt audit`, `/clearfelt humanize`, and `/clearfelt setup` commands, routed through a thin `SKILL.md` to per-command `reference/*.md` files.
- `scripts/detect.mjs`: a zero-dependency Node script that parses the Markdown rule files and computes the Empathy Index in code, including sentence-length variance, vocabulary diversity, trigram repetition, tiered banned-word matching, fenced-code and quote exclusion, and baseline/regression diffing.
- Eight rule files split one per category under `rules/antipatterns/` and `rules/banned_words/`, plus gitignored local-override templates so personal additions never touch the shared files.
- `clearfelt.config.md`: every tunable (score threshold, iteration cap, intensity, severity weights, tier thresholds, hook settings) in one plain Markdown table.
- `prompts/audit_loop.xml`: the 3-pass rewrite pipeline (extract and calibrate, scrub slop, warmth evaluation) driving `/clearfelt humanize`.
- No-fabrication and voice-profile-precedence rules for the rewrite pass.
- `.clearfelt/voice-profile.md` per-project voice profile, built and updated via `/clearfelt setup`.
- `scripts/hook.mjs`: an auto-audit hook that scores edited text files after Edit/Write/MultiEdit, managed via `$clearfelt hooks`.
- `scripts/pin.mjs`: `$clearfelt-<command>` shortcut skills.
- All user-facing data and config files are Markdown, no JSON, so non-technical users can customize the banlist and voice without touching syntax that can break.
