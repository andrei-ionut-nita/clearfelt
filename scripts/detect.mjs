#!/usr/bin/env node
/**
 * clearfelt detector: parses the Markdown rule files under rules/, scans a
 * target file against them, and prints a deterministic JSON score report.
 * Zero external dependencies, Node stdlib only.
 *
 * Usage:
 *   node scripts/detect.mjs --mode report <path> [--save-baseline <file>] [--baseline <file>] [--voice <name>]
 *   node scripts/detect.mjs --mode score <path>
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { mode: 'report', paths: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--save-baseline') args.saveBaseline = argv[++i];
    else if (a === '--baseline') args.baseline = argv[++i];
    else if (a === '--voice') args.voice = argv[++i];
    else args.paths.push(a);
  }
  return args;
}

// ---- rule file parsing ----

function parseBulletLine(line) {
  const m = line.match(/^-\s+(.+)$/);
  if (!m) return null;
  const parts = m[1].split('|').map((p) => p.trim());
  const rawPattern = parts[0].replace(/^"(.*)"$/, '$1');
  const fields = { pattern: rawPattern };
  for (const part of parts.slice(1)) {
    const kv = part.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    fields[key] = /^\d+$/.test(value) ? Number(value) : value;
  }
  return fields;
}

function parseRuleFile(filePath, category) {
  const text = readFileSync(filePath, 'utf8');
  const entries = [];
  for (const line of text.split('\n')) {
    const parsed = parseBulletLine(line);
    if (parsed) entries.push({ ...parsed, category, severity: parsed.severity ?? 5, tier: parsed.tier ?? 1 });
  }
  return entries;
}

function loadRuleDir(dirPath) {
  if (!existsSync(dirPath)) return [];
  const entries = [];
  for (const file of readdirSync(dirPath).filter((f) => f.endsWith('.md'))) {
    const category = basename(file, '.md');
    entries.push(...parseRuleFile(join(dirPath, file), category));
  }
  return entries;
}

function mergeLocal(base, localFile) {
  if (!existsSync(localFile)) return base;
  const text = readFileSync(localFile, 'utf8');
  let currentCategory = null;
  const merged = [...base];
  for (const line of text.split('\n')) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentCategory = heading[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      continue;
    }
    const parsed = parseBulletLine(line);
    if (!parsed) continue;
    const entry = { ...parsed, category: currentCategory ?? 'local', severity: parsed.severity ?? 5, tier: parsed.tier ?? 1 };
    const existingIdx = merged.findIndex((e) => e.pattern.toLowerCase() === entry.pattern.toLowerCase());
    if (existingIdx >= 0) merged[existingIdx] = { ...merged[existingIdx], ...entry };
    else merged.push(entry);
  }
  return merged;
}

function loadRules() {
  const antipatterns = mergeLocal(
    loadRuleDir(join(ROOT, 'rules', 'antipatterns')),
    join(ROOT, 'rules', 'antipatterns.local.md'),
  );
  const bannedWords = mergeLocal(
    loadRuleDir(join(ROOT, 'rules', 'banned_words')),
    join(ROOT, 'rules', 'banned_words.local.md'),
  );
  return { antipatterns, bannedWords, all: [...antipatterns, ...bannedWords] };
}

// ---- config parsing ----

function parseConfigTable(text, sectionHeading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${sectionHeading}`);
  if (start === -1) return {};
  const settings = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break;
    const row = line.match(/^\|\s*([\w.]+)\s*\|\s*([^|]+?)\s*\|/);
    if (row && row[1] !== 'Setting' && row[1] !== 'Category') {
      const value = row[2].trim();
      settings[row[1]] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    }
  }
  return settings;
}

const CONFIG_SECTIONS = [
  'Scoring',
  'Category severity weights',
  'Tier thresholds',
  'Statistical signals',
  'Voice',
  'Humanize',
  'Readability',
];

function loadConfigFile(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  let merged = {};
  for (const section of CONFIG_SECTIONS) merged = { ...merged, ...parseConfigTable(text, section) };
  return merged;
}

function loadConfig() {
  const defaults = {
    empathy_threshold: 85,
    max_iterations: 3,
    intensity: 'light_touch',
    tier2_cluster_window: 40,
    tier3_density_threshold: 3,
    burstiness_weight: 10,
    vocabulary_diversity_weight: 5,
    repetition_weight: 5,
    'voice.mode': 'single',
    'humanize.require_confirmation': true,
    'humanize.ask_intensity': true,
    target_grade_level_min: 6,
    target_grade_level_max: 12,
  };
  // Precedence, low to high: hardcoded defaults, the skill's own shipped
  // clearfelt.config.md (tracked in git, reset on every skill update), then
  // ~/.clearfelt/settings.md (never shipped, never touched by an update,
  // the actual target for any "save my preference globally" action).
  const shipped = loadConfigFile(join(ROOT, 'clearfelt.config.md'));
  const globalOverrides = loadConfigFile(join(homedir(), '.clearfelt', 'settings.md'));
  return { ...defaults, ...shipped, ...globalOverrides };
}

// ---- voice profile precedence ----

function extractBulletSection(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return new Set();
  const section = text.slice(start).split(/\n##\s+/)[0];
  const overrides = new Set();
  for (const line of section.split('\n')) {
    const m = line.match(/^-\s+(.+)$/);
    if (m) overrides.add(m[1].trim().toLowerCase());
  }
  return overrides;
}

function loadVoiceProfileOverrides(targetDir, config, voiceName) {
  const profilePath =
    config['voice.mode'] === 'multi' && voiceName
      ? join(targetDir, '.clearfelt', 'voices', `${voiceName}.md`)
      : join(targetDir, '.clearfelt', 'voice-profile.md');
  if (!existsSync(profilePath)) return new Set();
  const text = readFileSync(profilePath, 'utf8');
  return extractBulletSection(text, '## Words I want to keep using');
}

// ---- domain profile precedence ----

function loadDomainOverrides(targetDir) {
  const domainPath = join(targetDir, '.clearfelt', 'domain.md');
  if (!existsSync(domainPath)) return new Set();
  const text = readFileSync(domainPath, 'utf8');
  return extractBulletSection(text, '## Technical terms exempt from flagging');
}

function loadDomainReadabilityTarget(targetDir) {
  const domainPath = join(targetDir, '.clearfelt', 'domain.md');
  if (!existsSync(domainPath)) return {};
  const text = readFileSync(domainPath, 'utf8');
  const target = {};
  const minMatch = text.match(/target_grade_level_min:\s*(\d+(\.\d+)?)/);
  const maxMatch = text.match(/target_grade_level_max:\s*(\d+(\.\d+)?)/);
  if (minMatch) target.target_grade_level_min = Number(minMatch[1]);
  if (maxMatch) target.target_grade_level_max = Number(maxMatch[1]);
  return target;
}

// ---- code / quote exclusion guard ----

function stripExcludedRegions(text) {
  let stripped = text.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
  stripped = stripped.replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length));
  stripped = stripped
    .split('\n')
    .map((line) => (/^\s*>/.test(line) ? ' '.repeat(line.length) : line))
    .join('\n');
  return stripped;
}

// ---- statistical signals ----

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function burstinessScore(text) {
  const sentences = splitSentences(text);
  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length).filter((n) => n > 0);
  if (lengths.length < 2) return { coefficientOfVariation: 0, sentenceCount: lengths.length };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean === 0 ? 0 : stdDev / mean;
  return { coefficientOfVariation: cv, sentenceCount: lengths.length };
}

function typeTokenRatio(text) {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  if (words.length === 0) return 0;
  const unique = new Set(words);
  return unique.size / words.length;
}

function trigramRepetitionRatio(text) {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  if (words.length < 3) return 0;
  const trigrams = [];
  for (let i = 0; i <= words.length - 3; i++) trigrams.push(words.slice(i, i + 3).join(' '));
  const counts = new Map();
  for (const t of trigrams) counts.set(t, (counts.get(t) || 0) + 1);
  const repeated = [...counts.values()].filter((c) => c > 1).reduce((a, b) => a + b, 0);
  return trigrams.length === 0 ? 0 : repeated / trigrams.length;
}

// Sentence burstiness is blind to paragraph structure entirely: splitSentences
// flattens the whole text into one stream, so two documents with identical
// sentences but different paragraph breaks score identically on every signal
// above. This is a real gap, found via testing: a "structural_rework" pass
// that only changed paragraph boundaries moved nothing. Paragraph-length
// variety (the same coefficient-of-variation approach as burstinessScore,
// one level up) and an explicit penalty for a long document crammed into a
// single paragraph close it.
function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^#{1,6}\s/.test(p));
}

function paragraphStructureScore(text) {
  const paragraphs = splitParagraphs(text);
  const lengths = paragraphs.map((p) => (p.match(/\b[a-z']+\b/gi) || []).length).filter((n) => n > 0);
  if (lengths.length < 2) {
    return { coefficientOfVariation: 0, paragraphCount: lengths.length };
  }
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean === 0 ? 0 : stdDev / mean;
  return { coefficientOfVariation: cv, paragraphCount: lengths.length };
}

// ---- readability (Flesch, Flesch-Kincaid, Gunning Fog, processing fluency) ----
// Formulas: Flesch, R. (1948), Journal of Applied Psychology, 32(3), 221-233.
// Kincaid et al. (1975), Navy Research Branch Report 8-75. Gunning, R. (1952),
// The Technique of Clear Writing. See docs/SOURCES.md for verified citations.

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function computeReadability(text) {
  const sentences = splitSentences(text);
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  const sentenceCount = Math.max(sentences.length, 1);
  const wordCount = Math.max(words.length, 1);
  const syllableCounts = words.map(countSyllables);
  const syllableTotal = syllableCounts.reduce((a, b) => a + b, 0);
  const complexWordCount = syllableCounts.filter((c) => c >= 3).length;

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = syllableTotal / wordCount;

  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const gunningFog = 0.4 * (wordsPerSentence + 100 * (complexWordCount / wordCount));

  const passiveMatches = text.match(/\b(?:is|are|was|were|be|been|being)\s+\w+ed\b/gi) || [];
  const nominalizationMatches = text.match(/\b\w+(?:tion|ment|ance|ence|ity)s?\b/gi) || [];

  return {
    fleschReadingEase: Number(fleschReadingEase.toFixed(1)),
    fleschKincaidGrade: Number(Math.max(0, fleschKincaidGrade).toFixed(1)),
    gunningFog: Number(gunningFog.toFixed(1)),
    passiveVoiceDensity: Number((passiveMatches.length / sentenceCount).toFixed(2)),
    nominalizationDensity: Number((nominalizationMatches.length / wordCount).toFixed(3)),
  };
}

// ---- matching ----

function findHits(text, rules, config, overrides, { includeSuppressed = false } = {}) {
  const hits = [];
  const lines = text.split('\n');

  for (const rule of rules) {
    if (overrides.has(rule.pattern.toLowerCase())) continue;
    const isSingleWord = !rule.pattern.includes(' ');
    const regex = isSingleWord
      ? new RegExp(`\\b${inflectionPattern(rule.pattern)}\\b`, 'gi')
      : new RegExp(escapeRegex(rule.pattern), 'gi');

    const occurrences = [];
    lines.forEach((line, idx) => {
      let match;
      const lineRegex = new RegExp(regex.source, 'gi');
      while ((match = lineRegex.exec(line)) !== null) {
        occurrences.push({ line: idx + 1, snippet: line.trim().slice(0, 120) });
      }
    });
    if (occurrences.length === 0) continue;

    // Tiering exists to keep the SCORE honest (a single legitimate "robust"
    // shouldn't tank a document). --mode scan (includeSuppressed) bypasses it
    // deliberately: /clearfelt humanize's balanced/full_rewrite/structural_rework
    // tiers need to see every occurrence, not just the ones that survived
    // tier-suppression, or they can never touch the words tiering was hiding
    // from the score. .clearfelt/domain.md's exemption list is still the right
    // tool for genuinely legitimate jargon; tiering was never meant to protect
    // humanize's editing scope, only the scored number.
    if (!includeSuppressed) {
      if (rule.tier === 3 && occurrences.length < (config.tier3_density_threshold ?? 3)) continue;
      if (rule.tier === 2 && occurrences.length < 2) {
        // tier 2 needs another hit within the cluster window; approximate via
        // "more than one occurrence of anything" rather than tracking word offsets exactly.
        continue;
      }
    }

    for (const occ of occurrences) {
      hits.push({
        category: rule.category,
        pattern: rule.pattern,
        severity: rule.severity,
        tier: rule.tier,
        source: rule.source ?? 'unattributed',
        ...occ,
      });
    }
  }
  return hits;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A rule for "leverage" should also catch "leveraging"; a rule for "seamless"
// should also catch "seamlessly." Exact-literal-form matching missed these
// (found via testing, see docs/decisions/0009 and the round-9/10 dogfooding
// notes in CHANGELOG.md). This is a heuristic, not real stemming: it handles
// the common case (silent-e drop before -ing/-ed, plus -s/-es/-ed/-ing/-ly)
// and won't catch irregular derivations (e.g. "synergistic" from "synergy"),
// which still need their own separate rule entry.
function inflectionPattern(word) {
  if (/e$/i.test(word)) {
    const stem = escapeRegex(word.slice(0, -1));
    return `(?:${stem}(?:e|es|ed|ing)?)`;
  }
  if (/[^aeiou]y$/i.test(word)) {
    // consonant + y: synergy -> synergies, not "synergys"
    const stem = escapeRegex(word.slice(0, -1));
    return `(?:${escapeRegex(word)}|${stem}ies)`;
  }
  return `(?:${escapeRegex(word)}(?:s|es|ed|ing|ly)?)`;
}

// ---- scoring ----

function computeScore(text, hits, config) {
  const categoryWeight = (category) => config[category] ?? 1.0;
  let deduction = 0;
  for (const hit of hits) deduction += hit.severity * categoryWeight(hit.category);

  // Rule-hit deduction is an unbounded linear sum, one document can rack up
  // 80+ points, while every statistical signal below is bounded to a small
  // range by its own formula. Measured across 17 real documents scored
  // during development (see docs/decisions/0011), deduction spanned 0-86
  // while the statistical signals combined never exceeded about 5 points in
  // either direction. Past a handful of rule hits, deduction doesn't just
  // dominate the score, it mathematically zeroes out everything else's
  // ability to matter at all. deduction_cap stops that: once deduction
  // exceeds the cap, the document is already unambiguously in "needs work"
  // territory (below empathy_threshold's default of 85 many times over),
  // and further raw deduction adds no decision-relevant resolution, so
  // capping it here preserves headroom for the other signals to still mean
  // something instead of losing that ability whenever a document is bad
  // enough. The raw, uncapped sum is still reported (deductionRaw) so
  // nothing is silently hidden, only the score-affecting value is capped.
  const deductionCap = config.deduction_cap ?? 65;
  const deductionApplied = Math.min(deduction, deductionCap);

  const { coefficientOfVariation } = burstinessScore(text);
  const burstinessAdjustment = (Math.min(coefficientOfVariation, 1) - 0.5) * (config.burstiness_weight ?? 12);

  const ttr = typeTokenRatio(text);
  const vocabAdjustment = (ttr - 0.4) * (config.vocabulary_diversity_weight ?? 17);

  const repetition = trigramRepetitionRatio(text);
  const repetitionPenalty = repetition * (config.repetition_weight ?? 27) * 10;

  const { sentenceCount } = burstinessScore(text);
  const { coefficientOfVariation: paragraphCV, paragraphCount } = paragraphStructureScore(text);
  const paragraphVarietyAdjustment =
    paragraphCount >= 2 ? (Math.min(paragraphCV, 1) - 0.5) * (config.paragraph_variety_weight ?? 12) : 0;
  const wallOfTextPenalty =
    paragraphCount <= 1 && sentenceCount >= (config.wall_of_text_sentence_threshold ?? 5)
      ? config.wall_of_text_penalty ?? 15
      : 0;

  let score =
    100 -
    deductionApplied +
    burstinessAdjustment +
    vocabAdjustment -
    repetitionPenalty +
    paragraphVarietyAdjustment -
    wallOfTextPenalty;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Every component above gets folded into the final score with a mix of
  // "+" and "-" in the formula, which is fine for the math but confusing to
  // present raw: some fields (repetitionPenalty, wallOfTextPenalty) are
  // stored as positive magnitudes that always subtract, others
  // (burstinessAdjustment, vocabAdjustment, paragraphVarietyAdjustment) are
  // already signed and can go either way. `impacts` normalizes all of them
  // to "how many points this actually added or removed," one consistent
  // sign convention, sorted by magnitude so the biggest driver of the score
  // is always first, not buried in a fixed formula-order list. Uses
  // deductionApplied, the capped value, since that's what actually moved
  // the score; deductionRaw is still available separately for anyone
  // debugging why a document with a very high raw deduction didn't score
  // as low as they expected.
  const deductionCapped = deduction > deductionCap;
  const impacts = [
    {
      label: deductionCapped ? `Rule-hit deduction (capped from ${deduction})` : 'Rule-hit deduction',
      impact: -deductionApplied,
    },
    { label: 'Sentence-rhythm (burstiness)', impact: burstinessAdjustment },
    { label: 'Vocabulary diversity', impact: vocabAdjustment },
    { label: 'Repeated-phrase penalty', impact: -repetitionPenalty },
    { label: 'Paragraph-variety', impact: paragraphVarietyAdjustment },
    { label: 'Wall-of-text penalty', impact: -wallOfTextPenalty },
  ]
    .map((row) => ({ ...row, impact: Number(row.impact.toFixed(2)) }))
    .filter((row) => row.impact !== 0)
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    score,
    deduction,
    deductionApplied,
    deductionCapped,
    burstinessAdjustment,
    vocabAdjustment,
    repetitionPenalty,
    paragraphVarietyAdjustment,
    wallOfTextPenalty,
    typeTokenRatio: ttr,
    trigramRepetitionRatio: repetition,
    paragraphCount,
    impacts,
  };
}

// Collapses repeated hits of the same pattern into one row (occurrence count
// plus every line number) and sorts by how many points that pattern actually
// cost (severity times how often it fired), so the worst offender is first
// instead of the reader having to scan a flat, unsorted list to find it.
function summarizePatterns(hits, config) {
  const byPattern = new Map();
  for (const hit of hits) {
    const key = `${hit.category}|${hit.pattern}`;
    if (!byPattern.has(key)) {
      byPattern.set(key, {
        pattern: hit.pattern,
        category: hit.category,
        severity: hit.severity,
        source: hit.source,
        occurrences: 0,
        lines: [],
      });
    }
    const entry = byPattern.get(key);
    entry.occurrences += 1;
    entry.lines.push(hit.line);
  }
  const weight = (category) => config[category] ?? 1.0;
  return [...byPattern.values()]
    .map((entry) => ({ ...entry, points: Number((entry.severity * weight(entry.category) * entry.occurrences).toFixed(2)) }))
    .sort((a, b) => b.points - a.points);
}

// Per-category point subtotal (severity-weighted, not just a raw hit count),
// sorted descending, so "9 puffery_lexicon hits" and "1 severity-8 hit" are
// never presented as if they carried equal weight in the score.
function summarizeCategoryPoints(hits, config) {
  const weight = (category) => config[category] ?? 1.0;
  const totals = new Map();
  for (const hit of hits) {
    const points = hit.severity * weight(hit.category);
    const existing = totals.get(hit.category) ?? { category: hit.category, points: 0, hits: 0 };
    existing.points += points;
    existing.hits += 1;
    totals.set(hit.category, existing);
  }
  return [...totals.values()]
    .map((row) => ({ ...row, points: Number(row.points.toFixed(2)) }))
    .sort((a, b) => b.points - a.points);
}

// ---- baseline diff ----

function diffAgainstBaseline(hits, baselinePath) {
  if (!baselinePath || !existsSync(baselinePath)) return hits;
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const seen = new Set(baseline.hits.map((h) => `${h.category}|${h.pattern}|${h.line}`));
  return hits.filter((h) => !seen.has(`${h.category}|${h.pattern}|${h.line}`));
}

// ---- main ----

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.paths.length === 0) {
    console.error('Usage: node scripts/detect.mjs --mode <report|score> <path> [--save-baseline <file>] [--baseline <file>] [--voice <name>]');
    process.exit(1);
  }

  const targetPath = resolve(args.paths[0]);
  const text = readFileSync(targetPath, 'utf8');
  const scanText = stripExcludedRegions(text);

  const { all: rules } = loadRules();
  const config = loadConfig();
  const voiceOverrides = loadVoiceProfileOverrides(process.cwd(), config, args.voice);
  const domainOverrides = loadDomainOverrides(process.cwd());
  const overrides = new Set([...voiceOverrides, ...domainOverrides]);

  if (args.mode === 'scan') {
    const allOccurrences = findHits(scanText, rules, config, overrides, { includeSuppressed: true });
    console.log(JSON.stringify({ target: targetPath, occurrences: allOccurrences }, null, 2));
    return;
  }

  const allHits = findHits(scanText, rules, config, overrides);
  const reportedHits = args.baseline ? diffAgainstBaseline(allHits, resolve(args.baseline)) : allHits;
  const scoring = computeScore(scanText, allHits, config);
  const readability = computeReadability(scanText);
  const readabilityTarget = {
    target_grade_level_min: config.target_grade_level_min,
    target_grade_level_max: config.target_grade_level_max,
    ...loadDomainReadabilityTarget(process.cwd()),
  };
  readability.withinTargetRange =
    readability.fleschKincaidGrade >= readabilityTarget.target_grade_level_min &&
    readability.fleschKincaidGrade <= readabilityTarget.target_grade_level_max;

  if (args.saveBaseline) {
    writeFileSync(resolve(args.saveBaseline), JSON.stringify({ hits: allHits }, null, 2));
  }

  if (args.mode === 'score') {
    console.log(JSON.stringify({ score: scoring.score }));
    return;
  }

  const byCategory = {};
  for (const hit of reportedHits) {
    byCategory[hit.category] = (byCategory[hit.category] || 0) + 1;
  }

  const patternSummary = summarizePatterns(reportedHits, config);
  const categoryPoints = summarizeCategoryPoints(reportedHits, config);
  const topImpact = scoring.impacts[0];
  const leadDriver = topImpact
    ? `${topImpact.label} (${topImpact.impact > 0 ? '+' : ''}${topImpact.impact} of the score)`
    : 'no single factor dominates; every signal is near zero';

  console.log(
    JSON.stringify(
      {
        target: targetPath,
        score: scoring.score,
        leadDriver,
        breakdown: {
          impacts: scoring.impacts,
          deduction: scoring.deduction,
          deductionApplied: scoring.deductionApplied,
          deductionCapped: scoring.deductionCapped,
          burstinessAdjustment: Number(scoring.burstinessAdjustment.toFixed(2)),
          vocabAdjustment: Number(scoring.vocabAdjustment.toFixed(2)),
          repetitionPenalty: Number(scoring.repetitionPenalty.toFixed(2)),
          paragraphVarietyAdjustment: Number(scoring.paragraphVarietyAdjustment.toFixed(2)),
          wallOfTextPenalty: Number(scoring.wallOfTextPenalty.toFixed(2)),
          typeTokenRatio: Number(scoring.typeTokenRatio.toFixed(3)),
          trigramRepetitionRatio: Number(scoring.trigramRepetitionRatio.toFixed(3)),
          paragraphCount: scoring.paragraphCount,
        },
        categoryCounts: byCategory,
        categoryPoints,
        patternSummary,
        hits: reportedHits,
        readability,
      },
      null,
      2,
    ),
  );
}

main();
