// Regression suite for scripts/check.mjs. Runs the script as a real
// subprocess against fixtures under tests/fixtures/check/, same convention
// as tests/detect.test.mjs. Uses only node:test/node:assert, no new
// dependency, per CLAUDE.md's dependency-free rule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHECK = join(ROOT, 'scripts', 'check.mjs');
const FIXTURES = join(__dirname, 'fixtures', 'check');

function run(before, after) {
  try {
    const out = execFileSync(
      process.execPath,
      [CHECK, '--before', join(FIXTURES, before), '--after', join(FIXTURES, after)],
      { cwd: FIXTURES, encoding: 'utf8' },
    );
    return { status: 0, result: JSON.parse(out) };
  } catch (err) {
    // check.mjs exits 1 on verdict "fail"; the JSON report is still on stdout.
    return { status: err.status, result: JSON.parse(err.stdout) };
  }
}

test('locked-span mismatch: hard-fails, exit code 1', () => {
  const { status, result } = run('locked-span-before.md', 'locked-span-mismatch-after.md');
  assert.equal(status, 1);
  assert.equal(result.verdict, 'fail');
  assert.equal(result.lockedSpans.count, 1);
  assert.equal(result.lockedSpans.mismatches.length, 1);
  assert.equal(result.lockedSpans.mismatches[0].reason, 'locked-span content changed');
});

test('clean rewrite with no locked spans and no dropped/added facts: passes', () => {
  const { status, result } = run('clean-rewrite-before.md', 'clean-rewrite-after.md');
  assert.equal(status, 0);
  assert.equal(result.verdict, 'pass');
  assert.deepEqual(result.lockedSpans, { count: 0, mismatches: [] });
  assert.deepEqual(result.fingerprint.dropped, []);
  assert.deepEqual(result.fingerprint.added, []);
});

test('dropped number: warns by default, exit code 0', () => {
  const { status, result } = run('dropped-number-before.md', 'dropped-number-after.md');
  assert.equal(status, 0);
  assert.equal(result.verdict, 'warn');
  const droppedNumbers = result.fingerprint.dropped.filter((d) => d.type === 'number');
  assert.equal(droppedNumbers.length, 1);
  assert.equal(droppedNumbers[0].value, '42');
});

test('identical text: no locked spans, no fingerprint diff, passes', () => {
  const { status, result } = run('clean-rewrite-before.md', 'clean-rewrite-before.md');
  assert.equal(status, 0);
  assert.equal(result.verdict, 'pass');
});
