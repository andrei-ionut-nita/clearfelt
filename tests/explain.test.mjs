// Regression suite for scripts/explain.mjs. Runs the script as a real
// subprocess, same convention as the other tests/*.test.mjs files, since
// it's a script (unconditional `main()` at the bottom), not a library. Pre-
// existing gap closed here: explain.mjs had zero test coverage before this
// file, invisible even in the coverage report (a file with no test never
// gets loaded, so it never even appears in the table), not just a low
// number.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withGlobalSettings, acquireLock, releaseLock } from './helpers/global-settings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXPLAIN = join(ROOT, 'scripts', 'explain.mjs');
const SHIPPED_CONFIG = join(ROOT, 'clearfelt.config.md');
const FIXTURES = join(__dirname, 'fixtures');

function run(extraArgs = []) {
  const out = execFileSync(process.execPath, [EXPLAIN, ...extraArgs], { cwd: FIXTURES, encoding: 'utf8' });
  return JSON.parse(out);
}

test('--help prints usage and exits zero', () => {
  const out = execFileSync(process.execPath, [EXPLAIN, '--help'], { cwd: FIXTURES, encoding: 'utf8' });
  assert.match(out, /Usage:/);
});

test('no .clearfelt/ at all: reports voice/domain absent, personalCalibration is the not-computed message', () => {
  const result = run();
  assert.equal(result.voice.exists, false);
  assert.equal(result.domain.exists, false);
  assert.equal(typeof result.voice.personalCalibration, 'string');
  assert.match(result.voice.personalCalibration, /not computed/);
});

test('voice-profile.md with a Personal calibration section: reports the computed object, and config reflects the override', () => {
  // tests/fixtures/.clearfelt/ is the SAME shared directory
  // tests/detect.test.mjs also writes to (both files' FIXTURES constant
  // resolve to tests/fixtures), and node --test runs separate test files
  // concurrently by default: acquireLock/releaseLock (same primitive
  // withGlobalSettings uses) prevents this test and one of detect.test.mjs's
  // from racing on the same directory. Found the same way the
  // ~/.clearfelt/settings.md race was found: a coverage-driven test
  // addition here started intermittently failing.
  acquireLock();
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const profilePath = join(clearfeltDir, 'voice-profile.md');
  const alreadyExisted = existsSync(clearfeltDir);

  try {
    mkdirSync(clearfeltDir, { recursive: true });
    writeFileSync(
      profilePath,
      [
        '# Voice profile',
        '',
        '## Personal calibration (computed)',
        '',
        '- baseline_mattr: 0.5',
        '- baseline_burstiness_cv: 0.6',
        '- baseline_paragraph_cv: 0.7',
        '- sample_word_count: 4000',
        '',
      ].join('\n'),
    );

    const result = run();
    assert.deepEqual(result.voice.personalCalibration, {
      vocabulary_diversity_baseline: 0.5,
      burstiness_baseline: 0.6,
      paragraph_variety_baseline: 0.7,
    });
    // The three overridden config keys must show the computed value and a
    // source pointing at the voice profile, not the shipped/default value
    // silently left in place, or /clearfelt explain would lie about what's
    // actually driving the score.
    assert.equal(result.config.vocabulary_diversity_baseline.value, 0.5);
    assert.match(result.config.vocabulary_diversity_baseline.source, /voice-profile\.md \(computed\)/);
    assert.equal(result.config.burstiness_baseline.value, 0.6);
    assert.equal(result.config.paragraph_variety_baseline.value, 0.7);
  } finally {
    if (existsSync(profilePath)) rmSync(profilePath);
    if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    releaseLock();
  }
});

test('voice-profile.md without a calibration section: personalCalibration stays the not-computed message, not an empty object', () => {
  acquireLock();
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const profilePath = join(clearfeltDir, 'voice-profile.md');
  const alreadyExisted = existsSync(clearfeltDir);

  try {
    mkdirSync(clearfeltDir, { recursive: true });
    writeFileSync(profilePath, ['# Voice profile', '', '## Words I want to keep using', '', '- honestly', ''].join('\n'));

    const result = run();
    assert.equal(result.voice.exists, true);
    assert.equal(typeof result.voice.personalCalibration, 'string');
    assert.match(result.voice.personalCalibration, /not computed/);
  } finally {
    if (existsSync(profilePath)) rmSync(profilePath);
    if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    releaseLock();
  }
});

