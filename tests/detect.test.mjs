// Regression suite for scripts/detect.mjs. Runs the script as a real
// subprocess, exactly the way a user invokes it, rather than importing
// internals: detect.mjs is a script (unconditional `main()` at the bottom),
// not a library, and testing it as one keeps this suite honest about what
// actually ships. Uses only node:test/node:assert (Node's built-in test
// runner), no new dependency, per CLAUDE.md's dependency-free rule.
//
// Known gap, not fixed here: `loadConfig()` reads `~/.clearfelt/settings.md`
// via `os.homedir()` with no override hook, so the config-weight regression
// test below (via helpers/global-settings.mjs's withGlobalSettings) still
// temporarily writes a real file in the machine's home directory. A future
// refactor could add a CLEARFELT_HOME env override to avoid that. What IS
// fixed here: this used to be its own copy-pasted backup/restore block,
// unsafe under node --test's default cross-file concurrency since
// check.test.mjs touches the exact same real file; both now go through one
// lock-protected helper instead of racing on it independently.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { withGlobalSettings, acquireLock, releaseLock } from './helpers/global-settings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DETECT = join(ROOT, 'scripts', 'detect.mjs');
const FIXTURES = join(__dirname, 'fixtures');

function run(fixture, extraArgs = []) {
  const out = execFileSync(
    process.execPath,
    [DETECT, '--mode', 'report', join(FIXTURES, fixture), ...extraArgs],
    { cwd: FIXTURES, encoding: 'utf8' },
  );
  return JSON.parse(out);
}

test('ai-heavy-sample.md: known hits, deduction, and wall-of-text penalty', () => {
  // These numbers moved twice since this test was first written:
  // 1. score 60 to 31, hits 4 to 9, when tier2_cluster_window was wired up
  //    for real: the old approximation only counted a tier-2 word as a hit
  //    when the SAME word repeated, so single-occurrence tier-2 words
  //    (testament, seamless, unlock, synergistic, paradigm shift) were all
  //    silently suppressed even though this fixture is one dense paragraph
  //    where they all sit well within any reasonable cluster window of
  //    each other, exactly the case tier-2 is supposed to catch.
  // 2. score 31 to 23, hits 9 to 10, when "pave the way" (this fixture
  //    already contains it: "we can pave the way for a paradigm shift")
  //    was added to puffery_lexicon.md, and vocabulary diversity switched
  //    from raw TTR to length-normalized Root TTR with a rescaled weight
  //    (docs/decisions/0012-length-normalized-vocabulary-diversity.md),
  //    both while closing the eval recall gap.
  // 3. score 23 to 11, hits and deduction unchanged, when Root TTR was
  //    replaced by MATTR (docs/decisions/0017-windowed-vocabulary-diversity.md):
  //    Root TTR still grew unbounded with document length well past this
  //    corpus (15.4 on an 841-word real-world sample versus a 5.7-7.4
  //    fixture-calibrated band), a windowed measure fixes that by
  //    construction. This fixture is 92 words, just over the 50-word
  //    window, so it lost most of its vocabulary-diversity bonus too, not
  //    just the outlier long document the fix targeted.
  // 4. score 11 to 9, hits 10 to 12, deduction 63 to 75 (now over
  //    deduction_cap, deductionCapped flips true), when investigating
  //    tests/fixtures/eval/ai-7.md's out-of-band eval miss surfaced a real
  //    coverage gap: "landscape" had no rule entry at all, and "In today's
  //    rapidly evolving X landscape/world/era/environment" openers only
  //    matched the single literal "In today's world," string, not this
  //    paraphrase. Both gaps were closed with new rule-dictionary entries
  //    (rules/banned_words/high_frequency_lexicon.md's "landscape",
  //    rules/antipatterns/throat_clearing_openers.md's four new regex
  //    bullets), and this fixture happens to contain exactly the phrase
  //    those entries were added for, so its score moved too.
  const result = run('ai-heavy-sample.md');
  assert.equal(result.score, 9);
  assert.equal(result.breakdown.deduction, 75);
  assert.equal(result.breakdown.deductionApplied, 65);
  assert.equal(result.breakdown.deductionCapped, true);
  assert.equal(result.breakdown.wallOfTextPenalty, 15);
  assert.equal(result.breakdown.paragraphCount, 1);
  assert.deepEqual(result.categoryCounts, {
    fake_profound_closers: 1,
    throat_clearing_openers: 1,
    high_frequency_lexicon: 4,
    puffery_lexicon: 6,
  });
  assert.equal(result.hits.length, 12);
});

