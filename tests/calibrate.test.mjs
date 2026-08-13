// Regression suite for scripts/calibrate.mjs. Runs the script as a real
// subprocess, same convention as tests/detect.test.mjs, since it's a script
// (unconditional `main()` at the bottom), not a library.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CALIBRATE = join(ROOT, 'scripts', 'calibrate.mjs');
const FIXTURES = join(__dirname, 'fixtures');

function run(...args) {
  const out = execFileSync(process.execPath, [CALIBRATE, ...args], { cwd: FIXTURES, encoding: 'utf8' });
  return JSON.parse(out);
}

test('single file: reports the three baseline numbers reused from score.mjs, plus word count', () => {
  const result = run('human-sample.md');
  assert.equal(result.fileCount, 1);
  assert.ok(result.wordCount > 0);
  assert.ok(result.baseline_mattr >= 0 && result.baseline_mattr <= 1, 'MATTR must be in 0-1');
  assert.ok(result.baseline_burstiness_cv >= 0 && result.baseline_burstiness_cv <= 1, 'burstiness CV must be clamped to 0-1');
  assert.ok(
    result.baseline_paragraph_cv >= 0 && result.baseline_paragraph_cv <= 1,
    'paragraph CV must be clamped to 0-1',
  );
});

test('thin sample warns below the 300-word threshold', () => {
  const result = run('human-sample.md');
  assert.ok(result.wordCount < 300, 'fixture must be a thin sample for this test to mean anything');
  assert.ok(result.warning, 'expected a thin-sample warning');
  assert.match(result.warning, /noisy/);
});

test('directory: pools every .md/.txt/.mdx file and reports the real file count', () => {
  const result = run('.');
  assert.ok(result.fileCount >= 2, 'fixtures directory has multiple scannable files');
  assert.ok(result.wordCount > 0);
});

test('a directory pooling more words than one file, in general, does not throw or return zero', () => {
  const single = run('human-sample.md');
  const dir = run('.');
  assert.ok(dir.wordCount >= single.wordCount, 'pooling every fixture should not have fewer words than one fixture alone');
});

test('empty directory (no .md/.txt/.mdx files): exits non-zero with a clear error', () => {
  const emptyDir = join(FIXTURES, 'empty-for-calibrate-test');
  mkdirSync(emptyDir, { recursive: true });
  try {
    assert.throws(() => run('empty-for-calibrate-test'), /Command failed/);
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('a path outside the project directory is refused, even when it exists', () => {
  const outsideDir = join(tmpdir(), 'clearfelt-calibrate-outside-test');
  mkdirSync(outsideDir, { recursive: true });
  try {
    assert.throws(() => run(outsideDir), /Command failed/);
  } finally {
    if (existsSync(outsideDir)) rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('missing path exits non-zero with a clear error', () => {
  assert.throws(() => run('does-not-exist.md'), /Command failed/);
});

test('no argument prints usage and exits non-zero', () => {
  assert.throws(() => run(), /Command failed/);
});

test('--help prints usage and exits zero (unlike a bare missing argument)', () => {
  const out = execFileSync(process.execPath, [CALIBRATE, '--help'], { cwd: FIXTURES, encoding: 'utf8' });
  assert.match(out, /Usage:/);
});

test('-h (short flag) behaves identically to --help', () => {
  const out = execFileSync(process.execPath, [CALIBRATE, '-h'], { cwd: FIXTURES, encoding: 'utf8' });
  assert.match(out, /Usage:/);
});

test('directory mode: a non-.md/.txt/.mdx file at the top level is silently excluded, not counted or read', () => {
  const baseline = run('.');
  const jsonPath = join(FIXTURES, 'calibrate-non-scannable-test.json');
  writeFileSync(jsonPath, JSON.stringify({ this: 'must not be counted as a scannable file' }));
  try {
    const withExtraFile = run('.');
    assert.equal(withExtraFile.fileCount, baseline.fileCount, 'a .json file must not be picked up by directory mode at all');
  } finally {
    rmSync(jsonPath);
  }
});

test('a file with zero matched words (numbers/symbols only) reports wordCount 0, not a crash', () => {
  const path = join(FIXTURES, 'calibrate-zero-words-test.md');
  writeFileSync(path, '12345 678.90 !!! ... ---\n');
  try {
    const result = run('calibrate-zero-words-test.md');
    assert.equal(result.wordCount, 0);
    assert.ok(result.warning, 'zero words is well under the thin-sample threshold, must still warn');
  } finally {
    rmSync(path);
  }
});

test('a sample at or above the 300-word threshold reports no warning field at all', () => {
  const result = run('.');
  assert.ok(result.wordCount >= 300, 'the pooled fixtures directory must exceed the threshold for this test to mean anything');
  assert.equal('warning' in result, false);
});
