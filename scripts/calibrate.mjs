#!/usr/bin/env node
/**
 * clearfelt calibration: computes personal statistical baselines (vocabulary
 * diversity, sentence-rhythm burstiness, paragraph-length variety) from a
 * writing sample or a directory of past writing, for /clearfelt setup to
 * store in .clearfelt/voice-profile.md's "Personal calibration (computed)"
 * section. Reuses the exact same scoring functions detect.mjs's real audit
 * path calls (movingAverageTtr, burstinessScore, paragraphStructureScore),
 * not a parallel implementation, so a calibrated baseline and a later audit
 * score are always computed the same way. Pure read, writes nothing itself,
 * same "let the model handle writing files" split every other script here
 * follows. Zero external dependencies, Node stdlib only, same rule as
 * detect.mjs.
 *
 * Usage:
 *   node scripts/calibrate.mjs <path|directory>
 */

import { existsSync, readdirSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { join, resolve, sep, extname } from 'node:path';
import { movingAverageTtr, burstinessScore, paragraphStructureScore } from './lib/score.mjs';

// Same boundary guarantee as detect.mjs's assertWithinCwd: refuses to read a
// path outside the current project.
function assertWithinCwd(targetPath, label) {
  const cwdReal = realpathSync(process.cwd());
  const targetReal = realpathSync(targetPath);
  const withinCwd = targetReal === cwdReal || targetReal.startsWith(cwdReal + sep);
  if (!withinCwd) {
    console.error(
      `Error: ${label} "${targetPath}" resolves outside the current project (${cwdReal}). ` +
        'clearfelt only reads files inside the project it was invoked from.',
    );
    process.exit(1);
  }
  return targetReal;
}

const USAGE = `clearfelt calibration: computes personal statistical baselines from a writing sample or directory.

Usage:
  node scripts/calibrate.mjs <path|directory>

<path|directory> must resolve inside the current project directory (process.cwd()); clearfelt refuses to read a path outside it.`;

const SCANNABLE_EXTENSIONS = new Set(['.md', '.txt', '.mdx']);

// Below this word count, MATTR (a 50-word sliding window) and the
// coefficient-of-variation signals are measuring mostly noise, not a stable
// personal pattern. Not a hard stop, calibration still runs, but setup.md
// surfaces this as a reason to prefer a directory of past pieces over one
// short pasted sample.
const THIN_SAMPLE_WORD_THRESHOLD = 300;

function collectText(targetPath) {
  if (!statSync(targetPath).isDirectory()) {
    return { text: readFileSync(targetPath, 'utf8'), fileCount: 1 };
  }
  const files = readdirSync(targetPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SCANNABLE_EXTENSIONS.has(extname(entry.name)))
    .map((entry) => join(targetPath, entry.name))
    .sort();
  if (files.length === 0) {
    console.error(`Error: no .md/.txt/.mdx files found in directory: ${targetPath}`);
    process.exit(1);
  }
  return { text: files.map((file) => readFileSync(file, 'utf8')).join('\n\n'), fileCount: files.length };
}

function main() {
  const [, , rawPath] = process.argv;
  if (!rawPath || rawPath === '--help' || rawPath === '-h') {
    console.log(USAGE);
    process.exit(rawPath ? 0 : 1);
  }

  const targetPath = resolve(rawPath);
  if (!existsSync(targetPath)) {
    console.error(`Error: path not found: ${targetPath}`);
    process.exit(1);
  }
  assertWithinCwd(targetPath, 'target path');

  const { text, fileCount } = collectText(targetPath);
  const wordCount = (text.match(/\b[a-z']+\b/gi) || []).length;
  const mattr = movingAverageTtr(text, 50);
  const { coefficientOfVariation: burstinessCv } = burstinessScore(text);
  const { coefficientOfVariation: paragraphCv } = paragraphStructureScore(text);

  const result = {
    target: targetPath,
    fileCount,
    wordCount,
    baseline_mattr: Number(mattr.toFixed(4)),
    baseline_burstiness_cv: Number(Math.min(burstinessCv, 1).toFixed(4)),
    baseline_paragraph_cv: Number(Math.min(paragraphCv, 1).toFixed(4)),
  };
  if (wordCount < THIN_SAMPLE_WORD_THRESHOLD) {
    result.warning =
      `Only ${wordCount} words analyzed across ${fileCount} file(s), calibration will be noisy below ` +
      `${THIN_SAMPLE_WORD_THRESHOLD} words. Prefer a directory of several past pieces over one short sample.`;
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
