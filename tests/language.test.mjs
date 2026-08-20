// Unit tests for scripts/lib/language.mjs (docs/decisions/0023). Imported
// directly, same rationale as tests/score.test.mjs: a pure library of
// exported functions with no CLI of its own.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { englishFunctionWordRatio, languageConfidence } from '../scripts/lib/language.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');

test('englishFunctionWordRatio: empty text returns a zero ratio, not NaN', () => {
  assert.deepEqual(englishFunctionWordRatio(''), { ratio: 0, wordCount: 0 });
});

test('englishFunctionWordRatio: real English prose lands well above the low-confidence threshold', () => {
  const text = readFileSync(join(FIXTURES, 'human-sample.md'), 'utf8');
  const { ratio, wordCount } = englishFunctionWordRatio(text);
  assert.ok(wordCount > 30);
  assert.ok(ratio > 0.15, `expected a real English fixture to score above 0.15, got ${ratio}`);
});

test('englishFunctionWordRatio: text with no English function words at all scores at or near zero', () => {
  const nonEnglish =
    'Programmiersprachen entwickeln sich schnell weiter und Unternehmen müssen ständig neue Technologien ' +
    'bewerten bevor Investitionsentscheidungen getroffen werden können heutzutage besonders wichtig geworden';
  const { ratio } = englishFunctionWordRatio(nonEnglish);
  assert.ok(ratio < 0.15, `expected a non-English sample to score below 0.15, got ${ratio}`);
});

test('languageConfidence: returns null (withholds judgment) below the minimum word count', () => {
  assert.equal(languageConfidence('The quick brown fox.'), null);
  assert.equal(languageConfidence(''), null);
});

test('languageConfidence: real English prose returns low: false', () => {
  const text = readFileSync(join(FIXTURES, 'human-sample.md'), 'utf8');
  const result = languageConfidence(text);
  assert.ok(result !== null);
  assert.equal(result.low, false);
  assert.ok(result.confidence > 0.15);
});

test('languageConfidence: a long non-English sample returns low: true, with the raw ratio disclosed', () => {
  const nonEnglish = Array(10)
    .fill(
      'Programmiersprachen entwickeln sich schnell weiter und Unternehmen müssen ständig neue Technologien ' +
        'bewerten bevor Investitionsentscheidungen getroffen werden können heutzutage besonders wichtig geworden',
    )
    .join(' ');
  const result = languageConfidence(nonEnglish);
  assert.ok(result !== null);
  assert.equal(result.low, true);
  assert.ok(Number.isFinite(result.confidence));
});
