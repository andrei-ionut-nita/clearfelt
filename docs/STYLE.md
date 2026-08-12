# The style clearfelt writes toward

This is the standalone reference for what "humanized" actually means here. It's what `/clearfelt humanize` is optimizing for, and it's useful on its own even if you never run the tool: a checklist for catching AI-sounding writing by eye.

## Cadence

Vary sentence length on purpose. A three-word sentence next to a twenty-word one reads as a person thinking out loud, not a template filling in blanks. Uniform sentence length, even when every sentence is well-written, is one of the strongest tells that a paragraph came from a model. `scripts/detect.mjs` measures this directly as sentence-length variance (burstiness).

## Perspective

Prefer relational language over detached description. "We ran into this when onboarding new users" instead of "The user will experience this during onboarding." Corporate distancing reads as evasive even when the content is accurate.

## Contractions and casual transitions

Use "don't," "you're," "we'll" where they're natural. Swap rigid conjunctions for the way people actually talk: "Plus" instead of "Furthermore," "On top of that" instead of "Moreover." This isn't about being sloppy, it's about not sounding like a memo.

## What gets flagged

Five categories of phrase and structure, documented in full in `rules/antipatterns/` and `rules/banned_words/`:

- **Binary contrasts**: "It's not X. It's Y." False-choice drama around a claim that didn't need it.
- **Fake-profound closers**: Sentences that reach for weight they haven't earned, usually the last line of a paragraph.
- **Throat-clearing openers**: Warm-up sentences that delay the point instead of starting with it.
- **Weasel attribution**: Claims backed by an authority that's never named ("experts agree," "studies show").
- **Structural tells**: Colon-reveal sentences, synonym cycling, and other shape-level habits, not individual words.
- **Formatting tells**: Punctuation and layout habits, not word choice, including the em-dash-as-pause habit this project has zero tolerance for in its own writing.
- **Lexicon**: Individual words that show up in AI-generated text far more than in ordinary writing (delve, tapestry, pivotal, and so on), plus marketing puffery (game-changer, seamless, robust).

## What doesn't get flagged

A voice profile always wins. If `.clearfelt/voice-profile.md` says you like a word or a construction the base rules would otherwise catch, `/clearfelt humanize` leaves it alone. This tool is trying to remove the tells that make writing sound like nobody in particular wrote it, not to erase what makes your writing sound like you.

## No fabrication

The rewrite pass never invents a fact, name, date, or citation that wasn't already in the source. Tightening vague language is fine. Inventing a specific to replace vague language is not, even if the result reads better. See [decisions/0004-no-fabrication-and-voice-precedence.md](decisions/0004-no-fabrication-and-voice-precedence.md).

## Where this comes from

None of the above is arbitrary. [RESEARCH.md](RESEARCH.md) has the underlying findings (burstiness, lexical diversity, certainty markers, and more), and every rule bullet in `rules/` carries a `source:` key resolved in [SOURCES.md](SOURCES.md). If you're skeptical that a flagged word or phrase actually matters, that's the right instinct: go check the source instead of taking clearfelt's word for it.
