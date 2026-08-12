# clearfelt

Strip clinical AI writing patterns out of text and rewrite it with human warmth, backed by a real, runnable score instead of an LLM's opinion of itself.

## Why

Most anti-AI-slop tools work the same way: a big prompt tells the model what to avoid, and you trust the rewrite. clearfelt is deterministic and scored instead. `scripts/detect.mjs` parses the Markdown rule files in this repo and computes a 0 to 100 Empathy Index in code, so the number is reproducible by anyone who runs the script, on any file, at any time, not just something an LLM estimated while reading your text.

## Quick start

```bash
git clone <this-repo> ~/.claude/skills/clearfelt
```

That's the whole install. `scripts/detect.mjs` has zero external dependencies, only Node's standard library, so nothing else to `npm install`.

Then, in Claude Code, in any project:

```
/clearfelt audit path/to/draft.md
```

You'll get a score and a list of hits with line numbers. Nothing gets edited. When you're ready to fix it:

```
/clearfelt humanize path/to/draft.md
```

`/clearfelt setup` is optional, not required for either of the above. It builds a personal voice profile so future runs preserve your own quirks instead of a generic default.

## Before and after

**Before** (Empathy Index: 41)

> In today's fast-paced digital world, it is important to note that AI is transforming every industry. It's not a tool. It's a revolution. Experts agree that companies must delve into this technology to unlock seamless growth. The future isn't coming. It's already here.

**After** (Empathy Index: 92)

> AI is already changing how most industries work, and that's not really in dispute anymore. What's less obvious is how fast companies actually need to move on it. We've seen teams get real traction just by picking one workflow and testing it for a month. That's usually enough to know if it's worth the bigger commitment.

**Before** (Empathy Index: 55)

> Our platform offers a seamless, robust solution that delivers pivotal insights. Studies show that businesses leveraging our tools see paramount improvements. In conclusion, this is a game-changer for your organization.

**After** (Empathy Index: 88)

> Our platform gives you insights you can actually act on, without the setup headache most tools come with. Teams using it tend to see real gains fast. If your org is stuck deciding, this is probably the push you need.

## Usage

| Command | Does |
|---|---|
| `/clearfelt audit [path]` | Scores a file or directory, reports every hit, never edits anything. |
| `/clearfelt humanize [path]` | Rewrites the file, looping the scrub and re-score steps until it clears the threshold (default 85) or hits the iteration cap (default 3). |
| `/clearfelt setup` | Builds or updates a personal voice profile. Optional, re-runnable any time. |
| `$clearfelt hooks <status\|on\|off\|ignore-rule\|ignore-file\|reset>` | Manages an auto-audit hook that scores text files after you edit them. |
| `node scripts/pin.mjs <pin\|unpin> <audit\|humanize\|setup>` | Creates or removes a `$clearfelt-<command>` shortcut skill. |

By default, `/clearfelt humanize` is conservative: it only touches spans that were actually flagged, and keeps your paragraph structure intact. Set `intensity: aggressive` in `clearfelt.config.md` if you want it to restructure sentences more freely.

## Using it on content pipelines

If you're running clearfelt repeatedly over a growing set of drafts (a content calendar, a blog backlog, a batch of LinkedIn posts), save a baseline after your first pass and diff against it later so you only see new slop, not the same old hits every time:

```bash
node scripts/detect.mjs --mode report drafts/ --save-baseline .clearfelt/baseline.json
# ...later, after adding more drafts...
node scripts/detect.mjs --mode report drafts/ --baseline .clearfelt/baseline.json
```

## Customization

Every file you're meant to hand-edit is plain Markdown. No JSON, no code syntax to break.

- **Add or remove a banned word:** open the relevant file under `rules/banned_words/`, or copy `rules/banned_words.local.example.md` to `banned_words.local.md` in the same folder for a personal-only addition that never touches the shared files.
- **Add a banned phrase or pattern:** same idea, under `rules/antipatterns/`, with `rules/antipatterns.local.example.md` as the personal-only template.
- **Change scoring behavior:** every threshold, weight, and setting lives in one table-based file, `clearfelt.config.md`.
- **Set your own voice:** run `/clearfelt setup`, or hand-edit `.clearfelt/voice-profile.md` directly using `templates/voice-profile.example.md` as a guide. A preference stated there always overrides the shipped banlist.

## Architecture

```
SKILL.md              thin router: commands table, routing rules
reference/*.md         full behavior for each command, loaded on demand
scripts/detect.mjs     the actual scoring engine, zero dependencies
scripts/hook.mjs       auto-audit hook admin and runtime body
scripts/pin.mjs        $clearfelt-<command> shortcut creation
rules/antipatterns/     phrase and structural patterns, one file per category
rules/banned_words/     single words and short phrases, tiered
clearfelt.config.md    every tunable, one Markdown table
prompts/audit_loop.xml  the 3-pass rewrite pipeline for /clearfelt humanize
templates/              bundled voice-profile defaults
```

`prompts/audit_loop.xml` is the one file in this repo that isn't Markdown. It's the literal prompt text fed to Claude to run the rewrite loop, not something you're meant to hand-edit day to day, and XML tags are Anthropic's own recommended way to structure a multi-step prompt reliably. Everything you'd actually customize lives in the Markdown files above it.

The router pattern (a thin `SKILL.md` pointing to `reference/*.md`, plus a hooks and pin layer) is adapted from a design already running in production elsewhere, applied here to keep this skill's own context footprint small.

Working on clearfelt itself, rather than using it: see [docs/DEVELOP.md](docs/DEVELOP.md). The writing style it enforces, as a standalone reference: [docs/STYLE.md](docs/STYLE.md). Why the repo is shaped the way it is: [docs/decisions/](docs/decisions/). Cutting a release: [docs/RELEASE.md](docs/RELEASE.md).

## Evidence base

Every rule in `rules/` carries a `source:` field. Run `/clearfelt audit` and the score report includes a source key for each hit; look it up in [docs/SOURCES.md](docs/SOURCES.md) for the actual paper, institutional report, or community tool it came from. [docs/RESEARCH.md](docs/RESEARCH.md) has the condensed synthesis of what the underlying research actually found. Nothing is cited without a checkable trail: claims that came up in research but couldn't be traced to a real paper are labeled `unresolved-*` rather than given a made-up citation. If you've seen a pattern repeatedly and it isn't here yet, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

Built by [Andrei Nita](https://andreinita.co/). [LinkedIn](https://www.linkedin.com/in/nitaionutandrei/).

## License

MIT. See [LICENSE](LICENSE).

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Current version: 0.1.0.
