# /clearfelt audit

Read-only scan. Never edits the target.

## Flow

1. Resolve the target path from the user's argument. If it's a directory, scan every `.md`/`.txt`/`.mdx` file in it. If `voice.mode` is `multi` (see `clearfelt.config.md`) and no voice was named in the request, ask which voice applies before running, so overrides resolve correctly.
2. Run: `node scripts/detect.mjs --mode report <path> [--voice <name>]`
3. **If the target was a directory** (the JSON has `isDirectory: true` and a `files` array with more than one entry): present [reference/format/audit.md](format/audit.md)'s "Directory audit summary" template first. Name every filename explicitly, in a worst-first ranking table, with the greatest offender called out by name in the opening sentence. Never leave the reader to infer which or how many files were in scope. Follow it with each file's full breakdown, worst-first, each one still headed by its own filename.
4. Parse the JSON and present it following [reference/format/audit.md](format/audit.md)'s single-file template: filename, plain-language verdict, one-sentence reason first, then `categoryPoints` as the "Why" table, `patternSummary` (its `points` field, not raw severity) as the "Where" table, `breakdown.impacts` as "The full math" table, readability as its own table with plain-language bands, commentary (if any) as short bullets. Not a prose summary.
   - All three data tables come pre-sorted by the script (points lost, descending). Present them in that order, don't re-sort by category name or rule-file order: the reader should see the biggest driver first without having to scan for it.
   - Always show the full-math table, not only when asked. Two files can land on the same final score for different reasons (zero deductions left vs. adjustments cancelling out), and that table is what makes the reason legible instead of looking like a bug.
