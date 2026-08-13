// Regression suite for scripts/hook.mjs: the admin actions (status/on/off/
// ignore-rule/ignore-file/reset) and the PostToolUse hook body (stdin JSON
// parsing, path containment, ignore-glob matching). Runs the script as a
// real subprocess against a throwaway project directory, same convention as
// tests/pin.test.mjs. Uses only node:test/node:assert, no new dependency,
// per CLAUDE.md's dependency-free rule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HOOK = join(ROOT, 'scripts', 'hook.mjs');

function run(args, cwd, input) {
  return execFileSync(process.execPath, [HOOK, ...args], { cwd, encoding: 'utf8', input });
}

function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), 'clearfelt-hook-test-'));
  mkdirSync(join(dir, '.git'));
  return dir;
}

function payload(filePath) {
  return JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: filePath } });
}

// ---- admin actions ----

test('status reports disabled/empty state before anything is configured', () => {
  const dir = makeProject();
  try {
    const out = run(['status'], dir);
    assert.match(out, /enabled: false/);
    assert.match(out, /ignored rules: \(none\)/);
    assert.match(out, /ignored files: \(none\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('on enables the hook and installs a PostToolUse entry in .claude/settings.local.json', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    const state = readFileSync(join(dir, '.clearfelt', 'hook-state.md'), 'utf8');
    assert.match(state, /enabled: true/);
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'));
    assert.equal(settings.hooks.PostToolUse.length, 1);
    assert.match(settings.hooks.PostToolUse[0].matcher, /Edit\|Write\|MultiEdit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('off disables the hook and removes the installed PostToolUse entry', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    run(['off'], dir);
    const state = readFileSync(join(dir, '.clearfelt', 'hook-state.md'), 'utf8');
    assert.match(state, /enabled: false/);
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'));
    assert.equal(settings.hooks.PostToolUse, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignore-rule and ignore-file accumulate in status, reset clears everything', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    run(['ignore-rule', 'puffery_lexicon'], dir);
    run(['ignore-file', '*.txt'], dir);
    const status = run(['status'], dir);
    assert.match(status, /ignored rules: puffery_lexicon/);
    assert.match(status, /ignored files: \*\.txt/);

    run(['reset'], dir);
    const afterReset = run(['status'], dir);
    assert.match(afterReset, /enabled: false/);
    assert.match(afterReset, /ignored rules: \(none\)/);
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'));
    assert.equal(settings.hooks.PostToolUse, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unknown action fails loudly instead of silently falling through to the hook body', () => {
  const dir = makeProject();
  try {
    assert.throws(() => run(['bogus-action'], dir), /Command failed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- hook body (PostToolUse stdin payload) ----

test('hook body does nothing when the hook is disabled, even with a valid payload', () => {
  const dir = makeProject();
  try {
    const target = join(dir, 'draft.md');
    writeFileSync(target, 'Delve into this seamless, hassle-free solution.');
    const out = run([], dir, payload(target));
    assert.equal(out, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hook body scores an in-scope file and reports hits once enabled', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    const target = join(dir, 'draft.md');
    writeFileSync(target, 'Delve into this seamless, hassle-free, paramount opportunity, honestly.');
    const out = run([], dir, payload(target));
    assert.match(out, /clearfelt: .*draft\.md scored \d+\/100/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hook body silently no-ops on malformed JSON on stdin, does not throw', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    const out = run([], dir, 'not valid json {{{');
    assert.equal(out, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hook body silently no-ops when the payload has no file_path', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    const out = run([], dir, JSON.stringify({ tool_name: 'Edit', tool_input: {} }));
    assert.equal(out, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hook body refuses a file_path outside the project (isWithinCwd guard)', () => {
  const dir = makeProject();
  const outsideDir = mkdtempSync(join(tmpdir(), 'clearfelt-hook-outside-'));
  try {
    run(['on'], dir);
    const outsideTarget = join(outsideDir, 'secret.md');
    writeFileSync(outsideTarget, 'Delve into this seamless opportunity.');
    const out = run([], dir, payload(outsideTarget));
    assert.equal(out, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('hook body respects an ignored file glob and skips scoring', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    run(['ignore-file', '*.md'], dir);
    const target = join(dir, 'draft.md');
    writeFileSync(target, 'Delve into this seamless, hassle-free opportunity.');
    const out = run([], dir, payload(target));
    assert.equal(out, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hook body skips a non-text extension entirely', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    const target = join(dir, 'image.png');
    writeFileSync(target, 'not actually an image, but the extension is what matters here');
    const out = run([], dir, payload(target));
    assert.equal(out, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
