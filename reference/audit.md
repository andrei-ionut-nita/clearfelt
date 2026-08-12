# /clearfelt audit

Read-only scan. Never edits the target.

## Flow

1. Resolve the target path from the user's argument. If it's a directory, scan every `.md`/`.txt`/`.mdx` file in it.
2. Run: `node scripts/detect.mjs --mode report <path>`
3. Parse the JSON it prints and present it to the user:
   - The score, out of 100, labeled "Empathy Index".
   - Each hit grouped by category, with its line number and snippet.
   - The statistical breakdown (burstiness, vocabulary diversity, repetition) in one short line, not a full table, unless the user asks for detail.
4. Every hit carries a `source` key. Mention it briefly (e.g. "no-ai-slop pattern" or "camaraderie: flagged per research, unresolved citation, see docs/SOURCES.md") if the user asks why something was flagged, rather than presenting the rule as clearfelt's own unexplained opinion.
5. Do not edit the file. If the user wants it fixed, point them at `/clearfelt humanize`.

## Empathy Index formula

The score starts at 100 and is adjusted by `scripts/detect.mjs`:

| Component | Effect |
|---|---|
| Each rule hit | Score drops by that rule's `severity`, multiplied by its category's weight from `clearfelt.config.md`. |
| Sentence-length variance (burstiness) | Low variance (uniform sentence lengths, an AI tell) costs up to `burstiness_weight` points; high variance earns some back. |
| Vocabulary diversity (type-token ratio) | Low diversity (repetitive word choice) costs up to `vocabulary_diversity_weight` points. |
| Trigram repetition | Repeated three-word sequences cost up to `repetition_weight * 10` points, scaled by how much of the text repeats. |

Final score is clamped to the 0 to 100 range. Every weight above is a row in `clearfelt.config.md`, editable without touching the script.

## Tiered banned words

A tier-1 word always counts as a hit. A tier-2 word only counts when at least one other hit is nearby. A tier-3 word only counts once it appears at least `tier3_density_threshold` times in the document. This keeps words like "robust" from being flagged on a single legitimate use.

## Exclusions

Fenced code blocks, inline code spans, and blockquoted lines are stripped before scanning, so code samples and quoted material never generate false hits.

## Baseline mode

If the user wants to track only new slop introduced since a previous scan (useful for a growing set of drafts), offer:

```
node scripts/detect.mjs --mode report <path> --save-baseline <baseline-file>
```

to snapshot the current hits, and on a later run:

```
node scripts/detect.mjs --mode report <path> --baseline <baseline-file>
```

to report only hits that are new since that snapshot.
