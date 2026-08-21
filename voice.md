# Voice

This is doctrine, not data: what clearfelt-writing's voice-profile system does, why it exists, and what precedence it has. It does not hold any individual's actual preferences. Those live in `.clearfelt-writing/voice-profile.md` (per project, gitignored, built by `/clearfelt-writing setup`, template at `templates/voice-profile.example.md`), or per-writer in `.clearfelt-writing/voices/<name>.md` when `voice.mode: multi` (`docs/decisions/0007`). Looking for where to add your own preferred words or non-negotiables? Edit that file, not this one.

## What "voice" means here

`writing.md` defines clearfelt-writing's product-level judgment about what counts as bad writing. Voice sits above that judgment: a specific person's or project's deliberate departures from it. A word the base doctrine would otherwise flag can still be exactly right for a given writer, and this system exists so that preference wins on purpose, not as a loophole someone stumbled into.

## Precedence

A stated voice-profile preference overrides the base rule dictionary, for that project, full stop (`docs/decisions/0004`). This is enforced in code, not just prompt instruction: `scripts/detect.mjs`'s `loadVoiceProfileOverrides` checks `.clearfelt-writing/voice-profile.md`'s "Words I want to keep using" section before matching any rule against the target text, so a model following stale instructions can't accidentally flag something the user already asked to keep.

That precedence stops at `writing.md`'s refusal rules. Saying "keep using 'honestly' as a sentence opener" is a style choice; skipping confirmation before a write, or softening a hedge in `risk_tier: sensitive` content, is not. The latter two stay product-level guarantees no matter what a profile says.

## What the system asks for, and why

`/clearfelt-writing setup`'s adaptive interview (`reference/setup.md`) builds a voice profile from four things: words to keep that the base rules would otherwise flag, words to avoid beyond the base banlist, a sentence-rhythm description, and non-negotiables. Four fields, not a personality questionnaire, because the only thing the rest of the system needs from a voice profile is what to check before flagging or rewriting something, not a general theory of the user's writing.

## Multi-voice and domain profiles are a different axis

`voice.mode: multi` (`.clearfelt-writing/voices/<name>.md`) is for multiple writers sharing one project who don't share a voice. `.clearfelt-writing/domain.md` is project-scoped, not writer-scoped: exempt terminology and target reading level for the domain everyone in the project is writing in, regardless of whose voice profile is active. Don't put domain jargon in a personal voice profile just because it's easier; it belongs in `domain.md` so every writer on the project gets the exemption, not just one.

## What this system will not do

A voice preference cannot introduce a fact, name, date, or citation absent from the source; no-fabrication (`docs/decisions/0004`) applies regardless of voice. Nor does having one silently expand what `/clearfelt-writing rewrite` is allowed to touch beyond the resolved intensity tier: it changes which words get flagged and how the prose sounds, not how much of the document gets edited.
