// Regression suite for scripts/detect.mjs. Runs the script as a real
// subprocess, exactly the way a user invokes it, rather than importing
// internals: detect.mjs is a script (unconditional `main()` at the bottom),
// not a library, and testing it as one keeps this suite honest about what
// actually ships. Uses only node:test/node:assert (Node's built-in test
// runner), no new dependency, per CLAUDE.md's dependency-free rule.
//
// Known gap, not fixed here: `loadConfig()` reads `~/.clearfelt/settings.md`
// via `os.homedir()` with no override hook, so the config-weight regression
// test below temporarily writes and then removes a real file in the
// machine's home directory. Acceptable for now; a future refactor could add
// a CLEARFELT_HOME env override to avoid touching the real home directory
// during tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DETECT = join(ROOT, 'scripts', 'detect.mjs');
const FIXTURES = join(__dirname, 'fixtures');

function run(fixture, extraArgs = []) {
  const out = execFileSync(
    process.execPath,
    [DETECT, '--mode', 'report', join(FIXTURES, fixture), ...extraArgs],
    { cwd: FIXTURES, encoding: 'utf8' },
  );
  return JSON.parse(out);
}

test('ai-heavy-sample.md: known hits, deduction, and wall-of-text penalty', () => {
  const result = run('ai-heavy-sample.md');
  assert.equal(result.score, 60);
  assert.equal(result.breakdown.deduction, 28);
  assert.equal(result.breakdown.deductionApplied, 28);
  assert.equal(result.breakdown.deductionCapped, false);
  assert.equal(result.breakdown.wallOfTextPenalty, 15);
  assert.equal(result.breakdown.paragraphCount, 1);
  assert.deepEqual(result.categoryCounts, {
    fake_profound_closers: 1,
    high_frequency_lexicon: 2,
    puffery_lexicon: 1,
  });
  assert.equal(result.hits.length, 4);
});

test('ai-heavy-sample.md: impacts and category points are sorted by magnitude, descending', () => {
  const result = run('ai-heavy-sample.md');
  const impacts = result.breakdown.impacts;
  assert.equal(impacts[0].label, 'Rule-hit deduction');
  for (let i = 1; i < impacts.length; i++) {
    assert.ok(Math.abs(impacts[i - 1].impact) >= Math.abs(impacts[i].impact), 'impacts must be sorted by |impact| descending');
  }
  assert.equal(impacts.some((row) => row.impact === 0), false, 'a zero-impact factor should be omitted, not printed as 0');

  const points = result.categoryPoints;
  assert.equal(points[0].category, 'high_frequency_lexicon'); // delve (8) + tapestry (7) = 15, the fixture's largest category subtotal
  for (let i = 1; i < points.length; i++) {
    assert.ok(points[i - 1].points >= points[i].points, 'categoryPoints must be sorted descending');
  }

  assert.equal(result.patternSummary.length, 4); // one row per distinct pattern, matching the 4 hits in this fixture
  for (const row of result.patternSummary) {
    assert.equal(row.occurrences, row.lines.length, `${row.pattern}: occurrences must match the number of recorded lines`);
  }
  for (let i = 1; i < result.patternSummary.length; i++) {
    assert.ok(result.patternSummary[i - 1].points >= result.patternSummary[i].points, 'patternSummary must be sorted by points descending');
  }
});

test('extreme-slop-sample.md: raw deduction beyond deduction_cap is capped, not silently discarded', () => {
  const result = run('extreme-slop-sample.md');
  assert.ok(result.breakdown.deduction > 65, 'fixture must exceed the cap for this test to mean anything');
  assert.equal(result.breakdown.deductionApplied, 65);
  assert.equal(result.breakdown.deductionCapped, true);
  assert.match(result.breakdown.impacts[0].label, /capped from \d+/, 'the top impact label must disclose the raw deduction, not just the capped one');
});

test('human-sample.md: no rule hits, clean score, multiple paragraphs', () => {
  const result = run('human-sample.md');
  assert.equal(result.hits.length, 0);
  assert.equal(result.breakdown.deduction, 0);
  assert.equal(result.breakdown.wallOfTextPenalty, 0);
  assert.equal(result.breakdown.paragraphCount, 4);
  assert.ok(result.score >= 85, `expected score >= 85, got ${result.score}`);
});

test('regression: category severity weights from config actually multiply the deduction', () => {
  // Round-9 bug: loadConfig() never parsed the "Category severity weights"
  // section, and computeScore looked up a `weight_<category>` key that was
  // never populated, so every category silently scored at 1.0 regardless of
  // clearfelt.config.md. This reproduces that exact scenario via the
  // highest-precedence override file and asserts the weight actually lands.
  const settingsDir = join(homedir(), '.clearfelt');
  const settingsPath = join(settingsDir, 'settings.md');
  const dirAlreadyExisted = existsSync(settingsDir);
  const fileAlreadyExisted = existsSync(settingsPath);
  const previousContent = fileAlreadyExisted ? readFileSync(settingsPath, 'utf8') : null;

  try {
    const baseline = run('ai-heavy-sample.md');
    const puffuryHit = baseline.hits.find((h) => h.category === 'puffery_lexicon');
    assert.ok(puffuryHit, 'fixture must contain a puffery_lexicon hit for this test to mean anything');

    if (!dirAlreadyExisted) mkdirSync(settingsDir, { recursive: true });
    writeFileSync(
      settingsPath,
      ['## Category severity weights', '', '| Category | Weight multiplier |', '|---|---|', '| puffery_lexicon | 0.5 |', ''].join('\n'),
    );

    const weighted = run('ai-heavy-sample.md');
    const expectedDrop = puffuryHit.severity * 0.5; // 0.5, not the old buggy 1.0
    assert.equal(
      weighted.breakdown.deduction,
      baseline.breakdown.deduction - expectedDrop,
      'a 0.5 category weight in ~/.clearfelt/settings.md should cut that category\'s contribution in half',
    );
  } finally {
    if (fileAlreadyExisted) writeFileSync(settingsPath, previousContent);
    else if (existsSync(settingsPath)) rmSync(settingsPath);
    if (!dirAlreadyExisted && existsSync(settingsDir)) rmSync(settingsDir, { recursive: true, force: true });
  }
});
