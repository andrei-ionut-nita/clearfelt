# Output format

How `/clearfelt audit`, `/clearfelt rewrite`, and `/clearfelt explain` present results. Applies to every response these commands produce, not just a suggestion for long ones.

## Rules

1. **Tables and bullets, not paragraphs.** Scores, hits, and readability metrics are data. Present them as data (a table or a list), never folded into a prose sentence like "the score dropped from 74 to 100 because of X, Y, and Z."
2. **No em-dashes, and no arrow characters (`→`, `->`) as a substitute for one.** Both read as the same dense connective-prose habit this tool exists to remove from other people's writing. Use a table column, a new line, or a plain word ("becomes," "then") instead.
3. **Never reproduce an em-dash from quoted source text either.** If a flagged snippet contains one, describe it ("an em-dash used as a pause near the end") rather than quoting the character.
4. **Headers over inline labels.** `## Before` and `## After` as separate sections, not "before: ... after: ...” run into one line.
5. **Commentary is bullets, capped.** If something needs explaining beyond the table (why a score is misleading, what a follow-up should be), say it in short bullets, not a dense paragraph. Three or four bullets, not a wall of text.
6. **Lead with the number, not the reasoning.** State the score, then the table, then commentary if needed. Don't bury the score in a paragraph the user has to read to find it.
7. **A table is data, not a caption.** Every table gets a one-sentence plain-language lede directly above it, in the reader's own terms, saying what the table shows and why it's there, before the table itself. `## Flagged patterns` as a bare header followed immediately by a grid of numbers asks the reader to reverse-engineer what they're looking at; one sentence ("the exact phrases driving the categories above, worst offender first") removes that guesswork. This is not the same as rule 5's capped commentary bullets, which explain something *beyond* a table; this is the one-line frame *for* each table, and every table gets one, not just the ones that need extra explaining.
8. **Verdict before evidence, always.** The very first thing in an audit or rewrite response is a plain-English verdict (see "Verdict line" below), not the bare score. A reader should know whether they're in good shape before they've read a single table.
9. **Make the hierarchy visible, not just implied by header level.** Each major section should say in its lede sentence how it relates to the one above it (the categories in "Why" roll up into the verdict; the patterns in "Where" are what's inside each category; "The full math" is what a category number was built from), so a reader skimming headers alone still gets the shape of the argument, not just a list of disconnected tables.

## Verdict line

The first line of any `/clearfelt audit` or `/clearfelt rewrite` response, before the score breakdown, before anything else. Not just the number, a one-word plain-English read on it, so a skimming reader doesn't have to know that 85 is the threshold to know whether this is fine:

- **score >= human_score_threshold (resolved value, default 85):** "Reads clean."
- **score within 15 points below the threshold:** "Borderline."
- **more than 15 points below the threshold:** "Needs work."

Format: `**<verdict>:** <score>/100`. Immediately under it, one plain sentence (not from the JSON verbatim, write it in your own words from `leadDriver` and the top category) stating *why* in language a non-technical reader follows, e.g. "Mostly marketing buzzwords repeating themselves, not sentence structure." This sentence is the thing a reader remembers; the tables below are how they verify it.

## Directory audit summary

Required whenever `/clearfelt audit`'s target is a directory (`detect.mjs`'s `files` array has more than one entry), before any per-file breakdown. Two things this fixes that a reader would otherwise have to reconstruct themselves: which files were actually in scope, and which one needs attention first, without reading every table to find out.

```
**<verdict, applied to the average score>:** <average score>/100 average across <N> files: <file 1>, <file 2>, <file 3>

<one plain sentence naming the worst file by name and why it's worst, e.g. "long_ai_slop.md is the biggest concern, 27 rule hits versus 8-14 in the others.">

| File | Score | Verdict |
|---|---|---|
| <file, worst first> | <score> | <verdict> |
```

Sorted worst score first, so the greatest offender is always the top row, never buried in file-listing order or alphabetical order. Every filename in this table is the real filename from `detect.mjs`'s `target` field, spelled out, not "the first file" or "the second one." Follow this summary with each file's full single-file breakdown below, in the same worst-first order, each one still opening with its own verdict line per the template below, a reader jumping straight to a per-file section shouldn't have to scroll back up to find out what file they're looking at.

## `/clearfelt audit` template

The filename is part of the header, even for a single-file audit, from `detect.mjs`'s `target` field, never omitted on the assumption it's obvious from context.

