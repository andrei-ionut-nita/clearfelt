// Config-loading and precedence layer: parses clearfelt.config.md's Markdown
// tables, merges shipped defaults with the skill's own config and a user's
// global overrides, and reads the two project-scoped override files
// (.clearfelt/voice-profile.md, .clearfelt/domain.md). Split out of
// detect.mjs so scripts/explain.mjs and scripts/check.mjs can import this
// precedence logic directly instead of re-implementing it.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..', '..');

// ---- config parsing ----

export function parseConfigTable(text, sectionHeading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${sectionHeading}`);
  if (start === -1) return {};
  const settings = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break;
    const row = line.match(/^\|\s*([\w.]+)\s*\|\s*([^|]+?)\s*\|/);
    if (row && row[1] !== 'Setting' && row[1] !== 'Category') {
      const value = row[2].trim();
      settings[row[1]] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    }
  }
  return settings;
}

export const CONFIG_SECTIONS = [
  'Scoring',
  'Category severity weights',
  'Tier thresholds',
  'Statistical signals',
  'Voice',
  'Rewrite',
  'Preservation checking',
  'Readability',
];

export function loadConfigFile(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  let merged = {};
  for (const section of CONFIG_SECTIONS) merged = { ...merged, ...parseConfigTable(text, section) };
  return merged;
}

const CONFIG_DEFAULTS = {
  human_score_threshold: 85,
  max_iterations: 3,
  intensity: 'light_touch',
  tier2_cluster_window: 40,
  tier3_density_threshold: 3,
  burstiness_weight: 10,
  vocabulary_diversity_weight: 5,
  repetition_weight: 5,
  'voice.mode': 'single',
  'rewrite.require_confirmation': true,
  'rewrite.ask_intensity': true,
  'check.enabled': true,
  'check.hard_fail_on_locked_span_mismatch': true,
  'check.hard_fail_on_dropped_fact': false,
  'check.hard_fail_on_added_fact': false,
  target_grade_level_min: 6,
  target_grade_level_max: 12,
};

// Precedence, low to high: hardcoded defaults, the skill's own shipped
// clearfelt.config.md (tracked in git, reset on every skill update), then
// ~/.clearfelt/settings.md (never shipped, never touched by an update,
// the actual target for any "save my preference globally" action).
function configLayers() {
  const shipped = loadConfigFile(join(ROOT, 'clearfelt.config.md'));
  const globalOverrides = loadConfigFile(join(homedir(), '.clearfelt', 'settings.md'));
  return { defaults: CONFIG_DEFAULTS, shipped, globalOverrides };
}

export function loadConfig() {
  const { defaults, shipped, globalOverrides } = configLayers();
  return { ...defaults, ...shipped, ...globalOverrides };
}

// Same merge as loadConfig(), but keeps which layer each key's final value
// came from, so /clearfelt explain can show provenance instead of just the
// flattened result. loadConfig() stays the single source of truth for the
// merge order; this just also records it.
export function loadConfigWithProvenance() {
  const { defaults, shipped, globalOverrides } = configLayers();
  const result = {};
  for (const key of new Set([...Object.keys(defaults), ...Object.keys(shipped), ...Object.keys(globalOverrides)])) {
    if (key in globalOverrides) {
      result[key] = { value: globalOverrides[key], source: 'global (~/.clearfelt/settings.md)' };
    } else if (key in shipped) {
      result[key] = { value: shipped[key], source: 'shipped (clearfelt.config.md)' };
    } else {
      result[key] = { value: defaults[key], source: 'default' };
    }
  }
  return result;
}

// ---- voice profile precedence ----

export function extractBulletSection(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return new Set();
  const section = text.slice(start).split(/\n##\s+/)[0];
  const overrides = new Set();
  for (const line of section.split('\n')) {
    const m = line.match(/^-\s+(.+)$/);
    if (m) overrides.add(m[1].trim().toLowerCase());
  }
  return overrides;
}

export function loadVoiceProfileOverrides(targetDir, config, voiceName) {
  const profilePath =
    config['voice.mode'] === 'multi' && voiceName
      ? join(targetDir, '.clearfelt', 'voices', `${voiceName}.md`)
      : join(targetDir, '.clearfelt', 'voice-profile.md');
  if (!existsSync(profilePath)) return new Set();
  const text = readFileSync(profilePath, 'utf8');
  return extractBulletSection(text, '## Words I want to keep using');
}

// ---- domain profile precedence ----

export function loadDomainOverrides(targetDir) {
  const domainPath = join(targetDir, '.clearfelt', 'domain.md');
  if (!existsSync(domainPath)) return new Set();
  const text = readFileSync(domainPath, 'utf8');
  return extractBulletSection(text, '## Technical terms exempt from flagging');
}

export function loadDomainReadabilityTarget(targetDir) {
  const domainPath = join(targetDir, '.clearfelt', 'domain.md');
  if (!existsSync(domainPath)) return {};
  const text = readFileSync(domainPath, 'utf8');
  const target = {};
  const minMatch = text.match(/target_grade_level_min:\s*(\d+(\.\d+)?)/);
  const maxMatch = text.match(/target_grade_level_max:\s*(\d+(\.\d+)?)/);
  if (minMatch) target.target_grade_level_min = Number(minMatch[1]);
  if (maxMatch) target.target_grade_level_max = Number(maxMatch[1]);
  return target;
}