test('ai-heavy-sample.md: impacts and category points are sorted by magnitude, descending', () => {
  const result = run('ai-heavy-sample.md');
  const impacts = result.breakdown.impacts;
  assert.match(impacts[0].label, /^Rule-hit deduction/); // "(capped from N)" once deduction exceeds deduction_cap, see the fixture-history comment above
  for (let i = 1; i < impacts.length; i++) {
    assert.ok(Math.abs(impacts[i - 1].impact) >= Math.abs(impacts[i].impact), 'impacts must be sorted by |impact| descending');
  }
  assert.equal(impacts.some((row) => row.impact === 0), false, 'a zero-impact factor should be omitted, not printed as 0');

  const points = result.categoryPoints;
  // seamless (6) + unlock (5) + in conclusion (7) + synergistic (6) + paradigm shift (6)
  // + pave the way (6) = 36, the fixture's largest category subtotal now that
  // tier-2 clustering counts them all and "pave the way" is in the lexicon.
  assert.equal(points[0].category, 'puffery_lexicon');
  for (let i = 1; i < points.length; i++) {
    assert.ok(points[i - 1].points >= points[i].points, 'categoryPoints must be sorted descending');
  }

  assert.equal(result.patternSummary.length, 12); // one row per distinct pattern, matching the 12 hits in this fixture
  for (const row of result.patternSummary) {
    assert.equal(row.occurrences, row.lines.length, `${row.pattern}: occurrences must match the number of recorded lines`);
  }
  for (let i = 1; i < result.patternSummary.length; i++) {
    assert.ok(result.patternSummary[i - 1].points >= result.patternSummary[i].points, 'patternSummary must be sorted by points descending');
  }
});

test('extreme-slop-sample.md: raw deduction beyond deduction_cap is capped, not silently discarded', () => {
  const result = run('extreme-slop-sample.md');
  assert.ok(result.breakdown.deduction > 65, 'fixture must exceed the cap for this test to mean anything');
  assert.equal(result.breakdown.deductionApplied, 65);
  assert.equal(result.breakdown.deductionCapped, true);
  assert.match(result.breakdown.impacts[0].label, /capped from \d+/, 'the top impact label must disclose the raw deduction, not just the capped one');
});

test('human-sample.md: no rule hits, clean score, multiple paragraphs', () => {
  const result = run('human-sample.md');
  assert.equal(result.hits.length, 0);
  assert.equal(result.breakdown.deduction, 0);
  assert.equal(result.breakdown.wallOfTextPenalty, 0);
  assert.equal(result.breakdown.paragraphCount, 4);
  assert.ok(result.score >= 85, `expected score >= 85, got ${result.score}`);
});

test('template-patterns-sample.md: regex bullets fire on real text, not just their bracketed example', () => {
  // Round-9-era bug: binary_contrasts.md and structural_tells.md bullets
  // like "It's not X. It's Y." and "colon-reveal: The best part: it
  // learns." were matched as literal strings (capital X/Y, the label
  // prefix and all), so they could never fire on real prose. Fixed by
  // giving these bullets `regex: true` and rewriting them as actual
  // regexes; this fixture exercises each one with a fresh sentence, not
  // the exact example text from the rule file, to prove the pattern
  // generalizes rather than only matching its own doc comment.
  const result = run('template-patterns-sample.md');
  const categories = result.hits.map((h) => h.category);
  assert.ok(categories.includes('binary_contrasts'), 'expected at least one binary_contrasts hit');
  assert.ok(categories.includes('structural_tells'), 'expected at least one structural_tells hit');
  // 4 distinct binary_contrasts patterns in the fixture ("It's not X. It's
  // Y.", "This isn't just [X]. It's [Y].", "It's not about X, it's about
  // Y.", "X isn't the point. Y is."), plus the colon-reveal and
  // dramatic-fragment structural_tells patterns.
  const binaryHits = result.hits.filter((h) => h.category === 'binary_contrasts');
  assert.ok(binaryHits.length >= 4, `expected at least 4 binary_contrasts hits, got ${binaryHits.length}`);
});

