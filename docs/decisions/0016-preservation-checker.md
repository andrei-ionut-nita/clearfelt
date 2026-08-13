# ADR 0016: A code-verified preservation checker, not just prompt instruction

**Status:** Implemented
**Date:** 2026-08-13

## Context

Every no-fabrication and locked-span guarantee `/clearfelt rewrite` makes (`writing.md`'s "What clearfelt preserves," ADR 0004, ADR 0015) was, until now, enforced entirely by `prompts/audit_loop.xml`'s prose instructions to the LLM doing the rewrite. There was no deterministic, post-hoc verification that a rewrite actually kept what it was told to keep, the same gap ADR 0001 accepted for rewriting itself ("the model is used to rewrite while the score is only used to gate the process") but never closed for preservation specifically. A locked span or a dropped fact could slip through a rewrite with nothing in code to catch it before the user approves the write.

## Decision

**`scripts/check.mjs`, a new dependency-free script**, run in Pass 3 of `prompts/audit_loop.xml` against the source file and a staged candidate rewrite (`.clearfelt/candidate.md`, gitignored scratch state, mirroring how the rewrite loop already holds a candidate in memory before writing anything real). It reports a JSON verdict of `pass`, `warn`, or `fail`.

**Locked spans are deterministic and always hard-fail on mismatch.** Every `<!-- clearfelt-lock -->` / `<!-- /clearfelt-lock -->` pair (ADR 0015) in the source and candidate is extracted in document order; a count change or a content difference between corresponding pairs is unambiguous, no judgment call involved, so it always blocks the write when `check.hard_fail_on_locked_span_mismatch` is true (the shipped default).

**Everything else is heuristic and warns by default.** Numbers, dates, proper nouns, and quoted material are extracted from the source and candidate with plain regexes and diffed as multisets. This is regex-based entity-spotting, not named-entity recognition: `CLAUDE.md`'s dependency-free rule rules out pulling in an NLP library, and hand-rolling real NER is out of scope. Each extractor has a known, disclosed failure mode:

- **Numbers**: "20" rewritten as "twenty" is a false drop+add pair. No numeral/word normalization in v1.
- **Dates**: "March 3rd" rewritten as "the 3rd of March" is a false drop+add pair. No date-form normalization in v1.
- **Proper nouns**: the widest error range of the four. Sentence-initial capitalized words are excluded unless the same token also appears capitalized mid-sentence elsewhere in the document, a cheap heuristic that trades one failure mode for the other: a genuinely dropped proper noun that only ever appeared sentence-initially will be missed entirely (a false negative), not flagged.
- **Quotes**: the most reliable of the four (straight/curly double-quotes, blockquote lines), and the highest-stakes category to get right (misquoting someone), but still string-matched, not meaning-matched.

Given that disclosed unreliability, defaulting to hard-fail on every fingerprint mismatch would block real, legitimate rewrites often enough to make the whole gate something users route around rather than trust. `check.hard_fail_on_dropped_fact` and `check.hard_fail_on_added_fact` (both default `false`) let a project opt into the stricter behavior if it wants it; the shipped default is warn, surfaced in the confirmation view's "Preservation check" section (`reference/output-format.md`), never silently dropped.

**A real NER approach was considered and rejected.** It would require an external model or a substantial hand-built statistical tagger, both in tension with `CLAUDE.md`'s "no npm dependency, ever" rule and this tool's own "deterministic and scored, not vibes-based" positioning (a probabilistic tagger reintroduces exactly the kind of unreproducible judgment the Human Score exists to avoid). Plain regex extraction, honestly labeled as heuristic, was judged more consistent with the project's existing tradeoffs than a more sophisticated but less transparent approach.

## Consequences

A `fail` verdict stops the rewrite loop before the confirmation view is ever shown, same severity as failing to clear `human_score_threshold`; Pass 3's loop condition now checks both. A `warn` verdict does not block, it adds a disclosed, bulleted list to what the user reviews before approving a write, consistent with `reference/output-format.md`'s existing "say so as its own bullet, don't fold it into prose" discipline. Nothing about `scripts/detect.mjs`'s scoring changed: `check.mjs` is a new, separate script, not a modification to the scoring engine, and it never runs as part of `/clearfelt audit`, only `/clearfelt rewrite`'s pipeline.
