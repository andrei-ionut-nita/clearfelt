// Reporting layer: turns rule hits and a computed score into the summarized,
// sorted shapes the CLI actually prints (pattern/category summaries,
// baseline diffing, and the single-file orchestration function used by both
// single-target and directory-scan modes). Split out of detect.mjs along
// with rule matching (scripts/lib/rules.mjs) and scoring (scripts/lib/score.mjs).

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripExcludedRegions, findHits, loadRegisterRules } from './rules.mjs';
import { computeScore, computeReadability } from './score.mjs';
import { loadDomainReadabilityTarget } from './config.mjs';
import { languageConfidence } from './language.mjs';

// Collapses repeated hits of the same pattern into one row (occurrence count
// plus every line number) and sorts by how many points that pattern actually
// cost (severity times how often it fired), so the worst offender is first
// instead of the reader having to scan a flat, unsorted list to find it.
export function summarizePatterns(hits, config) {
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
export function summarizeCategoryPoints(hits, config) {
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

export function diffAgainstBaseline(hits, baselinePath) {
  if (!baselinePath || !existsSync(baselinePath)) return hits;
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const seen = new Set(baseline.hits.map((h) => `${h.category}|${h.pattern}|${h.line}`));
  return hits.filter((h) => !seen.has(`${h.category}|${h.pattern}|${h.line}`));
}

// ---- single-file scoring (shared by single-target and directory-scan modes) ----

// Runs the full scan/score/report pipeline for one file and returns
// { format, payload } rather than printing, so directory mode can call this
// once per file and aggregate. `format` mirrors the exact JSON.stringify
// call each mode used before this was extracted (compact for score, pretty
// for report/scan), so single-file output is byte-for-byte unchanged.
export function runFile(targetPath, args, rules, config, overrides, register = 'neutral') {
  const text = readFileSync(targetPath, 'utf8');
  const scanText = stripExcludedRegions(text);

  if (args.mode === 'scan') {
    const allOccurrences = findHits(scanText, rules, config, overrides, { includeSuppressed: true });
    return { format: 'pretty', payload: { target: targetPath, occurrences: allOccurrences } };
  }

  // Register hits (docs/decisions/0024) are computed from a wholly separate
  // list than `rules` above and never touch `allHits` below, so they can
  // never reach computeScore: a register mismatch is an advisory note about
  // tone, not evidence the text reads AI-written, and folding it into the
  // Human Score would make that one number mean two different things
  // depending on a voice-profile setting the reader of a bare score can't
  // see. 'neutral' (the default) consults neither list, so a project that
  // never sets register: sees this cost nothing, not even an extra hit scan.
  // includeSuppressed: true bypasses findHits's tier-2/tier-3 clustering
  // logic, which exists only to keep the SCORE honest against a single
  // legitimate word choice (see rules.mjs's own comment on this). Register
  // hits never reach computeScore, so that suppression has nothing to
  // protect here and would only silently drop a real, isolated mismatch
  // (found via a one-hit test case: a lone "faking" in a short sentence was
  // dropped because tier 2 requires a second nearby hit, a rule that makes
  // sense for a scored deduction and none at all for an advisory note).
  let registerHits = [];
  if (register !== 'neutral') {
    const registerRules = loadRegisterRules();
    registerHits = findHits(
      scanText,
      register === 'warm' ? registerRules.accusatory : registerRules.hedging,
      config,
      overrides,
      { includeSuppressed: true },
    );
  }

  // Computed once here (not just in report mode) so /clearfelt write and
  // /clearfelt rewrite's iterative --mode score calls (prompts/write_loop.xml,
  // prompts/audit_loop.xml) see this too, not only a standalone /clearfelt
  // audit report. Only present when it actually fires, see docs/decisions/0023.
  const langSignal = languageConfidence(scanText);
  const languageWarning =
    langSignal?.low
      ? {
          scoreReliability: 'low',
          languageConfidence: langSignal.confidence,
          languageWarning:
            'This text may not be English. The Human Score\'s statistical baselines and rule dictionary are ' +
            'English-calibrated (see docs/RESEARCH.md); this score may not mean what it looks like it means.',
        }
      : {};

  const allHits = findHits(scanText, rules, config, overrides);
  const reportedHits = args.baseline ? diffAgainstBaseline(allHits, resolve(args.baseline)) : allHits;
  const scoring = computeScore(scanText, allHits, config, args.exemptRepetition ?? []);
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
    // `target` is included alongside `score` so directory mode can label
    // each file's result; single-target callers already only read `.score`.
    return { format: 'compact', payload: { target: targetPath, score: scoring.score, ...languageWarning } };
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

  return {
    format: 'pretty',
    payload: {
      target: targetPath,
      score: scoring.score,
      leadDriver,
      ...languageWarning,
      ...(args.exemptRepetition?.length ? { exemptRepetition: args.exemptRepetition } : {}),
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
        rootTypeTokenRatio: Number(scoring.rootTypeTokenRatio.toFixed(2)),
        movingAverageTtr: Number(scoring.movingAverageTtr.toFixed(3)),
        trigramRepetitionRatio: Number(scoring.trigramRepetitionRatio.toFixed(3)),
        paragraphCount: scoring.paragraphCount,
      },
      categoryCounts: byCategory,
      categoryPoints,
      patternSummary,
      hits: reportedHits,
      readability,
      ...(register !== 'neutral' ? { registerCheck: { register, hits: registerHits } } : {}),
    },
  };
}
