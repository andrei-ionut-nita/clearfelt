# Cutting a release

clearfelt uses plain tags (`v0.1.0`, not `skill-v0.1.0`) since there's only one product in this repo, unlike a multi-surface project that needs a prefix to disambiguate a CLI release from an extension release.

## Versioning

[Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the project is pre-1.0:

- Patch (`0.1.1`): rule additions to `rules/`, doc fixes, bug fixes in `scripts/` that don't change behavior anyone depends on.
- Minor (`0.2.0`): a new command, a new script capability (new `detect.mjs` flag, new hook action), a new rule category.
- Treat any breaking change to `scripts/detect.mjs`'s JSON output shape, `clearfelt.config.md`'s setting names, or the rule file bullet format as minor-or-higher and call it out explicitly in the changelog entry, since other tools or scripts might parse these.

## Steps

1. **Update the version.** Bump `version:` in `SKILL.md`'s frontmatter to the new version number.
2. **Update the changelog.** Add a new `## [x.y.z] - YYYY-MM-DD` section at the top of [CHANGELOG.md](../CHANGELOG.md), under the `## [Unreleased]` heading if one exists. Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)'s `Added` / `Changed` / `Fixed` / `Removed` grouping.
3. **Run the full verification pass** from [DEVELOP.md](DEVELOP.md): `detect.mjs` against a sample file, the hook on/off round-trip, the pin/unpin round-trip, the XML well-formedness check, and the em-dash scan across the whole repo.
4. **Commit.** A single commit covering the version bump and changelog entry is fine; don't bundle unrelated feature work into a release commit.
5. **Tag.**
   ```bash
   git tag -a vX.Y.Z -m "clearfelt vX.Y.Z"
   git push origin main
   git push origin vX.Y.Z
   ```
6. **Create the GitHub release.**
   ```bash
   gh release create vX.Y.Z --title "clearfelt vX.Y.Z" --notes-file -
   ```
   Pipe in release notes drawn directly from that version's CHANGELOG.md entry, not a fresh summary written from scratch, so the changelog and the release notes never drift apart.

## What doesn't ship in a release

There's nothing to build or publish beyond the repo itself: no npm package, no compiled artifact. The tag and the release are a pointer at a commit, not a build step. `scripts/detect.mjs` and everything else runs directly from the cloned repo at whatever tag the user is on.
