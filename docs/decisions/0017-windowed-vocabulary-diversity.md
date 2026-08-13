# ADR 0017: Windowed vocabulary diversity (MATTR), replacing Root TTR

**Status:** Implemented
**Date:** 2026-08-13

## Context

`docs/decisions/0012` replaced raw type-token ratio with Root TTR (Guiraud's R, unique words / sqrt(total words)) specifically to reduce vocabulary diversity's length dependence, and it did, within the 16-fixture eval corpus (39-84 words). Dogfooding `/clearfelt audit` against a real, externally-generated 841-word AI-slop document (asked of Gemini specifically to produce dense corporate AI writing) surfaced that the fix was incomplete: the document scored 99, "reads clean," despite carrying 27 rule hits, the highest raw hit count of any file tested this session. Root TTR for that document was 15.45, more than double the highest value (7.42) the scoring weight was ever calibrated against, an out-of-distribution extrapolation the linear formula had no way to stay sane under. The vocabulary-diversity bonus (+69.98) alone outweighed the maximum possible rule-hit penalty (-65, capped), overriding an otherwise-correct signal.

The root cause is not noise or an uncalibrated weight, it's the metric itself. Root TTR still accumulates unique words over the *whole* document, only normalized by the square root of length rather than raw length. A longer document naturally covers more subtopics (this one has five distinct sections: executive summary, strategic pillars, tactical execution, operational scaling, conclusion) and therefore uses more distinct words almost regardless of whether a human or a model wrote it. Whole-document vocabulary count is confounded with topic breadth and length, not a clean proxy for authorship, and no amount of reweighting a whole-document metric fixes a confound baked into what's being measured.

## Decision

**MATTR (Moving-Average Type-Token Ratio, Covington & McFall 2010, `covington-mcfall-2010` in `docs/SOURCES.md`)** replaces Root TTR as the score-feeding vocabulary-diversity signal. MATTR computes ordinary type-token ratio inside a fixed-size sliding window (50 words, the literature-standard default) and averages the result across every window position in the document. This fixes the length confound by construction, not degree: every window is exactly 50 words, so document length stops being a variable at all once a document exceeds the window, instead of merely growing more slowly. Falls back to plain whole-document TTR for documents at or under the window size, matching existing behavior there since there is no length bias left to correct for at that size.

**Empirical validation**, measured against the same 16-fixture eval corpus plus the 841-word external document that surfaced the problem (see the probe script's output, not reproduced here, run against both metrics side by side):

| | Root TTR | MATTR-50 |
|---|---|---|
| AI-labeled fixtures | 5.7-15.4 (mean 7.34, dominated by the outlier) | 0.80-0.89 (mean 0.862) |
| Human-labeled fixtures | 5.9-7.4 (mean 6.70) | 0.81-0.95 (mean 0.879) |
| 841-word external AI document | 15.45 (more than 2x the highest calibrated value) | 0.889 (squarely inside the existing spread) |

MATTR keeps a real, if modest, separation between the AI-labeled and human-labeled means (0.862 vs. 0.879), in the same direction Root TTR showed, while no longer treating the long document as an extreme outlier. This is the expected, honest outcome for a signal whose own documentation already describes it as "a tie-breaker and diagnostic, most informative once rule-hit deduction is capped or near zero, not a co-equal scoring input" (`reference/audit.md`), a signal in that role should have a modest, bounded effect, not the ability to single-handedly cancel out a capped rule-hit deduction.

**Recalibrated weight and baseline**: `vocabulary_diversity_baseline` moved from `6.7` to `0.8688` (the combined AI+human mean MATTR-50 across the 16-fixture corpus) and `vocabulary_diversity_weight` from `8` to `140` (chosen so the corpus's observed extremes produce roughly a ±10-12 point swing, not the ±70 an out-of-distribution Root TTR value could produce). Both are on MATTR's native 0-1 scale now, not Root TTR's unbounded one; see `clearfelt.config.md`.

## Consequences

Every score in the eval corpus and the shipped fixtures shifted (see `CHANGELOG.md` for the concrete before/after numbers); `scripts/eval.mjs`'s pass rate held at 15/16, the same single disclosed miss as before, not a regression. The 841-word external document moved from 99 ("reads clean") to 31 ("needs work"), now correctly led by its rule-hit deduction rather than masked by an out-of-scale vocabulary bonus. Both raw type-token ratio (`breakdown.typeTokenRatio`) and Root TTR (`breakdown.rootTypeTokenRatio`) remain in the JSON output for transparency and comparison; only MATTR (`breakdown.movingAverageTtr`) feeds the score now. The eval corpus itself is still capped at 84 words, meaning MATTR's windowing behavior is only exercised by fallback (plain whole-document TTR) for every fixture in it; a genuinely longer labeled fixture (300+ words) would be a real improvement to the corpus, not fixed here, since the 16-fixture set staying deliberately small is `docs/decisions/0012`'s own tradeoff, not one this ADR revisits.
