#!/usr/bin/env node
/**
 * Pin/unpin a clearfelt subcommand as a standalone $clearfelt-<command> shortcut skill.
 * Adapted from impeccable's scripts/pin.mjs: same harness-directory discovery,
 * same pin-marker-comment convention so unpin never deletes a user's own skill.
 *
 * Usage:
 *   node scripts/pin.mjs pin <audit|humanize|setup>
 *   node scripts/pin.mjs unpin <audit|humanize|setup>
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(__dirname, '..');

const HARNESS_DIRS = ['.claude', '.cursor', '.codex', '.agents'];
const VALID_COMMANDS = ['audit', 'humanize', 'setup'];
const PIN_MARKER = '<!-- clearfelt-pinned-skill -->';

function findProjectRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  while (dir !== '/') {
    if (existsSync(join(dir, 'package.json')) || existsSync(join(dir, '.git'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir);
}

function pinnedSkillContent(command) {
  return `---
name: clearfelt-${command}
description: Shortcut for "/clearfelt ${command}". Pinned by scripts/pin.mjs; run "node scripts/pin.mjs unpin ${command}" to remove.
---
${PIN_MARKER}

Run the clearfelt "${command}" subcommand exactly as documented in [reference/${command}.md](${SKILL_ROOT}/reference/${command}.md). Treat this as an alias for "/clearfelt ${command}", not a separate feature.
`;
}

function pin(command) {
  const projectRoot = findProjectRoot();
  let installed = 0;
  for (const harness of HARNESS_DIRS) {
    const harnessDir = join(projectRoot, harness);
    if (!existsSync(harnessDir)) continue;
    const skillsDir = join(harnessDir, 'skills', `clearfelt-${command}`);
    mkdirSync(skillsDir, { recursive: true });
    writeFileSync(join(skillsDir, 'SKILL.md'), pinnedSkillContent(command));
    installed++;
  }
  if (installed === 0) {
    console.log('No harness directories found (.claude, .cursor, .codex, .agents) in this project. Nothing pinned.');
    return;
  }
  console.log(`Pinned $clearfelt-${command} in ${installed} harness director${installed === 1 ? 'y' : 'ies'}.`);
}

function unpin(command) {
  const projectRoot = findProjectRoot();
  let removed = 0;
  for (const harness of HARNESS_DIRS) {
    const skillDir = join(projectRoot, harness, 'skills', `clearfelt-${command}`);
    const skillFile = join(skillDir, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const content = readFileSync(skillFile, 'utf8');
    if (!content.includes(PIN_MARKER)) {
      console.log(`Skipping ${skillFile}: not a clearfelt-pinned skill (no marker found), leaving it alone.`);
      continue;
    }
    rmSync(skillDir, { recursive: true, force: true });
    removed++;
  }
  console.log(removed > 0 ? `Unpinned $clearfelt-${command} from ${removed} location(s).` : 'Nothing to unpin.');
}

function main() {
  const [, , action, command] = process.argv;
  if (!['pin', 'unpin'].includes(action) || !VALID_COMMANDS.includes(command)) {
    console.error(`Usage: node scripts/pin.mjs <pin|unpin> <${VALID_COMMANDS.join('|')}>`);
    process.exit(1);
  }
  if (action === 'pin') pin(command);
  else unpin(command);
}

main();
