#!/usr/bin/env node
/**
 * Scores recorded judgment runs (tests/fixtures/qualitative/runs/*.json)
 * against tests/fixtures/qualitative/manifest.json's expected labels for
 * the five "Qualitative signals" in reference/audit.md (narrative
 * idiosyncrasy, episodic grounding, cognitive friction, synonym cycling,
 * admits real stakes). These are a reasoning step, not a regex-checkable
 * rule (see reference/audit.md), so unlike scripts/eval.mjs this script
 * cannot produce a judgment itself; it only reports on judgments a Claude
 * Code session already recorded. See tests/fixtures/qualitative/runs/README.md
 * for how to record one.
 *
 * Usage: node scripts/qualitative-eval.mjs
 *
 * With zero runs recorded, this prints the manifest and instructions, not
 * an error: an empty runs/ directory is the expected starting state, not a
 * broken one.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FIXTURES_DIR = join(ROOT, 'tests', 'fixtures', 'qualitative');
const RUNS_DIR = join(FIXTURES_DIR, 'runs');

const manifest = JSON.parse(readFileSync(join(FIXTURES_DIR, 'manifest.json'), 'utf8'));
const SIGNALS = ['narrativeIdiosyncrasy', 'episodicGrounding', 'cognitiveFriction', 'noSynonymCycling', 'admitsRealStakes'];

function loadRuns() {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(RUNS_DIR, f), 'utf8')));
}

function accuracy(run) {
  let correct = 0;
  let total = 0;
  const perSignal = Object.fromEntries(SIGNALS.map((s) => [s, { correct: 0, total: 0 }]));
  for (const fixture of manifest.fixtures) {
    const judged = run.judgments[fixture.file];
    if (!judged) continue;
    for (const signal of SIGNALS) {
      total += 1;
      perSignal[signal].total += 1;
      if (judged[signal] === fixture.expected[signal]) {
        correct += 1;
        perSignal[signal].correct += 1;
      }
    }
  }
  return { correct, total, perSignal };
}

// Simple percent-agreement between two runs' judgments on the same fixture
// set, signal by signal. Not Cohen's kappa (no chance-agreement correction):
// this repo stays dependency-free and the fixture set is small enough that
// a kappa's extra assumptions would outrun what four fixtures can actually
// support. Percent agreement is the honest, legible number at this scale.
function pairwiseAgreement(runA, runB) {
  let agree = 0;
  let total = 0;
  for (const fixture of manifest.fixtures) {
    const a = runA.judgments[fixture.file];
    const b = runB.judgments[fixture.file];
    if (!a || !b) continue;
    for (const signal of SIGNALS) {
      total += 1;
      if (a[signal] === b[signal]) agree += 1;
    }
  }
  return { agree, total };
}

const runs = loadRuns();

if (runs.length === 0) {
  console.log(`No runs recorded yet in ${join('tests', 'fixtures', 'qualitative', 'runs')}/.`);
  console.log(`${manifest.fixtures.length} fixtures are labeled and waiting to be judged: ${manifest.fixtures.map((f) => f.file).join(', ')}`);
  console.log('\nSee tests/fixtures/qualitative/runs/README.md for how to record a judgment run.');
  process.exit(0);
}

console.log(`${runs.length} run(s) recorded.\n`);

for (const run of runs) {
  const { correct, total, perSignal } = accuracy(run);
  console.log(`${run.runId} (${run.judge}, ${run.date}): ${correct}/${total} signal-level judgments match the manifest's expected labels`);
  for (const signal of SIGNALS) {
    const s = perSignal[signal];
    console.log(`  ${signal.padEnd(20)} ${s.correct}/${s.total}`);
  }
}

if (runs.length >= 2) {
  console.log('\nPairwise agreement between runs (the actual consistency measure, not just correctness against the manifest):');
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const { agree, total } = pairwiseAgreement(runs[i], runs[j]);
      const pct = total > 0 ? Math.round((100 * agree) / total) : 0;
      console.log(`  ${runs[i].runId} vs ${runs[j].runId}: ${agree}/${total} (${pct}%)`);
    }
  }
} else {
  console.log('\nOnly one run recorded; record a second, independent run to see pairwise agreement (the consistency measure this harness exists for, not just one pass\'s accuracy).');
}
