// Unit tests for tests/helpers/global-settings.mjs itself: the lock
// primitive other test files depend on for safety needs to be verified
// directly, not just trusted because the tests that use it happen to pass.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { withGlobalSettings, acquireLock, releaseLock } from './global-settings.mjs';

test('withGlobalSettings writes the given content during fn and restores exact prior absence afterward', () => {
  const homeSettingsPath = join(homedir(), '.clearfelt', 'settings.md');

  // Not read outside the lock: an existsSync() here would race against any
  // other test file's own withGlobalSettings call mutating this same real
  // file under its own lock acquisition, and could observe a transient
  // in-flight state instead of the true prior one (the exact intermittent
  // CI failure this test used to have). fileAlreadyExisted is the value
  // withGlobalSettings itself observed atomically under the lock, so
  // comparing against that instead is race-free by construction.
  let sawContentDuring = null;
  const fileAlreadyExisted = withGlobalSettings(
    ['## Scoring', '', '| Setting | Default |', '|---|---|', '| max_iterations | 7 |', ''],
    () => {
      sawContentDuring = existsSync(homeSettingsPath);
    },
  );

  assert.equal(sawContentDuring, true, 'the file must exist while fn runs');
  assert.equal(existsSync(homeSettingsPath), fileAlreadyExisted, 'must restore to the exact prior existence state');
});

test('a second acquireLock while the first is held times out instead of hanging or double-acquiring', () => {
  const testLockPath = join(tmpdir(), 'clearfelt-global-settings-lock-test');
  if (existsSync(testLockPath)) rmSync(testLockPath, { recursive: true, force: true });

  acquireLock(5000, testLockPath);
  try {
    assert.throws(() => acquireLock(50, testLockPath), /Timed out waiting for the global-settings test lock/);
  } finally {
    releaseLock(testLockPath);
  }
});

test('acquireLock rethrows a non-contention mkdir failure instead of treating it as "locked, retry"', () => {
  // A lock path whose parent directory does not exist fails with ENOENT, not
  // EEXIST: a real, different failure mode from "someone else holds the
  // lock", and acquireLock must surface it immediately rather than silently
  // retrying until the timeout.
  const unreachablePath = join(tmpdir(), 'clearfelt-lock-test-no-such-parent-dir', 'nested', 'lock');
  assert.throws(() => acquireLock(5000, unreachablePath), (err) => err.code === 'ENOENT');
});

test('releaseLock on an already-released (or never-acquired) lock does not throw', () => {
  const testLockPath = join(tmpdir(), 'clearfelt-global-settings-lock-test-idempotent');
  assert.equal(existsSync(testLockPath), false);
  assert.doesNotThrow(() => releaseLock(testLockPath));
});

test('mkdirSync-based mutual exclusion actually excludes: two processes cannot both hold the lock at once', () => {
  const testLockPath = join(tmpdir(), 'clearfelt-global-settings-lock-test-exclusive');
  if (existsSync(testLockPath)) rmSync(testLockPath, { recursive: true, force: true });

  acquireLock(5000, testLockPath);
  try {
    // Directly exercising the primitive mkdirSync relies on: a second
    // attempt while the first is outstanding must see EEXIST, not silently
    // succeed (which would mean the "lock" isn't actually exclusive).
    assert.throws(() => mkdirSync(testLockPath), (err) => err.code === 'EEXIST');
  } finally {
    releaseLock(testLockPath);
  }
});
