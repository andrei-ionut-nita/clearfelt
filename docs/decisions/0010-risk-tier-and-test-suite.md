# ADR 0010: A risk tier for sensitive documents, an automated test suite, and a lightweight eval set

**Status:** Implemented
**Date:** 2026-08-12

## Context

A multi-persona review of clearfelt (a Bloomberg-style editor, an FT-style editor, an Amazon-style chief communications officer, a Netflix-style CEO and Chief People Officer, an engineering audit in the style of Google's founders, and a Wikipedia-style sourcing/neutrality pass) surfaced one dominant risk and several smaller, concrete gaps, all checked directly against the repo rather than assumed:

- No automated tests exist anywhere in the repo (`find . -iname "*test*"` returned nothing before this change), for a tool whose entire brand claim is "deterministic and reproducible." Every change made in this project's own history so far was verified by hand, one-off scripts, never a suite that fails on its own.
- Scoring weights (`severity` values in `rules/*/*.md`, the statistical-signal weights in `clearfelt.config.md`) were chosen by inspection, with no labeled ground truth anywhere to check them against.
- Nothing distinguishes a low-stakes document from a legally or reputationally sensitive one. `/clearfelt humanize`'s hedge- and qualifier-removal rules (`frictionless_claims`, `weasel_attribution`) run identically on a blog post and a shareholder letter, and hedged language is often legally load-bearing in the latter, not a stylistic weakness.
- Confirm-before-write (ADR 0006) is a single interactive gate with no durable record; nothing survives past the terminal session that approved a write.
- `docs/SOURCES.md` had `wikipedia-ai-signs` (a crowd-maintained essay) miscategorized in the "Academic and institutional sources" table instead of "Community prior art," violating the file's own stated two-tier distinction.
- Readability defaults (`target_grade_level_min/max`, 6-12) are US-school-grade calibrated and presented without qualification about their applicability elsewhere.

## Decision

**An automated test suite**, `tests/detect.test.mjs`, using Node's built-in test runner (`node:test`), zero new dependency, run via `node --test`. Tests invoke `scripts/detect.mjs` as a real subprocess against fixtures in `tests/fixtures/`, matching how the script is actually used, rather than importing internals (it's a script with an unconditional `main()`, not a library). Includes a regression test that reproduces the round-9 category-severity-weight bug via a temporary `~/.clearfelt/settings.md` override and asserts it stays fixed.

**A lightweight eval set**, `tests/fixtures/eval/` plus `scripts/eval.mjs`, ten labeled fixtures (five AI-heavy, five human) with expected score bands. Explicitly not full ML validation, just a first, honest, checkable answer to "does the score correlate with the label at all." Run once during this change: 5 of 10 fixtures landed out of band, all five AI-heavy ones scored higher than expected because they're short, single-paragraph samples where most flagged words occur only once and get suppressed by tier-2/tier-3 thresholds. Left as a real, measured finding rather than adjusted to pass; the bands should stay tied to what a human labeler would expect, not to what the current detector happens to produce.

**A `risk_tier` field** in `.clearfelt/domain.md` (`standard` default, `sensitive` opt-in), documented in `templates/domain.example.md`, `reference/humanize.md`, and `reference/setup.md`, and wired into `prompts/audit_loop.xml`'s Pass 1 and Pass 2. When `sensitive`: `frictionless_claims` and `weasel_attribution` hits are never rewritten away at any intensity tier, and the confirm-before-write gate is forced on regardless of `humanize.require_confirmation` or any saved preference. Kept as a project-level field on the existing shared domain file rather than a new config file, consistent with the CLAUDE.md rule against a second place to configure the same kind of setting.

**A durable audit log**, `.clearfelt/audit.log`, gitignored the same way as the rest of `.clearfelt/`. `/clearfelt humanize` appends one line on every approved write (timestamp, path, intensity, score delta, approval), and also on an unattended write when `humanize.require_confirmation: false`. Nothing is logged on a decline, since nothing changed.

**Source table fix**: `wikipedia-ai-signs` moved from "Academic and institutional sources" to "Community prior art" in `docs/SOURCES.md`, matching what it actually is.

**Readability caveat documented**, not silently left implicit: `clearfelt.config.md` and `README.md` now both state plainly that the shipped grade-level defaults are US-school-grade, English-language calibrated, and that real localization is out of scope for this version.

## Consequences

`node --test` and `node scripts/eval.mjs` become the two commands to run before opening a PR that touches scoring, alongside the existing manual rule-testing steps in `docs/DEVELOP.md`, which now references both. The eval set's current 5/10 pass rate is a known, disclosed limitation (short single-paragraph AI text under-scores due to tier suppression), not a regression introduced by this change; closing it is future work, likely either tuning tier thresholds for short documents or accepting the tradeoff and documenting it more prominently in the README. `risk_tier` does not change how `/clearfelt audit` scores or reports a document, only how `/clearfelt humanize` is allowed to rewrite it, keeping the read-only/rewrite boundary (SKILL.md's Commands table) intact.