test('regression: category severity weights from config actually multiply the deduction', () => {
  // Round-9 bug: loadConfig() never parsed the "Category severity weights"
  // section, and computeScore looked up a `weight_<category>` key that was
  // never populated, so every category silently scored at 1.0 regardless of
  // clearfelt.config.md. This reproduces that exact scenario via the
  // highest-precedence override file and asserts the weight actually lands.
  const baseline = run('ai-heavy-sample.md');
  const puffuryHits = baseline.hits.filter((h) => h.category === 'puffery_lexicon');
  assert.ok(puffuryHits.length > 0, 'fixture must contain a puffery_lexicon hit for this test to mean anything');

  withGlobalSettings(
    ['## Category severity weights', '', '| Category | Weight multiplier |', '|---|---|', '| puffery_lexicon | 0.5 |', ''],
    () => {
      const weighted = run('ai-heavy-sample.md');
      // The weight applies to every puffery_lexicon hit, not just one, so
      // the expected drop is 0.5 (not the old buggy 1.0) applied across all
      // of them, summed, not a single hit's severity.
      const expectedDrop = puffuryHits.reduce((sum, h) => sum + h.severity, 0) * 0.5;
      assert.equal(
        weighted.breakdown.deduction,
        baseline.breakdown.deduction - expectedDrop,
        'a 0.5 category weight in ~/.clearfelt/settings.md should cut that category\'s contribution in half',
      );
    },
  );
});

test('leadDriver falls back to "no single factor dominates" when every impact is exactly zero', () => {
  // report.mjs's leadDriver is scoring.impacts[0]'s label, or this fallback
  // string when impacts is empty. impacts only drops an entry when its
  // rounded value is exactly 0, so an empty document scored against
  // baselines forced to 0 (matching its own all-zero actual statistics)
  // is the one input that empties every component at once.
  const emptyPath = join(FIXTURES, 'empty-for-leaddriver-test.md');
  writeFileSync(emptyPath, '');
  try {
    withGlobalSettings(
      [
        '## Statistical signals',
        '',
        '| Setting | Default |',
        '|---|---|',
        '| vocabulary_diversity_baseline | 0 |',
        '| burstiness_baseline | 0 |',
        '| paragraph_variety_baseline | 0 |',
        '',
      ],
      () => {
        const out = execFileSync(process.execPath, [DETECT, '--mode', 'report', emptyPath], { cwd: FIXTURES, encoding: 'utf8' });
        const result = JSON.parse(out);
        assert.deepEqual(result.breakdown.impacts, [], 'every impact must be exactly zero for this test to mean anything');
        assert.equal(result.leadDriver, 'no single factor dominates; every signal is near zero');
      },
    );
  } finally {
    rmSync(emptyPath);
  }
});

test('personal calibration in .clearfelt/voice-profile.md overrides the generic statistical baselines', () => {
  // Feature: scripts/calibrate.mjs computes a writer's own MATTR/burstiness/
  // paragraph-CV, /clearfelt setup stores it, and loadVoiceProfileCalibration
  // reads it back to override clearfelt.config.md's generic, fixture-derived
  // defaults for this project only. A voice profile with no calibration
  // section must be a strict no-op (covered implicitly by every other test
  // in this file, none of which create one); this test covers the override
  // actually taking effect when the section is present.
  // tests/fixtures/.clearfelt/ is shared with tests/explain.test.mjs (both
  // files' FIXTURES resolve to the same tests/fixtures directory), and
  // node --test runs separate test files concurrently by default: lock it
  // the same way withGlobalSettings already locks ~/.clearfelt/settings.md.
  acquireLock();
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const profilePath = join(clearfeltDir, 'voice-profile.md');
  const alreadyExisted = existsSync(clearfeltDir);

  try {
    const baseline = run('human-sample.md');

    mkdirSync(clearfeltDir, { recursive: true });
    writeFileSync(
      profilePath,
      [
        '# Voice profile',
        '',
        '## Personal calibration (computed)',
        '',
        '- baseline_mattr: 0.5',
        '- baseline_burstiness_cv: 0.9',
        '- baseline_paragraph_cv: 0.9',
        '- sample_word_count: 4000',
        '',
      ].join('\n'),
    );

    const calibrated = run('human-sample.md');

    // human-sample.md's actual MATTR/burstiness/paragraph CV don't change,
    // only the baselines they're measured against do, so every one of the
    // three adjustments that depends on a baseline must move, each in a
    // known direction given the fixture's own values (all three test
    // baselines are set below the shipped/default 0.5 or the document's
    // actual CV, so every adjustment should move in a knowable direction,
    // not just "some assertion about vocabAdjustment", which is all a
    // shallower version of this test would catch).
    assert.notEqual(
      calibrated.breakdown.vocabAdjustment,
      baseline.breakdown.vocabAdjustment,
      'a personal vocabulary_diversity_baseline must change the score once set',
    );
    assert.ok(
      calibrated.breakdown.vocabAdjustment > baseline.breakdown.vocabAdjustment,
      'a lower personal baseline than the shipped default should raise vocabAdjustment, not lower it',
    );
    assert.notEqual(
      calibrated.breakdown.burstinessAdjustment,
      baseline.breakdown.burstinessAdjustment,
      'a personal burstiness_baseline must change the score once set',
    );
    assert.notEqual(
      calibrated.breakdown.paragraphVarietyAdjustment,
      baseline.breakdown.paragraphVarietyAdjustment,
      'a personal paragraph_variety_baseline must change the score once set',
    );
  } finally {
    if (existsSync(profilePath)) rmSync(profilePath);
    if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    releaseLock();
  }
});

