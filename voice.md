# Voice

This is doctrine, not data: what clearfelt's voice-profile system does, why it exists, and what precedence it has. It does not hold any individual's actual preferences. Those live in `.clearfelt/voice-profile.md` (per project, gitignored, built by `/clearfelt setup`, template at `templates/voice-profile.example.md`), or per-writer in `.clearfelt/voices/<name>.md` when `voice.mode: multi` (`docs/decisions/0007`). If you're looking for where to add your own preferred words or non-negotiables, edit that file, not this one.

## What "voice" means here

`writing.md` defines clearfelt's product-level judgment about what counts as bad writing. Voice is the layer above that judgment: a specific person's or project's deliberate departures from it. A word `writing.md`'s doctrine would otherwise flag can still be exactly right for a given writer, and the voice-profile system exists so that preference wins, on purpose, not as a loophole.

## Precedence

A stated voice-profile preference overrides the shipped rule files, for that project, full stop (`docs/decisions/0004`). This is enforced in code, not just prompt instruction: `scripts/detect.mjs`'s `loadVoiceProfileOverrides` checks `.clearfelt/voice-profile.md`'s "Words I want to keep using" section before matching any rule against the target text, so an LLM following the wrong instructions can't accidentally flag something the user explicitly asked to keep.

Voice precedence does not override `writing.md`'s refusal rules. A voice profile can say "keep using 'honestly,' as a sentence opener"; it cannot make `/clearfelt rewrite` skip confirmation before writing, or soften a hedge in `risk_tier: sensitive` content. Those are product-level guarantees, not style preferences.

## What the system asks for, and why

`/clearfelt setup`'s adaptive interview (`reference/setup.md`) builds a voice profile from four things: words to keep that the base rules would otherwise flag, words to avoid beyond the base banlist, a sentence-rhythm description, and non-negotiables. Four fields, not a personality questionnaire, because the only thing the rest of the system needs from a voice profile is what to check before flagging or rewriting something, not a general theory of the user's writing.

## Multi-voice and domain profiles are a different axis

`voice.mode: multi` (`.clearfelt/voices/<name>.md`) is for multiple writers sharing one project who don't share a voice. `.clearfelt/domain.md` is project-scoped, not writer-scoped: exempt terminology and target reading level for the domain everyone in the project is writing in, regardless of whose voice profile is active. Don't put domain jargon in a personal voice profile just because it's easier; it belongs in `domain.md` so every writer on the project gets the exemption, not just one.

## What this system will not do

It will not let a voice preference introduce a fact, name, date, or citation that wasn't in the source; no-fabrication (`docs/decisions/0004`) applies regardless of voice. It will not silently expand scope beyond the resolved intensity tier just because a voice profile exists; a voice profile changes which words get flagged and how the prose sounds, not how much of the document `/clearfelt rewrite` is allowed to touch.
