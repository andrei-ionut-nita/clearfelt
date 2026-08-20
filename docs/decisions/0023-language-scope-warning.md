# ADR 0023: A disclosed language-confidence warning, not silent misscoring

**Status:** Implemented
**Date:** 2026-08-20

## Context

A CPO-lens review of clearfelt (is it actually generic enough for anyone, not just this repo's one real pilot) surfaced a gap the tool had never addressed: `docs/RESEARCH.md:57` already discloses, citing `stanford-hai-bias-2023`, that non-native English writers are disproportionately misflagged by exactly this class of statistical AI-detector, because their writing sits statistically closer to the "smooth, uniform" AI profile without being AI-generated at all. But that disclosure lives in a research document nobody reads mid-workflow. Every statistical signal in `scripts/lib/score.mjs` (MATTR, burstiness, trigram repetition) and every rule dictionary entry in `rules/antipatterns/` and `rules/banned_words/` is English-only by construction: English word-boundary regexes, English vocabulary lists. A document in French, Romanian, or any other language still gets a confident-looking 0-100 Human Score today, with nothing in the output disclosing that the number doesn't measure what it looks like it measures.

The README already discloses an analogous limitation for readability specifically ("Calibrated for US-school-grade, English-language, general-audience text; not validated for other languages"), but the Human Score itself, the tool's headline number, had no equivalent.

## Decision

1. New `scripts/lib/language.mjs`: `englishFunctionWordRatio(text)`, the fraction of a document's words that are among the ~50 highest-frequency English function words (articles, prepositions, common pronouns and auxiliaries). Function words occur in real English prose at a roughly stable rate regardless of topic or register, unlike content words, which is exactly why this is a cheap, robust signal rather than a fragile one. `languageConfidence(text)` wraps it: returns `null` below `MIN_WORDS_FOR_CONFIDENCE` (30 words, mirroring `calibrate.mjs`'s own thin-sample threshold, not enough signal to judge either way), otherwise `{ confidence, low }`, where `low` fires below `LOW_CONFIDENCE_THRESHOLD` (0.15), a level real English prose in this repo's own fixtures never falls under.
2. `scripts/lib/report.mjs`'s `runFile()` computes this once per file and adds `scoreReliability: "low"`, `languageConfidence: <ratio>`, and a plain-language `languageWarning` string to the payload, in both `--mode report` and `--mode score`, only when it actually fires. An English document's payload is byte-for-byte unchanged from before this ADR.
3. `--mode score` carries the field too, not just `--mode report`: `prompts/write_loop.xml` and `prompts/audit_loop.xml`'s iterative scoring passes only ever call `--mode score`, so a report-only warning would never reach a real `/clearfelt write`/`rewrite` run, only a standalone `/clearfelt audit`.
4. `reference/audit.md` and `reference/write.md` updated so the agent surfaces this plainly, forward in the response, the same placement `risk_tier: sensitive` already gets, not a footnote.

## Why a heuristic warning, not real multi-language support

Real support (translated rule dictionaries, non-English statistical baselines) is a legitimate, much larger feature, and needs the same evidence-backed design pass `docs/decisions/0011`, `0012`, and `0017` used to calibrate the English signals: labeled non-English fixtures, measured separation, a documented baseline. Nothing like that exists yet. Shipping a guessed non-English scoring behavior without that evidence would repeat the exact mistake `docs/ROADMAP.md`'s Feature C was declined for, a statistical proxy asserted with more confidence than the evidence behind it earns. Disclosure needs none of that evidence to be honest; a confident guess does.

## Why not silently reduce the deduction weights for a likely non-English document instead of warning

Auto-adjusting the score for a guessed language is itself an unvalidated guess, and a worse one: it would produce a *different* confident-looking number with no disclosure at all, compounding the original problem instead of fixing it. A plain warning lets the reader decide how much to trust the number; a silent auto-correction doesn't.

## Consequences

- Purely additive: `languageConfidence`/`scoreReliability`/`languageWarning` are new optional fields, present only when they fire. No existing caller, test, or downstream consumer of `detect.mjs`'s JSON output changes for English text.
- Doesn't touch scoring itself (`computeScore`'s formula, weights, and thresholds are all unchanged): this is a report-layer disclosure, not a scoring-layer correction, on purpose, see above.
- Explicitly not built: non-English rule dictionaries, non-English statistical baselines, or any attempt to actually score non-English writing meaningfully. That stays a real, separate, evidence-gated feature for whenever real demand and a labeled fixture corpus exist.