test('voice.mode: multi with --voice <name>: .clearfelt/voices/<name>.md "Words I want to keep using" suppresses that word\'s hit', () => {
  // Shares tests/fixtures/.clearfelt/ with the calibration test above and
  // with tests/explain.test.mjs; withGlobalSettings's own lock covers both
  // the settings mutation and this fixture-directory mutation, so no
  // separate acquireLock/releaseLock here (that would deadlock against it).
  const voicesDir = join(FIXTURES, '.clearfelt', 'voices');
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const alreadyExisted = existsSync(clearfeltDir);
  const profilePath = join(voicesDir, 'work.md');

  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    try {
      const baseline = run('ai-heavy-sample.md');
      assert.ok(
        baseline.hits.some((h) => h.pattern.toLowerCase() === 'delve'),
        'ai-heavy-sample.md must trigger the "delve" hit for this override test to mean anything',
      );

      mkdirSync(voicesDir, { recursive: true });
      writeFileSync(profilePath, ['# Voice profile: work', '', '## Words I want to keep using', '', '- delve', ''].join('\n'));

      const withVoice = run('ai-heavy-sample.md', ['--voice', 'work']);
      assert.ok(
        !withVoice.hits.some((h) => h.pattern.toLowerCase() === 'delve'),
        'the multi-voice profile override must suppress the "delve" hit',
      );
    } finally {
      if (existsSync(profilePath)) rmSync(profilePath);
      if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    }
  });
});

test('extends: a word listed only in the base file is still suppressed through a platform override (union, ADR 0021)', () => {
  const voicesDir = join(FIXTURES, '.clearfelt', 'voices');
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const alreadyExisted = existsSync(clearfeltDir);
  const basePath = join(voicesDir, 'general.md');
  const overridePath = join(voicesDir, 'linkedin.md');

  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    try {
      const baseline = run('ai-heavy-sample.md');
      assert.ok(
        baseline.hits.some((h) => h.pattern.toLowerCase() === 'delve'),
        'ai-heavy-sample.md must trigger the "delve" hit for this override test to mean anything',
      );

      mkdirSync(voicesDir, { recursive: true });
      // "delve" lives ONLY in the base file, never repeated in the override.
      writeFileSync(basePath, ['# Voice profile: general', '', '## Words I want to keep using', '', '- delve', ''].join('\n'));
      writeFileSync(overridePath, ['extends: general', '', '# Voice profile: linkedin', ''].join('\n'));

      const withVoice = run('ai-heavy-sample.md', ['--voice', 'linkedin']);
      assert.ok(
        !withVoice.hits.some((h) => h.pattern.toLowerCase() === 'delve'),
        'a base-only kept word must still suppress the hit when scoring through the platform override that extends it',
      );
    } finally {
      if (existsSync(basePath)) rmSync(basePath);
      if (existsSync(overridePath)) rmSync(overridePath);
      if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    }
  });
});

// ---- --exempt-repetition (ADR 0022) ----

test('--exempt-repetition: a phrase repeated on purpose stops counting against repetitionPenalty, and is echoed back in the report', () => {
  const callbackFile = join(FIXTURES, 'repeated-callback-tmp.md');
  writeFileSync(
    callbackFile,
    'The recruiter goes quiet exactly when you need them least.\n\n' +
      'Who has shown up for you, not before it, but after you need them least?\n',
  );
  try {
    const baseline = run('repeated-callback-tmp.md');
    const withExemption = run('repeated-callback-tmp.md', ['--exempt-repetition', 'you need them least']);
    assert.ok(
      withExemption.breakdown.repetitionPenalty <= baseline.breakdown.repetitionPenalty,
      'exempting the repeated callback phrase must not increase the repetition penalty',
    );
    assert.deepEqual(withExemption.exemptRepetition, ['you need them least']);
    assert.equal(baseline.exemptRepetition, undefined);
  } finally {
    rmSync(callbackFile);
  }
});

