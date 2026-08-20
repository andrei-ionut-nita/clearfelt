# Hedging Lexicon

Words and phrases that soften a claim past the point of taking a real position. Flagged only when a voice's `register:` field is set to `direct` (docs/decisions/0024); never scored, never active by default. This is a curated categorization for tone matching, not an AI-detection claim, so entries carry `source: editorial` rather than a `docs/SOURCES.md` research key (see ADR 0024's "Why these entries don't cite research"). `severity` here is an informational strength note only, not a scoring input; `tier` is deliberately omitted, since register hits always bypass tier-clustering (they never touch the score it exists to protect, see report.mjs's own comment).

- i could be wrong but | severity: 5 | source: editorial
- just a thought | severity: 4 | source: editorial
- sort of | severity: 3 | source: editorial
- kind of | severity: 3 | source: editorial
- maybe | severity: 3 | source: editorial
- perhaps | severity: 3 | source: editorial
- possibly | severity: 3 | source: editorial
- i think | severity: 3 | source: editorial
- i feel like | severity: 4 | source: editorial
- not to be that person but | severity: 5 | source: editorial
- just my opinion | severity: 4 | source: editorial
