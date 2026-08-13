# ADR 0009: A four-tier intensity ladder, asked upfront, saved somewhere that survives an update

**Status:** Implemented
**Date:** 2026-08-12

## Context

Dogfooding surfaced two problems at once. Running `/clearfelt humanize` end-to-end on a real slop-heavy test file produced a near-no-op edit: `intensity: conservative`, the silent default, only ever touches confirmed hits and preserves structure, and the user was never asked whether that was the right amount of change for a document this dense. Separately, the user asked directly how a saved preference would survive a skill update, a question that, on investigation, exposed a real bug in round 9's design: `voice.mode`, saved by editing `clearfelt.config.md` directly, lives inside the skill's own tracked repo and would be silently wiped by the next `git pull` or reinstall.

## Decision

**Four intensity tiers, not two**, replacing `conservative`/`aggressive`. Chosen to reflect gaps found in actual testing, not picked abstractly: `light_touch` and `full_rewrite` are the old two tiers renamed; `balanced` fills the gap between "touch nothing but flagged spans" and "restructure sentences," and `structural_rework` exists specifically because the test file had no paragraph breaks at all and no existing tier was willing to fix that. Config values are the friendly slugs directly (`light_touch`, not `conservative` mapped to a display label), avoiding a translation table to keep in sync, consistent with the project's existing "no jargon, hand-editable Markdown" stance.

**Asked upfront, with a preview**, not read silently from config. Pass 1 of `prompts/audit_loop.xml` now runs the `detect.mjs` scan before any rewriting, builds a to-do preview from the hits, and presents it alongside the four-tier table so the choice is grounded in what's actually wrong with this document, not an abstract menu.

**Settings that survive a skill update, modeled on `impeccable`** (verified via direct inspection, not assumed): `impeccable` never writes user data into its own installed skill repo. Persisted state lives either in `<project>/.impeccable/` or `~/.impeccable/` (resolved via `os.homedir()`), both physically outside anything a `git pull` or reinstall touches. clearfelt's `.clearfelt/` project directory already matched this pattern for voice and domain profiles; `clearfelt.config.md` did not, and round 9's `voice.mode` save instruction (documented in `reference/setup.md`) pointed there by mistake. Fixed for both settings, not just the new one: a new `~/.clearfelt/settings.md`, using the same table format `clearfelt.config.md` already uses (so `scripts/detect.mjs`'s existing `parseConfigTable` parser needed no changes), is the actual target for any global save, layered with highest precedence in `loadConfig()`. `clearfelt.config.md` remains the shipped-defaults reference, reset on every update by design; `~/.clearfelt/settings.md` is never shipped and never touched by one.

**Save scope is the user's choice at save time**, not a hardcoded default: global (`~/.clearfelt/settings.md`, every project using this skill install) or project-only (`.clearfelt/domain.md`'s `preferred_intensity` field, reusing the existing project-scoped shared file rather than inventing a new one, consistent with the CLAUDE.md hard rule against a second place to configure the same setting).

## Consequences

Resolution order for intensity, checked before Pass 2 ever rewrites anything: `.clearfelt/domain.md`'s `preferred_intensity` (project) beats `~/.clearfelt/settings.md`'s `intensity` (global save) beats `clearfelt.config.md`'s shipped default (ask). The confirm-before-write gate from ADR 0006 is unchanged and still runs afterward as a separate, later checkpoint, this ADR only affects how the *rewrite itself* gets scoped, not whether the result gets written.
