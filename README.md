# clearfelt

A deterministic editorial toolkit for Claude Code: strip AI-sounding writing, keep every writer's voice consistent, catch what doesn't read at the right level, all backed by a real, sourced, runnable score instead of an LLM's opinion of itself.

## Why

Most anti-AI-slop tools work the same way: a big prompt tells the model what to avoid, and you trust the rewrite. clearfelt is deterministic and scored instead. `scripts/detect.mjs` parses the Markdown rule files in this repo and computes a 0 to 100 Human Score in code, so the number is reproducible by anyone who runs the script, on any file, at any time, not just something an LLM estimated while reading your text.

## Major features

- **Deterministic Human Score.** `scripts/detect.mjs` computes the score in code, reproducible by anyone, not estimated by an LLM.
- **Sourced rule dictionary.** Every rule cites real research ([docs/SOURCES.md](docs/SOURCES.md)) or named prior art, nothing asserted without a disclosed origin. A handful of words carry an honestly-labeled `unresolved-*` source, a citation nobody could verify, and stay off by default rather than counting against your score; see `rules.include_unresolved` in `clearfelt.config.md`.
- **Confirms before it writes anything.** `/clearfelt rewrite` shows a before/after and asks, it never silently overwrites your file.
- **Multi-voice for teams.** One shared voice by default, or a separate profile per writer.
- **Domain-aware, no false positives on real jargon.** `.clearfelt/domain.md` exempts legitimate technical terms a generic banlist would otherwise flag.
- **Readability, tracked separately from AI-tell scoring.** Flesch-Kincaid, Gunning Fog, and processing-fluency signals, so audience-fit and slop-detection never get conflated into one blurry number. Calibrated for US-school-grade, English-language, general-audience text; not validated for other languages or specialist audiences, set your own range in `.clearfelt/domain.md` if that doesn't fit.
- **Everything hand-editable, no JSON.** Rules, config, voice, and domain files are all plain Markdown.
- **Baseline diffing, hooks, and pin shortcuts.** Built for repeated use on a growing set of drafts, not a one-off scan.
- **Sorted, not dumped.** The score report leads with what actually drove the number, groups repeated hits into one row with an occurrence count, and shows category point subtotals sorted by impact, not a flat list in rule-file order.
- **A risk tier for sensitive documents.** Set `risk_tier: sensitive` in `.clearfelt/domain.md` for a shareholder letter, a filing, anything Legal has reviewed, and `/clearfelt rewrite` stops rewriting away hedges and qualifiers and forces the confirmation gate on, regardless of other settings.
- **A durable log of every write.** `/clearfelt rewrite` appends to `.clearfelt/audit.log` on every approved write, the first record that survives past the terminal session that approved it.
- **A code-verified preservation guarantee, not just a prompt instruction.** `scripts/check.mjs` deterministically diffs a rewrite candidate against its source: a locked span that changed always blocks the write; a dropped or added number, date, proper noun, or quote surfaces as a disclosed warning by default.
- **See exactly what's active before you run anything.** `/clearfelt explain` prints every resolved config setting and where it came from (default, shipped, or your global override), plus voice/domain/hook state, in one place.
- **Tested, not just trusted.** `node --test` runs a real regression suite against `scripts/detect.mjs`; `node scripts/eval.mjs` checks the score against a small labeled corpus and reports the pass rate honestly, including where it currently falls short.

## Quick start

```bash
npx skills add andrei-ionut-nita/clearfelt
```

