# Contributing to clearfelt

The rule dictionary drifts out of date as AI writing habits change, so keeping it current matters more than almost anything else in this repo. The patterns already in `rules/` draw on documented AI-writing-tell research and community-observed patterns, not just this project's own opinion, and new additions should meet the same bar: a pattern you've actually seen, not a guess.

## Adding a shared pattern or word

1. Pick the right file. Multi-word phrases and structural patterns go under `rules/antipatterns/<category>.md`. Single words and short fixed phrases go under `rules/banned_words/<list>.md`. If nothing fits, propose a new category file rather than forcing it into an existing one.
2. Add a bullet in this shape:
   - Antipatterns: `- "the pattern" | severity: N`
   - Banned words: `- word | severity: N | tier: N`
3. Pick a severity from 1 to 9, matching how strongly the pattern reads as AI-generated. Look at the existing entries in that file for calibration before picking a number out of thin air.
4. For banned words, pick a tier: `1` if it should always be flagged, `2` if it should only be flagged when clustered with other hits, `3` if it should only be flagged once it's clearly dense in the document. Tiers exist to cut false positives on words that are sometimes completely legitimate.
5. Open a PR with a one-line description of where you saw the pattern (a real example, a linked source, or "seen repeatedly in ChatGPT output" is fine).

## Personal-only additions

If you just want to flag a word for yourself without proposing it for everyone, don't open a PR. Copy `rules/antipatterns.local.example.md` or `rules/banned_words.local.example.md` to the matching `.local.md` file in the same folder. Both are gitignored.

## Changing `scripts/detect.mjs`

The script has zero external dependencies on purpose, so `git clone` is still the entire install. Any change should keep using Node's standard library only.