test('.clearfelt/domain.md with every field set: all reported, "(unset)" sentinel treated as unset, custom grade range wins over config default', () => {
  acquireLock();
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const domainPath = join(clearfeltDir, 'domain.md');
  const alreadyExisted2 = existsSync(clearfeltDir);

  try {
    mkdirSync(clearfeltDir, { recursive: true });
    writeFileSync(
      domainPath,
      [
        '# Domain profile',
        '',
        '## Domain',
        '',
        'Developer tooling.',
        '',
        '## Technical terms exempt from flagging',
        '',
        '- robust',
        '- leverage',
        '',
        '## Target reading level',
        '',
        '- target_grade_level_min: 8',
        '- target_grade_level_max: 14',
        '',
        '## Preferred intensity',
        '',
        '- preferred_intensity: balanced',
        '',
        '## Preferred length',
        '',
        '- preferred_length: (unset)',
        '',
        '## Mode',
        '',
        '- mode: technical',
        '',
        '## Risk tier',
        '',
        '- risk_tier: sensitive',
        '',
      ].join('\n'),
    );

    const result = run();
    assert.equal(result.domain.exists, true);
    assert.equal(result.domain.riskTier, 'sensitive');
    assert.equal(result.domain.mode, 'technical');
    assert.equal(result.domain.preferredIntensity, 'balanced');
    assert.equal(result.domain.preferredLength, null, '(unset) sentinel must read as not set, not the literal string');
    assert.equal(result.domain.targetGradeLevel.min, 8);
    assert.equal(result.domain.targetGradeLevel.max, 14);
    assert.equal(result.domain.targetGradeLevel.source, '.clearfelt/domain.md');
    assert.equal(result.domain.exemptTermCount, 2);
  } finally {
    if (existsSync(domainPath)) rmSync(domainPath);
    if (!alreadyExisted2 && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    releaseLock();
  }
});

test('multi-voice mode: --voice <name> resolves .clearfelt/voices/<name>.md instead of voice-profile.md', () => {
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const voicesDir = join(clearfeltDir, 'voices');
  const clearfeltDirAlreadyExisted = existsSync(clearfeltDir);

  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    try {
      mkdirSync(voicesDir, { recursive: true });
      writeFileSync(
        join(voicesDir, 'sarah.md'),
        ['# Voice profile: sarah', '', '## Words I want to keep using', '', '- honestly', '- look', ''].join('\n'),
      );

      const result = run(['--voice', 'sarah']);
      assert.equal(result.voice.mode, 'multi');
      assert.match(result.voice.profilePath, /\.clearfelt[/\\]voices[/\\]sarah\.md$/);
      assert.equal(result.voice.exists, true);
      assert.equal(result.voice.keptWordsCount, 2);
    } finally {
      if (existsSync(voicesDir)) rmSync(voicesDir, { recursive: true, force: true });
      if (!clearfeltDirAlreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    }
  });
});

test('a config key with no shipped clearfelt.config.md row at all falls back to CONFIG_DEFAULTS, source "default"', () => {
  // config.mjs's loadConfigWithProvenance() has three layers (defaults,
  // shipped, global). The shipped file covers every default by design (that
  // is what checkConfigDrift/checkConfigDefaultsDrift in scripts/lint.mjs
  // exist to enforce), so the "default" source branch is not reachable
  // through the real shipped file as it normally exists. Reaching it
  // honestly means removing one real row and putting it back, the same
  // mutate-then-restore discipline the ~/.clearfelt/settings.md regression
  // test in tests/detect.test.mjs already uses for the global-override
  // layer; this is the equivalent for the shipped layer. Narrow window,
  // synchronous, full content restored in finally even on assertion failure.
  const originalContent = readFileSync(SHIPPED_CONFIG, 'utf8');
  assert.match(originalContent, /\|\s*deduction_cap\s*\|/, 'expected clearfelt.config.md to actually ship a deduction_cap row');

  try {
    const withoutRow = originalContent
      .split('\n')
      .filter((line) => !/^\|\s*deduction_cap\s*\|/.test(line))
      .join('\n');
    assert.notEqual(withoutRow, originalContent, 'the filter must have actually removed a line');
    writeFileSync(SHIPPED_CONFIG, withoutRow);

    const result = run();
    assert.equal(result.config.deduction_cap.source, 'default');
    assert.equal(result.config.deduction_cap.value, 65, 'CONFIG_DEFAULTS.deduction_cap, not an arbitrary fallback');
  } finally {
    writeFileSync(SHIPPED_CONFIG, originalContent);
  }
});

test('-h (short flag) behaves identically to --help', () => {
  const out = execFileSync(process.execPath, [EXPLAIN, '-h'], { cwd: FIXTURES, encoding: 'utf8' });
  assert.match(out, /Usage:/);
});

test('--voice given while voice.mode is single (default, no multi override): resolves the same voice-profile.md path as no --voice at all, mode stays "single"', () => {
  const withoutVoiceFlag = run();
  const withVoiceFlag = run(['--voice', 'someone']);
  assert.equal(withVoiceFlag.voice.mode, 'single');
  assert.equal(withVoiceFlag.voice.profilePath, withoutVoiceFlag.voice.profilePath);
});

test('voice.mode: multi but no --voice given: still resolves voice-profile.md, not a voices/ path (voiceName absent short-circuits the multi branch)', () => {
  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    const result = run();
    assert.equal(result.voice.mode, 'multi');
    assert.match(result.voice.profilePath, /voice-profile\.md$/);
    assert.doesNotMatch(result.voice.profilePath, /voices[/\\]/);
  });
});

test('.clearfelt/domain.md with only the "## Domain" heading present: every other field falls back to its default (field() line-absent branch, not just the "(unset)" sentinel)', () => {
  acquireLock();
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const domainPath = join(clearfeltDir, 'domain.md');
  const alreadyExisted = existsSync(clearfeltDir);

  try {
    // Captured before domain.md exists, so this is a genuine "no domain.md
    // at all" baseline to diff the minimal-domain.md result against below,
    // not accidentally computed with the file already in place.
    const withoutDomain = run();

    mkdirSync(clearfeltDir, { recursive: true });
    writeFileSync(domainPath, ['# Domain profile', '', '## Domain', '', 'General audience, nothing else set.', ''].join('\n'));

    const result = run();
    assert.equal(result.domain.exists, true);
    assert.equal(result.domain.riskTier, 'standard', 'a completely absent risk_tier line must fall back to "standard"');
    assert.equal(result.domain.mode, null);
    assert.equal(result.domain.preferredIntensity, null);
    assert.equal(result.domain.preferredLength, null);
    assert.equal(result.domain.exemptTermCount, 0);
    // No target_grade_level lines at all: falls all the way back to
    // config's own resolved value/source, identical to no domain.md existing.
    assert.deepEqual(result.domain.targetGradeLevel, withoutDomain.domain.targetGradeLevel);
  } finally {
    if (existsSync(domainPath)) rmSync(domainPath);
    if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    releaseLock();
  }
});
