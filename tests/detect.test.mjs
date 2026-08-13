// Regression suite for scripts/detect.mjs. Runs the script as a real
// subprocess, exactly the way a user invokes it, rather than importing
// internals: detect.mjs is a script (unconditional `main()` at the bottom),
// not a library, and testing it as one keeps this suite honest about what
// actually ships. Uses only node:test/node:assert (Node's built-in test
// runner), no new dependency, per CLAUDE.md's dependency-free rule.
//
// Known gap, not fixed here: `loadConfig()` reads `~/.clearfelt/settings.md`
// via `os.homedir()` with no override hook, so the config-weight regression
// test below temporarily writes and then removes a real file in the
// machine's home directory. Acceptable for now; a future refactor could add
// a CLEARFELT_HOME env override to avoid touching the real home directory
// during tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

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
  const settingsDir = join(homedir(), '.clearfelt');
  const settingsPath = join(settingsDir, 'settings.md');
  const dirAlreadyExisted = existsSync(settingsDir);
  const fileAlreadyExisted = existsSync(settingsPath);
  const previousContent = fileAlreadyExisted ? readFileSync(settingsPath, 'utf8') : null;

  try {
    const baseline = run('ai-heavy-sample.md');
    const puffuryHits = baseline.hits.filter((h) => h.category === 'puffery_lexicon');
    assert.ok(puffuryHits.length > 0, 'fixture must contain a puffery_lexicon hit for this test to mean anything');

    if (!dirAlreadyExisted) mkdirSync(settingsDir, { recursive: true });
    writeFileSync(
      settingsPath,
      ['## Category severity weights', '', '| Category | Weight multiplier |', '|---|---|', '| puffery_lexicon | 0.5 |', ''].join('\n'),
    );

    const weighted = run('ai-heavy-sample.md');
    // The weight applies to every puffery_lexicon hit, not just one, so the
    // expected drop is 0.5 (not the old buggy 1.0) applied across all of
    // them, summed, not a single hit's severity.
    const expectedDrop = puffuryHits.reduce((sum, h) => sum + h.severity, 0) * 0.5;
    assert.equal(
      weighted.breakdown.deduction,
      baseline.breakdown.deduction - expectedDrop,
      'a 0.5 category weight in ~/.clearfelt/settings.md should cut that category\'s contribution in half',
    );
  } finally {
    if (fileAlreadyExisted) writeFileSync(settingsPath, previousContent);
    else if (existsSync(settingsPath)) rmSync(settingsPath);
    if (!dirAlreadyExisted && existsSync(settingsDir)) rmSync(settingsDir, { recursive: true, force: true });
  }
});
