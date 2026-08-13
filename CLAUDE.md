# Project instructions for Claude

This file orients a Claude Code session working ON clearfelt itself, not a session using clearfelt in some other project. If you're here to use the skill, start at [README.md](README.md) or `SKILL.md` instead.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full file-by-file breakdown: what each top-level file and `scripts/` module is responsible for, and the ADR each design choice traces back to.

## Hard rules for this repo

- **No em-dash characters, anywhere, ever.** This applies to every file in this repo, including this one, code comments, commit messages, and any text a Claude session generates while working here. The project detects and removes this exact habit from other people's writing; it does not get to keep it in its own. Check with `grep -rnP "\x{2014}" .` before committing (U+2014, the em dash's Unicode codepoint, so this rule never has to spell out the character it forbids).
- **No JSON in user-facing rule or config files.** `rules/*.md` and `clearfelt.config.md` stay Markdown so non-technical users can hand-edit them. See [docs/decisions/0002](docs/decisions/0002-markdown-only-data-files.md). The only JSON clearfelt writes is `.claude/settings.local.json` (Claude Code's own hook config format, not ours) and baseline snapshot files under `.clearfelt/`, both of which are machine-written state, not something a human is meant to hand-edit.
- **`scripts/detect.mjs` stays dependency-free.** No `package.json`, no `npm install` step. `git clone` is the entire install.
- **`/clearfelt rewrite` never writes without explicit confirmation, by default.** The tool that removes AI-slop from other people's writing doesn't get to silently overwrite a user's file either. See [docs/decisions/0006](docs/decisions/0006-confirm-before-write.md). The only exception is a project's own explicit `rewrite.require_confirmation: false` in its `clearfelt.config.md`, never a default or an assumption made on the user's behalf.
- **Claude Code only, v1, for anything we build.** No standalone CLI, no npm package, no purpose-built support for other agents, unless that scope decision is revisited explicitly and recorded as a new ADR. This doesn't mean rejecting distribution channels that already exist for free: the repo is installable via `npx skills add` (root-level `SKILL.md` with `name`/`description` is all that requires) because that costs nothing to support, but `scripts/hook.mjs` and `scripts/pin.mjs` still only target Claude Code's actual config format (`.claude/settings.local.json`) and harness directories. On another agent installed via `skills add`, `/clearfelt audit`/`rewrite`/`write`/`setup` still work since they're plain instructions any agent can follow, but hooks and pin do not, and that's fine: don't build agent-specific support for either script without a new ADR.

## Where things are documented

- File-by-file architecture breakdown: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Using the skill: [README.md](README.md)
- Extending the rule dictionary (PRs vs. personal `.local.md` files): [CONTRIBUTING.md](CONTRIBUTING.md)
- Working on the repo itself, testing each script: [docs/DEVELOP.md](docs/DEVELOP.md)
- The writing style the tool enforces: [docs/STYLE.md](docs/STYLE.md)
- Why the repo is shaped the way it is: [docs/decisions/](docs/decisions/)
- Cutting a release: [docs/RELEASE.md](docs/RELEASE.md)
- What the underlying research actually found: [docs/RESEARCH.md](docs/RESEARCH.md)
- The bibliography every rule's `source:` key resolves against: [docs/SOURCES.md](docs/SOURCES.md)
