# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-13

Prompted by evaluating clearfelt as an editor at a tech magazine would: four scale/trust gaps addressed, plus a README repositioning to match. All additive and backward compatible; existing projects with no `.clearfelt/` files behave exactly as before.

### Added (this round: multi-persona critique converted to fixes)

- **Automated test suite.** `tests/detect.test.mjs` (Node's built-in test runner, `node --test`, no new dependency) runs `scripts/detect.mjs` as a real subprocess against fixtures in `tests/fixtures/`, including a regression test for the round-9 category-severity-weight bug. Prompted by an engineering audit finding zero tests anywhere in the repo for a tool whose entire claim is deterministic reproducibility.
- **A lightweight eval set.** `tests/fixtures/eval/` (10 labeled fixtures) plus `scripts/eval.mjs` reports how many land within their expected score band. Not full validation, an honest first check. Current result, kept rather than tuned away: 5/10, all five AI-heavy fixtures score higher than expected because short, single-occurrence slop words get suppressed by tier-2/tier-3 thresholds, a real, disclosed detection-recall gap.
- **`risk_tier` field in `.clearfelt/domain.md`.** `standard` (default) or `sensitive`. When `sensitive`, `/clearfelt humanize` never rewrites away hedges, qualifiers, or attributions (`frictionless_claims`, `weasel_attribution`), and the confirm-before-write gate is forced on regardless of other settings. See `docs/decisions/0010-risk-tier-and-test-suite.md`.
- **`.clearfelt/audit.log`.** `/clearfelt humanize` now appends a line (timestamp, path, intensity, score delta, approval) on every write, the first durable record of a humanize run; previously nothing survived past the terminal session that approved it.
- `docs/decisions/0010`: new ADR covering all of the above.

- **Output readability: sorted, grouped, and hierarchical instead of a flat unsorted dump.** Prompted by a readability critique of the output itself. `scripts/detect.mjs`'s report mode now returns `leadDriver` (one-line "what actually drove this score"), `breakdown.impacts` (every nonzero scoring factor, normalized to one consistent sign convention, sorted by magnitude), `categoryPoints` (severity-weighted point subtotal per category, sorted descending, not just a raw hit count that treats one severity-8 hit the same as one severity-1 hit), and `patternSummary` (repeated hits of the same pattern collapsed into one row with an occurrence count and line list, instead of one row per occurrence). `reference/output-format.md`'s `/clearfelt audit` and `/clearfelt humanize` templates rewritten to present these pre-sorted tables in order, rather than re-sorting or explaining the score in prose.
- **`deduction_cap` and a rescale of every statistical signal weight.** Measured across 17 real documents scored this session, rule-hit deduction (unbounded) spanned 0-86 while every statistical signal combined (bounded by its own formula) never exceeded about 5 points, meaning past roughly 2 rule hits the statistical signals were mathematically incapable of affecting the score at all. New `deduction_cap` setting (default 65) in `clearfelt.config.md` clamps deduction's effect on the score without hiding the raw number (`breakdown.deduction` stays the true sum; `breakdown.deductionApplied` is the capped value actually used; `breakdown.deductionCapped` flags the divergence, and the top `impacts` row's label discloses it directly, e.g. "capped from 119"). `burstiness_weight` (10 to 12), `vocabulary_diversity_weight` (5 to 17), `repetition_weight` (5 to 27), and `paragraph_variety_weight` (8 to 12) were rescaled using the observed-range data, not round-number guesses. See `docs/decisions/0011-deduction-cap-and-signal-rebalance.md`, including why a fourth option (rescaling everything to percentile bands against the eval corpus) was considered and explicitly deferred rather than folded in, the eval corpus is too small (10 fixtures) for percentile ranking to mean anything yet.
- **Release checklist now requires a README/doc sync, not just a version bump.** `docs/RELEASE.md`'s Steps gained an explicit step covering "Major features," the "Before and after" example scores (which are real, computed numbers and had drifted out of date after the deduction-cap rebalance above), the Usage table, the Architecture diagram, and Customization, plus a note to check `SKILL.md`'s "Configuration" line and `CLAUDE.md`'s architecture notes for the same drift. Found because README.md was, in fact, out of sync: missing `risk_tier`, `.clearfelt/audit.log`, the test suite, the eval set, and the sorted-output work above entirely, and its two worked examples displayed scores (41, 92, 55, 88) that no longer matched what `scripts/detect.mjs` actually returns for that exact text (56, 100, 83, 100) after this session's scoring changes. README, `SKILL.md`, and `CLAUDE.md` all updated to match current behavior.

### Fixed

- `docs/SOURCES.md`: `wikipedia-ai-signs` was listed under "Academic and institutional sources" alongside peer-reviewed journal articles; it's a crowd-maintained essay, moved to "Community prior art" where it belongs, matching the file's own stated two-tier distinction.