test('--exempt-repetition: repeatable, multiple phrases can be exempted in one run', () => {
  const { status, stdout } = spawnSync(
    process.execPath,
    [DETECT, '--mode', 'report', join(FIXTURES, 'human-sample.md'), '--exempt-repetition', 'one', '--exempt-repetition', 'two'],
    { cwd: FIXTURES, encoding: 'utf8' },
  );
  assert.equal(status, 0);
  const payload = JSON.parse(stdout);
  assert.deepEqual(payload.exemptRepetition, ['one', 'two']);
});

// ---- language-confidence warning (ADR 0023) ----

test('a non-English document reports scoreReliability/languageConfidence/languageWarning', () => {
  const result = run('non-english-sample.md');
  assert.equal(result.scoreReliability, 'low');
  assert.ok(typeof result.languageConfidence === 'number' && result.languageConfidence < 0.15);
  assert.match(result.languageWarning, /may not be English/);
});

test('--mode score also carries the language warning, not just --mode report: prompts/write_loop.xml and audit_loop.xml only ever call --mode score for their iterative scoring pass', () => {
  const out = execFileSync(
    process.execPath,
    [DETECT, '--mode', 'score', join(FIXTURES, 'non-english-sample.md')],
    { cwd: FIXTURES, encoding: 'utf8' },
  );
  const result = JSON.parse(out);
  assert.equal(result.scoreReliability, 'low');
  assert.ok(typeof result.languageConfidence === 'number');
});

test('a real English document has no languageWarning field at all, report unchanged from before ADR 0023', () => {
  const result = run('human-sample.md');
  assert.equal(result.scoreReliability, undefined);
  assert.equal(result.languageConfidence, undefined);
  assert.equal(result.languageWarning, undefined);
});

// ---- CLI surface: modes, directory scanning, and error paths ----
// The tests above all go through the run() helper (single file, --mode
// report). These cover the rest of detect.mjs's own main(): --help, no
// path, an unknown --mode, a missing or out-of-project path, and
// directory mode (report/score/scan aggregation, and the empty-directory
// error), none of which run() exercises.

test('--help prints usage (to stdout, unlike every other usage/error message in this file) and exits zero', () => {
  const { status, stdout } = spawnSync(process.execPath, [DETECT, '--help'], { cwd: FIXTURES, encoding: 'utf8' });
  assert.equal(status, 0);
  assert.match(stdout, /Usage:/);
});

test('no path argument: usage to stderr, exit 1', () => {
  const { status, stderr } = spawnSync(process.execPath, [DETECT, '--mode', 'report'], { cwd: FIXTURES, encoding: 'utf8' });
  assert.equal(status, 1);
  assert.match(stderr, /Usage:/);
});

test('unknown --mode: clear error, exit 1', () => {
  const { status, stderr } = spawnSync(process.execPath, [DETECT, '--mode', 'bogus', join(FIXTURES, 'human-sample.md')], {
    cwd: FIXTURES,
    encoding: 'utf8',
  });
  assert.equal(status, 1);
  assert.match(stderr, /unknown --mode "bogus"/);
});

test('a path that does not exist: clear error, exit 1', () => {
  const { status, stderr } = spawnSync(process.execPath, [DETECT, '--mode', 'report', 'does-not-exist.md'], {
    cwd: FIXTURES,
    encoding: 'utf8',
  });
  assert.equal(status, 1);
  assert.match(stderr, /path not found/);
});

test('a path outside the project directory is refused, even when it exists', () => {
  const outsideFile = join(tmpdir(), 'clearfelt-detect-outside-test.md');
  writeFileSync(outsideFile, 'Some text.');
  try {
    const { status, stderr } = spawnSync(process.execPath, [DETECT, '--mode', 'report', outsideFile], { cwd: FIXTURES, encoding: 'utf8' });
    assert.equal(status, 1);
    assert.match(stderr, /resolves outside the current project/);
  } finally {
    if (existsSync(outsideFile)) rmSync(outsideFile);
  }
});

test('single-file mode, --mode score: compact one-line JSON, not pretty-printed', () => {
  const out = execFileSync(process.execPath, [DETECT, '--mode', 'score', join(FIXTURES, 'human-sample.md')], {
    cwd: FIXTURES,
    encoding: 'utf8',
  });
  assert.equal(out.trim().includes('\n'), false, 'compact format must be a single line, unlike the pretty-printed report');
  const result = JSON.parse(out);
  assert.ok(typeof result.score === 'number');
});

test('directory mode, --mode report: aggregates every .md/.txt/.mdx file in the directory with a real average score', () => {
  const out = execFileSync(process.execPath, [DETECT, '--mode', 'report', FIXTURES], { cwd: FIXTURES, encoding: 'utf8' });
  const result = JSON.parse(out);
  assert.equal(result.isDirectory, true);
  assert.ok(Array.isArray(result.files) && result.files.length >= 2, 'fixtures directory has multiple top-level .md files');
  assert.ok(typeof result.score === 'number');
  const expectedAverage = Math.round(result.files.reduce((sum, f) => sum + f.score, 0) / result.files.length);
  assert.equal(result.score, expectedAverage);
});

