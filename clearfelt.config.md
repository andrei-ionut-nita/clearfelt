# clearfelt config

Tunables for `scripts/detect.mjs`, `/clearfelt humanize`'s rewrite loop, and the auto-audit hook. Edit the values in the tables below; nothing here needs code or JSON syntax.

This file ships inside the skill's own repo and gets reset on every skill update. Anything you want to persist across an update, a saved intensity preference, a changed `voice.mode`, belongs in `~/.clearfelt/settings.md` instead (same table format, home directory, never touched by an update), not here. `/clearfelt humanize`'s save prompts write there automatically; hand-edit it yourself for anything else you want to stick.

## Scoring

| Setting | Default | What it controls |
|---|---|---|
| empathy_threshold | 85 | `/clearfelt humanize` stops looping once the Empathy Index reaches this score. |
| max_iterations | 3 | Hard cap on scrub/re-score passes in `/clearfelt humanize`, even if the threshold is never reached. |
| intensity | light_touch | One of `light_touch`, `balanced`, `full_rewrite`, `structural_rework`. See "Choosing an intensity" in `reference/humanize.md` for what each does. This is the shipped default only; `/clearfelt humanize` asks before using it unless `humanize.ask_intensity` is `false` or a preference is resolved from `~/.clearfelt/settings.md` or `.clearfelt/domain.md`. |
| deduction_cap | 65 | The rule-hit deduction (raw sum of every hit's severity x category weight) is capped here before it's subtracted from the score. Rule-hit deduction has no natural ceiling, one document can rack up 80+ points, while the statistical signals below are bounded to a small range; past this cap the document is already unambiguously below `empathy_threshold`, so letting deduction keep climbing only erases the other signals' ability to matter, not add real information. The uncapped sum is still reported (`deduction` in `breakdown`, alongside the capped `deductionApplied` actually used in the formula). See `docs/decisions/0011-deduction-cap-and-signal-rebalance.md`. |

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
| frictionless_claims | 1.0 |
| high_frequency_lexicon | 1.0 |
| puffery_lexicon | 1.0 |
| vague_abstraction_lexicon | 0.75 |

## Tier thresholds

| Setting | Default | What it controls |
|---|---|---|
| tier2_cluster_window | 40 | A tier-2 word only counts as a hit when another flagged word appears within this many words of it. |
| tier3_density_threshold | 3 | A tier-3 word only counts as a hit once it appears at least this many times in the document. |

## Statistical signals

These weights were rescaled (`docs/decisions/0011-deduction-cap-and-signal-rebalance.md`) using the observed range each signal actually produced across 17 real documents scored during development, not picked from theory: the old weights left burstiness, vocabulary diversity, and paragraph variety spanning under 5 points combined even at their most extreme observed values, and repetition spanning barely 1 point despite a 50-point theoretical ceiling, so none of them could realistically compete with rule-hit deduction. Matters most in combination with `deduction_cap` above: these signals are tie-breakers and diagnostics once deduction is capped or already near zero, not co-equal scoring inputs on a document with many rule hits.

| Setting | Default | What it controls |
|---|---|---|
| burstiness_weight | 12 | How many points of the score are affected by sentence-length variance (coefficient of variation across sentence word counts). Low variance costs points; high variance earns them back. |
| vocabulary_diversity_weight | 17 | How many points are affected by type-token ratio (unique words divided by total words). |
| repetition_weight | 27 | How many points are lost to repeated three-word sequences (trigram repetition). Raised the most of the four: exact trigram repetition is rare even in bad AI writing, so its observed range was the narrowest relative to its theoretical ceiling. |
| paragraph_variety_weight | 12 | How many points are affected by variance in paragraph length (coefficient of variation across paragraph word counts, the same approach as burstiness, one level up). Markdown headers are excluded from this count. Uniform paragraph lengths cost points; varied ones earn them back. |
| wall_of_text_penalty | 15 | A flat deduction when a document has only one paragraph and is long enough that a human would likely have broken it up (see `wall_of_text_sentence_threshold`). Found via testing: sentence- and word-level statistical signals are all blind to paragraph structure entirely, a single giant paragraph and a well-paragraphed document with identical sentences used to score identically. |
| wall_of_text_sentence_threshold | 5 | The `wall_of_text_penalty` only applies once a single-paragraph document has at least this many sentences; short notes aren't expected to have paragraph breaks. |

## Humanize

| Setting | Default | What it controls |
|---|---|---|
| humanize.require_confirmation | true | `/clearfelt humanize` runs the rewrite loop in memory, shows a before/after, and waits for explicit approval before writing the file. Set to `false` only for scripted/batch use where no one is present to confirm; the shipped default never writes without asking. Forced back to `true` regardless of this setting when `.clearfelt/domain.md` sets `risk_tier: sensitive`, see `reference/humanize.md`. |
| humanize.ask_intensity | true | Whether `/clearfelt humanize` asks which intensity tier to use before running. Set to `false` automatically when a preference is saved globally (see below); editing this by hand here won't survive a skill update, use `~/.clearfelt/settings.md` for anything meant to persist. |

## Voice

| Setting | Default | What it controls |
|---|---|---|
| voice.mode | single | `single` reads `.clearfelt/voice-profile.md`. `multi` reads `.clearfelt/voices/<name>.md` instead, selected with `--voice <name>`, for projects with more than one writer. |

## Readability

| Setting | Default | What it controls |
|---|---|---|
| target_grade_level_min | 6 | `/clearfelt audit` notes (not deducts) when Flesch-Kincaid Grade Level falls below this. Overridden per project by `.clearfelt/domain.md` if it sets one. |
| target_grade_level_max | 12 | Same, for the upper bound. Default range is general-audience web/news writing. |

These defaults, and the formulas themselves (`reference/audit.md`), are calibrated for US-school-grade, English-language, general-audience text. They are not validated for non-English text or for specialist/global audiences with different reading norms. Set your own range in `.clearfelt/domain.md` for anything outside that; real localization support is out of scope for this version, not silently assumed to work.

## Hooks

| Setting | Default | What it controls |
|---|---|---|
| hook.enabled | false | Whether the auto-audit hook is installed for this project. Toggle with `$clearfelt hooks on` / `off`. |
| hook.quiet | false | When true, the hook only speaks up when it finds something, instead of acknowledging clean files too. |