### Known regression, disclosed rather than tuned away

- Raising `vocabulary_diversity_weight` as part of the ADR 0011 rebalance made `scripts/eval.mjs`'s existing AI-heavy misses score even further from their expected band (78 up to 83, 78 up to 83, 94 up to 99, 88 up to 93, 87 up to 91; pass rate stays 5/10). Type-token ratio correlates with document length, not AI-ness, so short single-paragraph AI samples (the same known weak spot from ADR 0010) get a larger undeserved bonus under the new weight. Left as-is and reported honestly rather than adjusted to pass; a real fix likely needs a length-normalized vocabulary-diversity formula or the deferred percentile-rescaling approach once the eval corpus grows.

### Changed

- `clearfelt.config.md` and `README.md`: readability defaults (`target_grade_level_min/max`, 6-12) now state plainly they're US-school-grade, English-language calibrated, not validated for other languages or specialist audiences.
- `docs/DEVELOP.md`: new "Running the automated test suite" section; "Testing a rule change" now points at adding a fixture/test case for anything significant instead of eyeballing a one-off manual run only.

### Added

- **Confirm-before-write.** `/clearfelt humanize` now runs its rewrite loop in memory, shows a before/after with the score delta, and requires explicit approval before writing the file. New `humanize.require_confirmation` setting in `clearfelt.config.md`, default `true`. See `docs/decisions/0006-confirm-before-write.md`.
- **Multi-voice profiles.** New `voice.mode` setting in `clearfelt.config.md` (`single` default, or `multi`). In multi mode, voices live in `.clearfelt/voices/<name>.md`, selected with `scripts/detect.mjs --voice <name>`. `/clearfelt setup` now branches on this. See `docs/decisions/0007-multi-voice-and-domain-profiles.md`.
- **Domain profiles.** New `.clearfelt/domain.md` (template: `templates/domain.example.md`), project-scoped and shared by every writer, holding domain-specific terms exempt from flagging and an optional target reading-level range. Built via `/clearfelt setup`'s new domain section. `scripts/detect.mjs` gained `loadDomainOverrides`, merged into the same override set as voice-profile precedence.
- **Readability metrics.** `scripts/detect.mjs` gained `computeReadability`: Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog Index, and two processing-fluency signals (passive-voice density, nominalization density). Reported separately from the Empathy Index, never blended into it. New `target_grade_level_min`/`max` settings in `clearfelt.config.md`, overridable by `.clearfelt/domain.md`. Five citations added to `docs/SOURCES.md` (`flesch-1948`, `kincaid-1975`, `gunning-1952`, `oppenheimer-2006`, `alter-oppenheimer-2009`), each independently verified for a real, resolvable URL. See `docs/decisions/0008-readability-metrics.md`, including why Kahneman's System 1/2 thinking was considered and rejected as a citation (a psychological theory with no computable formula).
- `docs/decisions/0006`, `0007`, `0008`: three new ADRs.
- **Output format contract.** New `reference/output-format.md`: tables and bullets, not prose paragraphs, for both `/clearfelt audit` and `/clearfelt humanize`, and an explicit ban on em-dashes and arrow characters (`→`, `->`) as connective-prose substitutes in anything the skill presents to the user, not just in the repo's own files. `SKILL.md`, `reference/audit.md`, and `reference/humanize.md` now point to it. Prompted by dogfooding: an end-to-end test run produced a dense, arrow-heavy response that repeated the exact habit this tool exists to remove.
- **Closed a gap in the research pass.** `docs/RESEARCH.md` gained a "Human situatedness" section and `reference/audit.md`'s "Qualitative signals" gained three items (narrative idiosyncrasy, episodic grounding, cognitive friction), operationalizing findings the original research synthesis flagged as underweighted (`research-synthesis-2026`) but that were never turned into guidance clearfelt's Pass 1 actually applies. Two related items (emotional qualia, pragmatic relevance) were considered and explicitly left out as too subjective to check without drifting into vibes-checking; behavioral production signals (keystroke timing, revision patterns) are documented as structurally out of scope for a tool that only sees finished text.
- **Four-tier intensity ladder, asked upfront.** `intensity` replaces `conservative`/`aggressive` with `light_touch`, `balanced`, `full_rewrite`, `structural_rework` (breaking rename, see Fixed below for the compatibility note). `prompts/audit_loop.xml`'s Pass 1 now runs the `detect.mjs` scan before any rewriting, builds a to-do preview, and asks which tier to use (with a save prompt) instead of reading `intensity` silently. See `docs/decisions/0009-intensity-ladder-and-saved-preference.md`.
- **`~/.clearfelt/settings.md`: a global settings file that survives skill updates.** New precedence layer in `scripts/detect.mjs`'s `loadConfig()` (highest priority, above the shipped `clearfelt.config.md`), resolved via `os.homedir()`, modeled directly on `impeccable`'s home-directory settings pattern (verified by inspection, not assumed). This is the real fix for "where does a saved global preference go so it isn't wiped on the next update," and it retroactively corrects round 9's `voice.mode` save instructions, which previously pointed at `clearfelt.config.md`, a file inside the skill's own tracked repo that gets reset on every update. `.clearfelt/domain.md` gained a `preferred_intensity` field for the project-scoped alternative (already update-safe, no fix needed there).

