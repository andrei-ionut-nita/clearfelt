# ADR 0015: Locked spans, a per-span preservation guarantee

**Status:** Implemented
**Date:** 2026-08-13

## Context

`risk_tier: sensitive` (ADR 0010) is the only existing mechanism for telling `/clearfelt humanize` "don't touch this," and it's whole-project and whole-category: setting it protects `frictionless_claims` and `weasel_attribution` hits everywhere in the project, and forces confirmation on every run. The v0.3 spec doc's "preserve exactly" / "minimal touch" idea named a real gap this doesn't cover: a single verbatim quote, a legal boilerplate footer, or a pull-quote inside an otherwise normal document, where declaring the entire project sensitive would be both too broad (every other paragraph gets the same restriction) and too narrow (it only protects two specific rule categories, not "leave this exact text alone").

## Decision

**`<!-- clearfelt-lock -->` / `<!-- /clearfelt-lock -->` marker pairs**, placed directly in the target document by its author, on their own lines around the span to protect. Ordinary HTML comments, the same idiom `scripts/pin.mjs` already uses for its own marker convention (`<!-- clearfelt-pinned-skill -->`), invisible in rendered Markdown, consistent with `docs/decisions/0002`'s Markdown-only rule for user-facing files (this is not a second config format, it's plain text inside the file it protects).

**Scope: `/clearfelt humanize` only, not scoring.** A rule hit inside a locked span still counts in `/clearfelt audit`'s report and score exactly as it would anywhere else; locking a span changes what humanize is willing to rewrite, not what the detector reports. This mirrors `risk_tier`'s existing behavior (it also only changes humanize's rewrite scope and the confirmation gate, never the score) and keeps the guarantee legible: a user should never be surprised that a locked, flagged span didn't affect the score, because it always did.

**Handled entirely in `prompts/audit_loop.xml`, not `scripts/detect.mjs`.** Rewriting is LLM-driven by design (ADR 0001: "the model is used to rewrite while the score is only used to gate the process"); `detect.mjs` never rewrites anything, so there is no code-level enforcement point for this the way there is for scoring. Pass 1 records each locked region's line range; Pass 2 treats it as a hard boundary at every intensity tier, the same way it already treats `risk_tier: sensitive`'s two protected categories.

**Narrower than `risk_tier` on purpose, not a replacement for it.** `risk_tier: sensitive` protects two whole rule categories project-wide and forces confirmation; a locked span protects exactly the text between its markers and nothing about the confirmation gate. Both can be used together; neither implies the other.

## Consequences

The markers are visible in the source Markdown itself (as HTML comments) but not in rendered output, so a document with locked spans looks unchanged to a reader viewing it normally. `/clearfelt humanize` leaves the markers in place rather than stripping them after a run, so the same region stays protected across repeated humanize runs without the author having to re-mark it each time. Nothing in `scripts/detect.mjs` changed; this is a documentation and prompt-instruction addition only, consistent with how `risk_tier`'s hedge-protection is also purely instruction-enforced rather than code-enforced.
