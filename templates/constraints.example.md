# Constraints: example

Copy this file to `.clearfelt-writing/constraints/<name>.md` in your own project and reference it with `--constraints <name>` on `/clearfelt-writing write` or `/clearfelt-writing rewrite`. Unlike a voice profile, a constraint set has nothing to do with tone: it's a hard, checkable guarantee about the shape of the output (a length ceiling, a required or forbidden substring), verified against the actual candidate text by `scripts/check.mjs`, not just prompt-instructed. `--max-chars`/`--max-words`/`--must-contain`/`--must-not-contain` on the command line work the same way for a one-off, with no file needed; a named set is for a constraint you'll reuse across many drafts (a platform's character limit, a template's required disclaimer).

## Limits

Leave a row `(unset)` (or delete it) to skip that check. Both are word/character counts of the trimmed candidate text, not the seed or source.

| Setting | Value |
|---|---|
| max_chars | (unset) |
| max_words | (unset) |

## Must contain

One per line. The candidate must contain every one of these, or the run fails (see `check.hard_fail_on_constraint_violation` in `clearfelt-writing.config.md`). Plain text matches as a literal, case-sensitive substring; wrap a line in `/pattern/flags` to match a regex instead.

- (example) andreinita.co
- (example) /\?\s*$/

## Must not contain

Same rule as above, inverted: the candidate must NOT contain any of these.

- (example) /!!+/
- (example) leverage
