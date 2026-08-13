# Domain profile

Copy this file to `.clearfelt/domain.md` in your own project (or run `/clearfelt setup`, which writes it for you). Unlike a voice profile, this is shared by everyone working on the project: it describes the subject matter, not any one writer's style. `scripts/detect.mjs` reads it before flagging anything, same precedence as a voice profile.

## Domain

A sentence or two describing what this project is about, so a future setup run or a new contributor has context.

Default (no domain set up yet): general audience, no domain assumed.

## Technical terms exempt from flagging

Words or phrases the shared rule files would otherwise flag, but that are legitimate, ordinary usage in this domain (for example, "robust" describing a system architecture, or "delve into the codebase" in a deep-dive piece). One per line. `/clearfelt audit` and `/clearfelt humanize` will never touch these.

- (example) robust

## Target reading level

Optional. If set, `/clearfelt audit` notes when a draft's Flesch-Kincaid Grade Level falls outside this range, as an FYI, not a score deduction. Overrides the shipped default in `clearfelt.config.md` (6 to 12) for this project.

- target_grade_level_min: (unset)
- target_grade_level_max: (unset)

## Preferred intensity

Optional. If set, `/clearfelt humanize` uses this intensity for this project without asking, instead of the four-tier question described in `reference/humanize.md`. One of `light_touch`, `balanced`, `full_rewrite`, `structural_rework`. Scoped to this project only; for a preference that applies everywhere you use this skill, see `~/.clearfelt/settings.md` instead.

- preferred_intensity: (unset)

## Risk tier

Optional. Set this to `sensitive` for a project where a rewrite could carry real legal or reputational weight: a shareholder letter, a regulatory filing, anything with forward-looking statements or safe-harbor language, anything already reviewed by Legal. Default is `standard`.

When `sensitive`: `/clearfelt humanize` never rewrites away hedges, qualifiers, or attributions (the `frictionless_claims` and `weasel_attribution` rule categories), since that language is often legally load-bearing, not a stylistic weakness, in this kind of document. `humanize.require_confirmation` is also forced to `true` for this project regardless of any saved global preference or `clearfelt.config.md` setting. See `reference/humanize.md`.

- risk_tier: standard
