# Word-naturalness log

A plain running list of real cases where a word choice read odd to a human but wasn't caught (or wasn't caught generally) by the Human Score, whose statistical signals measure repetition and rhythm, not naturalness. Not wired into `scripts/eval.mjs` or any other scored check, this is evidence, not a test.

Why this exists, and why it isn't a feature yet: see `docs/ROADMAP.md`'s Feature G. The short version: a general fix (n-gram surprisal, a verb-lemma dictionary) needs real infrastructure this repo hasn't taken on for anything else, and building it against one example would be a guess dressed up as a decision. Each real case caught by hand goes here first, and a curated rule in `rules/antipatterns/` if it's a clean pattern (see `CONTRIBUTING.md`). Feature G's reopening condition is explicit: once maintaining this list and its corresponding rules by hand becomes the actual bottleneck, not before.

## Format

One entry per case: the sentence it appeared in, the odd word, the natural alternative, where it was found, and whether a rule now catches it.

## Entries

- **Sentence**: "Nobody diligences it the way they'd diligence a term sheet."
  **Odd**: "diligences" (verbed noun)
  **Natural**: "audits"
  **Found**: `executive_assistant`, clearfelt-writing-shadow-drafted Wednesday LinkedIn post, 2026-08-20. The regular (non-clearfelt-writing) pipeline used "audits" for the same sentence; the clearfelt-writing-drafted alternative used "diligences" while independently paraphrasing away from the source wording, and scored *higher* on vocabulary diversity (MATTR) for it, exactly the failure mode this log exists to track.
  **Caught by a rule now**: yes, `rules/antipatterns/corporate_neologisms.md` (pronoun-object-scoped, so it doesn't false-positive on "due diligence document" or "diligence a term sheet").
