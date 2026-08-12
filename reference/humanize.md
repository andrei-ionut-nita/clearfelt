# /clearfelt humanize

Rewrites the target file in place, driven by `prompts/audit_loop.xml`.

## Flow

1. Resolve the target path.
2. Follow `prompts/audit_loop.xml` pass by pass: extract and calibrate, scrub slop, evaluate warmth, looping the scrub/evaluate pair per the `<loop>` block's condition.
3. Read `empathy_threshold`, `max_iterations`, and `intensity` from `clearfelt.config.md` before starting.
4. Write the rewritten text back to the target file once the loop ends (threshold cleared or iteration cap hit).
5. Report the final score and how many passes it took. If the cap was hit before clearing the threshold, say so plainly rather than implying success.

## Conservative vs. aggressive

`intensity: conservative` (the default) only rewrites spans that `scripts/detect.mjs` actually flagged, and keeps paragraph count, paragraph order, and approximate sentence count close to the original. `intensity: aggressive` additionally varies sentence length deliberately, shifts toward collective pronouns, and swaps rigid conjunctions for casual transitions, even in spans that weren't flagged. Never switch intensity without the user setting it in `clearfelt.config.md` or asking for it directly.

## Two hard rules

**No fabrication.** The rewrite never introduces a fact, name, date, statistic, or citation that wasn't already in the source. If a sentence reads as vague or unsupported, tighten the language, don't invent a specific to replace it.

**Voice-profile precedence.** If `.clearfelt/voice-profile.md` exists in the user's project and states a preference (for example, "I like using em-dashes" or a word the base rules would otherwise flag), that preference overrides the shipped rule files for this project. `scripts/detect.mjs` already checks the voice profile before flagging a hit, so a humanized draft should never fight the user's own stated voice.

## Voice profile

If `.clearfelt/voice-profile.md` doesn't exist yet, proceed with bundled defaults from `templates/voice-profile.example.md` and mention once, after the run completes, that `/clearfelt setup` can build a personal one. Don't block the humanize run on it.