```
## <filename>

**<verdict>:** <score>/100

<one plain sentence: why, in the reader's own terms, not jargon>

## Why

Each category below is a family of related AI-tells (repeated buzzwords, hedge-free claims, structural tics); points lost is how much this specific category is costing the score above, worst first.

| Category | Points lost | Hits |
|---|---|---|
| <category> | <points> | <hits> |

## Where

The exact phrases inside those categories, sorted by the same points-lost measure as "Why" above so the order is verifiable, not asserted. One row per distinct phrase, repeats collapsed into a count and a line list rather than one row per occurrence. Points here are `severity x occurrences`, already computed in `patternSummary`, never make the reader multiply it themselves.

| Pattern | Points lost | Occurrences | Category | Lines |
|---|---|---|---|---|
| <pattern> | <points> | <occurrences> | <category> | <lines, comma-separated; if more than 6, show the first 6 then "+N more"> |

Severity (the 1-9 per-hit weight `points` was computed from) is diagnostic, not decision-relevant on its own since `points` already folds it in, present it only if the reader asks why one low-occurrence pattern outweighs a higher-occurrence one.

## The full math

Skippable if the two tables above already explain the number. Every nonzero factor that fed the score, one consistent sign convention (positive = added, negative = subtracted), sorted by size of impact. Round to the nearest whole point for display, this formula doesn't support the precision a raw decimal implies; the exact value is always in the JSON if someone needs it.

| Factor | Impact |
|---|---|
| <label> | <impact, rounded to the nearest whole number, explicit + sign if positive> |

If `breakdown.deductionCapped` is true, the "Rule-hit deduction" row's label already says so ("capped from N"), from the JSON as-is; don't strip that parenthetical when transcribing the row. Add one plain-language line right under the table when this fires: "The raw hit count would have cost more than this, but the formula caps how far rule hits alone can drag the score down." That's the reader's only signal that "Why"/"Where" above sum to more raw severity than what actually hit the final number.

(Only if the reader asks for the underlying statistics, not by default): type-token ratio, trigram repetition ratio, and paragraph count from `breakdown` are diagnostic inputs, not score impacts themselves, present them separately and only on request.

## Readability

A different question from the score above: not "does this sound AI-written," but "is this pitched at the right level for its audience." Tracked separately on purpose, see `docs/decisions/0008`. A raw psychometric score means nothing without its scale, every metric below gets a plain-language band alongside the number, not the number alone.

| Metric | Value | What that means |
|---|---|---|
| Flesch Reading Ease | <value> | <band: 90-100 very easy, 70-89 easy, 50-69 plain, 30-49 difficult, 0-29 very difficult, below 0 extremely dense> |
| Flesch-Kincaid Grade | <value> | <band: "about grade N" for N under 13; "college level" for 13-16; "post-graduate level" above 16> |
| Gunning Fog | <value> | <band: same style, years-of-schooling-to-read-easily framing, e.g. "needs about 15 years of schooling to read comfortably"> |
| Within target range | yes / no | <the actual target inline, e.g. "no (target: 6-12)", never a bare yes/no with the range left for the reader to look up> |

(Only if relevant) **Notes**
- <bullet, not a paragraph>
```

## `/clearfelt rewrite` intensity question template

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

## `/clearfelt rewrite` template

Same verdict-first discipline as `/clearfelt audit`: the reader should know the outcome before reading a single table.

```
**<verdict, same three bands as audit, applied to the After score>:** <before score> to <after score>/100 (<N> pass(es))

<one plain sentence: what actually changed and why, in the reader's own terms, not jargon, e.g. "Swapped out repeated marketing buzzwords for plainer phrasing across three passes.">

## Before

<original text or a representative excerpt>

## After

<rewritten text>

## What moved the score

Every factor that changed between the two runs, sorted by size of movement, same sign convention as `/clearfelt audit` (positive = added, negative = subtracted). A factor that was 0 in both runs is omitted entirely, not shown as a row of zeros. Values rounded to the nearest whole point, same reasoning as audit's "The full math": this formula doesn't support decimal precision in a human-facing table.

| Factor | Before | After |
|---|---|---|
| <label> | <impact or "0"> | <impact or "0"> |

## What changed, and why

Every bullet names what drove the change, not just the before/after text: a `patternSummary` pattern and category if a specific rule hit caused it, or the relevant `breakdown.impacts` label (for example "Sentence-rhythm (burstiness)") if a statistical signal did, not a generic "improved wording." A change made only because the resolved intensity tier's scope allows it (a `full_rewrite`-tier sentence-variation pass with no single rule hit behind it, for example) says so plainly rather than inventing a rule that didn't fire.

- <span changed> to <what it became>. Driver: <pattern/category, or the impacts label>.

If a span was left unchanged despite matching a rule (`risk_tier: sensitive` protection, a `.clearfelt/domain.md` exemption, or a `.clearfelt/voice-profile.md` preference), say so as its own bullet here too, not silently: `<span> kept as-is. Protected: <reason>.` This is what makes the diff explainable in both directions, not just for what moved.

## Preservation check

Only shown when `scripts/check.mjs`'s verdict for this run was `warn` (a `fail` verdict never reaches this template, see `reference/rewrite.md`'s "Preservation checking" section: it blocks the confirmation view entirely). These are automated, regex-based flags on facts the rewrite may have dropped or added, not confirmed errors, say that plainly before the list, then glance-check the spans yourself before approving:

- <type: number/date/properNoun/quote> `<value>` present in the source but missing from the rewrite. Context: `<snippet>`.
- <type> `<value>` present in the rewrite but not the source. Context: `<snippet>`.

Apply this to `<path>`? (waiting for explicit yes/no)
```

