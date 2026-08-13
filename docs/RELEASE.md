# Cutting a release

clearfelt uses plain tags (`v0.1.0`, not `skill-v0.1.0`) since there's only one product in this repo, unlike a multi-surface project that needs a prefix to disambiguate a CLI release from an extension release.

## Versioning

[Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the project is pre-1.0:

- Patch (`0.1.1`): rule additions to `rules/`, doc fixes, bug fixes in `scripts/` that don't change behavior anyone depends on.
- Minor (`0.2.0`): a new command, a new script capability (new `detect.mjs` flag, new hook action), a new rule category.
- Treat any breaking change to `scripts/detect.mjs`'s JSON output shape, `clearfelt.config.md`'s setting names, or the rule file bullet format as minor-or-higher and call it out explicitly in the changelog entry, since other tools or scripts might parse these.

## Steps

1. **Update the version.** Bump `version:` in `SKILL.md`'s frontmatter to the new version number, and the "Current version" line at the bottom of [README.md](../README.md)'s Changelog section.
2. **Update the changelog.** Add a new `## [x.y.z] - YYYY-MM-DD` section at the top of [CHANGELOG.md](../CHANGELOG.md), under the `## [Unreleased]` heading if one exists. Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)'s `Added` / `Changed` / `Fixed` / `Removed` grouping.
3. **Update README.md so it actually reflects what's shipping**, not just the version number. Don't skip this, the README is the first thing a new user reads and drifts silently otherwise. Specifically check:
   - **"Major features"** lists every feature added since the last release, not just the ones from the release that first introduced the section.
   - **"Before and after"** example scores are still accurate. These are real, `/clearfelt`-computed numbers, not illustrative round numbers, re-run `node scripts/detect.mjs --mode score <scratch-file>` against both snippets and update the displayed scores if a scoring-formula change (a new signal, a reweighted one, a new cap) moved them. An inaccurate worked example in a deterministic-scoring tool's own README undermines the thing the tool exists to prove.
   - **"Usage"** table and the paragraph below it match every current command flag and behavior (`--mode scan`, intensity tiers, `risk_tier`, whatever shipped this release).
   - **"Architecture"** diagram lists every top-level file or directory a new contributor would actually find (add a line for anything new: a `tests/` directory, a new `scripts/*.mjs`, a new top-level config file).
   - **"Customization"** covers any new hand-editable setting or file (a new `.clearfelt/*` field, a new `clearfelt.config.md` section).
   - Do the same staleness check on `SKILL.md`'s "Configuration" line and `CLAUDE.md`'s architecture notes, both name specific settings and files by hand and drift the same way README does.
4. **Run the full verification pass** from [DEVELOP.md](DEVELOP.md): `node --test`, `node scripts/eval.mjs`, `node scripts/lint.mjs` (frontmatter, XML well-formedness, rule-source completeness, config-to-code drift, and the em-dash scan across the whole repo, all in one command), `detect.mjs` against a sample file, the hook on/off round-trip, and the pin/unpin round-trip. CI (`.github/workflows/ci.yml`) runs the first three on every push and PR, but a tag should still get one direct local run before it's pushed.
5. **Commit.** A single commit covering the version bump, changelog entry, and README/doc sync is fine; don't bundle unrelated feature work into a release commit.
6. **Tag.**
   ```bash
   git tag -a vX.Y.Z -m "clearfelt vX.Y.Z"
   git push origin main
   git push origin vX.Y.Z
   ```
7. **Create the GitHub release.**
   ```bash
   gh release create vX.Y.Z --title "clearfelt vX.Y.Z" --notes-file -
   ```
   Pipe in release notes drawn directly from that version's CHANGELOG.md entry, not a fresh summary written from scratch, so the changelog and the release notes never drift apart.

## What doesn't ship in a release

There's nothing to build or publish beyond the repo itself: no npm package, no compiled artifact. The tag and the release are a pointer at a commit, not a build step. `scripts/detect.mjs` and everything else runs directly from the cloned repo at whatever tag the user is on.
