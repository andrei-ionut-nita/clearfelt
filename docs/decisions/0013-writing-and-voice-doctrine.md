# ADR 0013: writing.md and voice.md as root-level product doctrine

**Status:** Implemented
**Date:** 2026-08-13

## Context

clearfelt's identity, what counts as bad writing, what it preserves, how warmth trades off against precision, is currently spread across `rules/`, `docs/decisions/`, `docs/RESEARCH.md`, and `prompts/audit_loop.xml`, each covering one piece without a single normative statement tying them together. As the rule dictionary and scoring model grow (multi-dimensional scoring, mode-based rewrite policy, both planned for v0.3's later phases), that absence gets worse: each new rule or weight change has nothing to check itself against except precedent in scattered ADRs, which is workable for a maintainer who remembers every prior decision and fragile for anyone else.

A product-brainstorm session (four adversarial personas critiquing an early v2 spec, later consolidated) raised this directly and proposed a root-level doctrine file, initially as four files: `product.md`, `design.md`, `writing.md`, `voice.md`. Mid-session, it emerged that `product.md` and `design.md` are already owned by a separate, unrelated skill (`impeccable`, confirmed via its own documentation: `/impeccable init` generates exactly those two files, covering platform/positioning context and design tokens/system patterns). Creating files by those names in this repo would collide with that convention in any project using both skills.

## Decision

**Two files, `writing.md` and `voice.md`, both at repo root, both tracked.** Not `product.md` or `design.md`, those stay `impeccable`'s.

**`writing.md`** is system-level editorial doctrine: what clearfelt considers bad writing, what it always preserves, when it refuses to rewrite, and the underlying principle (formality is not a flaw, genre conventions must be respected, context matters more than a surface pattern match) that `rules/`, `clearfelt.config.md`'s weights, and `prompts/audit_loop.xml`'s rewrite instructions are all implementations of. It does not restate what those files already say line by line; it states the judgment they're supposed to be consistent with, so a future rule addition or weight change has something to check itself against.

**`voice.md`** is doctrine about the voice-profile *system*, not a data file: why it exists, its precedence over the shipped rule files, what it will and will not override (it does not override no-fabrication or confirm-before-write). The actual per-project data stays exactly where it already was: `.clearfelt/voice-profile.md` (or `.clearfelt/voices/<name>.md` in multi-voice mode), gitignored, built by `/clearfelt setup`. This was the one real design question: whether `voice.md` at root should hold user preferences directly. It should not, that would either duplicate `.clearfelt/voice-profile.md` or fight it for authority, and would also stop making sense the moment a project has more than one writer (`voice.mode: multi` already exists for exactly that case).

**Both are referenced from the pipeline that should actually follow them**, not left as standalone reading: `SKILL.md` points to both up front, and `prompts/audit_loop.xml`'s Pass 1 and Pass 2 both cite them directly, Pass 1 as the standing doctrine the whole run operates under, Pass 2 with a concrete check (don't rewrite a formal or hedged passage just because a rule matched it, if the passage is legitimately correct for its genre).

## Consequences

`writing.md` and `voice.md` are documentation, not code; nothing enforces that a future rule addition actually respects them beyond a contributor or reviewer reading both first. This is the same trust model `CONTRIBUTING.md` already relies on for the `source:` requirement, not a new gap.

The `impeccable`-ownership boundary is now load-bearing: if `impeccable` is ever renamed, restructured, or the two projects diverge in what `PRODUCT.md`/`DESIGN.md` mean, this decision should be revisited rather than assumed to still hold.
