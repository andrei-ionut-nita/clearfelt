# ADR 0008: Readability metrics, tracked separately from the Empathy Index

**Status:** Implemented
**Date:** 2026-08-12

## Context

Explicitly requested, with the instruction to research it rather than invent something. Mid-discussion, the user asked whether to incorporate Daniel Kahneman's System 1/2 dual-process thinking as a "speed of ingestion" signal.

## Decision

**Rejected citing Kahneman directly.** System 1/2 is a psychological theory of cognition, not a formula that produces a number from text. Attaching it to a rule would mean citing a framework the tool doesn't actually implement, which is exactly what `CONTRIBUTING.md`'s no-invented-attribution rule exists to prevent. `docs/SOURCES.md` already has a real convention for this kind of gap (`unresolved-*` keys, or the honest `clearfelt-heuristic` label), and inventing a computation to justify a citation would be worse than either.

**Adopted instead**, verified via WebSearch this round, all five citations checked for a real, resolvable URL before being written into `docs/SOURCES.md`:

- **Flesch Reading Ease** and **Flesch-Kincaid Grade Level** (`flesch-1948`, `kincaid-1975`): the most widely cited readability formulas, a reasonable default pair for a general audience.
- **Gunning Fog Index** (`gunning-1952`): specifically recommended for business/technical prose, directly relevant to clearfelt's stated audience.
- **Processing fluency** (`oppenheimer-2006`, `alter-oppenheimer-2009`): the legitimate, measurable relative of the "speed of ingestion" idea the user raised. Passive-voice density and nominalization density are countable correlates of processing effort, grounded in real fluency research, rather than a label borrowed from a theory with no formula.

SMOG was considered and dropped: it's calibrated for health-literacy material, not relevant to clearfelt's audience.

Readability is **reported separately from the Empathy Index, never blended into it**. They measure different things: audience-fit versus AI-tell density. A dense but obviously-human paragraph and a simple but AI-sounding one are different problems, and one blurred number would hide both. This mirrors the existing separation between the deterministic score and the qualitative frictionless-claims signal (`reference/audit.md`'s "Qualitative signals" section).

## Consequences

`scripts/detect.mjs`'s `computeReadability` adds a `readability` object to `--mode report` output, computed via a standard heuristic syllable counter (vowel-group counting, the same approach used by common JS `syllable` implementations, inlined to keep zero dependencies). `.clearfelt/domain.md` can set a target grade-level range that overrides the shipped default (6-12) in `clearfelt.config.md`, same override pattern as ADR 0007.
