# Voice profile

Copy this file to `.clearfelt/voice-profile.md` in your own project (or run `/clearfelt setup`, which writes it for you). `/clearfelt rewrite` reads it before rewriting anything, and a preference stated here always wins over the shipped rule files.

## Platform-scoped inheritance (optional, `voice.mode: multi` only)

A file under `.clearfelt/voices/<name>.md` can start with a one-line `extends: <base-name>` directive, naming another file in the same `voices/` directory (e.g. `extends: general`). One hop only, no chained inheritance. See [docs/decisions/0021](../docs/decisions/0021-platform-scoped-voice-inheritance.md) for the full design; the short version:

```
extends: general

# Voice profile: linkedin

## Words I want to keep using

- (only what's specific to this platform, added on top of general's list)
```

- **List sections** ("Words I want to keep using," "Words to avoid," "Non-negotiables"): union. This file's entries add to the base file's, never replace them.
- **Sentence rhythm**: this file's own text wins if set, otherwise inherits the base file's.
- **Personal calibration**: inherits the base file's computed numbers unless this file has its own complete calibration section, in which case this file's numbers win outright.

Leave this line out entirely for a plain, standalone profile (single-writer mode, or a multi-voice profile for a different writer, not a platform): everything below behaves exactly as it always has.

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