test('directory mode, --mode score: compact { score, files } shape, not the full report', () => {
  const out = execFileSync(process.execPath, [DETECT, '--mode', 'score', FIXTURES], { cwd: FIXTURES, encoding: 'utf8' });
  const result = JSON.parse(out);
  assert.ok(typeof result.score === 'number');
  assert.ok(Array.isArray(result.files));
  assert.ok(result.files.every((f) => typeof f.target === 'string' && typeof f.score === 'number'));
});

test('directory mode, --mode scan: returns occurrences per file, tier-suppression bypassed, no averaged score field', () => {
  const out = execFileSync(process.execPath, [DETECT, '--mode', 'scan', FIXTURES], { cwd: FIXTURES, encoding: 'utf8' });
  const result = JSON.parse(out);
  assert.equal(result.isDirectory, true);
  assert.ok(Array.isArray(result.files));
  assert.ok(!('score' in result), 'scan mode aggregates occurrences, not an averaged score');
  assert.ok(result.files.every((f) => Array.isArray(f.occurrences)));
});

test('directory mode with no scannable files: clear error, exit 1, no empty-directory silent success', () => {
  const emptyDir = join(FIXTURES, 'empty-for-detect-test');
  mkdirSync(emptyDir, { recursive: true });
  try {
    const { status, stderr } = spawnSync(process.execPath, [DETECT, '--mode', 'report', emptyDir], { cwd: FIXTURES, encoding: 'utf8' });
    assert.equal(status, 1);
    assert.match(stderr, /no \.md\/\.txt\/\.mdx files found/);
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

// ---- baseline mode (--save-baseline / --baseline) ----

test('--save-baseline writes a snapshot file of the current hits', () => {
  const baselinePath = join(FIXTURES, 'baseline-snapshot-test.json');
  try {
    if (existsSync(baselinePath)) rmSync(baselinePath);
    run('ai-heavy-sample.md', ['--save-baseline', baselinePath]);
    assert.ok(existsSync(baselinePath), '--save-baseline must actually write the file');
    const saved = JSON.parse(readFileSync(baselinePath, 'utf8'));
    assert.ok(Array.isArray(saved.hits) && saved.hits.length > 0, 'fixture has known hits to snapshot');
  } finally {
    if (existsSync(baselinePath)) rmSync(baselinePath);
  }
});

test('--baseline reports only hits new since the snapshot, not the ones already captured', () => {
  const baselinePath = join(FIXTURES, 'baseline-diff-test.json');
  try {
    const full = run('ai-heavy-sample.md', ['--save-baseline', baselinePath]);
    assert.ok(full.hits.length > 0, 'fixture must have hits for this test to mean anything');

    const diffed = run('ai-heavy-sample.md', ['--baseline', baselinePath]);
    assert.equal(diffed.hits.length, 0, 'scanning the same file against its own just-saved baseline must show zero new hits');
    // The score itself is computed from allHits, not reportedHits (see
    // scripts/lib/report.mjs's runFile), so it must be unchanged by the
    // baseline diff, only the reported hit list narrows.
    assert.equal(diffed.score, full.score);
  } finally {
    if (existsSync(baselinePath)) rmSync(baselinePath);
  }
});

test('--baseline pointing at a nonexistent snapshot file is a no-op (all hits still reported), not an error', () => {
  const result = run('ai-heavy-sample.md', ['--baseline', join(FIXTURES, 'does-not-exist-baseline.json')]);
  const full = run('ai-heavy-sample.md');
  assert.equal(result.hits.length, full.hits.length);
});

test('.clearfelt/domain.md target_grade_level_min/max overrides clearfelt.config.md\'s shipped 6-12 default for readability.withinTargetRange', () => {
  acquireLock();
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const domainPath = join(clearfeltDir, 'domain.md');
  const alreadyExisted = existsSync(clearfeltDir);

  try {
    const withoutDomain = run('human-sample.md');

    mkdirSync(clearfeltDir, { recursive: true });
    // A deliberately extreme, narrow range that the fixture's real grade
    // level should NOT fall inside, so the override is verifiably taking
    // effect rather than coincidentally matching the shipped 6-12 default.
    writeFileSync(domainPath, ['# Domain profile', '', '## Target reading level', '', '- target_grade_level_min: 30', '- target_grade_level_max: 32', ''].join('\n'));

    const withDomain = run('human-sample.md');
    assert.equal(withDomain.readability.fleschKincaidGrade, withoutDomain.readability.fleschKincaidGrade, 'the domain override changes the target range, not the measured grade level itself');
    assert.equal(withDomain.readability.withinTargetRange, false, 'a real document should not happen to sit inside a 30-32 grade-level band');
  } finally {
    if (existsSync(domainPath)) rmSync(domainPath);
    if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    releaseLock();
  }
});

// ---- --register (docs/decisions/0024) ----

test('--register: neutral (the default) never adds a registerCheck field, and the score matches the no-flag run exactly', () => {
  const path = join(FIXTURES, 'register-tmp.md');
  writeFileSync(path, "What's the tell that someone's faking it, maybe?\n");
  try {
    const noFlag = run('register-tmp.md');
    const explicitNeutral = run('register-tmp.md', ['--register', 'neutral']);
    assert.equal(noFlag.registerCheck, undefined);
    assert.equal(explicitNeutral.registerCheck, undefined);
    assert.equal(noFlag.score, explicitNeutral.score);
  } finally {
    rmSync(path);
  }
});

test('--register warm: flags an accusatory word as an advisory hit, without moving the score at all', () => {
  const path = join(FIXTURES, 'register-warm-tmp.md');
  writeFileSync(path, "What's the tell that someone's faking it?\n");
  try {
    const neutral = run('register-warm-tmp.md');
    const warm = run('register-warm-tmp.md', ['--register', 'warm']);
    assert.equal(warm.registerCheck.register, 'warm');
    assert.ok(warm.registerCheck.hits.some((h) => h.category === 'accusatory'), 'the accusatory list must catch "faking"');
    assert.equal(warm.score, neutral.score, 'a register hit must never change the Human Score');
    assert.deepEqual(warm.hits, neutral.hits, 'register hits must be entirely separate from the scored hits array');
  } finally {
    rmSync(path);
  }
});

test('--register direct: flags a hedging word as an advisory hit, without moving the score at all', () => {
  const path = join(FIXTURES, 'register-direct-tmp.md');
  writeFileSync(path, 'Maybe this approach could possibly work, I think.\n');
  try {
    const neutral = run('register-direct-tmp.md');
    const direct = run('register-direct-tmp.md', ['--register', 'direct']);
    assert.equal(direct.registerCheck.register, 'direct');
    assert.ok(direct.registerCheck.hits.some((h) => h.category === 'hedging'), 'the hedging list must catch "maybe"/"possibly"/"i think"');
    assert.equal(direct.score, neutral.score, 'a register hit must never change the Human Score');
  } finally {
    rmSync(path);
  }
});

test('--register: an isolated single hit is not suppressed by tier-2 clustering (tier suppression only protects the score, which register never touches)', () => {
  const path = join(FIXTURES, 'register-isolated-tmp.md');
  writeFileSync(path, "There's nothing else unusual here, just one lone word: fake.\n");
  try {
    const warm = run('register-isolated-tmp.md', ['--register', 'warm']);
    assert.ok(warm.registerCheck.hits.some((h) => h.pattern === 'fake'), 'a single, isolated register hit must still surface, unlike a scored tier-2 word would');
  } finally {
    rmSync(path);
  }
});

test('--register: an unknown value is rejected with a clear error and non-zero exit', () => {
  const { status, stderr } = spawnSync(process.execPath, [DETECT, '--mode', 'score', join(FIXTURES, 'human-sample.md'), '--register', 'loud'], {
    cwd: FIXTURES,
    encoding: 'utf8',
  });
  assert.notEqual(status, 0);
  assert.match(stderr, /unknown --register/);
});

test('--mode score: registerCheck never appears, even with --register warm (advisory-only field is report-mode only)', () => {
  const path = join(FIXTURES, 'register-score-mode-tmp.md');
  writeFileSync(path, "What's the tell that someone's faking it?\n");
  try {
    const out = execFileSync(process.execPath, [DETECT, '--mode', 'score', join(FIXTURES, 'register-score-mode-tmp.md'), '--register', 'warm'], {
      cwd: FIXTURES,
      encoding: 'utf8',
    });
    const payload = JSON.parse(out);
    assert.equal(payload.registerCheck, undefined);
    assert.ok('score' in payload);
  } finally {
    rmSync(path);
  }
});

test('a voice profile\'s own "## Register" field is picked up with no --register flag at all', () => {
  const voicesDir = join(FIXTURES, '.clearfelt', 'voices');
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const alreadyExisted = existsSync(clearfeltDir);
  const profilePath = join(voicesDir, 'warm-voice.md');
  const path = join(FIXTURES, 'register-voice-tmp.md');
  writeFileSync(path, "What's the tell that someone's faking it?\n");

  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    try {
      mkdirSync(voicesDir, { recursive: true });
      writeFileSync(profilePath, ['# Voice profile: warm-voice', '', '## Register', '', 'register: warm', ''].join('\n'));

      const result = run('register-voice-tmp.md', ['--voice', 'warm-voice']);
      assert.equal(result.registerCheck.register, 'warm');
      assert.ok(result.registerCheck.hits.some((h) => h.category === 'accusatory'));
    } finally {
      rmSync(path);
      if (existsSync(profilePath)) rmSync(profilePath);
      if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    }
  });
});

test('register: an override file with no "## Register" section inherits the base file\'s register (extends:, same precedence as Sentence rhythm)', () => {
  const voicesDir = join(FIXTURES, '.clearfelt', 'voices');
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const alreadyExisted = existsSync(clearfeltDir);
  const basePath = join(voicesDir, 'general.md');
  const overridePath = join(voicesDir, 'quiet.md');
  const path = join(FIXTURES, 'register-inherit-tmp.md');
  writeFileSync(path, "What's the tell that someone's faking it?\n");

  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    try {
      mkdirSync(voicesDir, { recursive: true });
      writeFileSync(basePath, ['# Voice profile: general', '', '## Register', '', 'register: warm', ''].join('\n'));
      writeFileSync(overridePath, ['extends: general', '', '# Voice profile: quiet', ''].join('\n'));

      const result = run('register-inherit-tmp.md', ['--voice', 'quiet']);
      assert.equal(result.registerCheck.register, 'warm', 'no own "## Register" section means the base file\'s value applies');
    } finally {
      rmSync(path);
      if (existsSync(basePath)) rmSync(basePath);
      if (existsSync(overridePath)) rmSync(overridePath);
      if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    }
  });
});

