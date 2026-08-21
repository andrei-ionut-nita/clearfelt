# `/clearfelt-writing audit` output

Shared rules live in [conventions.md](conventions.md), read that first. This file covers the two templates specific to audit: the directory summary, and the per-file breakdown.

## Directory audit summary

Required whenever the audit target is a directory (`detect.mjs`'s `files` array has more than one entry), shown before any per-file breakdown. It fixes two things a reader would otherwise have to reconstruct themselves: which files were actually in scope, and which one needs attention first.

```
**<verdict, applied to the average score>:** <average score>/100 average across <N> files: <file 1>, <file 2>, <file 3>

<one plain sentence naming the worst file by name and why it's worst, e.g. "long_ai_slop.md is the biggest concern, 27 rule hits versus 8-14 in the others.">

| File | Score | Verdict |
|---|---|---|
| <file, worst first> | <score> | <verdict> |
```

Sort worst score first, so the greatest offender is always the top row. Never sort by file-listing order or alphabetical order. Use the real filename from `detect.mjs`'s `target` field in every row, spelled out, never "the first file."

Follow this summary with each file's full single-file breakdown below, worst-first, same order as the table. Each per-file section still opens with its own verdict line per the template below: a reader jumping straight to one file's section shouldn't have to scroll up to see what file they're looking at.

## Single-file audit template

The filename is part of the header, even for a single-file audit, taken from `detect.mjs`'s `target` field. Never omit it on the assumption it's obvious from context.

```
## <filename>

**<verdict>:** <score>/100

<one plain sentence: why, in the reader's own terms, not jargon>

## Why

Each category below is a family of related AI-tells (repeated buzzwords, hedge-free claims, structural tics). Points lost is how much this specific category is costing the score above, worst first.

| Category | Points lost | Hits |
|---|---|---|

## Where

The exact phrases inside those categories, sorted by the same points-lost measure as "Why" so the order is verifiable, not asserted. One row per distinct phrase, repeats collapsed into a count and a line list rather than one row per occurrence. Points here are `severity x occurrences`, already computed in `patternSummary`. Never make the reader multiply it themselves.

| Pattern | Points lost | Occurrences | Category | Lines |
|---|---|---|---|---|

Show severity (the 1-9 per-hit weight `points` was computed from) only if the reader asks why one low-occurrence pattern outweighs a higher-occurrence one. It's diagnostic, not decision-relevant on its own since `points` already folds it in.

## The full math

Skippable if the two tables above already explain the number. Every nonzero factor that fed the score, sorted by size of impact, one consistent sign convention (positive = added, negative = subtracted). Round to the nearest whole point for display, this formula doesn't support the precision a raw decimal implies. The exact value is always in the JSON if someone needs it.

| Factor | Impact |
|---|---|

If `breakdown.deductionCapped` is true, the "Rule-hit deduction" row's label already says so ("capped from N"), taken from the JSON as-is. Don't strip that parenthetical when transcribing the row. Add one plain-language line under the table when this fires: "The raw hit count would have cost more than this, but the formula caps how far rule hits alone can drag the score down." That line is the reader's only signal that "Why" and "Where" sum to more raw severity than what actually hit the final number.

Only if the reader asks for the underlying statistics, not by default: present type-token ratio, trigram repetition ratio, and paragraph count from `breakdown` separately. These are diagnostic inputs, not score impacts themselves.

## Readability

A different question from the score above: not "does this sound AI-written," but "is this pitched at the right level for its audience." Tracked separately on purpose, see `docs/decisions/0008`. Give every metric a plain-language band alongside the number, a raw psychometric score means nothing without its scale.

| Metric | Value | What that means |
|---|---|---|
| Flesch Reading Ease | <value> | <band: 90-100 very easy, 70-89 easy, 50-69 plain, 30-49 difficult, 0-29 very difficult, below 0 extremely dense> |
| Flesch-Kincaid Grade | <value> | <band: "about grade N" for N under 13; "college level" for 13-16; "post-graduate level" above 16> |
| Gunning Fog | <value> | <band: same style, years-of-schooling-to-read-easily framing, e.g. "needs about 15 years of schooling to read comfortably"> |
| Within target range | yes / no | <the actual target inline, e.g. "no (target: 6-12)", never a bare yes/no with the range left for the reader to look up> |

(Only if relevant) **Notes**
- <bullet, not a paragraph>

## Example

A single-file audit, abbreviated:

```
## draft.md

**Borderline:** 72/100

Mostly marketing buzzwords repeating themselves, not sentence structure.

## Why

| Category | Points lost | Hits |
|---|---|---|
| banned_words | 18 | 6 |
| structural_tells | 6 | 2 |

## Where

| Pattern | Points lost | Occurrences | Category | Lines |
|---|---|---|---|---|
| "leverage" | 12 | 4 | banned_words | 3, 8, 14, 22 |
| "seamlessly" | 6 | 2 | banned_words | 9, 17 |

## The full math

| Factor | Impact |
|---|---|
| Rule-hit deduction | -24 |
| Sentence-length variance (burstiness) | -4 |

## Readability

| Metric | Value | What that means |
|---|---|---|
| Flesch Reading Ease | 58 | plain |
| Flesch-Kincaid Grade | 9 | about grade 9 |
| Gunning Fog | 11 | needs about 11 years of schooling |
| Within target range | yes | target: 6-12 |
```
