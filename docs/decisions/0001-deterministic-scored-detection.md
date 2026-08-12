# ADR 0001: Deterministic, script-backed scoring instead of LLM judgment

**Status:** Implemented
**Date:** 2026-08-12

## Context

Eight prior-art repos already tackle AI-slop detection and rewriting (useantislop.com, anti-ai-slop-writing, slop-cop, anti-slop-slop-canon, two projects named humanizer, another anti-slop-writing, no-ai-slop, stop-slop). Reviewing them directly showed a split: some are pure system prompts with no algorithmic detection at all (coderjatin/anti-slop-writing, hardikpandya/stop-slop), some use a qualitative rubric scored by the model itself (stop-slop's 1-10 dimensions), and one (brandonwise/humanizer) computes a real 0-100 score from pattern matching plus statistical text analysis in actual code.

## Decision

clearfelt's score, the Empathy Index, is computed by `scripts/detect.mjs`, a real Node script, not estimated by an LLM reading the rule files and the target text. The script parses the Markdown rule dictionary itself and does the pattern matching, tiering, and statistical analysis (burstiness, vocabulary diversity, trigram repetition) in code.

## Consequences

The score is reproducible: anyone can run `node scripts/detect.mjs --mode report <file>` and get the same number, independent of which model or which day it's run. This is the project's stated differentiator against the other seven prior-art repos. It also means `scripts/detect.mjs` has to stay dependency-free (see [0002](0002-markdown-only-data-files.md) and `../DEVELOP.md`), since a script anyone can audit and run is only a credibility asset if it's actually easy to run.
