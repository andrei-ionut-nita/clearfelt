#!/usr/bin/env node
/**
 * clearfelt hook: admin actions (status/on/off/ignore-rule/ignore-file) when
 * invoked with an action argument, or the actual PostToolUse hook body when
 * invoked with none (Claude Code calls it after Edit/Write/MultiEdit and
 * feeds the tool call as JSON on stdin).
 *
 * Live per-project state (enabled/quiet/ignores) lives in .clearfelt/hook-state.md,
 * gitignored, separate from the tracked clearfelt.config.md defaults, so toggling
 * the hook never produces a diff in the shared repo file.
 *
 * Usage:
 *   node scripts/hook.mjs status
 *   node scripts/hook.mjs on
 *   node scripts/hook.mjs off
 *   node scripts/hook.mjs ignore-rule <category>
 *   node scripts/hook.mjs ignore-file <glob>
 *   node scripts/hook.mjs   (no args: runtime hook body, reads stdin)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STATE_DIR = join(process.cwd(), '.clearfelt');
const STATE_FILE = join(STATE_DIR, 'hook-state.md');
const SETTINGS_FILE = join(process.cwd(), '.claude', 'settings.local.json');
const TEXT_EXTENSIONS = new Set(['.md', '.mdx', '.txt']);

const ACTIONS = new Set(['status', 'on', 'off', 'ignore-rule', 'ignore-file', 'reset']);

export function readState() {
  const defaults = { enabled: false, quiet: false, ignoreRules: [], ignoreFiles: [] };
  if (!existsSync(STATE_FILE)) return defaults;
  const text = readFileSync(STATE_FILE, 'utf8');
  const state = { ...defaults };
  state.enabled = /^enabled:\s*true/m.test(text);
  state.quiet = /^quiet:\s*true/m.test(text);
  const rulesSection = text.match(/## Ignored rules\n([\s\S]*?)(\n##|$)/);
  if (rulesSection) state.ignoreRules = [...rulesSection[1].matchAll(/^-\s+(.+)$/gm)].map((m) => m[1].trim());
  const filesSection = text.match(/## Ignored files\n([\s\S]*?)(\n##|$)/);
  if (filesSection) state.ignoreFiles = [...filesSection[1].matchAll(/^-\s+(.+)$/gm)].map((m) => m[1].trim());
  return state;
}

function writeState(state) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  const lines = [
    '# clearfelt hook state (local, not shared)',
    '',
    `enabled: ${state.enabled}`,
    `quiet: ${state.quiet}`,
    '',
    '## Ignored rules',
    '',
    ...state.ignoreRules.map((r) => `- ${r}`),
    '',
    '## Ignored files',
    '',
    ...state.ignoreFiles.map((f) => `- ${f}`),
    '',
  ];
  writeFileSync(STATE_FILE, lines.join('\n'));
}

function installHookManifest() {
  const settingsDir = dirname(SETTINGS_FILE);
  if (!existsSync(settingsDir)) mkdirSync(settingsDir, { recursive: true });
  const existing = existsSync(SETTINGS_FILE) ? JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) : {};
  existing.hooks = existing.hooks || {};
  const entry = {
    matcher: 'Edit|Write|MultiEdit',
    hooks: [
      {
        type: 'command',
        command: `node "${join(ROOT, 'scripts', 'hook.mjs')}"`,
        timeout: 15,
      },
    ],
  };
  const already = (existing.hooks.PostToolUse || []).some(
    (e) => JSON.stringify(e) === JSON.stringify(entry),
  );
  if (!already) {
    existing.hooks.PostToolUse = [...(existing.hooks.PostToolUse || []), entry];
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(existing, null, 2));
}

function removeHookManifest() {
  if (!existsSync(SETTINGS_FILE)) return;
  const existing = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
  if (existing.hooks?.PostToolUse) {
    existing.hooks.PostToolUse = existing.hooks.PostToolUse.filter(
      (e) => !JSON.stringify(e).includes('clearfelt'),
    );
    if (existing.hooks.PostToolUse.length === 0) delete existing.hooks.PostToolUse;
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(existing, null, 2));
}

function runAdmin(action, arg) {
  const state = readState();
  if (action === 'status') {
    console.log(`enabled: ${state.enabled}`);
    console.log(`quiet: ${state.quiet}`);
    console.log(`ignored rules: ${state.ignoreRules.join(', ') || '(none)'}`);
    console.log(`ignored files: ${state.ignoreFiles.join(', ') || '(none)'}`);
    return;
  }
  if (action === 'on') {
    state.enabled = true;
    writeState(state);
    installHookManifest();
    console.log('Done. The clearfelt hook will fire after the next Edit/Write/MultiEdit on a text file.');
    return;
  }
  if (action === 'off') {
    state.enabled = false;
    writeState(state);
    removeHookManifest();
    console.log('Done. New edits will not trigger the clearfelt hook in this project until you run "$clearfelt hooks on".');
    return;
  }
  if (action === 'ignore-rule') {
    if (!arg) throw new Error('ignore-rule requires a category argument');
    if (!state.ignoreRules.includes(arg)) state.ignoreRules.push(arg);
    writeState(state);
    console.log(`Ignoring rule category: ${arg}`);
    return;
  }
  if (action === 'ignore-file') {
    if (!arg) throw new Error('ignore-file requires a glob argument');
    if (!state.ignoreFiles.includes(arg)) state.ignoreFiles.push(arg);
    writeState(state);
    console.log(`Ignoring file pattern: ${arg}`);
    return;
  }
  if (action === 'reset') {
    writeState({ enabled: false, quiet: false, ignoreRules: [], ignoreFiles: [] });
    removeHookManifest();
    console.log('Reset. Hook state cleared.');
  }
}

// Defense in depth: the PostToolUse payload's file_path already came from
// Claude's own Edit/Write/MultiEdit call, so this mostly guards against a
// future or unexpected payload shape rather than a live attack today.
// Fails closed (false) on anything unresolvable, rather than assuming safe.
export function isWithinCwd(candidatePath) {
  try {
    const cwdReal = realpathSync(process.cwd());
    const candidateReal = realpathSync(candidatePath);
    return candidateReal === cwdReal || candidateReal.startsWith(cwdReal + sep);
  } catch {
    return false;
  }
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

// The three injectable params (readStdin, runDetect, state) are I/O
// boundaries with no meaningful default-vs-real distinction to design
// around: production always uses the defaults below (main()'s own call
// passes none), they exist purely so tests/hook.test.mjs can exercise the
// stdin-read-failure and detect.mjs-produced-bad-JSON branches directly,
// two real defensive paths a subprocess-only test has no reliable, portable
// way to trigger (a genuinely broken fd 0, or a dependency misbehaving
// despite exiting 0).
export function runHookBody({
  readStdin = () => readFileSync(0, 'utf8'),
  runDetect = (filePath) => spawnSync('node', [join(ROOT, 'scripts', 'detect.mjs'), '--mode', 'report', filePath], { encoding: 'utf8' }),
  state = readState(),
} = {}) {
  if (!state.enabled) return;

  let stdinText = '';
  try {
    stdinText = readStdin();
  } catch {
    return;
  }
  let payload;
  try {
    payload = JSON.parse(stdinText);
  } catch {
    return;
  }

  const filePath = payload?.tool_input?.file_path;
  if (!filePath) return;
  const ext = extname(filePath);
  if (!TEXT_EXTENSIONS.has(ext)) return;
  if (state.ignoreFiles.some((glob) => globToRegExp(glob).test(filePath))) return;
  if (!existsSync(filePath)) return;
  if (!isWithinCwd(filePath)) return;

  const result = runDetect(filePath);
  if (result.status !== 0) return;

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return;
  }

  const hits = report.hits.filter((h) => !state.ignoreRules.includes(h.category));
  if (hits.length === 0) {
    if (!state.quiet) console.log(`clearfelt: ${filePath} scored ${report.score}/100, no slop hits.`);
    return;
  }
  console.log(
    `clearfelt: ${filePath} scored ${report.score}/100 with ${hits.length} hit(s). Run "/clearfelt audit ${filePath}" for details.`,
  );
}

function main() {
  const [, , action, arg] = process.argv;
  if (action && ACTIONS.has(action)) {
    runAdmin(action, arg);
    return;
  }
  if (action) {
    console.error(`Unknown action: ${action}. Expected one of: ${[...ACTIONS].join(', ')}`);
    process.exit(1);
  }
  runHookBody();
}

// Guarded so `import { readState } from './hook.mjs'` (used by
// scripts/explain.mjs) never triggers admin actions or the PostToolUse hook
// body as a side effect of loading the module for its state reader.
if (import.meta.url === `file://${process.argv[1]}`) main();
