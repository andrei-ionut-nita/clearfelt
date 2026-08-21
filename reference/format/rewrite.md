# `/clearfelt-writing rewrite` output

Shared rules live in [conventions.md](conventions.md), read that first. This file covers the intensity question, the rewrite result, and the preservation-check block.

## Intensity question template

Shown in Pass 1, before any rewriting, when no intensity preference resolves automatically.

```
## What I'd fix

| Category | Pattern | Line |
|---|---|---|

## How much should I change?

| Option | What it touches |
|---|---|
| Light touch | Only the items above. Nothing else changes. |
| Balanced | The items above, plus contractions and casual phrasing throughout. |
| Full rewrite | The above, plus sentence rhythm varies throughout. |
| Structural rework | The above, plus paragraph breaks, splits, and reordering if needed. |

(waiting for a choice, then: save this? no / for every project / just this one)
```

When a preference already resolved (saved globally, saved for this project, or set via `.clearfelt-writing/domain.md`), show only the "What I'd fix" table plus one line stating which intensity is running and why. Don't ask the blocking question.

## Rewrite result template

Same verdict-first discipline as audit: the reader should know the outcome before reading a single table.

```
**<verdict, same three bands as audit, applied to the After score>:** <before score> to <after score>/100 (<N> pass(es))

<one plain sentence: what actually changed and why, in the reader's own terms>

## Before

<original text or a representative excerpt>

## After

<rewritten text>

## What moved the score

| Factor | Before | After |
|---|---|---|

## What changed, and why

- <span changed> to <what it became>. Driver: <pattern/category, or the impacts label>.

How should I write this?
- Overwrite <path>
- Write to a new file (<stem>.rewritten<ext>)
- Other
```

**"What moved the score" rules.** List every factor that changed between the two runs, sorted by size of movement, same sign convention as audit's full-math table (positive = added, negative = subtracted). Omit a factor entirely if it was 0 in both runs, don't show a row of zeros. Round values to the nearest whole point, same reasoning as audit: this formula doesn't support decimal precision in a human-facing table.

**"What changed, and why" rules.** Every bullet names what drove the change, not just the before/after text. Cite a `patternSummary` pattern and category if a specific rule hit caused it. Cite the relevant `breakdown.impacts` label (for example "Sentence-rhythm (burstiness)") if a statistical signal did it instead. If a change happened only because the resolved intensity tier's scope allows it (a `full_rewrite`-tier sentence-variation pass with no single rule hit behind it, for example), say that plainly rather than inventing a rule that didn't fire.

If a span was left unchanged despite matching a rule (`risk_tier: sensitive` protection, a `.clearfelt-writing/domain.md` exemption, or a `.clearfelt-writing/voice-profile.md` preference), say so as its own bullet here too: `<span> kept as-is. Protected: <reason>.` This is what makes the diff explainable in both directions, not just for what moved.

If the resulting score would be misleading on its own (a clean pass driven by a narrow rule dictionary rather than an actually-fixed piece, for example), add that as its own bullet under "What changed, and why." Don't let a good number stand in for a read of the actual text.

## Preservation check block

Only shown when `scripts/check.mjs`'s verdict for this run was `warn`. A `fail` verdict never reaches this template, it blocks the confirmation view entirely, see `reference/rewrite.md`'s "Preservation checking" section.

```
## Preservation check

- <type: number/date/properNoun/quote> `<value>` present in the source but missing from the rewrite. Context: `<snippet>`.
- <type> `<value>` present in the rewrite but not the source. Context: `<snippet>`.

How should I write this?
- Overwrite <path>
- Write to a new file (<stem>.rewritten<ext>)
- Other
```

These are automated, regex-based flags on facts the rewrite may have dropped or added, not confirmed errors. Say that plainly before the list, then glance-check the spans yourself before approving.

## Example

Intensity resolution with no saved preference, through to the approval gate:

```
## What I'd fix

| Category | Pattern | Line |
|---|---|---|
| banned_words | "leverage" | 3 |
| structural_tells | uniform sentence length | (whole doc) |

## How much should I change?

| Option | What it touches |
|---|---|
| Light touch | Only the items above. Nothing else changes. |
| Balanced | The items above, plus contractions and casual phrasing throughout. |
| Full rewrite | The above, plus sentence rhythm varies throughout. |
| Structural rework | The above, plus paragraph breaks, splits, and reordering if needed. |
```

User picks Balanced, declines to save it. Loop runs, score clears the threshold on pass 2:

```
**Reads clean:** 68 to 89/100 (2 passes)

Swapped repeated buzzwords for plainer phrasing, no structural changes.

## Before

...leverage our platform to seamlessly scale...

## After

...use our platform to scale, without the usual setup friction...

## What moved the score

| Factor | Before | After |
|---|---|---|
| Rule-hit deduction | -18 | -2 |

## What changed, and why

- "leverage our platform" to "use our platform". Driver: banned_words / leverage.
- "seamlessly scale" to "scale, without the usual setup friction". Driver: frictionless_claims.

How should I write this?
- Overwrite draft.md
- Write to a new file (draft.rewritten.md)
- Other
```