Uses the [skills CLI](https://github.com/vercel-labs/skills), which auto-detects Claude Code (and 70-plus other agents) and installs clearfelt into the right `skills/` directory for you. Add `-g` to install globally instead of per-project, or `-a claude-code` to target Claude Code specifically if you have more than one agent installed.

Prefer to manage it yourself:

```bash
git clone <this-repo> ~/.claude/skills/clearfelt
```

Either way, that's the whole install. `scripts/detect.mjs` has zero external dependencies, only Node's standard library, so nothing else to `npm install`.

Then, in Claude Code, in any project:

```
/clearfelt setup
```

Optional, but recommended first: a short adaptive interview that builds a voice profile and a domain profile, so audit and rewrite preserve your own quirks and don't flag your field's normal jargon. Skip it and both commands still work fine on bundled defaults.

```
/clearfelt audit path/to/draft.md
```

You'll get a score, a readability report, and a list of hits with line numbers. Nothing gets edited. When you're ready to fix it:

```
/clearfelt rewrite path/to/draft.md
```

First it previews what it would change and asks how far to go, light touch (just those items) up to structural rework (paragraph breaks and reordering too). Then it runs the pass, hands you a diff, and waits for a yes before touching the file. Two separate approvals, not one.

## Before and after

Scores below are real, computed by running `scripts/detect.mjs` against these exact snippets, not illustrative round numbers. They move whenever the scoring formula does, see `docs/RELEASE.md`'s release checklist for keeping them current.

**Before** (Human Score: 28)

> In today's fast-paced digital world, it is important to note that AI is transforming every industry. It's not a tool. It's a revolution. Experts agree that companies must delve into this technology to unlock seamless growth. The future isn't coming. It's already here.

**After** (Human Score: 100)

> AI is already changing how most industries work, and that's not really in dispute anymore. What's less obvious is how fast companies actually need to move on it. We've seen teams get real traction just by picking one workflow and testing it for a month. That's usually enough to know if it's worth the bigger commitment.

**Before** (Human Score: 62)

> Our platform offers a seamless, robust solution that delivers pivotal insights. Studies show that businesses leveraging our tools see paramount improvements. In conclusion, this is a game-changer for your organization.

**After** (Human Score: 100)

> Our platform gives you insights you can actually act on, without the setup headache most tools come with. Teams using it tend to see real gains fast. If your org is stuck deciding, this is probably the push you need.

## Usage

| Command | Does |
|---|---|
| `/clearfelt setup` | Builds or updates a voice profile (or profiles, in multi-voice mode) and a domain profile. Optional, recommended first, re-runnable any time. |
| `/clearfelt audit [path]` | Scores a file or directory, reports every hit plus a separate readability report, never edits anything. |
| `/clearfelt rewrite [path]` | Rewrites the file in memory, looping the scrub, re-score, and preservation-check steps until it clears the threshold (default 85) or hits the iteration cap (default 3), then shows a before/after and asks before writing. |
| `/clearfelt explain` | Prints every currently-resolved config setting and where it came from, plus voice/domain/hook state. Never edits anything. |
| `$clearfelt hooks <status\|on\|off\|ignore-rule\|ignore-file\|reset>` | Manages an auto-audit hook that scores text files after you edit them. |
| `node scripts/pin.mjs <pin\|unpin> <audit\|rewrite\|explain\|setup>` | Creates or removes a `$clearfelt-<command>` shortcut skill. |

`/clearfelt rewrite` asks which of four intensities to use (light touch, balanced, full rewrite, structural rework), previewing the target list first. Answer once and it offers to remember the choice: globally (`~/.clearfelt/settings.md`, your home directory, safe across skill updates) or just for this project (`.clearfelt/domain.md`). The file itself isn't touched until you sign off on the result; set `rewrite.require_confirmation: false` in `clearfelt.config.md` only for a deliberately unattended run. Every approved write lands a line in `.clearfelt/audit.log`. For a project where a rewrite carries real legal or reputational weight, set `risk_tier: sensitive` in `.clearfelt/domain.md`: hedges and qualifiers stop being fair game, and the sign-off step becomes mandatory regardless of any other setting.

## Using it on content pipelines

If you're running clearfelt repeatedly over a growing set of drafts (a content calendar, a blog backlog, a batch of LinkedIn posts), save a baseline after your first pass and diff against it later so you only see new slop, not the same old hits every time:

```bash
node scripts/detect.mjs --mode report drafts/ --save-baseline .clearfelt/baseline.json
# ...later, after adding more drafts...
node scripts/detect.mjs --mode report drafts/ --baseline .clearfelt/baseline.json
```

If your team has more than one writer, set `voice.mode: multi` in `clearfelt.config.md`, run `/clearfelt setup` once per writer, and pass `--voice <name>` (or let the skill ask which voice applies):

```bash
node scripts/detect.mjs --mode report drafts/sarah-post.md --voice sarah
```

## Customization

Every file you're meant to hand-edit is plain Markdown. No JSON, no code syntax to break.

- **Add or remove a banned word:** open the relevant file under `rules/banned_words/`, or copy `rules/banned_words.local.example.md` to `banned_words.local.md` in the same folder for a personal-only addition that never touches the shared files.
- **Add a banned phrase or pattern:** same idea, under `rules/antipatterns/`, with `rules/antipatterns.local.example.md` as the personal-only template.
- **Change scoring behavior:** every threshold, weight, and setting lives in one table-based file, `clearfelt.config.md`.
- **Set your own voice:** run `/clearfelt setup`, or hand-edit `.clearfelt/voice-profile.md` directly using `templates/voice-profile.example.md` as a guide. A preference stated there always overrides the shipped banlist. For a team with multiple writers, see `voice.mode` above and `templates/voice-profile.example.md` per writer under `.clearfelt/voices/`.
- **Exempt your domain's jargon:** run `/clearfelt setup`, or hand-edit `.clearfelt/domain.md` using `templates/domain.example.md` as a guide. Shared by everyone on the project, unlike a voice profile.
- **Mark a project legally or reputationally sensitive:** set `risk_tier: sensitive` in `.clearfelt/domain.md`. See `reference/rewrite.md`'s "Risk tier" section for exactly what this changes.
- **Save a preference across every project:** hand-edit `~/.clearfelt/settings.md` (same table format as `clearfelt.config.md`), or let `/clearfelt rewrite`'s save prompt write it for you. This file lives outside the skill's repo entirely, so it's the one place a customization survives a `git pull` or reinstall of the skill itself.
- **Check what's actually active:** run `/clearfelt explain` to see every resolved setting and which of the three layers above it came from, before running anything else.

## Architecture

```
SKILL.md              thin router: commands table, routing rules
reference/*.md         full behavior for each command, loaded on demand
scripts/detect.mjs     thin CLI entrypoint: arg parsing, mode dispatch
scripts/lib/config.mjs  config precedence, voice/domain profile overrides
scripts/lib/rules.mjs   rule-dictionary parsing and matching
scripts/lib/score.mjs   statistical signals, readability, the score formula
scripts/lib/report.mjs  pattern/category summaries, baseline diff, orchestration
scripts/check.mjs      preservation checker, diffs a rewrite candidate against its source
scripts/explain.mjs    prints every resolved config setting and its provenance
scripts/eval.mjs        lightweight scoring sanity check against a labeled corpus
scripts/qualitative-eval.mjs  scores recorded judgment runs on the five qualitative signals
scripts/hook.mjs       auto-audit hook admin and runtime body
scripts/pin.mjs        $clearfelt-<command> shortcut creation
scripts/lint.mjs       repo-consistency checks, run before any PR
rules/antipatterns/     phrase and structural patterns, one file per category
rules/banned_words/     single words and short phrases, tiered
clearfelt.config.md    every tunable, one Markdown table
prompts/audit_loop.xml  the 3-pass rewrite pipeline for /clearfelt rewrite
templates/              bundled voice-profile and domain-profile defaults
schemas/                documents the rule-bullet, eval-manifest, and detect/check output JSON shapes
reports/                gitignored, opt-in saved artifacts (audit/eval/check output)
tests/                  node --test suite plus fixtures/eval/'s and fixtures/qualitative/'s labeled corpora
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

See [CHANGELOG.md](CHANGELOG.md). Current version: 0.4.0.
