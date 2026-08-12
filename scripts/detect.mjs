#!/usr/bin/env node
/**
 * clearfelt detector: parses the Markdown rule files under rules/, scans a
 * target file against them, and prints a deterministic JSON score report.
 * Zero external dependencies, Node stdlib only.
 *
 * Usage:
 *   node scripts/detect.mjs --mode report <path> [--save-baseline <file>] [--baseline <file>]
 *   node scripts/detect.mjs --mode score <path>
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { mode: 'report', paths: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--save-baseline') args.saveBaseline = argv[++i];
    else if (a === '--baseline') args.baseline = argv[++i];
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

function loadConfig() {
  const configPath = join(ROOT, 'clearfelt.config.md');
  const defaults = {
    empathy_threshold: 85,
    max_iterations: 3,
    intensity: 'conservative',
    tier2_cluster_window: 40,
    tier3_density_threshold: 3,
    burstiness_weight: 10,
    vocabulary_diversity_weight: 5,
    repetition_weight: 5,
  };
  if (!existsSync(configPath)) return defaults;
  const text = readFileSync(configPath, 'utf8');
  return {
    ...defaults,
    ...parseConfigTable(text, 'Scoring'),
    ...parseConfigTable(text, 'Tier thresholds'),
    ...parseConfigTable(text, 'Statistical signals'),
  };
}

// ---- voice profile precedence ----

function loadVoiceProfileOverrides(targetDir) {
  const profilePath = join(targetDir, '.clearfelt', 'voice-profile.md');
  if (!existsSync(profilePath)) return new Set();
  const text = readFileSync(profilePath, 'utf8');
  const start = text.indexOf('## Words I want to keep using');
  if (start === -1) return new Set();
  const section = text.slice(start).split(/\n##\s+/)[0];
  const overrides = new Set();
  for (const line of section.split('\n')) {
    const m = line.match(/^-\s+(.+)$/);
    if (m) overrides.add(m[1].trim().toLowerCase());
  }
  return overrides;
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

// ---- matching ----

function findHits(text, rules, config, overrides) {
  const hits = [];
  const lines = text.split('\n');

  for (const rule of rules) {
    if (overrides.has(rule.pattern.toLowerCase())) continue;
    const isSingleWord = !rule.pattern.includes(' ');
    const regex = isSingleWord
      ? new RegExp(`\\b${escapeRegex(rule.pattern)}\\b`, 'gi')
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

    if (rule.tier === 3 && occurrences.length < (config.tier3_density_threshold ?? 3)) continue;
    if (rule.tier === 2 && occurrences.length < 2) {
      // tier 2 needs another hit within the cluster window; approximate via
      // "more than one occurrence of anything" rather than tracking word offsets exactly.
      continue;
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

// ---- scoring ----

function computeScore(text, hits, config) {
  const categoryWeight = (category) => config[`weight_${category}`] ?? 1.0;
  let deduction = 0;
  for (const hit of hits) deduction += hit.severity * categoryWeight(hit.category);

  const { coefficientOfVariation } = burstinessScore(text);
  const burstinessAdjustment = (Math.min(coefficientOfVariation, 1) - 0.5) * (config.burstiness_weight ?? 10);

  const ttr = typeTokenRatio(text);
  const vocabAdjustment = (ttr - 0.4) * (config.vocabulary_diversity_weight ?? 5);

  const repetition = trigramRepetitionRatio(text);
  const repetitionPenalty = repetition * (config.repetition_weight ?? 5) * 10;

  let score = 100 - deduction + burstinessAdjustment + vocabAdjustment - repetitionPenalty;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, deduction, burstinessAdjustment, vocabAdjustment, repetitionPenalty, typeTokenRatio: ttr, trigramRepetitionRatio: repetition };
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
    console.error('Usage: node scripts/detect.mjs --mode <report|score> <path> [--save-baseline <file>] [--baseline <file>]');
    process.exit(1);
  }

  const targetPath = resolve(args.paths[0]);
  const text = readFileSync(targetPath, 'utf8');
  const scanText = stripExcludedRegions(text);

  const { all: rules } = loadRules();
  const config = loadConfig();
  const overrides = loadVoiceProfileOverrides(process.cwd());

  const allHits = findHits(scanText, rules, config, overrides);
  const reportedHits = args.baseline ? diffAgainstBaseline(allHits, resolve(args.baseline)) : allHits;
  const scoring = computeScore(scanText, allHits, config);

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

  console.log(
    JSON.stringify(
      {
        target: targetPath,
        score: scoring.score,
        breakdown: {
          deduction: scoring.deduction,
          burstinessAdjustment: Number(scoring.burstinessAdjustment.toFixed(2)),
          vocabAdjustment: Number(scoring.vocabAdjustment.toFixed(2)),
          repetitionPenalty: Number(scoring.repetitionPenalty.toFixed(2)),
          typeTokenRatio: Number(scoring.typeTokenRatio.toFixed(3)),
          trigramRepetitionRatio: Number(scoring.trigramRepetitionRatio.toFixed(3)),
        },
        categoryCounts: byCategory,
        hits: reportedHits,
      },
      null,
      2,
    ),
  );
}

main();