5. If the JSON has a `scoreReliability: "low"` field (docs/decisions/0023), present its `languageWarning` plainly before anything else in the breakdown, the same forward placement risk_tier: sensitive gets: this score may not mean what it looks like it means, not a footnote to skim past. Don't suppress or re-word it away.
6. If the JSON has a `registerCheck` field (docs/decisions/0024), present it as a short, separate advisory note after the main breakdown, not folded into `categoryPoints` or the score explanation: it never affected the score, so it shouldn't read as if it did. Name the flagged word(s) and which register they didn't match (e.g. "warm voice, but this reads accusatory: 'faking'"). Never suggest a rewrite unprompted; that's `/clearfelt rewrite`'s job, not audit's.
7. Every hit carries a `source` key. Mention it briefly (e.g. "no-ai-slop pattern" or "camaraderie: flagged per research, unresolved citation, see docs/SOURCES.md") if the user asks why something was flagged, rather than presenting the rule as clearfelt's own unexplained opinion.
8. If `.clearfelt/domain.md` exists, mention once that some hits may already be suppressed by its exemption list, same framing as the voice-profile-precedence note.
9. Do not edit the file. If the user wants it fixed, point them at `/clearfelt rewrite`.
10. If the user asks for a durable copy of this result (not by default, only when asked), write the rendered report to `reports/<slug>-<date>.md` (creating `reports/` if needed; it's gitignored, opt-in, never a default write target, see `CLAUDE.md`), using a filename slug derived from the target path. Confirm the path written.

## Human Score formula

The score starts at 100 and is adjusted by `scripts/detect.mjs`:

| Component | Effect |
|---|---|
| Each rule hit | Score drops by that rule's `severity`, multiplied by its category's weight from `clearfelt.config.md`. The sum of all hits is capped at `deduction_cap` (default 65) before it affects the score, see below. |
| Sentence-length variance (burstiness) | Low variance (uniform sentence lengths, an AI tell) costs up to `burstiness_weight` points; high variance earns some back. |
| Vocabulary diversity (MATTR) | Below-baseline diversity (repetitive word choice) costs up to `vocabulary_diversity_weight` points relative to `vocabulary_diversity_baseline`; above-baseline earns some back. Uses MATTR (Moving-Average Type-Token Ratio, `covington-mcfall-2010`), ordinary type-token ratio computed inside a fixed 50-word sliding window and averaged across every window position, not raw type-token ratio or Root TTR: both grow with document length in ways that conflate length with genuine lexical variety rather than measuring it. See `docs/decisions/0017-windowed-vocabulary-diversity.md`. |
| Trigram repetition | Repeated three-word sequences cost up to `repetition_weight * 10` points, scaled by how much of the text repeats. |
| Paragraph-length variance | Same idea as burstiness, one level up: uniform paragraph lengths cost up to `paragraph_variety_weight` points; varied ones earn some back. Markdown headers don't count as paragraphs. |
| Wall-of-text penalty | A flat `wall_of_text_penalty` points off when a document has only one paragraph and is long enough (`wall_of_text_sentence_threshold` sentences or more) that a human would likely have broken it up. |

Final score is clamped to the 0 to 100 range. Every weight above is a row in `clearfelt.config.md`, editable without touching the script.

**Why rule-hit deduction is capped.** Rule-hit deduction is the only component above with no natural ceiling: a document with enough flagged words can accumulate 80+ points on its own. Past `deduction_cap`, a document is already unambiguously below `human_score_threshold`, so a raw sum climbing further adds no decision-relevant information, it just guarantees the statistical signals can never move the score at all. (Measured across real documents during development, uncapped rule-hit deduction dwarfed every statistical signal combined by more than an order of magnitude, see `docs/decisions/0011-deduction-cap-and-signal-rebalance.md`.)

`breakdown.deduction` in the JSON is the true, uncapped sum. `breakdown.deductionApplied` is what actually affected the score. `breakdown.deductionCapped` flags when the two diverge. If a hit count seems high relative to how much the score actually moved, present both numbers, don't let the capped number read as the whole story.

**When the statistical signals matter.** They're tie-breakers and diagnostics, most informative once rule-hit deduction is capped or already at or near zero, not co-equal scoring inputs on a document that still has many rule hits. Two documents that both hit the deduction cap, or both score 0 rule hits, are exactly the case these signals were built to still distinguish.

## Tiered banned words

A tier-1 word always counts as a hit. A tier-2 word only counts when at least one other hit is nearby. A tier-3 word only counts once it appears at least `tier3_density_threshold` times in the document. This keeps words like "robust" from being flagged on a single legitimate use in the **scored report**. It does not protect a word from `/clearfelt rewrite`'s `balanced` tier and above, which deliberately looks past tiering (`node scripts/detect.mjs --mode scan <path>`) so it can actually remove words the score was tactfully ignoring. A word you genuinely want kept belongs in `.clearfelt/domain.md`'s exemption list, not left to tier-suppression, which was only ever meant to protect the number, not the text.

## Exclusions

Fenced code blocks, inline code spans, and blockquoted lines are stripped before scanning, so code samples and quoted material never generate false hits.

## Qualitative signals

A few AI-tells aren't regex-detectable and don't feed the Human Score. When running `/clearfelt rewrite`'s Pass 1 (extract and calibrate), also read the draft for whether it admits any real stakes anywhere: a contestable opinion, an acknowledged risk, a decision that could have gone the other way. Prose that resolves every problem cleanly and never costs the writer anything reads as AI-generated even when no individual sentence trips a rule. `rules/antipatterns/frictionless_claims.md` catches the regex-able phrase-level subset of this (\"seamlessly,\" \"hassle-free\"); the whole-piece judgment call stays a reasoning step, not a score component, and should be mentioned to the user as a note rather than folded into the numeric score.

Three more, same treatment (reasoning step, not a score component), surfaced by the research synthesis's own gap analysis of what it had underweighted (`research-synthesis-2026`; see \"Human situatedness\" in `docs/RESEARCH.md`):

- **Narrative idiosyncrasy.** Human argument and storytelling tend toward moral ambiguity, digression, and subplots that don't fully resolve. AI converges on tidy, over-resolved causal chains with an explicitly stated takeaway. If a piece explains itself too completely, that's a tell independent of any single sentence.
- **Episodic grounding.** Human writing anchors claims in specific, checkable particulars: a real date, a named person, a specific place or tool. AI defaults to safe, generalized statements even when a concrete detail was available and would have cost nothing to include.
- **Cognitive friction.** Real-time thinking leaves traces: a self-correction, a hedge ("perhaps," "I mean"), a sentence that starts complex and simplifies mid-thought. Prose that never second-guesses itself, never hedges, and never locally repairs a thought reads as authored after the fact rather than composed in real time.
- **Synonym cycling.** Restating the same point three ways in a row ("It's fast. It's efficient. It's quick.") is a no-ai-slop-sourced tell, but detecting it requires comparing the meaning of multiple sentences, not matching text, so it isn't a `rules/antipatterns/structural_tells.md` bullet. `trigramRepetitionRatio` (see the Human Score formula above) catches near-literal repetition of the same words; synonym cycling is the harder case where the words differ but the point doesn't, and stays a reasoning-step check here.

Two items from the same gap analysis are intentionally not turned into guidance here. **Emotional qualia** (the difference between naming an emotion and rendering lived, shifting, context-bound affect) and **pragmatic relevance** (writing that signals identity, in-group knowledge, or stance toward a specific audience) are real but too subjective to check reliably even as a reasoning step without drifting into unfalsifiable vibes-checking, which is exactly what clearfelt's deterministic-score brand exists to avoid. **Behavioral production signals** (keystroke timing, revision bursts, non-linear composition) are out of scope entirely, not by oversight: clearfelt only ever sees finished text, and has no access to how it was produced.

## Readability

Tracked separately from the Human Score, never blended into it: readability is an audience-fit measure (does this read at the right level for who it's for), not an AI-tell measure (does this sound machine-generated). A dense, hard-to-read paragraph and an AI-sounding paragraph are different problems, and folding them into one number would hide both.

`scripts/detect.mjs` computes, per scan:

| Metric | What it measures | Source |
|---|---|---|
| Flesch Reading Ease | 0-100, higher is easier. The most widely cited single readability score. | `flesch-1948` |
| Flesch-Kincaid Grade Level | Approximate US school grade level needed to read it on the first pass. | `kincaid-1975` |
| Gunning Fog Index | Sentence length plus percentage of complex (3+ syllable) words; specifically suited to catching bloated business/technical prose. | `gunning-1952` |
| Passive-voice density | "be"-verb-plus-past-participle constructions per sentence. Higher values slow comprehension. | `oppenheimer-2006` |
| Nominalization density | Abstract-noun constructions (turning a verb into a noun, "utilization" instead of "use") as a share of total words. Higher values slow comprehension. | `alter-oppenheimer-2009` |

Present Flesch Reading Ease and Flesch-Kincaid Grade Level as the headline pair (the two most broadly understood), and mention Gunning Fog and the two fluency signals if the user asks for detail or if the numbers disagree sharply with each other. If `.clearfelt/domain.md` sets a target grade-level range (or the shipped default, 6 to 12, applies), note when the score falls outside it as an FYI, not a score deduction. `withinTargetRange` in the JSON output reflects this.

## Baseline mode

If the user wants to track only new slop introduced since a previous scan (useful for a growing set of drafts), offer:

```
node scripts/detect.mjs --mode report <path> --save-baseline <baseline-file>
```

to snapshot the current hits, and on a later run:

```
node scripts/detect.mjs --mode report <path> --baseline <baseline-file>
```

to report only hits that are new since that snapshot.
