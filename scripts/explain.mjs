#!/usr/bin/env node
/**
 * clearfelt explain: prints every currently-resolved setting and where it
 * came from (default / shipped clearfelt.config.md / global
 * ~/.clearfelt/settings.md), plus voice profile, domain profile, and hook
 * state, so a user can see the full picture before running anything else.
 * Read-only. Zero external dependencies, Node stdlib only.
 *
 * Usage:
 *   node scripts/explain.mjs [--voice <name>]
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadConfigWithProvenance,
  extractBulletSection,
} from './lib/config.mjs';
import { readState } from './hook.mjs';

const USAGE = `clearfelt explain: prints every currently-resolved setting and where it came from.

Usage:
  node scripts/explain.mjs [--voice <name>]

Options:
  --voice <name>  Voice profile to inspect when clearfelt.config.md's voice.mode is "multi".
  --help, -h      Print this message and exit.`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--voice') args.voice = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function explainVoice(config, voiceName) {
  const mode = config['voice.mode']?.value ?? 'single';
  const profilePath =
    mode === 'multi' && voiceName
      ? join(process.cwd(), '.clearfelt', 'voices', `${voiceName}.md`)
      : join(process.cwd(), '.clearfelt', 'voice-profile.md');
  const exists = existsSync(profilePath);
  const keptWordsCount = exists
    ? extractBulletSection(readFileSync(profilePath, 'utf8'), '## Words I want to keep using').size
    : 0;
  return { mode, profilePath, exists, keptWordsCount };
}

function explainDomain(config) {
  const domainPath = join(process.cwd(), '.clearfelt', 'domain.md');
  const exists = existsSync(domainPath);
  if (!exists) {
    return {
      exists: false,
      riskTier: 'standard',
      mode: null,
      preferredIntensity: null,
      targetGradeLevel: {
        min: config.target_grade_level_min?.value,
        max: config.target_grade_level_max?.value,
        source: config.target_grade_level_min?.source ?? 'default',
      },
      exemptTermCount: 0,
    };
  }
  const text = readFileSync(domainPath, 'utf8');
  const riskTierMatch = text.match(/risk_tier:\s*(\S+)/);
  const modeMatch = text.match(/^mode:\s*(\S+)/m);
  const intensityMatch = text.match(/preferred_intensity:\s*(\S+)/);
  const minMatch = text.match(/target_grade_level_min:\s*(\d+(\.\d+)?)/);
  const maxMatch = text.match(/target_grade_level_max:\s*(\d+(\.\d+)?)/);
  const exemptTermCount = extractBulletSection(text, '## Technical terms exempt from flagging').size;

  return {
    exists: true,
    riskTier: riskTierMatch ? riskTierMatch[1] : 'standard',
    mode: modeMatch ? modeMatch[1] : null,
    preferredIntensity: intensityMatch ? intensityMatch[1] : null,
    targetGradeLevel: {
      min: minMatch ? Number(minMatch[1]) : config.target_grade_level_min?.value,
      max: maxMatch ? Number(maxMatch[1]) : config.target_grade_level_max?.value,
      source: minMatch || maxMatch ? '.clearfelt/domain.md' : (config.target_grade_level_min?.source ?? 'default'),
    },
    exemptTermCount,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const config = loadConfigWithProvenance();
  const voice = explainVoice(config, args.voice);
  const domain = explainDomain(config);
  const hook = readState();

  console.log(
    JSON.stringify(
      {
        voice,
        domain,
        config,
        hook,
      },
      null,
      2,
    ),
  );
}

main();
