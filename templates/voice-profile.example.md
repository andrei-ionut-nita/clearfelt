# Voice profile

Copy this file to `.clearfelt/voice-profile.md` in your own project (or run `/clearfelt setup`, which writes it for you). `/clearfelt rewrite` reads it before rewriting anything, and a preference stated here always wins over the shipped rule files.

## Words I want to keep using

List words or phrases here that the base rule files would otherwise flag but that you actually like. One per line. `/clearfelt rewrite` will never touch these.

- (example) "honestly," as a sentence opener

## Words to avoid beyond the base banlist

Anything specific to you that isn't already in `rules/banned_words/`.

- (add your own)

## Sentence rhythm

A sentence or two describing how you naturally write: short and punchy, long and winding, mostly formal, mostly casual, a deliberate mix. `/clearfelt setup` fills this in from a writing sample or a direct question if you don't have one handy.

Default (no profile set up yet): mixed length, casual, contractions welcome.

## Non-negotiables

Hard rules that should never be broken, regardless of intensity setting.

- (example) Never use bullet points in body paragraphs.
- (example) Always British spelling.

## Personal calibration (computed)

Computed, not hand-written: `node scripts/calibrate.mjs <sample-file-or-directory>` measures a writer's own vocabulary diversity and sentence/paragraph rhythm from real past writing, and `/clearfelt setup` writes the result here. When present, these three numbers override `clearfelt.config.md`'s generic, fixture-derived defaults for this project's scoring, so a document is measured against this writer's own natural rhythm instead of a stranger's baseline. Leave unset (delete this section, or leave the fields blank) to use the shipped generic defaults.

A directory of several past pieces gives sturdier numbers than one short pasted sample; `scripts/calibrate.mjs` warns when the input is under ~300 words. Re-run it and update these values if the writer's style meaningfully changes, or if the original calibration ran on a thin sample.

- baseline_mattr: (unset)
- baseline_burstiness_cv: (unset)
- baseline_paragraph_cv: (unset)
- sample_word_count: (unset)
