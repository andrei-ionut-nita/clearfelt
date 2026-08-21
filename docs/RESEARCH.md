# What the research actually says

A condensed synthesis of the human-vs-AI-text research behind clearfelt-writing's rule dictionary, drawn from a multi-round research pass across peer-reviewed papers, institutional reports, and technical syntheses. Every specific claim below carries a source key; look it up in [SOURCES.md](SOURCES.md). This page is the "why," SOURCES.md is the bibliography, and the rule files under `rules/` are where the findings turn into something `scripts/detect.mjs` can actually check.

## The headline finding

Human text is more variable, context-bound, and cognitively uneven. AI text is more uniform, formal, and statistically smooth. But detection is probabilistic, not definitive, and the gap narrows as models improve. (`stanford-hai-detection-2023`, `pangram-2025`)

Humans are bad at telling the difference by eye: Hancock's Stanford study found people distinguish AI from human text at only 50 to 52 percent accuracy, essentially a coin flip. Grammatical correctness, first-person pronouns, and informal tone are all commonly but *incorrectly* treated as evidence of human authorship. (`stanford-hai-detection-2023`)

## What actually separates human from AI text

### Structural and statistical patterns

- **Variability vs. uniformity.** Human writing is bursty: a mix of short and long sentences, uneven complexity, broad spread in document length and lexical diversity. AI defaults to uniform medium-length sentences and forms compact stylistic clusters per model. (`ucc-2025`, `mda-comparison-2024`)
- **Lexical diversity.** Humans show a higher type-token ratio, more hapax legomena (words used exactly once), novel word combinations, and individualized collocations. AI leans on high-probability word sequences and overuses generic connectives: "furthermore," "in conclusion," "navigate," "leverage." (`opara-2025`)
- **Specific overused words.** A study reportedly found LLMs use words like "camaraderie," "tapestry," "palpable," and "intricate" orders of magnitude more often than humans writing in the same genre. This claim is flagged `unresolved-carnegie-mellon-pnas-2025` in SOURCES.md: worth acting on, but the paper itself couldn't be tracked down from the research export, so treat it as a lead, not gospel.

### Emotional, pragmatic, and rhetorical traits

- **Emotion.** Humans show stronger negative emotion (anger, sadness), especially in deceptive or high-stakes writing. AI defaults to a systematically positive, motivational tone, likely a side effect of alignment training. (`rodrigues-2026`)
- **Certainty and causal language.** AI uses far more certainty markers and causal connectives (up to 150% more in one study), sounding more authoritative and explanatory than the average human writer on the same topic. (`rodrigues-2026`)
- **Pragmatic grounding.** Humans anchor writing in concrete, time- and place-specific references: a real date, a specific street, a named person with biographical detail. AI defaults to abstract, generalized, "safe" statements with weaker episodic anchoring. (`opara-2025`)
- **Rhetorical organization.** Human argument structure is variable and sometimes digresses before returning to the point. AI produces stereotyped logical progressions and near-identical paragraph templates across outputs. (`comparative-framework-2025`)

### LIWC-category findings (the most quantified signals)

Rodrigues et al. (`rodrigues-2026`) and Sandler et al. (`sandler-2024`) independently measured LIWC-category differences with real effect sizes. The strongest, most consistent ones:

| Category | Direction | Typical magnitude |
|---|---|---|
| Informal language, netspeak | AI far below human | -54% to -84% |
| Positive emotion, achievement, reward language | AI far above human | +70% to +130% |
| Certainty, causal language | AI far above human | +50% to +150% |
| First-person pronouns ("I") | AI below human | large effect (d ~0.9) |
| Authenticity (LIWC composite) | AI below human | medium effect |
| Negative emotion (anger, sadness) | AI below human, especially in deceptive text | -30% to -50% |

### The human idiosyncrasies that don't show up as single words

The strongest "feels human" signals aren't lexical at all. They're structural and behavioral, and current LLMs don't reliably replicate them even when surface style is convincing:

