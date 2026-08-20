// English-language confidence heuristic: not a language detector, a guard.
// docs/RESEARCH.md already discloses (citing stanford-hai-bias-2023) that
// non-native English writers are disproportionately misflagged by this class
// of statistical detector, and every statistical signal in score.mjs plus
// every rule.mjs word list is English-only by construction (word-boundary
// regexes assume Latin script and English tokenization, banned-word lists
// are English vocabulary). A non-English document still gets a confident-
// looking 0-100 score today; nothing about the number discloses that it
// isn't measuring what it looks like it's measuring. This computes a cheap,
// deterministic signal for that, so detect.mjs can disclose low confidence
// instead of silently returning a meaningless number. Not a replacement for
// real multi-language support (translated rule dictionaries, non-English
// statistical baselines), a much larger, separately evidenced feature; see
// docs/decisions/0023.

// The ~50 highest-frequency English function words (articles, prepositions,
// conjunctions, pronouns, common auxiliary verbs). These occur in real
// English prose at a roughly stable rate regardless of topic or register
// (technical, casual, formal), which is exactly why they're a robust,
// cheap signal: content words vary by subject, function words don't.
const ENGLISH_FUNCTION_WORDS = new Set([
  'the', 'of', 'and', 'to', 'a', 'in', 'is', 'it', 'you', 'that',
  'he', 'was', 'for', 'on', 'are', 'with', 'as', 'i', 'his', 'they',
  'be', 'at', 'one', 'have', 'this', 'from', 'or', 'had', 'by', 'but',
  'what', 'some', 'we', 'can', 'out', 'other', 'were', 'all', 'there', 'when',
  'up', 'use', 'your', 'how', 'said', 'an', 'each', 'she', 'do', 'their',
]);

// Below this word count, the function-word ratio is measuring mostly noise
// (a short title or a code-heavy snippet can easily land under any threshold
// without being non-English at all). Mirrors calibrate.mjs's own
// THIN_SAMPLE_WORD_THRESHOLD pattern: not a hard stop, just a reason to
// withhold the warning rather than fire it on too little signal.
const MIN_WORDS_FOR_CONFIDENCE = 30;

// Below this ratio, real English prose essentially never falls (measured
// against this repo's own English fixtures, tests/fixtures/*.md, which all
// land well above 0.25); a document this low in common English function
// words is far more likely to be a different language, or non-prose content
// (a table, a code block) than English text scoring unusually.
const LOW_CONFIDENCE_THRESHOLD = 0.15;

export function englishFunctionWordRatio(text) {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  if (words.length === 0) return { ratio: 0, wordCount: 0 };
  const hits = words.filter((w) => ENGLISH_FUNCTION_WORDS.has(w)).length;
  return { ratio: hits / words.length, wordCount: words.length };
}

// Returns null when there isn't enough text to judge (see
// MIN_WORDS_FOR_CONFIDENCE above), otherwise { confidence, low }.
// `confidence` is the raw ratio, disclosed as-is rather than rescaled, so
// it's inspectable and not dressed up as more precise than it is.
export function languageConfidence(text) {
  const { ratio, wordCount } = englishFunctionWordRatio(text);
  if (wordCount < MIN_WORDS_FOR_CONFIDENCE) return null;
  return { confidence: Number(ratio.toFixed(3)), low: ratio < LOW_CONFIDENCE_THRESHOLD };
}
