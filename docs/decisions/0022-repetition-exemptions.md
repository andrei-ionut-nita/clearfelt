# ADR 0022: Declared repetition exemptions (`--exempt-repetition`)

**Status:** Implemented
**Date:** 2026-08-20

## Context

A real side-by-side comparison (`executive_assistant`'s LinkedIn shadow-mode pilot, logged in that project's `.clearfelt/shadow-log.md`) surfaced a document where the deterministic Human Score and human judgment of quality actively disagreed. A real, already-published-quality post scored 76, below the 85 threshold, on statistical grounds alone: zero rule hits, every manual checklist item passed, but a low `movingAverageTtr`, a low `burstinessScore` coefficient of variation, and a nonzero `trigramRepetitionRatio`.

Reading the text explains the repetition signal directly: the post's hook ("goes quiet exactly when you need them least") and its closing CTA ("shown up for you, after the placement, not before it") deliberately echo the same phrase to close a rhetorical loop, a hook/CTA callback. A separate paragraph also used anaphora ("No message at 90 days. No check-in during onboarding."), a different device with the same shape: intentional repetition as a technique, not AI-model repetition-from-limited-vocabulary, the thing `trigramRepetitionRatio` exists to catch.

The question this raised: should clearfelt learn to detect narrative devices like hook-callbacks and anaphora, so the score stops penalizing them?

No. `docs/ROADMAP.md`'s Feature C (structural-variety check) was already declined for exactly this shape of problem: a purely statistical proxy cannot distinguish "same phrase, filler" from "same phrase, device," and shipping one anyway risks a false-confidence signal that's worse than none, a passing (or in this case, a correctly-nonpenalizing) check invites trust the underlying measurement hasn't earned. Auto-detecting "this repetition was intentional" from the text alone is exactly that kind of proxy: there is no reliable, deterministic tell that separates a deliberate callback from an accidental one purely from word patterns. Feature E (virality/engagement optimization) was declined on a related but distinct ground: no deterministic score exists for "this will perform," only correlational guesses. This ADR's mechanism avoids both traps by not trying to detect anything: it lets a human (or the agent running `write_loop.xml`/`audit_loop.xml` on their behalf) state which repetition was intentional, the same "declare, don't guess" shape `.clearfelt/domain.md`'s jargon exemption list already uses for a different false-positive (rule hits on legitimate technical terms).

A second question this raised: should the exemption live in a voice profile, alongside kept-words and calibration? No. Kept-words and calibration describe a writer's stable, recurring traits, true across every post on that voice. A hook-callback phrase is specific to one document; "after the placement" means nothing to the next post's hook. Putting per-document phrases in a project-wide file would either need constant hand-editing (defeating the point) or accumulate stale entries that stop being true. The right scope is per-invocation, matching `scripts/check.mjs`'s existing `--must-contain`/`--must-not-contain` flags, which are also per-call, not voice-profile-scoped.

## Decision

1. `scripts/lib/score.mjs`'s `trigramRepetitionRatio(text, exemptPhrases = [])` takes an optional list of phrases. Each phrase is turned into its own 3-word windows (so a phrase of any length >= 3 words works, not just literal trigrams) and those specific trigram strings are excluded from the repeated-phrase tally, not the total trigram count: an exempted phrase still counts as real text, it just doesn't count against the writer for repeating it on purpose. A phrase under 3 words has no effect (no trigram to derive), disclosed in the CLI help text rather than silently doing nothing.
2. `computeScore(text, hits, config, exemptPhrases = [])` threads the same list through to `repetitionPenalty`. Every other signal (burstiness, vocabulary diversity, paragraph variety, wall-of-text) is untouched, deliberately: the callback/anaphora case is specifically about the repeated-phrase signal, and there's no comparable evidence yet that the other signals have the same false-positive problem for these two devices.
3. `scripts/detect.mjs` gains `--exempt-repetition <phrase>` (repeatable), the same shape as `check.mjs`'s existing repeatable flags. The report payload echoes back which phrases were exempted (`exemptRepetition`, present only when non-empty), so a saved report discloses that the score was computed with an exemption applied, not silently.
4. Not built: a voice-profile-level "recurring device" section (for a writer whose signature move is always anaphora, not just this one document). No real case has been observed yet where the same exempted phrase recurs across a writer's posts; per this project's own convention (see ROADMAP's framing), that stays undesigned until a real, evidenced case shows up, not built ahead of one.

## Why not just lower `repetition_weight` or raise `deduction_cap`

Both are global project-level dials, not text-aware. Lowering `repetition_weight` stops penalizing every repeated trigram in every future document from that project, including the real AI-slop repetition the signal exists to catch, not just the two occurrences that were actually deliberate. This ADR's mechanism keeps the default penalty exactly as strict as before for everything except the specific phrases a human has vouched for.

## Consequences

- `/clearfelt write` and `/clearfelt rewrite`'s prompt pipelines (`prompts/write_loop.xml`, `prompts/audit_loop.xml`) are updated to tell the agent: when a draft deliberately repeats a phrase as a hook-callback or anaphora, pass `--exempt-repetition "<phrase>"` when scoring it, rather than either accepting an unearned low score or, worse, rewriting away a legitimate technique to chase a higher number.
- This is opt-in and additive. A project that never passes `--exempt-repetition` sees byte-identical scoring behavior to before this ADR; `exemptPhrases` defaults to `[]` at both the `score.mjs` and `detect.mjs` layers.
- This does not change `scripts/check.mjs`, `hook.mjs`, or `pin.mjs`; the exemption is purely a `detect.mjs` reporting-time concern.
- Explicitly does not attempt to detect, reward, or optimize for "hook strength" or engagement, only to stop penalizing a human-vouched-for repetition. See ROADMAP's Feature E for why the former stays out.