### Changed

- **README repositioned.** New tagline framing clearfelt as a deterministic editorial toolkit rather than only an AI-slop remover, plus a new "Major features" section summarizing the whole repo in a scannable list. Usage, Customization, and Architecture sections updated for multi-voice, domain profiles, and the confirm-before-write gate.
- `clearfelt.config.md` gained `## Humanize`, `## Voice`, and `## Readability` sections.
- `CONTRIBUTING.md`: noted that voice and domain profiles are project-scoped, not shared rule files, no `source:` field required.
- `docs/STYLE.md`: noted readability is tracked separately from AI-tell scoring.

### Fixed

- `loadConfig()` never parsed `clearfelt.config.md`'s "Category severity weights" section, and `computeScore` looked up weights under a `weight_<category>` key that was never populated. Every category silently scored at a 1.0 multiplier regardless of what the config file said, since the skill's original bootstrap. Both are fixed: the section is now parsed, and `computeScore` reads weights by category name directly. Anyone who had customized a category weight will see their score change to reflect the setting they actually configured.
- **Single-word lexicon matching was exact-literal-form only.** A rule for "leverage" never caught "leveraging"; "seamless" never caught "seamlessly"; "synergy" never caught "synergies." Found via dogfooding: a real test document scored 100/100 at every humanize intensity while still containing four unflagged, unmistakably AI-sounding words. `scripts/detect.mjs` gained `inflectionPattern()`, a heuristic (not real stemming) covering silent-e drop before `-ing`/`-ed`, the common `-s`/`-es`/`-ed`/`-ing`/`-ly` suffix set, and consonant+y pluralization (`synergy` becomes `synergies`). Applies only to single-word rules; multi-word phrases are unaffected. Scores will drop for any text that was previously under-flagged because of this gap, this is a correctness fix, not a new false-positive source.
- Added `synergy`, `synergistic`, `paradigm shift`, and `paradigm-shattering` to `rules/banned_words/puffery_lexicon.md` (`source: clearfelt-heuristic`), the two lexicon words the dogfooding test surfaced as missing entirely.

**Breaking:** `intensity`'s valid values changed from `conservative`/`aggressive` to `light_touch`/`balanced`/`full_rewrite`/`structural_rework`, called out explicitly per `docs/RELEASE.md`'s rule on config setting-name changes. Anyone who had `intensity: conservative` or `intensity: aggressive` set in `clearfelt.config.md` or `~/.clearfelt/settings.md` needs to update it to the new slug (`conservative` maps to `light_touch`, `aggressive` maps to `full_rewrite`).

- **Tiers redesigned so each one touches a genuinely larger scope, not just polishes harder.** Found via testing: `balanced`, `full_rewrite`, and `structural_rework` all scored identically on a real document because none of them were scoped to touch words tier-suppression had hidden from the scored report, only the same 4 flagged spans plus rhythm. `scripts/detect.mjs --mode scan <path>` is new: it returns every rule-dictionary occurrence with tier-suppression bypassed (tiering protects the *score* from single-legitimate-use false positives, it was never meant to protect what `/clearfelt humanize` is allowed to edit). `balanced` and above now use it. Result on the test document: `light_touch` (42) to `balanced` (99) is now a real, earned 57-point jump instead of a tie. `full_rewrite` and `structural_rework` still land close to `balanced` once there's nothing left to deduct for, that's an honest consequence of the remaining differentiator being fine statistical polish, not a bug. See `reference/humanize.md`'s "Choosing an intensity" for the full per-tier scope.
- **Two new scoring signals: paragraph-length variety and a wall-of-text penalty.** Every existing statistical signal (burstiness, vocabulary diversity, trigram repetition) operates on a flattened sentence/word stream and was completely blind to paragraph structure, found when a `structural_rework` pass that only changed paragraph boundaries moved the score by exactly zero. New `paragraphStructureScore()` (same coefficient-of-variation approach as burstiness, one level up, Markdown headers excluded from the count) and a flat `wall_of_text_penalty` for a long document crammed into a single paragraph. New `clearfelt.config.md` rows: `paragraph_variety_weight` (8), `wall_of_text_penalty` (15), `wall_of_text_sentence_threshold` (5).
- **Score breakdown surfaced in the actual output, not just the JSON.** `scripts/detect.mjs` was already computing and returning every component of the final score (rule-hit deduction, burstiness, vocabulary diversity, trigram repetition, paragraph variety, wall-of-text penalty) in its `breakdown` object, but `/clearfelt audit` and `/clearfelt humanize` never showed it, only the single final number. Two files landing on the same score looked like a bug with no way to tell why from the response alone. New "Score breakdown" table in both templates in `reference/output-format.md` (`/clearfelt audit` shows one; `/clearfelt humanize` shows a before/after pair), always shown, not just on request.

