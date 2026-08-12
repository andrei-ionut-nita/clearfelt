# Project instructions for Claude

This file orients a Claude Code session working ON clearfelt itself, not a session using clearfelt in some other project. If you're here to use the skill, start at [README.md](README.md) or `SKILL.md` instead.

## Architecture

One user-invocable skill, `clearfelt`, with three commands underneath it (`audit`, `humanize`, `setup`), routed through `SKILL.md`. See `SKILL.md`'s Commands table and `reference/*.md` for the full behavior of each command. Full design rationale: [docs/decisions/](docs/decisions/).

- `SKILL.md`: thin router only. Frontmatter, one-paragraph pitch, Commands table, routing rules. Do not add full command walkthroughs here; they belong in `reference/*.md`.
- `reference/audit.md`, `reference/humanize.md`, `reference/setup.md`, `reference/hooks.md`: full behavior per command, loaded on demand.
- `scripts/detect.mjs`: the actual scoring engine. Zero external dependencies, Node stdlib only, on purpose (see [docs/decisions/0001](docs/decisions/0001-deterministic-scored-detection.md)). Never add an npm dependency to this script.
- `scripts/hook.mjs`, `scripts/pin.mjs`: hook admin/runtime and shortcut-skill creation, adapted from the `impeccable` skill's equivalent scripts.
- `rules/antipatterns/*.md`, `rules/banned_words/*.md`: the rule dictionary, one small file per category. `rules/*.local.example.md`: templates for personal, gitignored overrides.
- `clearfelt.config.md`: every tunable, one Markdown file. Never introduce a second place to configure the same setting.
- `prompts/audit_loop.xml`: the 3-pass rewrite pipeline. The one non-Markdown file in the repo, deliberately (see [docs/decisions/0003](docs/decisions/0003-xml-pipeline-format.md)).

## Hard rules for this repo

- **No em-dash characters, anywhere, ever.** This applies to every file in this repo, including this one, code comments, commit messages, and any text a Claude session generates while working here. The project detects and removes this exact habit from other people's writing; it does not get to keep it in its own. Check with `grep -rn "—" .` before committing.
- **No JSON in user-facing rule or config files.** `rules/*.md` and `clearfelt.config.md` stay Markdown so non-technical users can hand-edit them. See [docs/decisions/0002](docs/decisions/0002-markdown-only-data-files.md). The only JSON clearfelt writes is `.claude/settings.local.json` (Claude Code's own hook config format, not ours) and baseline snapshot files under `.clearfelt/`, both of which are machine-written state, not something a human is meant to hand-edit.
- **`scripts/detect.mjs` stays dependency-free.** No `package.json`, no `npm install` step. `git clone` is the entire install.
- **Claude Code only, v1.** No standalone CLI, no npm package, no other harness support, unless that scope decision is revisited explicitly and recorded as a new ADR.

## Where things are documented

- Using the skill: [README.md](README.md)
- Extending the rule dictionary (PRs vs. personal `.local.md` files): [CONTRIBUTING.md](CONTRIBUTING.md)
- Working on the repo itself, testing each script: [docs/DEVELOP.md](docs/DEVELOP.md)
- The writing style the tool enforces: [docs/STYLE.md](docs/STYLE.md)
- Why the repo is shaped the way it is: [docs/decisions/](docs/decisions/)
- Cutting a release: [docs/RELEASE.md](docs/RELEASE.md)
