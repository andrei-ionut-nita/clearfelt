# Accusatory Lexicon

Words that accuse the subject of deliberate dishonesty or bad faith, not just a gap in skill or judgment. Flagged only when a voice's `register:` field is set to `warm` (docs/decisions/0024); never scored, never active by default. This is a curated categorization for tone matching, not an AI-detection claim, so entries carry `source: editorial` rather than a `docs/SOURCES.md` research key (see ADR 0024's "Why these entries don't cite research"). `severity` here is an informational strength note only, not a scoring input; `tier` is deliberately omitted, since register hits always bypass tier-clustering (they never touch the score it exists to protect, see report.mjs's own comment).

- fake | severity: 4 | source: editorial
- fraud | severity: 6 | source: editorial
- fraudulent | severity: 6 | source: editorial
- lying | severity: 6 | source: editorial
- liar | severity: 6 | source: editorial
- pretending | severity: 4 | source: editorial
- scam | severity: 6 | source: editorial
- con artist | severity: 7 | source: editorial
- exposed as | severity: 5 | source: editorial
- caught lying | severity: 6 | source: editorial