test('register: an override file\'s own "## Register" wins over the base file it extends', () => {
  const voicesDir = join(FIXTURES, '.clearfelt', 'voices');
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const alreadyExisted = existsSync(clearfeltDir);
  const basePath = join(voicesDir, 'general.md');
  const overridePath = join(voicesDir, 'louder.md');
  const path = join(FIXTURES, 'register-override-wins-tmp.md');
  writeFileSync(path, 'Maybe this could possibly work.\n');

  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    try {
      mkdirSync(voicesDir, { recursive: true });
      writeFileSync(basePath, ['# Voice profile: general', '', '## Register', '', 'register: warm', ''].join('\n'));
      writeFileSync(overridePath, ['extends: general', '', '# Voice profile: louder', '', '## Register', '', 'register: direct', ''].join('\n'));

      const result = run('register-override-wins-tmp.md', ['--voice', 'louder']);
      assert.equal(result.registerCheck.register, 'direct', 'the override file\'s own register must win over the base\'s');
    } finally {
      rmSync(path);
      if (existsSync(basePath)) rmSync(basePath);
      if (existsSync(overridePath)) rmSync(overridePath);
      if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    }
  });
});

test('register: an invalid value inside a voice profile throws a clear error rather than silently defaulting', () => {
  const voicesDir = join(FIXTURES, '.clearfelt', 'voices');
  const clearfeltDir = join(FIXTURES, '.clearfelt');
  const alreadyExisted = existsSync(clearfeltDir);
  const profilePath = join(voicesDir, 'broken-register.md');
  const path = join(FIXTURES, 'register-invalid-tmp.md');
  writeFileSync(path, 'Some text.\n');

  withGlobalSettings(['## Voice', '', '| Setting | Default |', '|---|---|', '| voice.mode | multi |', ''], () => {
    try {
      mkdirSync(voicesDir, { recursive: true });
      writeFileSync(profilePath, ['# Voice profile: broken-register', '', '## Register', '', 'register: shouty', ''].join('\n'));

      const { status, stderr } = spawnSync(
        process.execPath,
        [DETECT, '--mode', 'report', join(FIXTURES, 'register-invalid-tmp.md'), '--voice', 'broken-register'],
        { cwd: FIXTURES, encoding: 'utf8' },
      );
      assert.notEqual(status, 0);
      assert.match(stderr, /Invalid register/);
    } finally {
      rmSync(path);
      if (existsSync(profilePath)) rmSync(profilePath);
      if (!alreadyExisted && existsSync(clearfeltDir)) rmSync(clearfeltDir, { recursive: true, force: true });
    }
  });
});
