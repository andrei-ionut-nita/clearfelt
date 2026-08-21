# `/clearfelt-writing write` output

Shared rules live in [conventions.md](conventions.md), read that first. This file covers the length question, the draft result, and the preservation-check block.

## Length question template

Shown in Pass 1, before any drafting, when no length preference resolves automatically.

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
| Short | `short_min_words`-`short_max_words` words (150-300 by default, see `clearfelt-writing.config.md`). A post or a short update. |
| Medium | `medium_min_words`-`medium_max_words` words (400-800 by default). A standard article or blog post. |
| Long | `long_min_words`+ words (1000+ by default), with section headers. |

(waiting for a choice, then: save this? no / for every project / just this one)
```

When a preference already resolved (saved globally, saved for this project, or set via `.clearfelt-writing/domain.md`), skip this question. State which length is running and why, then continue.

## Draft result template

Same verdict-first discipline as audit and rewrite, applied to the draft's own score. There's no before/after delta here since there's no prior draft to compare against.

```
**<verdict, same three bands as audit>:** <score>/100 (<N> pass(es))

<one plain sentence: what the draft is and the seed it came from, e.g. "A 480-word article expanding your one-line note on hiring philosophy.">

## Seed

<the seed text or file content, verbatim>

## Draft

<the generated draft>

## What the draft adds

- <addition>. Source: <seed / interview answer, named>.
```

**"What the draft adds" rules.** Every bullet names what the draft introduces beyond the seed and why, not just a restatement of the text. Cite a structural choice (an added section, an opening reframed as a hook), or a claim traceable to a specific interview answer rather than invented. There's no "Driver" column here, unlike rewrite's "What changed, and why": there's no prior rule hit to cite, since nothing existed to flag yet.

## Preservation check block

Same as rewrite's preservation-check block, shown only on a `warn` verdict from `scripts/check.mjs`.

```
## Preservation check

- <type: number/date/properNoun/quote> `<value>` present in the draft but not traceable to the seed or interview answers. Context: `<snippet>`.

Write this to `<path>`? (waiting for explicit yes/no)
```

Read the `dropped` list here as expected noise: the seed is short on purpose, most "dropped" items are just absent from a sparse seed, not lost from a fuller document. Read the `added` list as the one worth a real look: a genuinely new number, date, or name there isn't traceable to the seed.

## Example

A seed through interview through approval, abbreviated:

```
## What I know so far

| | |
|---|---|
| Seed | "we should write more but everyone's afraid of sounding fake" |
| Format | post |
| Audience | general |

## How long should this be?

| Option | Target |
|---|---|
| Short | 150-300 words. A post or a short update. |
| Medium | 400-800 words. A standard article or blog post. |
| Long | 1000+ words, with section headers. |
```

User picks Short, declines to save it:

```
**Reads clean:** 91/100 (1 pass)

A 240-word post expanding your note on the fear of sounding fake.

## Seed

we should write more but everyone's afraid of sounding fake

## Draft

Most people who stop writing don't stop because they run out of things to say...

## What the draft adds

- Opening reframed as a direct claim rather than a fragment. Source: seed.
- A closing example about a specific stalled draft. Source: interview answer (audience: general, no concrete example given, flagged as needing a real one before publishing).

Write this to note.draft.md? (waiting for explicit yes/no)
```
