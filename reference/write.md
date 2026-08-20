# /clearfelt write

Turns a short seed (a rough draft, a paragraph of notes, an idea pasted straight into the request) into a full first draft, driven by `prompts/write_loop.xml`, which reuses the same scrub, score, and preservation-check machinery `/clearfelt rewrite`'s `prompts/audit_loop.xml` already has, with a draft-generation pass in front instead of starting from existing prose. Never overwrites the seed file. Never writes without explicit approval: reuses `rewrite.require_confirmation` in `clearfelt.config.md` as its own gate, rather than a second setting for the identical guarantee.

Don't reach for this to fix an already-substantial document, that's what `/clearfelt rewrite` is for. `write` is for when there isn't a document yet, just an idea.

## Flow

1. Resolve the seed: a file path, or inline text pasted directly into the request. If neither, ask for one, don't invent a topic from nothing.
2. Resolve missing structure with a short interview, at most 4 questions, each through the same `AskUserQuestion` wizard pattern `/clearfelt setup` uses (concrete example options plus Other, one question per turn, never a bare open text prompt): format (post, article, email, README section...), target length, audience, and any point the seed doesn't state but the piece must hit. Skip a question outright if `.clearfelt/domain.md` already answers it (format and audience are often domain-level, not per-draft).
3. Generate the first full draft from the seed plus interview answers. The seed's stated position is load-bearing: the draft must not soften, reverse, or omit the seed's actual claim. This is the anchor the no-fabrication rule checks against, see below.
4. Hand the draft to `prompts/write_loop.xml`'s scrub/score passes, the same `scripts/detect.mjs` scoring and slop-scrubbing `/clearfelt rewrite` runs, just with a generation pass in front instead of starting from existing prose. Loop until `human_score_threshold` clears or `max_iterations` hits, identical rule to rewrite. If a scoring pass returns `scoreReliability: "low"` (docs/decisions/0023), the seed or draft likely isn't English; say so plainly before presenting the score, the number may not mean what it looks like it means, don't just loop trying to chase a higher one.
5. Confirm before writing: present the seed and the draft using [reference/format/write.md](format/write.md)'s result template (`## Seed` / `## Draft`, not `Before`/`After`, there's no prior draft to diff against), the score, and a "What the draft adds" bullet list, since there's no "changed" to describe on a from-scratch draft. Ask explicitly whether to write it, and to which path (default: `<seed-stem>.draft.md`, next to the seed, never the seed's own filename).
6. On approval, write the file and append a line to `.clearfelt/audit.log`, same shape as rewrite's line but `intensity=n/a` and a `mode=write` field instead. On decline, discard the draft, write nothing, offer to regenerate with different answers if asked.

## No fabrication, reinterpreted

Rewrite's no-fabrication rule checks the draft against a full source document. Write has no source document, only a seed and whatever the interview added. The rule still holds, narrowed to what's actually available to check against:

- Never invent a name, date, statistic, or quote that isn't in the seed or an interview answer.
- Never contradict the seed's stated position to make the draft read more confidently. A hedge in the seed can be tightened, not reversed.
- Everything else, the connective tissue, examples, structure, is expected to be new, that's the point of the command. `scripts/check.mjs`'s fingerprint check runs here too, but read its `dropped` list as mostly noise (the seed is short and sparse on purpose) and its `added` list as the one that matters: an added date, number, or name not traceable to the seed or the interview is worth a second look before approving.

## Length, not intensity

Rewrite has four intensity tiers because it's choosing how much of an existing document to touch. Write doesn't have that axis, there's nothing to touch yet, it has a length axis instead. Word-count bounds live in `clearfelt.config.md`'s "Write lengths" table, not hardcoded here:

| Slug | Friendly name | Target (default bounds, see `clearfelt.config.md`) |
|---|---|---|
| `short` | Short | `short_min_words`-`short_max_words` (150-300 by default). A post, a note, a short update. |
| `medium` | Medium | `medium_min_words`-`medium_max_words` (400-800 by default). A standard article or blog post. |
| `long` | Long | `long_min_words`+ (1000+ by default), with section headers. A full piece with room to develop more than one point. |

Resolved the same way rewrite resolves intensity: `.clearfelt/domain.md`'s `preferred_length` first, then a saved global preference, then ask. Same save-preference follow-up question as rewrite (global, this-project-only, or don't save).

## What it reuses from rewrite, on purpose

Same scoring engine, same confirm-before-write gate, same locked-span support (wrap seed text you want quoted verbatim in `<!-- clearfelt-lock -->`), same voice-profile precedence, same `.clearfelt/audit.log`, same constraint support (see `reference/rewrite.md`'s "Constraints" section: `--max-chars`/`--max-words`/`--must-contain`/`--must-not-contain`, or `--constraints <name>` for a reusable `.clearfelt/constraints/<name>.md` set). A constraint matters more here than in rewrite: there's no existing text whose length is already roughly right, the draft is built from nothing, so a hard ceiling like a platform's character limit needs to be a real generation target from the first pass, not just a check applied to whatever length felt natural. The only new pieces relative to rewrite are the interview, the draft-generation pass, and the narrower fabrication check above. Nothing here should ever duplicate logic that already exists in `scripts/lib/` or `prompts/audit_loop.xml`, if a pass looks identical to one rewrite already has, it should call the same code, not a copy of it.