## [0.1.2] - 2026-08-12

### Added

- `rules/banned_words/vague_abstraction_lexicon.md`: abstract summary words (significant, impactful, a number of) that substitute for a concrete detail, a distinct failure mode from the AI-frequency lexicon and marketing puffery.
- `rules/antipatterns/frictionless_claims.md`: phrase patterns for prose that describes a result as costless, no admitted risk or contested choice behind it.
- A "more than two bold, italic, or code spans in a single sentence" bullet in `rules/antipatterns/formatting_tells.md`.
- A "Qualitative signals" section in `reference/audit.md` documenting the non-regex-able version of the frictionless-claims check as a `/clearfelt humanize` reasoning step, explicitly not part of the deterministic score.
- Inline flagged/passes example pairs for every category in `docs/STYLE.md`'s "What gets flagged" section.

### Changed

- `clearfelt.config.md`'s category weight table gained rows for the two new categories.
- Reordered the recommended command sequence to setup, audit, humanize everywhere it's presented (`SKILL.md`'s frontmatter, Commands table, and first-use routing note; `README.md`'s Quick start and Usage table; `reference/humanize.md`'s voice-profile nudge). `/clearfelt setup` is now suggested before the other two commands run, not after.

## [0.1.1] - 2026-08-12

### Added

- `docs/SOURCES.md`: bibliography for the rule dictionary, in three tiers: academic and institutional sources with real URLs, community prior-art tools credited by name, and an honest "referenced but unresolved" table for claims that came up in research but couldn't be traced to an actual paper.
- `docs/RESEARCH.md`: condensed synthesis of the human-vs-AI-text research behind the rule dictionary.
- `docs/decisions/0005-sourced-rules.md`: the ADR for requiring a disclosed source on every rule.
- `docs/DEVELOP.md`, `docs/STYLE.md`, `docs/RELEASE.md`, and `CLAUDE.md`: development, style, release-process, and Claude-session-orientation docs.
- Five research-sourced lexicon entries: `camaraderie`, `palpable`, `intricate`, `furthermore`, `leverage`.

### Changed

- Every bullet in `rules/antipatterns/*.md` and `rules/banned_words/*.md` now carries a `source:` field resolved against `docs/SOURCES.md`. `rules/*.local.example.md` templates document the field for personal overrides (optional there).
- `scripts/detect.mjs` passes the `source` field through into every hit in `--mode report` output.
- `CONTRIBUTING.md` now requires a real `source:` key on any new shared rule, with `clearfelt-heuristic` and `unresolved-*` as the honest fallbacks instead of a fabricated citation.
- README's "Evidence base" section points at the actual bibliography instead of making an unlinked claim.
- LICENSE and README author attribution corrected.

## [0.1.0] - 2026-08-12

### Added

- `/clearfelt audit`, `/clearfelt humanize`, and `/clearfelt setup` commands, routed through a thin `SKILL.md` to per-command `reference/*.md` files.
- `scripts/detect.mjs`: a zero-dependency Node script that parses the Markdown rule files and computes the Empathy Index in code, including sentence-length variance, vocabulary diversity, trigram repetition, tiered banned-word matching, fenced-code and quote exclusion, and baseline/regression diffing.
- Eight rule files split one per category under `rules/antipatterns/` and `rules/banned_words/`, plus gitignored local-override templates so personal additions never touch the shared files.
- `clearfelt.config.md`: every tunable (score threshold, iteration cap, intensity, severity weights, tier thresholds, hook settings) in one plain Markdown table.
- `prompts/audit_loop.xml`: the 3-pass rewrite pipeline (extract and calibrate, scrub slop, warmth evaluation) driving `/clearfelt humanize`.
- No-fabrication and voice-profile-precedence rules for the rewrite pass.
- `.clearfelt/voice-profile.md` per-project voice profile, built and updated via `/clearfelt setup`.
- `scripts/hook.mjs`: an auto-audit hook that scores edited text files after Edit/Write/MultiEdit, managed via `$clearfelt hooks`.
- `scripts/pin.mjs`: `$clearfelt-<command>` shortcut skills.
- All user-facing data and config files are Markdown, no JSON, so non-technical users can customize the banlist and voice without touching syntax that can break.