- **Cognitive-load scars.** Abrupt simplifications mid-argument, local repairs ("or rather...", "I mean..."), sentences that start complex and taper off under load. Not sloppiness: a signature of real-time planning under bounded working memory. (`opara-2025`)
- **Metacognitive self-monitoring.** Hedges ("perhaps," "it seems that"), explicit audience address, mid-paragraph tonal shifts as the writer reconsiders their own stance. (`opara-2025`)
- **Narrative messiness.** Human stories and arguments tend toward moral ambiguity, temporal complexity, subplots that don't fully resolve, and implicit themes. AI converges on tidy single-track plots with explicitly stated morals. A study called StoryScope reportedly found human stories land in the rarest 10% of narrative-feature space at close to triple the rate of AI stories. Flagged `unresolved-storyscope-2026`: a real claim, but only a summary post was recoverable, not the paper.
- **"Inefficient" specificity.** Humans reach for locally meaningful but globally improbable word choices, shaped by personal history and taste. AI optimizes toward the globally probable phrasing, which reads as fluent but generic.
- **Authentic imperfection.** Human writing includes real typos (motor slips, not systematic patterns), intentional sentence fragments, and "good enough" grammar that's locally coherent but not globally perfect. AI's imperfections, when they occur, tend to be more uniform and systematic.

## Human situatedness: what the research synthesis initially missed

The research pass this page draws on included a self-critique of its own coverage (`research-synthesis-2026`): it leaned on broad stylometric markers (syntax, LIWC, burstiness) and underweighted narrative idiosyncrasy, episodic grounding, and cognitive friction, the traces of a specific mind writing in a specific context under real constraints, not just style. Three of those are now operationalized as reasoning-step guidance in `reference/audit.md`'s "Qualitative signals" section, the same treatment already given to the frictionless-claims check: narrative idiosyncrasy (AI over-resolves, humans leave things messier), episodic grounding (AI is safely generic, humans reach for specific checkable particulars), and cognitive friction (AI rarely hedges or self-corrects mid-thought).

Two more from the same self-critique, emotional qualia (lived, shifting affect versus a named emotion) and pragmatic relevance (writing that signals identity or stance toward a specific audience), were considered and deliberately left out of clearfelt-writing's guidance: too subjective to check reliably even as a reasoning step, and folding them in would mean trading the deterministic-score discipline for vibes-checking. A sixth, behavioral production signals (keystroke timing, revision patterns), isn't a judgment call at all: it's structurally out of reach for a tool that only ever sees finished text.

## Where the statistical signals stop being reliable

This matters for how clearfelt-writing's own scoring should be read: perplexity and burstiness distributions overlap heavily between good human writing and good AI writing, so any single threshold trades false positives against false negatives. (`pangram-2025`, `evalhub-2026`) Formal, technical, legal, and medical genres are inherently low-burstiness and low-perplexity even when entirely human-written, so detectors (and, by extension, `scripts/detect.mjs`'s statistical signals) will show more false positives there. Non-native English writers are disproportionately misflagged by commercial AI detectors for the same reason: their writing is statistically closer to the "smooth, uniform" AI profile without being AI-generated at all. (`stanford-hai-bias-2023`)

The Human Score is a diagnostic signal for clearfelt-writing's own rule dictionary, not a forensic AI-detection score. It should never be read as "this text was written by AI" or "this text was written by a human."

## What this means for clearfelt-writing's rule dictionary

The existing rule categories (binary contrasts, fake-profound closers, throat-clearing openers, weasel attribution, structural tells, formatting tells, high-frequency lexicon, puffery lexicon) mostly came from community prior-art tools, not this research pass. See `docs/decisions/0001-deterministic-scored-detection.md`. This research pass:

- Confirmed the lexical approach is directionally correct (`opara-2025`'s "high-probability word sequences" finding backs the whole banned-words concept) and added specific words with a research trail: `furthermore`, `leverage`, and (flagged unresolved) `camaraderie`, `palpable`, `intricate`.
- Confirmed `scripts/detect.mjs`'s existing statistical signals (burstiness, type-token ratio, trigram repetition) are the right family of measurement, not just plausible-sounding metrics invented for this project.
- Surfaced a caution worth keeping in mind for `/clearfelt-writing rewrite`'s `intensity: aggressive` mode: pushing burstiness and lexical diversity too hard past what's natural for the actual content risks reading as performed unevenness rather than genuine variation. The research measures what's different about human text on average; it doesn't say that maximizing every signal produces better writing.
