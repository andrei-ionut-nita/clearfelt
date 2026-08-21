// Shared helper for any test that needs to temporarily set
// ~/.clearfelt-writing/settings.md (the highest-precedence config layer, see
// scripts/lib/config.mjs's configLayers()) and restore it afterward.
//
// Found while adding new tests: detect.test.mjs and check.test.mjs both
// independently backed up/mutated/restored this exact real file with their
// own copy-pasted logic, and node --test runs separate test files
// concurrently by default (each its own process). Two processes racing on
// one real file in the actual home directory is a genuine bug, not a
// hypothetical one: whichever process's "did this exist before I touched
// it" check runs while the other's temporary content is in place gets the
// wrong answer, and can then restore the wrong "original" content, corrupting
// the other test's expected state. A single shared helper with a real
// cross-process lock (a directory create, atomic by construction: two
// processes racing on mkdirSync's EEXIST can't both win) closes that, rather
// than adding a third independent copy of the same unsafe pattern.
//
// Known gap, not fixed here (same one docs/DEVELOP.md and detect.test.mjs's
// own header comment already disclose): this still touches the real
// ~/.clearfelt-writing/settings.md file. A CLEARFELT_HOME env override in
// scripts/lib/config.mjs would remove the need for a lock entirely, by
// letting each test process point at its own private settings file instead
// of sharing one. This helper only makes the current, real-file approach
// safe under concurrency, it doesn't replace that future refactor.

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const LOCK_PATH = join(tmpdir(), 'clearfelt-writing-tests-global-settings.lock');
const LOCK_RETRY_MS = 20;
const LOCK_TIMEOUT_MS = 10_000;

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* busy-wait: node:test has no sync sleep primitive, and this lock is
       held for single-digit milliseconds per caller, so the cost is
       negligible next to the safety it buys. */
  }
}

// timeoutMs and lockPath are parameters (not just module constants) so a
// test can exercise the "already locked, give up" path in milliseconds
// instead of the real 10s production timeout, and the "some other mkdir
// failure, not contention" rethrow path with a path whose parent doesn't
// exist (ENOENT), without touching any shared real resource to provoke it.
export function acquireLock(timeoutMs = LOCK_TIMEOUT_MS, lockPath = LOCK_PATH) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      mkdirSync(lockPath);
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for the global-settings test lock at ${lockPath}`);
      }
      sleepSync(LOCK_RETRY_MS);
    }
  }
}

export function releaseLock(lockPath = LOCK_PATH) {
  rmSync(lockPath, { recursive: true, force: true });
}

// Runs fn() with ~/.clearfelt-writing/settings.md set to `contentLines` (an array of
// lines, joined with '\n'), then restores the file to exactly whatever state
// it was in before this call, all under an exclusive cross-process lock so
// no other test file's own call to this helper can observe or clobber the
// state in between. Returns `fileAlreadyExisted`, the existence this call
// itself observed under the lock, so a caller that wants to assert "did this
// restore correctly" has a race-free value to compare against instead of
// taking its own existsSync() reading outside the lock, which can observe
// another test file's in-flight, differently-locked mutation and get the
// wrong answer (found via an intermittent CI failure on exactly this check,
// see tests/helpers/global-settings.test.mjs).
export function withGlobalSettings(contentLines, fn, { lockTimeoutMs } = {}) {
  acquireLock(lockTimeoutMs);
  try {
    const settingsDir = join(homedir(), '.clearfelt-writing');
    const settingsPath = join(settingsDir, 'settings.md');
    const dirAlreadyExisted = existsSync(settingsDir);
    const fileAlreadyExisted = existsSync(settingsPath);
    const previousContent = fileAlreadyExisted ? readFileSync(settingsPath, 'utf8') : null;

    try {
      if (!dirAlreadyExisted) mkdirSync(settingsDir, { recursive: true });
      writeFileSync(settingsPath, contentLines.join('\n'));
      fn();
    } finally {
      if (fileAlreadyExisted) writeFileSync(settingsPath, previousContent);
      else if (existsSync(settingsPath)) rmSync(settingsPath);
      if (!dirAlreadyExisted && existsSync(settingsDir)) rmSync(settingsDir, { recursive: true, force: true });
    }
    return fileAlreadyExisted;
  } finally {
    releaseLock();
  }
}
