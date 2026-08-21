#!/usr/bin/env node
/**
 * clearfelt-writing preservation checker: compares a source text against a rewrite
 * candidate and reports what was dropped or added, so /clearfelt-writing rewrite's
 * no-fabrication guarantee is code-verified, not just prompt-instructed.
 * Zero external dependencies, Node stdlib only, same rule as detect.mjs.
 *
 * Usage:
 *   node scripts/check.mjs --before <path> --after <path> [--constraints <name>] [--max-chars <n>] [--max-words <n>] [--must-contain <text>]... [--must-not-contain <text>]...
 *
 * Locked-span mismatches (see reference/rewrite.md's "Locked spans") are a
 * deterministic, zero-ambiguity guarantee and always drive verdict "fail"
 * when check.hard_fail_on_locked_span_mismatch is true (the default).
 * Fingerprint mismatches (dropped/added numbers, dates, proper nouns, and
 * quoted material) are heuristic, regex-based entity-spotting, not real
 * NLP or named-entity recognition (this repo stays dependency-free, see
 * CLAUDE.md), and default to "warn" rather than "fail" for that reason.
 * See docs/decisions/0016-preservation-checker.md for the false-positive/
 * false-negative tradeoffs of each extractor below, disclosed rather than
 * papered over.
 *
 * Constraints (max_chars, max_words, must_contain, must_not_contain) are a
 * different kind of guarantee than either of the above: not about content
 * (locked spans) or facts (fingerprint), but about the shape of the output
 * itself, a hard ceiling or a required/forbidden pattern. Optional; when
 * none are given (no --constraints and no inline flags), the "constraints"
 * field in the report is null and has no effect on verdict.
 */

import { readFileSync, existsSync, realpathSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, sep, join } from 'node:path';
import { loadConfig, parseConfigTable } from './lib/config.mjs';
import { stripExcludedRegions } from './lib/rules.mjs';
import { splitSentences } from './lib/score.mjs';

// Same boundary guarantee as detect.mjs's assertWithinCwd: refuses to read a
// path outside the current project. Duplicated rather than shared (see
// docs/decisions/0016) because detect.mjs's version throws/exits on
// failure (CLI-style) while hook.mjs's version returns a boolean and
// swallows errors (silent-skip style); merging them risked changing one of
// the two call sites' behavior, not worth it for a ~10-line function.
function assertWithinCwd(targetPath, label) {
  const cwdReal = realpathSync(process.cwd());
  const targetReal = realpathSync(targetPath);
  const withinCwd = targetReal === cwdReal || targetReal.startsWith(cwdReal + sep);
  if (!withinCwd) {
    console.error(
      `Error: ${label} "${targetPath}" resolves outside the current project (${cwdReal}). ` +
        'clearfelt-writing only reads files inside the project it was invoked from.',
    );
    process.exit(1);
  }
  return targetReal;
}

const USAGE = `clearfelt-writing preservation checker: diffs a source text against a rewrite candidate, and (optionally) verifies hard shape constraints on the candidate.

Usage:
  node scripts/check.mjs --before <path> --after <path> [constraint options]

Constraint options (all optional, none required to run a plain before/after diff):
  --constraints <name>       Load .clearfelt-writing/constraints/<name>.md, a reusable named constraint set.
  --max-chars <n>            Fail if the candidate exceeds n characters (trimmed). Overrides a named set's own max_chars.
  --max-words <n>            Fail if the candidate exceeds n words. Overrides a named set's own max_words.
  --must-contain <text>      The candidate must contain this text (or /regex/ between slashes). Repeatable, adds to a named set's list.
  --must-not-contain <text>  The candidate must not contain this text (or /regex/). Repeatable, adds to a named set's list.

Both --before/--after paths must resolve inside the current project directory (process.cwd()).`;

