# ADR 0020: Confirm-before-write asks where, not just whether

**Status:** Decided
**Date:** 2026-08-13

## Context

ADR 0006 established that `/clearfelt rewrite` never writes without explicit confirmation, gated by a yes/no question: apply the change to `<path>`, or don't. In practice, a user who wants to see the rewrite land somewhere they can compare against the original, without touching the source file, had to decline the gate and ask separately for a new file, as a follow-up request the skill had no built-in path for.

## Decision

The confirm-before-write gate in `reference/rewrite.md` (and, by extension, anywhere `reference/format/rewrite.md`'s result template is used) is a three-option picker instead of a yes/no question:

- **Overwrite `<path>`**: the original yes.
- **Write to a new file**: defaults to `<stem>.rewritten<ext>` next to the original, the same naming convention `/clearfelt write` already uses for `<seed-stem>.draft.md`. A different name typed into the picker's own free-text slot is honored directly.
- **Other**: the same free-text slot doubles as the decline path (a bare "no" or "cancel") and as an escape hatch for anything else, most commonly a different write target typed out in full.

`.clearfelt/audit.log` gains an optional `source=<path>` field on the write-target-differs-from-original branch, so the log still records which document a rewrite came from even when it didn't land on top of it.

## Why

`/clearfelt write` already never overwrites its seed, by design, precisely because generating a new draft and replacing a source file are different enough operations that conflating them was never on the table for that command. `/clearfelt rewrite` sits in a genuinely different spot: most rewrites are meant to replace the source, so defaulting to overwrite (via the "Overwrite" option, always listed first) stays the common case and the zero-extra-thought path. But a rewrite is also frequently a proposal a user wants to hold up against the source rather than commit to blind, and until now that use case had no first-class answer, just a decline followed by a manually-specified new file.

A three-option picker, not a fourth yes/no variant, matches `reference/setup.md`'s existing wizard rule: a structured single-choice tool over a bare text prompt whenever the question has more than two real answers. This also keeps the gate itself unchanged in spirit, still a hard stop before any file write, still skippable only by the documented `rewrite.require_confirmation: false` opt-out, just resolving one more piece of information (where) at the same checkpoint instead of a second round-trip.

## Consequences

`reference/rewrite.md`'s "Confirm before writing" section and `reference/format/rewrite.md`'s result and preservation-check templates both describe the three-option menu instead of a yes/no line. The `rewrite.require_confirmation: false` opt-out still writes to `<path>` directly, since there's no one present to answer a "where" question in scripted/batch use.
