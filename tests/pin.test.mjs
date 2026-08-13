// Regression suite for scripts/pin.mjs. Runs the script as a real
// subprocess against a throwaway project directory (never the repo itself),
// exactly the way a user invokes it. Uses only node:test/node:assert, no new
// dependency, per CLAUDE.md's dependency-free rule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PIN = join(ROOT, 'scripts', 'pin.mjs');

function run(args, cwd) {
  return execFileSync(process.execPath, [PIN, ...args], { cwd, encoding: 'utf8' });
}

function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), 'clearfelt-pin-test-'));
  mkdirSync(join(dir, '.git'));
  mkdirSync(join(dir, '.claude'));
  return dir;
}

test('pin creates a marked shortcut skill in an existing harness dir', () => {
  const dir = makeProject();
  try {
    const out = run(['pin', 'audit'], dir);
    assert.match(out, /Pinned \$clearfelt-audit in 1 harness directory\./);
    const content = readFileSync(join(dir, '.claude', 'skills', 'clearfelt-audit', 'SKILL.md'), 'utf8');
    assert.match(content, /clearfelt-pinned-skill/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pin does not overwrite a pre-existing unrelated skill at the same path', () => {
  const dir = makeProject();
  try {
    const skillDir = join(dir, '.claude', 'skills', 'clearfelt-rewrite');
    mkdirSync(skillDir, { recursive: true });
    const untouched = '---\nname: clearfelt-rewrite\ndescription: A user\'s own unrelated skill.\n---\nDo not overwrite me.\n';
    writeFileSync(join(skillDir, 'SKILL.md'), untouched);

    const out = run(['pin', 'rewrite'], dir);
    assert.match(out, /Skipping .*: a SKILL\.md already exists there and isn't a clearfelt-pinned skill/);
    assert.match(out, /skipped 1/);

    const after = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
    assert.equal(after, untouched);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pin safely re-pins (refreshes) a skill it created previously', () => {
  const dir = makeProject();
  try {
    run(['pin', 'setup'], dir);
    const out = run(['pin', 'setup'], dir);
    assert.match(out, /Pinned \$clearfelt-setup in 1 harness directory\./);
    assert.doesNotMatch(out, /skipped/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unpin removes a marked skill but leaves an unmarked one alone', () => {
  const dir = makeProject();
  try {
    run(['pin', 'audit'], dir);
    const outUnpin = run(['unpin', 'audit'], dir);
    assert.match(outUnpin, /Unpinned \$clearfelt-audit from 1 location\(s\)\./);

    const skillDir = join(dir, '.claude', 'skills', 'clearfelt-setup');
    mkdirSync(skillDir, { recursive: true });
    const untouched = '---\nname: clearfelt-setup\ndescription: Not pinned by us.\n---\nLeave me alone.\n';
    writeFileSync(join(skillDir, 'SKILL.md'), untouched);

    const outSkip = run(['unpin', 'setup'], dir);
    assert.match(outSkip, /not a clearfelt-pinned skill/);
    assert.equal(readFileSync(join(skillDir, 'SKILL.md'), 'utf8'), untouched);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