function parseArgs(argv) {
  const args = { mustContain: [], mustNotContain: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--before') args.before = argv[++i];
    else if (a === '--after') args.after = argv[++i];
    else if (a === '--constraints') args.constraints = argv[++i];
    else if (a === '--max-chars') args.maxChars = Number(argv[++i]);
    else if (a === '--max-words') args.maxWords = Number(argv[++i]);
    else if (a === '--must-contain') args.mustContain.push(argv[++i]);
    else if (a === '--must-not-contain') args.mustNotContain.push(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

// ---- constraints (hard shape guarantees: length ceilings, required/forbidden text) ----
// A locked span (above) guarantees specific CONTENT survives a rewrite.
// Nothing gave the same guarantee for a SHAPE constraint, a character
// ceiling, a required substring, a forbidden pattern, so a scrub pass could
// silently push a candidate over a platform's hard limit with no
// verification step to catch it. This closes that gap the same way: a
// declarative constraint, checked here against the real output text, not
// just prompt-instructed. Named sets (.clearfelt-writing/constraints/<name>.md) are
// the reusable form; --max-chars etc. are the zero-setup inline form; a run
// can use either or both, inline flags always add to (length) or extend
// (must-contain/must-not-contain) a named set rather than silently losing
// one or the other.

// A value wrapped in /pattern/flags is a regex; anything else is matched as
// a literal, case-sensitive substring. No silent fallback on an invalid
// regex: an author who typo'd a pattern should see it fail loudly, not have
// it quietly treated as a literal string nobody will ever type.
function parseConstraintPattern(raw) {
  const m = raw.match(/^\/(.+)\/([a-z]*)$/);
  if (!m) return { literal: raw };
  try {
    return { regex: new RegExp(m[1], m[2]) };
  } catch (err) {
    return { invalid: err.message };
  }
}

// Only ever called after a parsed pattern's .invalid has already been
// checked by the caller, so parsed always has exactly one of .regex/
// .literal here, never neither; no third fallback branch to keep honest.
function testConstraintPattern(text, parsed) {
  return parsed.regex ? parsed.regex.test(text) : text.includes(parsed.literal);
}

function loadNamedConstraints(targetDir, name) {
  if (!name) return {};
  const path = join(targetDir, '.clearfelt-writing', 'constraints', `${name}.md`);
  if (!existsSync(path)) {
    console.error(`Error: --constraints "${name}" resolves to no file at ${path}.`);
    process.exit(1);
  }
  assertWithinCwd(path, '--constraints path');
  const text = readFileSync(path, 'utf8');
  const limits = parseConfigTable(text, 'Limits');
  const constraints = {};
  if (limits.max_chars !== undefined && limits.max_chars !== '(unset)') constraints.maxChars = Number(limits.max_chars);
  if (limits.max_words !== undefined && limits.max_words !== '(unset)') constraints.maxWords = Number(limits.max_words);
  constraints.mustContain = extractConstraintList(text, '## Must contain');
  constraints.mustNotContain = extractConstraintList(text, '## Must not contain');
  return constraints;
}

// Same shape as config.mjs's extractBulletSection, but case-preserving:
// that function lowercases every entry (fine for word-override matching,
// wrong here, a required URL or a /regex/ with intentional casing must not
// be silently lowercased before matching).
function extractConstraintList(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return [];
  const section = text.slice(start).split(/\n##\s+/)[0];
  const items = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^-\s+(.+)$/);
    if (m) items.push(m[1].trim());
  }
  return items;
}

function mergeConstraints(named, args) {
  const constraints = { ...named };
  if (args.maxChars !== undefined) constraints.maxChars = args.maxChars;
  if (args.maxWords !== undefined) constraints.maxWords = args.maxWords;
  constraints.mustContain = [...(named.mustContain ?? []), ...args.mustContain];
  constraints.mustNotContain = [...(named.mustNotContain ?? []), ...args.mustNotContain];
  return constraints;
}

function countWords(text) {
  return (text.match(/\b[\w']+\b/g) || []).length;
}

// Checked against the trimmed raw candidate text, not the rule-scanning
// stripped version (stripExcludedRegions removes code blocks/quotes, which
// are part of what a reader or a platform's character counter actually
// sees). Returns null when no constraint is active at all, so the report
// can distinguish "constraints checked, none failed" from "no constraints
// configured for this run".
function verifyConstraints(afterRaw, constraints) {
  const hasAny =
    constraints.maxChars !== undefined ||
    constraints.maxWords !== undefined ||
    constraints.mustContain.length > 0 ||
    constraints.mustNotContain.length > 0;
  if (!hasAny) return null;

  const text = afterRaw.trim();
  const results = [];
  if (constraints.maxChars !== undefined) {
    results.push({ rule: 'max_chars', limit: constraints.maxChars, actual: text.length, pass: text.length <= constraints.maxChars });
  }
  if (constraints.maxWords !== undefined) {
    const words = countWords(text);
    results.push({ rule: 'max_words', limit: constraints.maxWords, actual: words, pass: words <= constraints.maxWords });
  }
  for (const raw of constraints.mustContain) {
    const parsed = parseConstraintPattern(raw);
    results.push({
      rule: 'must_contain',
      pattern: raw,
      pass: !parsed.invalid && testConstraintPattern(text, parsed),
      error: parsed.invalid,
    });
  }
  for (const raw of constraints.mustNotContain) {
    const parsed = parseConstraintPattern(raw);
    results.push({
      rule: 'must_not_contain',
      pattern: raw,
      pass: !parsed.invalid && !testConstraintPattern(text, parsed),
      error: parsed.invalid,
    });
  }
  return results;
}

// ---- locked-span extraction (deterministic) ----

const LOCK_OPEN = '<!-- clearfelt-writing-lock -->';
const LOCK_CLOSE = '<!-- /clearfelt-writing-lock -->';

function extractLockedSpans(text) {
  const spans = [];
  let idx = 0;
  while (true) {
    const start = text.indexOf(LOCK_OPEN, idx);
    if (start === -1) break;
    const contentStart = start + LOCK_OPEN.length;
    const end = text.indexOf(LOCK_CLOSE, contentStart);
    if (end === -1) break;
    spans.push(text.slice(contentStart, end));
    idx = end + LOCK_CLOSE.length;
  }
  return spans;
}

function checkLockedSpans(beforeText, afterText) {
  const beforeSpans = extractLockedSpans(beforeText);
  const afterSpans = extractLockedSpans(afterText);
  const mismatches = [];
  const count = Math.max(beforeSpans.length, afterSpans.length);
  if (beforeSpans.length !== afterSpans.length) {
    mismatches.push({
      index: null,
      reason: `locked-span count changed: ${beforeSpans.length} before, ${afterSpans.length} after`,
    });
  }
  const pairCount = Math.min(beforeSpans.length, afterSpans.length);
  for (let i = 0; i < pairCount; i++) {
    if (beforeSpans[i] !== afterSpans[i]) {
      mismatches.push({ index: i, reason: 'locked-span content changed' });
    }
  }
  return { count, mismatches };
}

// ---- fingerprint extraction (heuristic, disclosed tradeoffs) ----

// Numbers and simple percentages. Known gap: "20" vs "twenty" is a false
// drop+add pair, no numeral/word normalization in v1.
function extractNumbers(text) {
  return [...text.matchAll(/\b\d+(?:\.\d+)?%?\b/g)].map((m) => m[0]);
}

// ISO dates, month-name dates, and bare 4-digit years in a date-shaped
// context. Known gap: "March 3rd" vs "the 3rd of March" is a false
// drop+add pair, no date-form normalization in v1.
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
function extractDates(text) {
  const iso = [...text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((m) => m[0]);
  const monthDay = [...text.matchAll(new RegExp(`\\b(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,\\s*\\d{4})?\\b`, 'g'))].map(
    (m) => m[0],
  );
  const contextualYear = [...text.matchAll(/\b(?:in|since|by|from)\s+(\d{4})\b/gi)].map((m) => m[1]);
  return [...iso, ...monthDay, ...contextualYear];
}

// Capitalized word sequences, excluding sentence-initial position unless the
// same token also appears capitalized mid-sentence elsewhere in the
// document (a cheap cross-check, still heuristic). This is the extractor
// with the widest false-positive/negative range: a genuinely dropped proper
// noun that only ever appeared sentence-initially will be MISSED (a false
// negative), and this repo stays dependency-free (CLAUDE.md), so real named-
// entity recognition is out of scope. See docs/decisions/0016 for the full
// tradeoff discussion; this is deliberately conservative, not a substitute
// for a human reading the diff.
function extractProperNouns(text) {
  const sentences = splitSentences(text);
  const midSentenceCapitalized = new Set();
  const candidates = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    words.forEach((word, i) => {
      const m = word.match(/^[A-Z][a-z]+/);
      if (!m) return;
      if (i > 0) midSentenceCapitalized.add(m[0]);
    });
  }
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    words.forEach((word, i) => {
      const m = word.match(/^[A-Z][a-z]+/);
      if (!m) return;
      if (i === 0 && !midSentenceCapitalized.has(m[0])) return; // likely just sentence-initial capitalization
      candidates.push(m[0]);
    });
  }
  return candidates;
}

// Straight/curly double-quoted spans and Markdown blockquote lines. The
// highest-stakes category (misquoting someone) and also the most reliably
// extractable, unlike proper nouns.
function extractQuotes(text) {
  const straight = [...text.matchAll(/"([^"\n]{3,})"/g)].map((m) => m[1].trim());
  const curly = [...text.matchAll(/“([^”\n]{3,})”/g)].map((m) => m[1].trim());
  const blockquotes = text
    .split('\n')
    .filter((line) => /^\s*>/.test(line))
    .map((line) => line.replace(/^\s*>\s?/, '').trim())
    .filter(Boolean);
  return [...straight, ...curly, ...blockquotes];
}

function multisetDiff(beforeItems, afterItems) {
  const beforeCounts = new Map();
  for (const item of beforeItems) beforeCounts.set(item, (beforeCounts.get(item) ?? 0) + 1);
  const afterCounts = new Map();
  for (const item of afterItems) afterCounts.set(item, (afterCounts.get(item) ?? 0) + 1);

  const dropped = [];
  for (const [item, beforeCount] of beforeCounts) {
    const afterCount = afterCounts.get(item) ?? 0;
    for (let i = 0; i < beforeCount - afterCount; i++) dropped.push(item);
  }
  const added = [];
  for (const [item, afterCount] of afterCounts) {
    const beforeCount = beforeCounts.get(item) ?? 0;
    for (let i = 0; i < afterCount - beforeCount; i++) added.push(item);
  }
  return { dropped, added };
}

// value always came from extractor(text), i.e. it is always a literal
// substring of text (trim only removes from the edges, which cannot break
// substring-ness), so indexOf here can never miss; no not-found branch.
function contextFor(text, value) {
  const idx = text.indexOf(value);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + value.length + 30);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function buildFingerprint(strippedText, extractor, type, before, after) {
  const beforeItems = extractor(before);
  const afterItems = extractor(after);
  const { dropped, added } = multisetDiff(beforeItems, afterItems);
  return {
    dropped: dropped.map((value) => ({ type, value, context: contextFor(before, value) })),
    added: added.map((value) => ({ type, value, context: contextFor(after, value) })),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.before || !args.after) {
    console.error(USAGE);
    process.exit(args.help ? 0 : 1);
  }

  const beforePath = resolve(args.before);
  const afterPath = resolve(args.after);
  for (const [p, label] of [[beforePath, '--before path'], [afterPath, '--after path']]) {
    if (!existsSync(p)) {
      console.error(`Error: path not found: ${p}`);
      process.exit(1);
    }
    assertWithinCwd(p, label);
  }

  const beforeRaw = readFileSync(beforePath, 'utf8');
  const afterRaw = readFileSync(afterPath, 'utf8');
  const beforeText = stripExcludedRegions(beforeRaw);
  const afterText = stripExcludedRegions(afterRaw);

  const config = loadConfig();
  const lockedSpans = checkLockedSpans(beforeRaw, afterRaw);

  // extractQuotes runs on the RAW text, not the stripped beforeText/
  // afterText the other three extractors use: stripExcludedRegions blanks
  // out every blockquoted line (rule-scanning's own exclusion, see
  // reference/audit.md's "Exclusions"), which would make extractQuotes'
  // blockquote-line detection permanently unreachable, exactly the content
  // a quote-preservation check most needs to see. A straight/curly quote
  // inside a fenced code sample is a rarer false-positive risk than never
  // detecting a dropped blockquote at all.
  const extractors = [
    ['number', extractNumbers, beforeText, afterText],
    ['date', extractDates, beforeText, afterText],
    ['properNoun', extractProperNouns, beforeText, afterText],
    ['quote', extractQuotes, beforeRaw, afterRaw],
  ];
  const fingerprint = { dropped: [], added: [] };
  for (const [type, extractor, before, after] of extractors) {
    const result = buildFingerprint(null, extractor, type, before, after);
    fingerprint.dropped.push(...result.dropped);
    fingerprint.added.push(...result.added);
  }

  const namedConstraints = loadNamedConstraints(process.cwd(), args.constraints);
  const constraints = mergeConstraints(namedConstraints, args);
  const constraintResults = verifyConstraints(afterRaw, constraints);

  const lockedSpanFailure = lockedSpans.mismatches.length > 0 && config['check.hard_fail_on_locked_span_mismatch'] !== false;
  const droppedFailure = fingerprint.dropped.length > 0 && config['check.hard_fail_on_dropped_fact'] === true;
  const addedFailure = fingerprint.added.length > 0 && config['check.hard_fail_on_added_fact'] === true;
  // Length overshoot (max_chars/max_words) is always a hard fail, not
  // toggleable: a platform will reject or truncate an over-limit post, so
  // "warn and ship anyway" isn't a meaningful option the way it is for
  // heuristic fact-preservation. must_contain/must_not_contain follow the
  // same hard_fail_on_* toggle pattern the fact checks already use, since
  // they're closer in kind to "did the rewrite keep what it should have".
  const lengthConstraintFailure = (constraintResults ?? []).some((r) => (r.rule === 'max_chars' || r.rule === 'max_words') && !r.pass);
  const contentConstraintFailure =
    (constraintResults ?? []).some((r) => (r.rule === 'must_contain' || r.rule === 'must_not_contain') && !r.pass) &&
    config['check.hard_fail_on_constraint_violation'] !== false;

  let verdict = 'pass';
  if (lockedSpanFailure || droppedFailure || addedFailure || lengthConstraintFailure || contentConstraintFailure) {
    verdict = 'fail';
  } else if (
    lockedSpans.mismatches.length > 0 ||
    fingerprint.dropped.length > 0 ||
    fingerprint.added.length > 0 ||
    (constraintResults ?? []).some((r) => !r.pass)
  ) {
    verdict = 'warn';
  }

  const report = {
    before: beforePath,
    after: afterPath,
    lockedSpans,
    fingerprint,
    constraints: constraintResults,
    verdict,
  };

  // Opt-in, nice-to-have: on a hard fail, also drop a durable copy under
  // reports/ (gitignored, never a default write target, see CLAUDE.md) so a
  // repeated preservation failure is reviewable later, not only visible in
  // whatever terminal session hit it.
  if (verdict === 'fail') {
    try {
      const reportsDir = join(resolve(process.cwd()), 'reports');
      mkdirSync(reportsDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeFileSync(join(reportsDir, `preservation-${stamp}.json`), JSON.stringify(report, null, 2));
    } catch {
      // Best-effort only; never let logging failure mask the real verdict.
    }
  }

  console.log(
    JSON.stringify(
      report,
      null,
      2,
    ),
  );

  process.exit(verdict === 'fail' ? 1 : 0);
}

main();
