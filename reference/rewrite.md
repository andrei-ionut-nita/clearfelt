# /clearfelt rewrite

Rewrites the target file, driven by `prompts/audit_loop.xml`. Never writes without explicit approval; see "Confirm before writing" below. Never picks an intensity silently either; see "Choosing an intensity" below.

## Flow

1. Resolve the target path. If `voice.mode` is `multi` (see `clearfelt.config.md`) and no voice was named in the request, ask which voice applies before continuing, then pass it as `--voice <name>` to every `scripts/detect.mjs` call below.
2. Follow `prompts/audit_loop.xml` pass by pass: extract and calibrate (this is where intensity gets resolved or asked, see below), scrub slop, then score and preservation-check the result, looping the scrub/evaluate pair per the `<loop>` block's condition. Do this **in memory**: hold the candidate rewrite as working text, don't touch the file on disk yet.
3. Read `human_score_threshold` and `max_iterations` from `clearfelt.config.md` before starting. Intensity is resolved separately, see below, not read silently.
4. Once the loop ends (threshold cleared or iteration cap hit), go to "Confirm before writing" below. Only write the file after that gate passes.
5. Report the final score and how many passes it took. If the cap was hit before clearing the threshold, say so plainly rather than implying success.

## Choosing an intensity

Four tiers, replacing the old conservative/aggressive pair. The config value is the same slug as the friendly name (lowercase, underscored), no separate translation table to keep in sync. Each tier is a strict superset of the one below it, touching a genuinely larger scope, not just polishing harder, so scores actually climb in real, verifiable steps rather than converging on the same number:

| Slug | Friendly name | What it touches |
|---|---|---|
| `light_touch` | Light touch | Only the spans `node scripts/detect.mjs --mode report <path>` reported as scored hits. Everything else, including paragraph structure and sentence count, stays exactly as-is. |
| `balanced` | Balanced | Every occurrence of every word or phrase anywhere in the rule dictionary, run `node scripts/detect.mjs --mode scan <path>` to get this list: it deliberately bypasses tier-suppression (which exists to protect the *score* from single-legitimate-use false positives, not to protect *rewrite*'s editing scope), so this includes words the scored report hid, like a `robust` used once or a `leverage` used twice. Rewrite every one of them, plus contractions and casual-transition swaps throughout. No sentence restructuring, no paragraph changes. A word a user genuinely wants kept belongs in `.clearfelt/domain.md`'s exemption list, not left protected by a tier threshold that was never meant for this. |
| `full_rewrite` | Full rewrite | Everything in Balanced, plus deliberate sentence-length variation, a shift toward collective pronouns ("we" instead of "the user"), and addressing the "Qualitative signals" in `reference/audit.md` (frictionless claims, narrative idiosyncrasy, episodic grounding, cognitive friction) as real rewrite targets, not just a reasoning note. Paragraph count and order still preserved. |
| `structural_rework` | Structural rework | Everything in Full rewrite, plus willing to add missing paragraph breaks, split or merge paragraphs, reorder sentences within a paragraph, and trim throat-clearing or padding sentences for real conciseness. Still bounded by the no-fabrication rule and voice-profile precedence, same as every other tier. |

The score at each tier is computed from the actual resulting text, the same way every other clearfelt score is, never assigned by which tier ran. On most real documents this scope escalation produces real, substantial score increases tier over tier, since each tier removes strictly more of what the score actually deducts for, but it's an earned consequence of what changed, not a guaranteed number.

These four tiers are the one rewrite-scope system; if you've seen a "no-touch / minimal-touch / transform / aggressive" naming elsewhere (an earlier v0.3 planning document used that language), it describes the same ladder, not a second one: `light_touch` and `balanced` are the minimal-touch end (scored hits only, then the full dictionary, never restructuring), `full_rewrite` is transform, `structural_rework` is the aggressive end. "No-touch" (skip rewriting entirely) already exists too, as declining to run `/clearfelt rewrite` at all, or `risk_tier: sensitive`'s hedge/qualifier protection for the spans it covers, not a fifth tier.

**Resolution order**, checked in Pass 1 before any rewriting happens:

1. `.clearfelt/domain.md`'s `preferred_intensity` field, if present (project-level, shared by everyone on the project).
2. `~/.clearfelt/settings.md`'s `intensity` and `rewrite.ask_intensity`, if present (a user's own global save, see "Saving a preference" below).
3. `clearfelt.config.md`'s shipped default (`rewrite.ask_intensity: true`, meaning: ask).

