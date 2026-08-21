# High-Frequency AI Lexicon

Single words that show up in AI-generated text far more often than in ordinary human writing.

Tier 1 always flags a hit. Tier 2 only flags when it appears clustered with other hits nearby. Tier 3 only flags once it's dense enough across the whole document to be a real pattern rather than a one-off legitimate use.

The three `unresolved-carnegie-mellon-pnas-2025`-sourced entries below are excluded by default (`rules.include_unresolved: false` in `clearfelt-writing.config.md`): that source key discloses a citation that couldn't be verified, not one that exists, and this repo's own standard is that nothing counts against a user's score without a disclosed, checkable origin.

- delve | severity: 8 | tier: 1 | source: community:no-ai-slop
- tapestry | severity: 7 | tier: 1 | source: community:no-ai-slop
- pivotal | severity: 5 | tier: 2 | source: community:no-ai-slop
- paramount | severity: 6 | tier: 2 | source: community:no-ai-slop
- revolutionize | severity: 6 | tier: 2 | source: community:no-ai-slop
- navigate | severity: 4 | tier: 3 | source: community:no-ai-slop
- testament | severity: 6 | tier: 2 | source: community:no-ai-slop
- underscore | severity: 5 | tier: 3 | source: community:no-ai-slop
- holistic | severity: 5 | tier: 2 | source: community:no-ai-slop
- camaraderie | severity: 6 | tier: 2 | source: unresolved-carnegie-mellon-pnas-2025
- palpable | severity: 6 | tier: 2 | source: unresolved-carnegie-mellon-pnas-2025
- intricate | severity: 5 | tier: 3 | source: unresolved-carnegie-mellon-pnas-2025
- furthermore | severity: 5 | tier: 2 | source: research-synthesis-2026
- leverage | severity: 5 | tier: 3 | source: research-synthesis-2026
- landscape | severity: 4 | tier: 2 | source: clearfelt-writing-heuristic
- juncture | severity: 4 | tier: 2 | source: clearfelt-writing-heuristic
