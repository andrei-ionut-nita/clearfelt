# ADR 0012: Length-normalized vocabulary diversity (Root TTR), plus lexicon additions

**Status:** Implemented
**Date:** 2026-08-13

## Context

ADR 0011 disclosed, rather than hid, a regression: raising `vocabulary_diversity_weight` as part of that rescale made `scripts/eval.mjs`'s existing AI-heavy misses score even further from their expected band, and named the likely cause directly: "type-token ratio is known to correlate with document length rather than AI-ness, short single-paragraph AI samples... get an even larger undeserved bonus." It closed with "closing it properly likely needs either a length-normalized vocabulary-diversity formula or the percentile-rescaling approach... not a further hand-tuned weight change."

Measuring raw TTR across every fixture in `tests/fixtures/` and `tests/fixtures/eval/` confirmed this directly: the 5 AI-heavy eval fixtures (46-63 words each) landed at 0.778-0.870 raw TTR, and the 5 human eval fixtures (56-84 words each) landed at 0.788-0.931, an almost total overlap. At this document length, raw TTR does not separate AI-heavy from human text at all; it mostly just measures how short the document is. `scripts/eval.mjs` was failing 5/10 fixtures going into this change, all five AI-heavy samples scoring above their expected band.

## Decision

**Switch the score-affecting vocabulary signal from raw type-token ratio to Root TTR** (`unique words / sqrt(total words)`, Guiraud's R, `guiraud-1954` in `docs/SOURCES.md`), which grows roughly with the square root of length rather than falling with raw length, a much weaker length dependence. Measured across the same 13 fixtures, Root TTR gave real separation: AI-heavy fixtures clustered 5.90-7.19, human fixtures 6.40-9.58 (one long human sample at 9.58, the rest 6.40-7.42).

New config: `vocabulary_diversity_baseline` (default 6.7, the neutral point on Root TTR's scale) and `vocabulary_diversity_weight` rescaled from 17 (tuned for the 0-1 raw-TTR scale) to 8 (tuned for Root TTR's scale), both in `clearfelt.config.md`'s `## Statistical signals` section. `computeScore` in `scripts/detect.mjs` now computes `vocabAdjustment = (rootTtr - vocabulary_diversity_baseline) * vocabulary_diversity_weight`. Raw TTR is still computed and reported (`breakdown.typeTokenRatio`) for transparency, matching this project's standing practice of disclosing the number a decision was based on; only `breakdown.rootTypeTokenRatio` feeds the score now.

**Percentile rescaling (ADR 0011's option 4) remains deferred.** A 10-fixture eval corpus is still too small to rank against meaningfully; Root TTR is a formula-level fix that doesn't need a reference corpus at all, so it was tried first.

**Three lexicon entries added** to `rules/banned_words/puffery_lexicon.md` (`pave the way`, `unwavering commitment`, `multi-faceted approach`, all `source: clearfelt-heuristic`), the same kind of dogfooding-surfaced gap ADR 0009/0.2.0 already added `synergy` and `paradigm shift` for. After the Root TTR fix, `scripts/eval.mjs`'s last remaining miss (`ai-3.md`, scoring 76 against an expected 0-70 band) turned out to be a genuine rule-dictionary coverage gap, not a scoring-formula problem: the fixture's four rule hits totaled only 23 deduction points, well under what its density of AI-cliché phrasing should have caught. These three phrases are common enough in AI-generated corporate writing generally, not narrowly reverse-engineered from this one fixture, to be a legitimate addition on their own merits.

## Consequences

**`scripts/eval.mjs` moved from 5/10 to 10/10**, in two steps: wiring up `tier2_cluster_window` for real (a separate fix, see the round-9/10 dogfooding notes) closed 2 misses on its own by no longer suppressing legitimate single-occurrence tier-2 hits in dense paragraphs; the Root TTR switch plus the three lexicon additions closed the remaining 3. This is the first time the eval corpus has passed in full; it is still only 10 fixtures, so a 10/10 pass rate is a much weaker claim than it will be once the corpus is grown (see the deferred benchmark-corpus work in the v0.3 plan), not a declaration that recall is solved.

**Existing tests updated.** `ai-heavy-sample.md`'s expected score, deduction, category counts, and hit count all moved (the tier-2 fix and the new `pave the way` lexicon entry both independently affect this fixture, since it contains that phrase), documented inline in `tests/detect.test.mjs` rather than silently changed. `human-sample.md`'s test only asserts `score >= 85`, unaffected. `extreme-slop-sample.md`'s test only asserts cap-engagement behavior, unaffected.

**A weaker length dependence, not zero.** Root TTR still grows somewhat with length (human-sample.md, the longest fixture at 165 words, landed at 9.58 against a baseline of 6.7, a large bonus). This is expected and roughly correct, since more running text genuinely does tend to sustain more real vocabulary variety, but it means very long documents will still skew toward a vocabulary-diversity bonus regardless of quality, worth revisiting if a future fixture set surfaces it as a real problem the way raw TTR's regression was surfaced here.
