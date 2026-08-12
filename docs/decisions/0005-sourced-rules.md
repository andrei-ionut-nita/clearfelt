# ADR 0005: Every rule carries a disclosed source

**Status:** Implemented
**Date:** 2026-08-12

## Context

A comprehensive human-vs-AI-text research pass (peer-reviewed papers, institutional reports, and technical syntheses) was compiled and handed to this project to integrate. Before that, every rule in `rules/` came from community prior-art tools (`no-ai-slop`, `anti-slop-slop-canon`) without any explicit citation in the rule files themselves. The README's "Evidence base" section made a general claim ("draws on documented research and community consensus") without pointing at anything a reader could check.

That's a credibility gap for a project whose entire pitch is "deterministic, not vibes-based." A rule dictionary that says "trust us, this is researched" without a checkable trail is exactly the kind of unverifiable claim clearfelt is meant to strip out of other people's writing.

## Decision

Every bullet in `rules/antipatterns/*.md` and `rules/banned_words/*.md` carries a `source:` field. It points to a key in `docs/SOURCES.md`, which is one of:

- An academic or institutional source, with a real URL.
- A community prior-art tool, credited by name.
- `research-synthesis-2026`, for claims from the research pass that didn't trace to one specific paper.
- `clearfelt-heuristic`, for this project's own observations, used sparingly and labeled honestly as opinion, not research.
- An `unresolved-*` key, for claims that came up in the research with a specific citation attached, but where the actual paper URL couldn't be recovered. These are flagged as leads to verify, not settled citations, rather than being either dropped silently or given a fabricated URL.

`docs/RESEARCH.md` holds the condensed synthesis of what the research actually found, as the "why" behind `docs/SOURCES.md`'s bibliography.

## Consequences

`CONTRIBUTING.md` requires a `source:` on every new shared rule. Personal `.local.md` overrides are exempt (`source: personal` or nothing), since those are one person's own list, not a claim clearfelt is making to the world. `scripts/detect.mjs` passes `source` through into every hit in `--mode report` output, so the citation is visible at the point of use, not just buried in the rule file.

The explicit `unresolved-*` and `clearfelt-heuristic` tags matter as much as the real citations do: they're what keeps this system honest under pressure to just cite something. A rule with no defensible source gets one of those labels, not a made-up paper.
