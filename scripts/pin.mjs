#!/usr/bin/env node
/**
 * Pin/unpin a clearfelt-writing subcommand as a standalone $clearfelt-writing-<command> shortcut skill.
 * Adapted from impeccable's scripts/pin.mjs: same harness-directory discovery,
 * same pin-marker-comment convention so unpin never deletes a user's own skill.
 *
 * Usage:
 *   node scripts/pin.mjs pin <audit|rewrite|write|explain|setup>
 *   node scripts/pin.mjs unpin <audit|rewrite|write|explain|setup>
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(__dirname, '..');

const HARNESS_DIRS = ['.claude', '.cursor', '.codex', '.agents'];
const VALID_COMMANDS = ['audit', 'rewrite', 'write', 'explain', 'setup'];
const PIN_MARKER = '<!-- clearfelt-writing-pinned-skill -->';

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
name: clearfelt-writing-${command}
description: Shortcut for "/clearfelt-writing ${command}". Pinned by scripts/pin.mjs; run "node scripts/pin.mjs unpin ${command}" to remove.
---
${PIN_MARKER}

Run the clearfelt-writing "${command}" subcommand exactly as documented in [reference/${command}.md](${SKILL_ROOT}/reference/${command}.md). Treat this as an alias for "/clearfelt-writing ${command}", not a separate feature.
`;
}

function pin(command) {
  const projectRoot = findProjectRoot();
  let installed = 0;
  let skipped = 0;
  for (const harness of HARNESS_DIRS) {
    const harnessDir = join(projectRoot, harness);
    if (!existsSync(harnessDir)) continue;
    const skillsDir = join(harnessDir, 'skills', `clearfelt-writing-${command}`);
    const skillFile = join(skillsDir, 'SKILL.md');
    if (existsSync(skillFile)) {
      const existing = readFileSync(skillFile, 'utf8');
      if (!existing.includes(PIN_MARKER)) {
        console.log(`Skipping ${skillFile}: a SKILL.md already exists there and isn't a clearfelt-writing-pinned skill, leaving it alone.`);
        skipped++;
        continue;
      }
    }
    mkdirSync(skillsDir, { recursive: true });
    writeFileSync(skillFile, pinnedSkillContent(command));
    installed++;
  }
  if (installed === 0 && skipped === 0) {
    console.log('No harness directories found (.claude, .cursor, .codex, .agents) in this project. Nothing pinned.');
    return;
  }
  const skippedNote = skipped > 0 ? `, skipped ${skipped} (pre-existing unrelated skill)` : '';
  console.log(`Pinned $clearfelt-writing-${command} in ${installed} harness director${installed === 1 ? 'y' : 'ies'}${skippedNote}.`);
}

function unpin(command) {
  const projectRoot = findProjectRoot();
  let removed = 0;
  for (const harness of HARNESS_DIRS) {
    const skillDir = join(projectRoot, harness, 'skills', `clearfelt-writing-${command}`);
    const skillFile = join(skillDir, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const content = readFileSync(skillFile, 'utf8');
    if (!content.includes(PIN_MARKER)) {
      console.log(`Skipping ${skillFile}: not a clearfelt-writing-pinned skill (no marker found), leaving it alone.`);
      continue;
    }
    rmSync(skillDir, { recursive: true, force: true });
    removed++;
  }
  console.log(removed > 0 ? `Unpinned $clearfelt-writing-${command} from ${removed} location(s).` : 'Nothing to unpin.');
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
