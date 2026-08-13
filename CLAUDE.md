# Project instructions for Claude

This file orients a Claude Code session working ON clearfelt itself, not a session using clearfelt in some other project. If you're here to use the skill, start at [README.md](README.md) or `SKILL.md` instead.

## Architecture

One user-invocable skill, `clearfelt`, with four commands underneath it (`audit`, `rewrite`, `explain`, `setup`), routed through `SKILL.md`. See `SKILL.md`'s Commands table and `reference/*.md` for the full behavior of each command. Full design rationale: [docs/decisions/](docs/decisions/).

- `SKILL.md`: thin router only. Frontmatter, one-paragraph pitch, Commands table, routing rules. Do not add full command walkthroughs here; they belong in `reference/*.md`.
- `writing.md`: the editorial doctrine behind every rule and rewrite decision, what clearfelt considers bad writing, what it always preserves, when it refuses to rewrite. System-level, not user-specific; see [docs/decisions/0013](docs/decisions/0013-writing-and-voice-doctrine.md). A rule or a `prompts/audit_loop.xml` instruction that contradicts this file is a bug in one of the two.
- `voice.md`: doctrine about the voice-profile *system* (precedence, what it will and won't override), not a data file. An individual's actual preferences live in `.clearfelt/voice-profile.md` (or `.clearfelt/voices/<name>.md`), never in this file.
- `reference/audit.md`, `reference/rewrite.md`, `reference/explain.md`, `reference/setup.md`, `reference/hooks.md`: full behavior per command, loaded on demand.
- `scripts/detect.mjs`: thin CLI entrypoint (arg parsing, mode dispatch) over `scripts/lib/`. Zero external dependencies, Node stdlib only, on purpose (see [docs/decisions/0001](docs/decisions/0001-deterministic-scored-detection.md)). Never add an npm dependency anywhere under `scripts/`.
- `scripts/lib/config.mjs`, `scripts/lib/rules.mjs`, `scripts/lib/score.mjs`, `scripts/lib/report.mjs`: the actual scoring engine, split by responsibility (config precedence and voice/domain overrides; rule-dictionary parsing and matching; statistical signals, readability, and the score formula; pattern/category summaries and the single-file orchestration `runFile` that ties the others together). `scripts/detect.mjs`, `scripts/check.mjs`, and `scripts/explain.mjs` all import from here rather than duplicating any of this logic.
- `scripts/hook.mjs`, `scripts/pin.mjs`: hook admin/runtime and shortcut-skill creation, adapted from the `impeccable` skill's equivalent scripts.
- `scripts/check.mjs`: preservation checker, deterministically diffs a source file against a rewrite candidate for locked-span and factual-fingerprint mismatches, run by `/clearfelt rewrite`'s pipeline before the confirmation view. See [docs/decisions/0016](docs/decisions/0016-preservation-checker.md).
- `scripts/explain.mjs`: read-only, prints every currently-resolved config setting with its provenance (default/shipped/global), plus voice/domain/hook state, powering `/clearfelt explain`.
- `scripts/eval.mjs`: lightweight sanity check of the scoring weights against the labeled fixtures in `tests/fixtures/eval/`, not full validation, see [docs/decisions/0011](docs/decisions/0011-deduction-cap-and-signal-rebalance.md).
- `scripts/lint.mjs`: repo-consistency checks (frontmatter, XML tag balance, rule-source completeness, config-to-code drift, em-dash prohibition repo-wide). Zero dependencies, same rule as `detect.mjs`. Run before any PR, see [docs/DEVELOP.md](docs/DEVELOP.md).
- `tests/`: `node --test` regression suite for `scripts/detect.mjs`, run as a real subprocess against `tests/fixtures/`. Run this, `node scripts/eval.mjs`, and `node scripts/lint.mjs` before any PR that touches scoring, config, or rule files, see [docs/DEVELOP.md](docs/DEVELOP.md).
- `rules/antipatterns/*.md`, `rules/banned_words/*.md`: the rule dictionary, one small file per category. `rules/*.local.example.md`: templates for personal, gitignored overrides. Every bullet in the shared files carries a `source:` key resolved in `docs/SOURCES.md` (see [docs/decisions/0005](docs/decisions/0005-sourced-rules.md)). Never add a shared rule without one.
- `clearfelt.config.md`: every tunable, one Markdown file. Never introduce a second place to configure the same setting. This is skill-level (shared across every project using a given install), not per-project; project-level customization happens through the `.clearfelt/` files below, not by adding a second config file.
- `prompts/audit_loop.xml`: the 3-pass rewrite pipeline. The one non-Markdown file in the repo, deliberately (see [docs/decisions/0003](docs/decisions/0003-xml-pipeline-format.md)).
- `.clearfelt/voice-profile.md` (or `.clearfelt/voices/<name>.md` in multi-voice mode), `.clearfelt/domain.md`: project-scoped, gitignored override files, consulted by `scripts/detect.mjs` before flagging a hit (see [docs/decisions/0004](docs/decisions/0004-no-fabrication-and-voice-precedence.md) and [docs/decisions/0007](docs/decisions/0007-multi-voice-and-domain-profiles.md)). Templates: `templates/voice-profile.example.md`, `templates/domain.example.md`. `domain.md`'s `risk_tier: sensitive` forces the confirm-before-write gate on and stops `/clearfelt rewrite` from rewriting away hedges/qualifiers, regardless of other settings, see [docs/decisions/0010](docs/decisions/0010-risk-tier-and-test-suite.md).
- `.clearfelt/audit.log`: gitignored, machine-appended record of every `/clearfelt rewrite` write (timestamp, path, intensity, score delta, approval). The only durable record that a write happened; a single interactive confirmation doesn't survive past the terminal session on its own.

## Hard rules for this repo

- **No em-dash characters, anywhere, ever.** This applies to every file in this repo, including this one, code comments, commit messages, and any text a Claude session generates while working here. The project detects and removes this exact habit from other people's writing; it does not get to keep it in its own. Check with `grep -rn "—" .` before committing.
- **No JSON in user-facing rule or config files.** `rules/*.md` and `clearfelt.config.md` stay Markdown so non-technical users can hand-edit them. See [docs/decisions/0002](docs/decisions/0002-markdown-only-data-files.md). The only JSON clearfelt writes is `.claude/settings.local.json` (Claude Code's own hook config format, not ours) and baseline snapshot files under `.clearfelt/`, both of which are machine-written state, not something a human is meant to hand-edit.
- **`scripts/detect.mjs` stays dependency-free.** No `package.json`, no `npm install` step. `git clone` is the entire install.
- **`/clearfelt rewrite` never writes without explicit confirmation, by default.** The tool that removes AI-slop from other people's writing doesn't get to silently overwrite a user's file either. See [docs/decisions/0006](docs/decisions/0006-confirm-before-write.md). The only exception is a project's own explicit `rewrite.require_confirmation: false` in its `clearfelt.config.md`, never a default or an assumption made on the user's behalf.
- **Claude Code only, v1, for anything we build.** No standalone CLI, no npm package, no purpose-built support for other agents, unless that scope decision is revisited explicitly and recorded as a new ADR. This doesn't mean rejecting distribution channels that already exist for free: the repo is installable via `npx skills add` (root-level `SKILL.md` with `name`/`description` is all that requires) because that costs nothing to support, but `scripts/hook.mjs` and `scripts/pin.mjs` still only target Claude Code's actual config format (`.claude/settings.local.json`) and harness directories. On another agent installed via `skills add`, `/clearfelt audit`/`rewrite`/`setup` still work since they're plain instructions any agent can follow, but hooks and pin do not, and that's fine: don't build agent-specific support for either script without a new ADR.

## Where things are documented

- Using the skill: [README.md](README.md)
- Extending the rule dictionary (PRs vs. personal `.local.md` files): [CONTRIBUTING.md](CONTRIBUTING.md)
- Working on the repo itself, testing each script: [docs/DEVELOP.md](docs/DEVELOP.md)
- The writing style the tool enforces: [docs/STYLE.md](docs/STYLE.md)
- Why the repo is shaped the way it is: [docs/decisions/](docs/decisions/)
- Cutting a release: [docs/RELEASE.md](docs/RELEASE.md)
- What the underlying research actually found: [docs/RESEARCH.md](docs/RESEARCH.md)
- The bibliography every rule's `source:` key resolves against: [docs/SOURCES.md](docs/SOURCES.md)
