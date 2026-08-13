# ADR 0011: Cap rule-hit deduction, rescale the statistical signal weights, defer percentile rescaling

**Status:** Implemented
**Date:** 2026-08-13

## Context

Dogfooding `/clearfelt humanize` at all four intensity tiers against a real test document (session's ongoing `ai_slop_example.md` test) showed `balanced`, `full_rewrite`, and `structural_rework` all converging on the same score once rule-hit deduction reached zero, even though `structural_rework` had visibly done more work (split 9 paragraphs into 14, removed remaining trigram repetition). The user asked directly why the other scoring components (burstiness, vocabulary diversity, repetition, paragraph variety) carried so little weight relative to rule-hit deduction.

Measuring the actual math against 17 real documents scored during this session (the 5 `ai_slop_example` tier variants, 2 `tests/fixtures/` files, 10 `tests/fixtures/eval/` files) confirmed a real, quantifiable imbalance, not just an impression:

| Signal | Theoretical range | **Observed range across 17 documents** |
|---|---|---|
| Rule-hit deduction | 0 to unbounded | **0 to 86** |
| Burstiness | -5 to +5 | -3.22 to +1.60 |
| Vocabulary diversity | -2 to +3 | +0.85 to +2.66 |
| Repeated-phrase penalty | 0 to 50 | **0 to 1.10** |
| Paragraph-variety | -4 to +4 | -3.71 to +0.28 |

Rule-hit deduction is a linear sum over every flagged word or phrase with no ceiling; every statistical signal is a bounded delta whose formula theoretically allows a wider range than real prose ever produces (sentence-length coefficient of variation for coherent writing sits around 0.3-0.6, not near 0 or 1; exact three-word-sequence repetition is rare even in bad AI writing, which repeats ideas and word choices, not literal trigrams). Past roughly 2 rule hits, deduction doesn't just dominate the score, it mathematically zeroes out every other signal's ability to matter at all.

Four candidate fixes were considered, as a staff-data-scientist-style options analysis:

1. **Cap rule-hit deduction** so it can't fully drown the rest.
2. **Raise the statistical weights**, sized empirically from the observed-range table above rather than round-number guesses.
3. **Leave the math, document the framing** (these signals are tie-breakers, not co-equal inputs).
4. **Rescale everything to percentile/z-score bands** against a labeled corpus.

## Decision

**Options 1 and 2 together, informed by the empirical table, option 3 unconditionally, option 4 explicitly deferred.**

Option 2 alone was rejected as insufficient on its own: raising a bounded signal's weight still gets crushed by an unbounded deduction once enough hits accumulate, it only delays the swamping point, it doesn't remove it. Option 1 is the load-bearing fix; option 2 is only useful once option 1 creates headroom for it to matter in (the zero-deduction regime where the three top humanize tiers converged is exactly that case). Option 4 was rejected for now, not indefinitely: percentile ranking is only as good as the distribution it's ranked against, and a 10-document eval corpus (`tests/fixtures/eval/`) is too small and noisy to rank against meaningfully. Shipping it now would mean the score quietly depends on an unstable reference corpus, and would turn `scripts/detect.mjs` from a self-contained deterministic script into one with a real data dependency, a bigger architectural cost than this problem currently justifies. Revisit once the eval corpus is grown well past 10 documents per label.

**`deduction_cap` (default 65)**, new setting in `clearfelt.config.md`'s `## Scoring` section. `computeScore` in `scripts/detect.mjs` now computes both `deduction` (the true, uncapped sum, unchanged) and `deductionApplied` (`Math.min(deduction, deductionCap)`, what actually feeds the score formula), plus a `deductionCapped` boolean. The `impacts` array's top row's label discloses the raw value directly (`"Rule-hit deduction (capped from 119)"`) rather than hiding it, so a reader never sees a capped score without also seeing the number that got capped. 65 was chosen against `empathy_threshold`'s default of 85: a document whose raw deduction already exceeds 65 is unambiguously below threshold regardless of exactly how far past it, so further raw deduction adds no decision-relevant resolution, only the ability to erase every other signal.

**Statistical weights rescaled** using the observed-range table, targeting roughly a 6-point realistic span per signal (enough to be a genuine tie-breaker, not enough to rival a capped deduction of up to 65): `burstiness_weight` 10 to 12, `vocabulary_diversity_weight` 5 to 17, `repetition_weight` 5 to 27, `paragraph_variety_weight` 8 to 12. Repetition got the largest multiplier since its observed range (1.10) was the narrowest relative to its theoretical ceiling (50), exact trigram repetition is genuinely rare, so when it does fire it should be able to say something.

**Framing documented** in `reference/audit.md`: a new "Why rule-hit deduction is capped" note and a "When the statistical signals matter" note, stating plainly that these signals are tie-breakers once deduction is capped or near zero, not co-equal scoring inputs on a document that still has many rule hits.

## Consequences

**A real, disclosed regression, not hidden**: re-running `scripts/eval.mjs` after the rescale kept the same 5/10 pass rate, but the 5 AI-heavy misses got measurably worse (78 up to 83, 78 up to 83, 94 up to 99, 88 up to 93, 87 up to 91), not just unchanged. Raising `vocabulary_diversity_weight` rewards high type-token ratio more, and TTR is known to correlate with document length rather than AI-ness, short single-paragraph AI samples (already this session's known weak spot, see ADR 0010) get an even larger undeserved bonus. This is left as-is and disclosed here and in the eval output rather than tuned away, consistent with this project's standing practice of reporting real findings over convenient ones. Closing it properly likely needs either a length-normalized vocabulary-diversity formula or the percentile-rescaling approach (option 4) once the eval corpus is large enough, not a further hand-tuned weight change.

Existing tests updated: `ai-heavy-sample.md`'s expected score moved 56 to 60 (deduction unchanged at 28, statistical signals shifted under the new weights). New fixture `tests/fixtures/extreme-slop-sample.md` and a new regression test assert the cap actually engages (`deductionApplied` clamped to 65, `deductionCapped: true`, the label discloses the raw value) for a document whose raw deduction exceeds it. `categoryPoints` and `patternSummary` (ADR-adjacent, added for the readability pass before this one) remain uncapped and unaffected, since they're diagnostic breakdowns of the raw hit list, not the score-affecting value.
