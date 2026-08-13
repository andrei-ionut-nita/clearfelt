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
import { isWithinCwd, runHookBody } from '../scripts/hook.mjs';

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

test('ignore-rule and ignore-file without an argument throw a clear error instead of silently no-oping', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    assert.throws(() => run(['ignore-rule'], dir), /Command failed/);
    assert.throws(() => run(['ignore-file'], dir), /Command failed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ignore-rule and ignore-file do not duplicate an already-ignored entry', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    run(['ignore-rule', 'puffery_lexicon'], dir);
    run(['ignore-rule', 'puffery_lexicon'], dir);
    run(['ignore-file', '*.txt'], dir);
    run(['ignore-file', '*.txt'], dir);
    const status = run(['status'], dir);
    // Exactly one occurrence of each, not two, proves the includes() guard
    // actually prevented a duplicate push.
    assert.equal((status.match(/puffery_lexicon/g) || []).length, 1);
    assert.equal((status.match(/\*\.txt/g) || []).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('on twice does not install a second, duplicate PostToolUse entry', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    run(['on'], dir);
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'));
    assert.equal(settings.hooks.PostToolUse.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('off when the hook was never turned on (.claude/settings.local.json does not exist) is a no-op, not a throw', () => {
  const dir = makeProject();
  try {
    const out = run(['off'], dir);
    assert.match(out, /Done\./);
    assert.equal(existsSync(join(dir, '.claude', 'settings.local.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('off preserves an unrelated PostToolUse entry a user configured themselves, only removing the clearfelt one', () => {
  const dir = makeProject();
  try {
    run(['on'], dir);
    const settingsPath = join(dir, '.claude', 'settings.local.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    // Deliberately no substring of "clearfelt" anywhere in this entry:
    // removeHookManifest's own filter is a plain JSON.stringify(e).includes
    // ('clearfelt') substring check, so an unrelated entry that happened to
    // contain that substring would be a false test, not a real one.
    settings.hooks.PostToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hello world' }] });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    run(['off'], dir);
    const after = JSON.parse(readFileSync(settingsPath, 'utf8'));
    assert.equal(after.hooks.PostToolUse.length, 1);
    assert.match(JSON.stringify(after.hooks.PostToolUse[0]), /hello world/);
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

// ---- unit-level tests (direct import, not subprocess) ----
// These isolate branches the subprocess tests above have no reliable,
// portable way to trigger: isWithinCwd's catch block needs realpathSync to
// throw, which only happens for a path that genuinely does not resolve
// (existsSync's own false-on-any-stat-error behavior means the hook body's
// call site never reaches isWithinCwd with such a path in practice, since
// it's gated by an existsSync check first); runHookBody's stdin-read and
// detect.mjs-output-parsing failure branches need a broken fd 0 or a
// dependency returning malformed JSON despite exiting 0, neither of which a
// real subprocess invocation can portably force. runHookBody's readStdin/
// runDetect/state parameters exist for exactly this (see its own comment).

function captureConsoleLog(fn) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines;
}

test('isWithinCwd: a path that does not resolve (does not exist) fails closed, does not throw', () => {
  assert.equal(isWithinCwd(join(tmpdir(), 'clearfelt-hook-unit-test-does-not-exist.md')), false);
});

test('isWithinCwd: a real path inside cwd returns true', () => {
  assert.equal(isWithinCwd(fileURLToPath(import.meta.url)), true);
});

test('isWithinCwd: a real path outside cwd returns false', () => {
  const outsideDir = mkdtempSync(join(tmpdir(), 'clearfelt-hook-iswithincwd-outside-'));
  const outsideFile = join(outsideDir, 'outside.md');
  writeFileSync(outsideFile, 'text');
  try {
    assert.equal(isWithinCwd(outsideFile), false);
  } finally {
    rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('runHookBody: a readStdin failure is a silent no-op, not a throw', () => {
  const lines = captureConsoleLog(() => {
    runHookBody({
      state: { enabled: true, quiet: false, ignoreRules: [], ignoreFiles: [] },
      readStdin: () => {
        throw new Error('simulated broken stdin');
      },
    });
  });
  assert.deepEqual(lines, []);
});

test('runHookBody: detect.mjs exiting 0 but printing non-JSON is a silent no-op, not a throw', () => {
  const target = join(__dirname, 'hook-unit-test-scratch.md');
  writeFileSync(target, 'Delve into this seamless opportunity.');
  try {
    const lines = captureConsoleLog(() => {
      runHookBody({
        state: { enabled: true, quiet: false, ignoreRules: [], ignoreFiles: [] },
        readStdin: () => JSON.stringify({ tool_input: { file_path: target } }),
        runDetect: () => ({ status: 0, stdout: 'not valid json {{{' }),
      });
    });
    assert.deepEqual(lines, []);
  } finally {
    rmSync(target);
  }
});

test('runHookBody: a file_path that does not exist on disk is a silent no-op, not a throw', () => {
  const missing = join(__dirname, 'hook-unit-test-does-not-exist.md');
  const lines = captureConsoleLog(() => {
    runHookBody({
      state: { enabled: true, quiet: false, ignoreRules: [], ignoreFiles: [] },
      readStdin: () => JSON.stringify({ tool_input: { file_path: missing } }),
      runDetect: () => {
        throw new Error('runDetect must never be called for a file_path that does not exist');
      },
    });
  });
  assert.deepEqual(lines, []);
});

test('runHookBody: detect.mjs exiting non-zero is a silent no-op, not a throw', () => {
  const target = join(__dirname, 'hook-unit-test-scratch-nonzero.md');
  writeFileSync(target, 'Delve into this seamless opportunity.');
  try {
    const lines = captureConsoleLog(() => {
      runHookBody({
        state: { enabled: true, quiet: false, ignoreRules: [], ignoreFiles: [] },
        readStdin: () => JSON.stringify({ tool_input: { file_path: target } }),
        runDetect: () => ({ status: 1, stdout: '' }),
      });
    });
    assert.deepEqual(lines, []);
  } finally {
    rmSync(target);
  }
});

test('runHookBody: zero hits and quiet:false prints the clean-score line', () => {
  const target = join(__dirname, 'hook-unit-test-scratch-clean.md');
  writeFileSync(target, 'Clean text.');
  try {
    const lines = captureConsoleLog(() => {
      runHookBody({
        state: { enabled: true, quiet: false, ignoreRules: [], ignoreFiles: [] },
        readStdin: () => JSON.stringify({ tool_input: { file_path: target } }),
        runDetect: () => ({ status: 0, stdout: JSON.stringify({ score: 100, hits: [] }) }),
      });
    });
    assert.equal(lines.length, 1);
    assert.match(lines[0], /scored 100\/100, no slop hits\./);
  } finally {
    rmSync(target);
  }
});

test('runHookBody: zero hits and quiet:true prints nothing at all', () => {
  const target = join(__dirname, 'hook-unit-test-scratch-quiet.md');
  writeFileSync(target, 'Clean text.');
  try {
    const lines = captureConsoleLog(() => {
      runHookBody({
        state: { enabled: true, quiet: true, ignoreRules: [], ignoreFiles: [] },
        readStdin: () => JSON.stringify({ tool_input: { file_path: target } }),
        runDetect: () => ({ status: 0, stdout: JSON.stringify({ score: 100, hits: [] }) }),
      });
    });
    assert.deepEqual(lines, []);
  } finally {
    rmSync(target);
  }
});
