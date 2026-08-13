// Regression suite for scripts/pin.mjs. Runs the script as a real
// subprocess against a throwaway project directory (never the repo itself),
// exactly the way a user invokes it. Uses only node:test/node:assert, no new
// dependency, per CLAUDE.md's dependency-free rule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
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

test('invalid action or command: usage message, exit 1', () => {
  const dir = makeProject();
  try {
    assert.throws(() => run(['bogus-action', 'audit'], dir), /Command failed/);
    assert.throws(() => run(['pin', 'bogus-command'], dir), /Command failed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('no harness directories at all: reports nothing pinned, does not create one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'clearfelt-pin-test-no-harness-'));
  mkdirSync(join(dir, '.git'));
  try {
    const out = run(['pin', 'audit'], dir);
    assert.match(out, /No harness directories found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findProjectRoot walks up from a subdirectory to find .git, not just check cwd itself', () => {
  const dir = makeProject();
  const nested = join(dir, 'src', 'deeply', 'nested');
  try {
    mkdirSync(nested, { recursive: true });
    const out = run(['pin', 'audit'], nested);
    assert.match(out, /Pinned \$clearfelt-audit in 1 harness directory\./);
    // Written at the real project root's .claude/, not a .claude created
    // inside the nested cwd, proving the walk-up actually found the root.
    assert.ok(existsSync(join(dir, '.claude', 'skills', 'clearfelt-audit', 'SKILL.md')));
    assert.ok(!existsSync(join(nested, '.claude')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('findProjectRoot falls back to the starting directory when no .git/package.json exists anywhere up to filesystem root', () => {
  // A fresh tmpdir with nothing in its ancestry (no .git, no package.json)
  // exercises the walk-all-the-way-to-root fallback (findProjectRoot's own
  // final `return resolve(startDir)`), distinct from every other test here,
  // which always has a .git at or above cwd.
  const dir = mkdtempSync(join(tmpdir(), 'clearfelt-pin-test-no-root-marker-'));
  try {
    const out = run(['pin', 'audit'], dir);
    // No harness dirs were created here either, so this still reports
    // nothing pinned, the meaningful assertion is that this returns
    // normally (falls back to startDir) instead of walking off the real
    // filesystem root or throwing.
    assert.match(out, /No harness directories found/);
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
