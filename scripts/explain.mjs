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
  loadVoiceProfileCalibration,
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
  // config always comes from loadConfigWithProvenance(), which guarantees an
  // entry for every CONFIG_DEFAULTS key ('voice.mode' included), so no
  // fallback is needed here, unlike explainDomain's field()-parsed values
  // below, which genuinely can be absent from a real domain.md.
  const mode = config['voice.mode'].value;
  const profilePath =
    mode === 'multi' && voiceName
      ? join(process.cwd(), '.clearfelt', 'voices', `${voiceName}.md`)
      : join(process.cwd(), '.clearfelt', 'voice-profile.md');
  const exists = existsSync(profilePath);
  const keptWordsCount = exists
    ? extractBulletSection(readFileSync(profilePath, 'utf8'), '## Words I want to keep using').size
    : 0;
  // Reuses config's own resolved value here (raw config, not {value, source}
  // provenance) since loadVoiceProfileCalibration wants a plain "which
  // voice.mode" string, matching how detect.mjs itself resolves it.
  const rawConfig = { 'voice.mode': mode };
  const calibration = loadVoiceProfileCalibration(process.cwd(), rawConfig, voiceName);
  return {
    mode,
    profilePath,
    exists,
    keptWordsCount,
    personalCalibration:
      Object.keys(calibration).length > 0
        ? calibration
        : 'not computed, run /clearfelt setup with a writing sample or corpus, generic defaults apply',
  };
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
      preferredLength: null,
      // Same guarantee as explainVoice's mode above: these two keys are
      // always present in config, no fallback needed.
      targetGradeLevel: {
        min: config.target_grade_level_min.value,
        max: config.target_grade_level_max.value,
        source: config.target_grade_level_min.source,
      },
      exemptTermCount: 0,
    };
  }
  const text = readFileSync(domainPath, 'utf8');
  // Every field below lives on a `- key: value` bullet line per
  // templates/domain.example.md, not a bare `key: value` line, and the
  // template's own convention for "not set" is the literal string
  // "(unset)", not an absent line. Both must be matched, or a real
  // domain.md (which always has the bullet prefix) silently fails to
  // parse, and the template's own unset sentinel reads as a real value.
  function field(name) {
    const m = text.match(new RegExp(`^-?\\s*${name}:\\s*(\\S+)`, 'm'));
    if (!m || m[1] === '(unset)') return null;
    return m[1];
  }
  const riskTierMatch = field('risk_tier');
  const modeMatch = field('mode');
  const intensityMatch = field('preferred_intensity');
  const lengthMatch = field('preferred_length');
  const minMatch = text.match(/target_grade_level_min:\s*(\d+(\.\d+)?)/);
  const maxMatch = text.match(/target_grade_level_max:\s*(\d+(\.\d+)?)/);
  const exemptTermCount = extractBulletSection(text, '## Technical terms exempt from flagging').size;

  return {
    exists: true,
    riskTier: riskTierMatch ?? 'standard',
    mode: modeMatch,
    preferredIntensity: intensityMatch,
    preferredLength: lengthMatch,
    targetGradeLevel: {
      min: minMatch ? Number(minMatch[1]) : config.target_grade_level_min.value,
      max: maxMatch ? Number(maxMatch[1]) : config.target_grade_level_max.value,
      source: minMatch || maxMatch ? '.clearfelt/domain.md' : config.target_grade_level_min.source,
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

  // Personal calibration overrides three of config's statistical-baseline
  // keys for actual scoring (see detect.mjs); reflect that here too, or
  // /clearfelt explain would show the generic default/shipped value as if
  // it were still driving the score.
  if (typeof voice.personalCalibration === 'object') {
    for (const [key, value] of Object.entries(voice.personalCalibration)) {
      config[key] = { value, source: `${voice.profilePath} (computed)` };
    }
  }

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
