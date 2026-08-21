# Domain profile

Copy this file to `.clearfelt-writing/domain.md` in your own project (or run `/clearfelt-writing setup`, which writes it for you). Unlike a voice profile, this is shared by everyone working on the project: it describes the subject matter, not any one writer's style. `scripts/detect.mjs` reads it before flagging anything, same precedence as a voice profile.

## Domain

A sentence or two describing what this project is about, so a future setup run or a new contributor has context.

Default (no domain set up yet): general audience, no domain assumed.

## Technical terms exempt from flagging

Words or phrases the shared rule files would otherwise flag, but that are legitimate, ordinary usage in this domain (for example, "robust" describing a system architecture, or "delve into the codebase" in a deep-dive piece). One per line. `/clearfelt-writing audit` and `/clearfelt-writing rewrite` will never touch these.

- (example) robust

## Target reading level

Optional. If set, `/clearfelt-writing audit` notes when a draft's Flesch-Kincaid Grade Level falls outside this range, as an FYI, not a score deduction. Overrides the shipped default in `clearfelt-writing.config.md` (6 to 12) for this project.

- target_grade_level_min: (unset)
- target_grade_level_max: (unset)

## Preferred intensity

Optional. If set, `/clearfelt-writing rewrite` uses this intensity for this project without asking, instead of the four-tier question described in `reference/rewrite.md`. One of `light_touch`, `balanced`, `full_rewrite`, `structural_rework`. Scoped to this project only; for a preference that applies everywhere you use this skill, see `~/.clearfelt-writing/settings.md` instead.

- preferred_intensity: (unset)

## Preferred length

Optional. If set, `/clearfelt-writing write` uses this length for this project without asking, instead of the three-tier question described in `reference/write.md`. One of `short`, `medium`, `long`. Scoped to this project only; for a preference that applies everywhere you use this skill, see `~/.clearfelt-writing/settings.md` instead.

- preferred_length: (unset)

## Mode

Optional. What kind of writing this project mostly is: `technical`, `marketing`, `support`, `executive`, `personal`, or `sensitive`. Context for `/clearfelt-writing rewrite`'s qualitative judgment (writing.md's "genre conventions must be respected"): Pass 1 mentions it, and Pass 2's non-regex checks (frictionless claims, narrative idiosyncrasy, episodic grounding, cognitive friction) weigh it when deciding whether dense or formal language is a genre convention or an actual tell. It is informational, not a separate enforcement switch: it does not change what `scripts/detect.mjs` flags or scores, and setting `mode: sensitive` here does not by itself get you `risk_tier: sensitive`'s hedge/qualifier protection or forced confirmation, set `risk_tier` explicitly below for that.

- mode: (unset)

## Risk tier

Optional. Set this to `sensitive` for a project where a rewrite could carry real legal or reputational weight: a shareholder letter, a regulatory filing, anything with forward-looking statements or safe-harbor language, anything already reviewed by Legal. Default is `standard`.

When `sensitive`: `/clearfelt-writing rewrite` never rewrites away hedges, qualifiers, or attributions (the `frictionless_claims` and `weasel_attribution` rule categories), since that language is often legally load-bearing, not a stylistic weakness, in this kind of document. `rewrite.require_confirmation` is also forced to `true` for this project regardless of any saved global preference or `clearfelt-writing.config.md` setting. See `reference/rewrite.md`.

- risk_tier: standard
