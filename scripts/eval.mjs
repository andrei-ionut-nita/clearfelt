#!/usr/bin/env node
/**
 * Lightweight sanity check for the Empathy Index's scoring weights, not a
 * substitute for real validation. Runs every fixture in
 * tests/fixtures/eval/manifest.json through detect.mjs and reports how many
 * land in their labeled expected band. A low pass rate is a real finding
 * about the detector's precision or recall, report it plainly, don't tune
 * the bands until it passes.
 *
 * Usage: node scripts/eval.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DETECT = join(ROOT, 'scripts', 'detect.mjs');
const EVAL_DIR = join(ROOT, 'tests', 'fixtures', 'eval');

const manifest = JSON.parse(readFileSync(join(EVAL_DIR, 'manifest.json'), 'utf8'));

let passed = 0;
const results = [];

for (const entry of manifest.fixtures) {
  const out = execFileSync(process.execPath, [DETECT, '--mode', 'score', join(EVAL_DIR, entry.file)], {
    cwd: EVAL_DIR,
    encoding: 'utf8',
  });
  const { score } = JSON.parse(out);
  const min = entry.expectedMin ?? 0;
  const max = entry.expectedMax ?? 100;
  const inBand = score >= min && score <= max;
  if (inBand) passed++;
  results.push({ file: entry.file, label: entry.label, score, band: `${min}-${max}`, inBand });
}

for (const r of results) {
  const mark = r.inBand ? 'in-band ' : 'OUT OF BAND';
  console.log(`${mark}  ${r.file.padEnd(14)} label=${r.label.padEnd(6)} score=${String(r.score).padStart(3)}  expected ${r.band}`);
}
console.log(`\n${passed}/${manifest.fixtures.length} fixtures scored within their expected band`);
