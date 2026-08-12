# ADR 0004: No-fabrication rule and voice-profile precedence

**Status:** Implemented
**Date:** 2026-08-12

## Context

Reviewing blader/humanizer surfaced two safety properties worth adopting directly. A rewrite tool that's optimizing for "sounds more human" has an obvious failure mode: it can drift toward inventing specifics (a name, a date, a statistic) because specific details read as more human than vague ones. Separately, a fixed banlist has its own failure mode: it can fight a user's actual voice, flagging a word or construction the user deliberately likes.

## Decision

Two hard rules, documented in `reference/humanize.md` and enforced in `prompts/audit_loop.xml`'s Pass 1 and Pass 2 instructions:

1. **No fabrication.** The rewrite never introduces a fact, name, date, statistic, or citation that wasn't already in the source text. Vague language gets tightened, not replaced with an invented specific.
2. **Voice-profile precedence.** If `.clearfelt/voice-profile.md` states a preference, `scripts/detect.mjs` checks it before flagging a hit, and that preference wins over the shipped rule files for that project.

## Consequences

`scripts/detect.mjs` reads `.clearfelt/voice-profile.md`'s "Words I want to keep using" section as an override set before matching rules against the target text. `/clearfelt humanize`'s Pass 1 extracts the factual payload up front specifically so later passes have something concrete to check rewrites against, rather than relying on the rewrite pass to remember not to invent things.
