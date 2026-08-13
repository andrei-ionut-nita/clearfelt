# Output format

How `/clearfelt audit` and `/clearfelt humanize` present results. Applies to every response these commands produce, not just a suggestion for long ones.

## Rules

1. **Tables and bullets, not paragraphs.** Scores, hits, and readability metrics are data. Present them as data (a table or a list), never folded into a prose sentence like "the score dropped from 74 to 100 because of X, Y, and Z."
2. **No em-dashes, and no arrow characters (`→`, `->`) as a substitute for one.** Both read as the same dense connective-prose habit this tool exists to remove from other people's writing. Use a table column, a new line, or a plain word ("becomes," "then") instead.
3. **Never reproduce an em-dash from quoted source text either.** If a flagged snippet contains one, describe it ("an em-dash used as a pause near the end") rather than quoting the character.
4. **Headers over inline labels.** `## Before` and `## After` as separate sections, not "before: ... after: ...” run into one line.
5. **Commentary is bullets, capped.** If something needs explaining beyond the table (why a score is misleading, what a follow-up should be), say it in short bullets, not a dense paragraph. Three or four bullets, not a wall of text.
6. **Lead with the number, not the reasoning.** State the score, then the table, then commentary if needed. Don't bury the score in a paragraph the user has to read to find it.

## `/clearfelt audit` template

```
## Empathy Index: <score>/100

<leadDriver, verbatim from the JSON, one line: what actually drove this number>

## What's pulling the score down

Sorted by points lost, not rule-file order. One row per category, from `categoryPoints`.

| Category | Points lost | Hits |
|---|---|---|
| <category> | <points> | <hits> |

## Flagged patterns

Sorted by points lost (severity x occurrences), from `patternSummary`. One row per distinct pattern, not one row per occurrence, repeats are a count and a line list, not repeated rows.

| Pattern | Category | Severity | Occurrences | Lines |
|---|---|---|---|---|
| <pattern> | <category> | <severity> | <occurrences> | <lines, comma-separated> |

## Score breakdown

Every nonzero factor, sorted by |impact|, one consistent sign convention (positive = added to the score, negative = subtracted), from `breakdown.impacts`. Omit a row entirely if its impact is exactly 0, don't print a bare "0".

| Factor | Impact |
|---|---|
| <label> | <impact, with explicit + sign if positive> |

If `breakdown.deductionCapped` is true, the "Rule-hit deduction" row's label already says so ("capped from N"), from the JSON as-is; don't strip that parenthetical when transcribing the row; it's the reader's only signal that the category/pattern tables above sum to more raw severity than what actually hit the score.

(Only if the reader asks for the underlying statistics, not by default): type-token ratio, trigram repetition ratio, and paragraph count from `breakdown` are diagnostic inputs, not score impacts themselves, present them separately and only on request.

## Readability

| Metric | Value |
|---|---|
| Flesch Reading Ease | <value> |
| Flesch-Kincaid Grade | <value> |
| Gunning Fog | <value> |
| Within target range | yes / no |

(Only if relevant) **Notes**
- <bullet, not a paragraph>
```

## `/clearfelt humanize` intensity question template

Shown in Pass 1, before any rewriting, when no intensity preference resolves automatically:

```
## What I'd fix

| Category | Pattern | Line |
|---|---|---|
| <category> | <pattern> | <line> |

## How much should I change?

| Option | What it touches |
|---|---|
| Light touch | Only the items above. Nothing else changes. |
| Balanced | The items above, plus contractions and casual phrasing throughout. |
| Full rewrite | The above, plus sentence rhythm varies throughout. |
| Structural rework | The above, plus paragraph breaks, splits, and reordering if needed. |

(waiting for a choice, then: save this? no / for every project / just this one)
```

When a preference already resolved (saved globally, saved for this project, or set via `.clearfelt/domain.md`), show only the "What I'd fix" table plus one line stating which intensity is running and why, no blocking question.

## `/clearfelt humanize` template

```
## Before: <score>/100

<original text or a representative excerpt>

## After: <score>/100 (<N> pass(es))

<rewritten text>

## Score breakdown

Union of factors that were nonzero in either run, sorted by the larger of the two |impact| values, same sign convention as `/clearfelt audit` (positive = added, negative = subtracted). A factor that was 0 in both runs is omitted, not shown as a row of zeros.

| Factor | Before | After |
|---|---|---|
| <label> | <impact or "0"> | <impact or "0"> |

## Changes made

- <span changed> to <what it became>

Apply this to `<path>`? (waiting for explicit yes/no)
```

If the score result would be misleading on its own (for example, a clean number that doesn't reflect what a human reader would notice), say so as its own bulleted note under "Changes made," not folded into prose elsewhere in the response.