If nothing resolves to a fixed choice, **ask**: present the to-do preview (the hit list from `scripts/detect.mjs`, following [reference/output-format.md](output-format.md)'s to-do-list template) alongside the four-tier table above, and let the user pick. Then ask a second, separate question: save this choice? No, save it globally, or save it for this project only. Don't save anything without an explicit answer to that second question.

If a preference already resolved, skip the question: show the to-do preview as a brief FYI, state which intensity is running and why (saved preference, and its scope), and proceed without blocking.

## Saving a preference, and surviving a skill update

- **Global** ("every project using this skill install"): writes `intensity` and `rewrite.ask_intensity: false` into `~/.clearfelt/settings.md`, in the user's home directory, creating the file and its `## Rewrite` section if needed. This file is never shipped with the skill and never touched by a `git pull` or reinstall of the skill itself, so a global save survives updates. Do not write a saved preference into `clearfelt.config.md`: that file lives inside the skill's own repo and gets reset by an update.
- **This project only**: writes `preferred_intensity` into `.clearfelt/domain.md` (creating it from `templates/domain.example.md` if it doesn't exist yet). This already lives in the user's project directory, not the skill's repo, so it's safe from updates by construction, same as `.clearfelt/voice-profile.md` always has been.

## Locked spans

Wrap any span in a target file with `<!-- clearfelt-lock -->` and `<!-- /clearfelt-lock -->` on their own lines to keep it exactly as-is through every intensity tier, including `structural_rework`. Narrower than `risk_tier: sensitive`: that protects two whole rule categories (`frictionless_claims`, `weasel_attribution`) project-wide; a locked span protects whatever text you actually wrapped, nothing more, nothing less, and works without declaring the whole project sensitive. Use it for a verbatim quote, a legal boilerplate footer, a pull-quote that has to stay exact, anything where the reason to preserve it is "this specific text," not "this whole document."

A rule hit inside a locked span still counts in `/clearfelt audit`'s score and report exactly as it would anywhere else, locking a span changes what `/clearfelt rewrite` is willing to touch, not what `scripts/detect.mjs` reports or scores. The markers themselves are ordinary HTML comments, invisible in rendered Markdown, and are left in place by `/clearfelt rewrite`, not stripped, so the same region stays protected on the next run too.

## Preservation checking

The no-fabrication rule and locked-span guarantee below are not enforced by prompt instruction alone. Pass 3 of `prompts/audit_loop.xml` writes the current candidate to `.clearfelt/candidate.md` and runs `node scripts/check.mjs --before <path> --after .clearfelt/candidate.md`, which deterministically diffs the source against the candidate: every `<!-- clearfelt-lock -->` span is checked for byte-identical content (a mismatch always blocks the write, see `check.hard_fail_on_locked_span_mismatch` in `clearfelt.config.md`), and a regex-based fingerprint of numbers, dates, proper nouns, and quoted material is compared before and after (a mismatch there warns by default, `check.hard_fail_on_dropped_fact` / `check.hard_fail_on_added_fact` can make it block instead). The fingerprint check is heuristic, not real named-entity recognition, this repo stays dependency-free (`CLAUDE.md`), so it will miss some things and occasionally flag a change that's actually fine; see `docs/decisions/0016-preservation-checker.md` for the specific tradeoffs. A `warn` verdict surfaces in the confirmation view's "Preservation check" section (`reference/output-format.md`) rather than blocking; a `fail` verdict (always locked-span mismatches, optionally fingerprint mismatches if configured) stops the run before the confirmation view is shown at all.

## Risk tier

`.clearfelt/domain.md` can set `risk_tier: sensitive` for a project where a rewrite carries real legal or reputational weight (a shareholder letter, a regulatory filing, anything with safe-harbor language, anything already reviewed by Legal). When set:

- Hedges, qualifiers, and attributions (the `frictionless_claims` and `weasel_attribution` rule categories) are never rewritten away, at any intensity tier, including `structural_rework`. That language is often legally load-bearing in this kind of document, not a stylistic weakness clearfelt should be removing.
- The confirm-before-write gate below is forced on for this project, regardless of `rewrite.require_confirmation` in `clearfelt.config.md` or any saved global preference in `~/.clearfelt/settings.md`.

Default is `standard` (no restriction beyond the normal tier scoping). This is a project-level setting only, same file and precedence as `preferred_intensity`.

## Confirm before writing

`rewrite.require_confirmation` in `clearfelt.config.md` defaults to `true`. This is the safe default and should not be treated as optional in practice, and is a separate, later checkpoint from the intensity question above, not a replacement for it:

1. Present a plain-language verdict and before/after score first, following [reference/output-format.md](output-format.md)'s `/clearfelt rewrite` template: `## Before` and `## After` as separate headed sections (not run into one line), a "What changed, and why" bullet list, not a prose paragraph explaining the diff.
2. If the resulting score would be misleading on its own (for example, a clean pass driven by a narrow rule dictionary rather than an actually-fixed piece), say so as its own bullet under "What changed, and why." Don't let a good number stand in for a read of the actual text.
3. Ask explicitly whether to apply the change to `<path>`. Don't proceed on an ambiguous or ignored response.
4. On approval, write the file, then append one line to `.clearfelt/audit.log` (create it if it doesn't exist yet; it's gitignored the same way as the rest of `.clearfelt/`, machine-written state, not something a human hand-edits): `<ISO timestamp>  <path>  intensity=<tier>  score <before>-><after>  approved=yes`. This is the only durable record that a write happened, a single interactive confirmation doesn't survive past the terminal session on its own. On decline, discard the candidate rewrite, write nothing, and don't log a line either since nothing changed; offer to revise (a different intensity, or targeting specific spans) if the user wants another attempt.
5. If a project has explicitly set `rewrite.require_confirmation: false` (a deliberate opt-out for scripted/batch use, not the shipped default), skip the gate and write directly, still log the line above, and still report the before/after summary afterward.

This mirrors clearfelt's own no-fabrication and no-silent-changes posture: the tool never modifies a user's file, or removes anything, without the user having seen what's about to change and said yes.

## Two hard rules

**No fabrication.** The rewrite never introduces a fact, name, date, statistic, or citation that wasn't already in the source. If a sentence reads as vague or unsupported, tighten the language, don't invent a specific to replace it.

**Voice-profile precedence.** If `.clearfelt/voice-profile.md` exists in the user's project and states a preference (for example, "I like using em-dashes" or a word the base rules would otherwise flag), that preference overrides the shipped rule files for this project. `scripts/detect.mjs` already checks the voice profile before flagging a hit, so a rewritten draft should never fight the user's own stated voice.

## Voice profile

If `.clearfelt/voice-profile.md` doesn't exist yet, mention once, before starting, that `/clearfelt setup` can build a personal one first. If the user would rather proceed anyway, continue with bundled defaults from `templates/voice-profile.example.md`. Don't block the rewrite run on it.
