# clearfelt config

Tunables for `scripts/detect.mjs`, `/clearfelt humanize`'s rewrite loop, and the auto-audit hook. Edit the values in the tables below; nothing here needs code or JSON syntax.

## Scoring

| Setting | Default | What it controls |
|---|---|---|
| empathy_threshold | 85 | `/clearfelt humanize` stops looping once the Empathy Index reaches this score. |
| max_iterations | 3 | Hard cap on scrub/re-score passes in `/clearfelt humanize`, even if the threshold is never reached. |
| intensity | conservative | `conservative` only touches confirmed rule hits and preserves structure/length. `aggressive` unlocks full burstiness and sentence restructuring. |

## Category severity weights

These match the table documented in `reference/audit.md`. Raise a weight to make that category count for more of the score; lower it to make it count for less.

| Category | Weight multiplier |
|---|---|
| binary_contrasts | 1.0 |
| fake_profound_closers | 1.0 |
| throat_clearing_openers | 1.0 |
| weasel_attribution | 1.0 |
| structural_tells | 1.0 |
| formatting_tells | 0.75 |
| high_frequency_lexicon | 1.0 |
| puffery_lexicon | 1.0 |

## Tier thresholds

| Setting | Default | What it controls |
|---|---|---|
| tier2_cluster_window | 40 | A tier-2 word only counts as a hit when another flagged word appears within this many words of it. |
| tier3_density_threshold | 3 | A tier-3 word only counts as a hit once it appears at least this many times in the document. |

## Statistical signals

| Setting | Default | What it controls |
|---|---|---|
| burstiness_weight | 10 | How many points of the score are affected by sentence-length variance (coefficient of variation across sentence word counts). Low variance costs points; high variance earns them back. |
| vocabulary_diversity_weight | 5 | How many points are affected by type-token ratio (unique words divided by total words). |
| repetition_weight | 5 | How many points are lost to repeated three-word sequences (trigram repetition). |

## Hooks

| Setting | Default | What it controls |
|---|---|---|
| hook.enabled | false | Whether the auto-audit hook is installed for this project. Toggle with `$clearfelt hooks on` / `off`. |
| hook.quiet | false | When true, the hook only speaks up when it finds something, instead of acknowledging clean files too. |