If the score result would be misleading on its own (for example, a clean number that doesn't reflect what a human reader would notice), say so as its own bulleted note under "What changed, and why," not folded into prose elsewhere in the response.

## `/clearfelt write` length question template

Shown in Pass 1, before any drafting, when no length preference resolves automatically:

```
## What I know so far

| | |
|---|---|
| Seed | <path, or "pasted inline"> |
| Format | <resolved or asked separately, see reference/write.md> |
| Audience | <resolved or asked separately> |

## How long should this be?

| Option | Target |
|---|---|
| Short | `short_min_words`-`short_max_words` words (150-300 by default, see `clearfelt.config.md`). A post or a short update. |
| Medium | `medium_min_words`-`medium_max_words` words (400-800 by default). A standard article or blog post. |
| Long | `long_min_words`+ words (1000+ by default), with section headers. |

(waiting for a choice, then: save this? no / for every project / just this one)
```

When a preference already resolved (saved globally, saved for this project, or set via `.clearfelt/domain.md`), skip this question, state which length is running and why, and continue.

## `/clearfelt write` template

Same verdict-first discipline as `/clearfelt audit` and `/clearfelt rewrite`, applied to the draft's own score, not a before/after delta since there's no prior draft to compare against.

```
**<verdict, same three bands as audit>:** <score>/100 (<N> pass(es))

<one plain sentence: what the draft is and the seed it came from, e.g. "A 480-word article expanding your one-line note on hiring philosophy.">

## Seed

<the seed text or file content, verbatim>

## Draft

<the generated draft>

## What the draft adds

Every bullet names what the draft introduces beyond the seed and why, not just a restatement of the text: a structural choice (an added section, an opening reframed as a hook), or a claim traceable to an interview answer rather than invented. No "Driver" column here, unlike rewrite's "What changed, and why": there's no prior rule hit to cite, since nothing existed to flag yet.

- <addition>. Source: <seed / interview answer, named>.

## Preservation check

Same as `/clearfelt rewrite`'s "Preservation check" section, only shown on a `warn` verdict from `scripts/check.mjs`. Read the `dropped` list here as expected noise (the seed is short on purpose, most "dropped" items are just absent from a sparse seed, not lost from a fuller document); the `added` list is the one worth a real look, since a genuinely new number, date, or name there isn't traceable to the seed:

- <type: number/date/properNoun/quote> `<value>` present in the draft but not traceable to the seed or interview answers. Context: `<snippet>`.

Write this to `<path>`? (waiting for explicit yes/no)
```

## `/clearfelt explain` template

```
## Voice and domain

| | |
|---|---|
| Voice mode | <single/multi> |
| Voice profile | <path> (exists / not found, run /clearfelt setup) |
| Words protected by voice profile | <keptWordsCount> |
| Domain profile | <exists / not found, run /clearfelt setup> |
| Risk tier | <riskTier> |
| Domain mode | <mode, or "not set"> |
| Preferred intensity | <preferredIntensity, or "not set, will ask"> |
| Preferred length | <preferredLength, or "not set, will ask"> |
| Target reading grade level | <min>-<max> (source: <source>) |
| Exempt technical terms | <exemptTermCount> |

## Config

Every row from `scripts/explain.mjs`'s `config` object, unfiltered, sorted by setting name for easy lookup, not by section.

| Setting | Value | Source |
|---|---|---|
| <key> | <value> | <default / shipped (clearfelt.config.md) / global (~/.clearfelt/settings.md)> |

## Hook

| | |
|---|---|
| Enabled | <yes/no> |
| Quiet | <yes/no> |
| Ignored rule categories | <comma list, or "(none)"> |
| Ignored file patterns | <comma list, or "(none)"> |
```
