# Output conventions

Shared rules for how `/clearfelt audit`, `/clearfelt rewrite`, `/clearfelt write`, and `/clearfelt explain` present results. Applies to every response these commands produce, not just a suggestion for long ones. Per-command templates live in `format/audit.md`, `format/rewrite.md`, `format/write.md`, `format/explain.md`.

## Rules

1. **Tables and bullets, not paragraphs.** Scores, hits, and readability metrics are data. Present them as a table or a list, never folded into a prose sentence like "the score dropped from 74 to 100 because of X, Y, and Z."
2. **No em-dashes, and no arrow characters (`→`, `->`) as a substitute for one.** Both read as the same dense connective-prose habit this tool exists to remove from other people's writing. Use a table column, a new line, or a plain word ("becomes," "then") instead.
3. **Never reproduce an em-dash from quoted source text either.** If a flagged snippet contains one, describe it ("an em-dash used as a pause near the end") rather than quoting the character.
4. **Headers over inline labels.** `## Before` and `## After` as separate sections, not "before: ... after: ..." run into one line.
5. **Commentary is bullets, capped.** If something needs explaining beyond the table (why a score is misleading, what a follow-up should be), say it in short bullets, not a dense paragraph. Three or four bullets, not a wall of text.
6. **Lead with the number, not the reasoning.** State the score, then the table, then commentary if needed. Don't bury the score in a paragraph the user has to read to find it.
7. **Every table gets a one-line lede.** Write one plain-language sentence directly above each table, in the reader's own terms, saying what the table shows and why it's there. A bare `## Flagged patterns` header followed by a grid of numbers asks the reader to reverse-engineer what they're looking at. This lede is not the same as rule 5's capped commentary: commentary explains something *beyond* a table, a lede frames the table itself, and every table gets one.
8. **Verdict before evidence, always.** The first thing in an audit or rewrite response is a plain-English verdict (see "Verdict line" below), not the bare score. A reader should know whether they're in good shape before reading a single table.
9. **State how each section relates to the one above it.** Each major section's lede should say how it rolls up into the section before it: the categories in "Why" roll up into the verdict, the patterns in "Where" are what's inside each category, "The full math" is what a category number was built from. A reader skimming headers alone should still get the shape of the argument, not just a list of disconnected tables.

## Verdict line

The first line of any `/clearfelt audit` or `/clearfelt rewrite` response, before the score breakdown, before anything else. Not just the number, a one-word plain-English read on it, so a skimming reader doesn't have to know that 85 is the threshold to know whether this is fine.

Bands, checked against `human_score_threshold` (resolved value, default 85):

| Score range | Verdict |
|---|---|
| >= threshold | "Reads clean." |
| within 15 points below threshold | "Borderline." |
| more than 15 points below threshold | "Needs work." |

Format: `**<verdict>:** <score>/100`. Immediately under it, one plain sentence stating *why*, written in your own words from `leadDriver` and the top category, not copied from the JSON verbatim. Example: "Mostly marketing buzzwords repeating themselves, not sentence structure." This sentence is the thing a reader remembers; the tables below are how they verify it.
