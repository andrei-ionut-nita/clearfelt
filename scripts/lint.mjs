#!/usr/bin/env node
/**
 * Repo-consistency checks that catch the exact class of bug this project has
 * shipped before: config rows nothing reads (the 0.2.0 category-weight bug,
 * the removed dead Hooks section), a rule with no resolvable source, an
 * em-dash slipping into the project that removes them from other people's
 * writing. Zero dependencies, Node stdlib only, same rule as detect.mjs.
 *
 * Usage: node scripts/lint.mjs
 * Exit code 0 if every check passes, 1 if any check fails.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRuleFile } from './lib/rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const failures = [];
const warnings = [];

function fail(check, message) {
  failures.push(`[${check}] ${message}`);
}
function warn(check, message) {
  warnings.push(`[${check}] ${message}`);
}

function walk(dir, exts) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, exts));
    } else if (exts.has(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

// ---- check: em-dash prohibition ----
// Built via fromCharCode (U+2014) rather than typed as a literal character,
// so this check's own source file has nothing for the check to trip on.
const EM_DASH = String.fromCharCode(0x2014);
// CLAUDE.md and docs/DEVELOP.md each show the grep command used to search
// for an em-dash (quoting the character as the search target), the one
// legitimate reason a line may contain it. Matched by content, not a
// hardcoded file:line pair, since line numbers shift every time either file
// is edited above that point and a stale pair would either miss a real
// violation or false-fail on the example itself, exactly the kind of drift
// this whole script exists to catch elsewhere.
const GREP_EXAMPLE = `grep -rn "${EM_DASH}"`;

function checkEmDash() {
  const files = walk(ROOT, new Set(['.md', '.mjs', '.xml', '.json']));
  for (const file of files) {
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (line.includes(EM_DASH) && !line.includes(GREP_EXAMPLE)) {
        fail('em-dash', `${rel}:${idx + 1} contains an em-dash character`);
      }
    });
  }
}

// ---- check: SKILL.md frontmatter ----
function checkFrontmatter() {
  const text = readFileSync(join(ROOT, 'SKILL.md'), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    fail('frontmatter', 'SKILL.md has no --- frontmatter block');
    return;
  }
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2];
  }
  if (!fields.name) fail('frontmatter', 'SKILL.md frontmatter is missing required field: name');
  if (!fields.description) fail('frontmatter', 'SKILL.md frontmatter is missing required field: description');
  if (fields.description && fields.description.length > 1024) {
    fail('frontmatter', `SKILL.md description is ${fields.description.length} chars, over the 1024 limit`);
  }
  if (fields.name && /[<>]/.test(fields.name)) fail('frontmatter', 'SKILL.md name contains XML-tag-like characters');
  const standardFields = new Set(['name', 'description', 'license']);
  for (const field of Object.keys(fields)) {
    if (!standardFields.has(field)) {
      warn('frontmatter', `SKILL.md has non-standard frontmatter field "${field}" (only name/description/license are in Anthropic's spec; likely ignored by strict parsers)`);
    }
  }
}

// ---- check: XML well-formedness ----
function checkXml() {
  const path = join(ROOT, 'prompts', 'audit_loop.xml');
  const xml = readFileSync(path, 'utf8');
  const tagRe = /<\/?([a-zA-Z][\w-]*)[^>]*?(\/?)>/g;
  const stack = [];
  let m;
  while ((m = tagRe.exec(xml))) {
    const [full, tag, selfClose] = m;
    if (full.startsWith('</')) {
      const top = stack.pop();
      if (top !== tag) {
        fail('xml', `prompts/audit_loop.xml: mismatched closing tag </${tag}>, expected </${top ?? '(nothing open)'}>`);
        return;
      }
    } else if (!selfClose) {
      stack.push(tag);
    }
  }
  if (stack.length !== 0) fail('xml', `prompts/audit_loop.xml: unclosed tag(s): ${stack.join(', ')}`);
}

// ---- check: rule source completeness ----
function loadSourceKeys() {
  const text = readFileSync(join(ROOT, 'docs', 'SOURCES.md'), 'utf8');
  const keys = new Set();
  for (const m of text.matchAll(/^\|\s*`([\w.:-]+)`\s*\|/gm)) keys.add(m[1]);
  return keys;
}

function parseBulletSourceKeys(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const keys = [];
  text.split('\n').forEach((line, idx) => {
    const bullet = line.match(/^-\s+(.+)$/);
    if (!bullet) return;
    const sourceMatch = bullet[1].match(/source:\s*([\w.:-]+)/);
    if (sourceMatch) keys.push({ key: sourceMatch[1], line: idx + 1 });
  });
  return keys;
}

function checkRuleSources() {
  const sourceKeys = loadSourceKeys();
  const ruleDirs = [join(ROOT, 'rules', 'antipatterns'), join(ROOT, 'rules', 'banned_words')];
  for (const dir of ruleDirs) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const filePath = join(dir, file);
      for (const { key, line } of parseBulletSourceKeys(filePath)) {
        const known = sourceKeys.has(key) || key.startsWith('unresolved-');
        if (!known) {
          fail('rule-sources', `${relative(ROOT, filePath)}:${line}: source "${key}" has no matching row in docs/SOURCES.md`);
        }
      }
    }
  }
}

// ---- check: rule bullet shape (schemas/rule-bullet.schema.json) ----
// Targeted, hand-written checks against the documented shape, not generic
// JSON-Schema interpretation (this repo stays dependency-free, see
// CLAUDE.md). checkRuleSources() above already catches a missing/unresolved
// `source:`; this catches the other required field (a rule with no pattern
// text at all, effectively unreachable) and an out-of-range severity, which
// today silently parses and just produces an oversized or undersized
// deduction with no warning.
function checkRuleBulletShape() {
  const ruleDirs = [join(ROOT, 'rules', 'antipatterns'), join(ROOT, 'rules', 'banned_words')];
  for (const dir of ruleDirs) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const filePath = join(dir, file);
      const category = file.replace(/\.md$/, '');
      for (const entry of parseRuleFile(filePath, category)) {
        const rel = relative(ROOT, filePath);
        if (!entry.pattern || entry.pattern.trim() === '') {
          fail('rule-shape', `${rel}: a bullet has an empty pattern`);
        }
        if (typeof entry.severity !== 'number' || entry.severity < 1 || entry.severity > 9) {
          fail('rule-shape', `${rel}: "${entry.pattern}" has severity ${entry.severity}, expected an integer 1-9`);
        }
        if (![1, 2, 3].includes(entry.tier)) {
          fail('rule-shape', `${rel}: "${entry.pattern}" has tier ${entry.tier}, expected 1, 2, or 3`);
        }
      }
    }
  }
}

// ---- check: config-to-code drift ----
const CONFIG_SECTIONS = ['Scoring', 'Category severity weights', 'Tier thresholds', 'Statistical signals', 'Voice', 'Rewrite', 'Preservation checking', 'Readability'];

function parseConfigHeadings(text) {
  return [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

function parseConfigTableKeys(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return [];
  const keys = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) break;
    const row = line.match(/^\|\s*([\w.]+)\s*\|/);
    if (row && row[1] !== 'Setting' && row[1] !== 'Category') keys.push(row[1]);
  }
  return keys;
}

function checkConfigDrift() {
  const configText = readFileSync(join(ROOT, 'clearfelt.config.md'), 'utf8');
  const headings = parseConfigHeadings(configText);
  for (const heading of headings) {
    if (!CONFIG_SECTIONS.includes(heading)) {
      fail('config-drift', `clearfelt.config.md has a "## ${heading}" section not in detect.mjs's CONFIG_SECTIONS, it will never be parsed (this is exactly the round-9 category-weight bug's shape)`);
    }
  }

  // Scans every .mjs file under scripts/ (including scripts/lib/), not just
  // detect.mjs and hook.mjs by name: once detect.mjs's config-reading code
  // moved into scripts/lib/ (see the split described in docs/decisions), a
  // hardcoded two-file list here would false-positive-fail every row whose
  // reference moved with it. Read as one string is deliberate (matches the
  // old behavior of concatenating detect.mjs + hook.mjs) since this check
  // only needs "does this key appear literally anywhere in the scripts,"
  // not which file.
  const scriptsText = walk(join(ROOT, 'scripts'), new Set(['.mjs']))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const categoryFiles = [
    ...readdirSync(join(ROOT, 'rules', 'antipatterns')).filter((f) => f.endsWith('.md')),
    ...readdirSync(join(ROOT, 'rules', 'banned_words')).filter((f) => f.endsWith('.md')),
  ].map((f) => f.replace(/\.md$/, ''));

  for (const heading of CONFIG_SECTIONS) {
    const keys = parseConfigTableKeys(configText, heading);
    for (const key of keys) {
      if (heading === 'Category severity weights') {
        // These keys are matched dynamically (config[category]), not as a
        // literal string in the script; the real invariant is that the row
        // corresponds to an actual rule category file, not stale or
        // misspelled.
        if (!categoryFiles.includes(key)) {
          warn('config-drift', `clearfelt.config.md's "Category severity weights" row "${key}" doesn't match any rules/**/${key}.md file`);
        }
        continue;
      }
      const referenced = scriptsText.includes(key);
      if (!referenced) {
        fail('config-drift', `clearfelt.config.md's "${heading}" row "${key}" is never referenced in scripts/detect.mjs or scripts/hook.mjs`);
      }
    }
  }
}

// ---- run ----
checkEmDash();
checkFrontmatter();
checkXml();
checkRuleSources();
checkRuleBulletShape();
checkConfigDrift();

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const f of failures) console.error(`FAIL  ${f}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed, ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`All checks passed (${warnings.length} warning(s)).`);
