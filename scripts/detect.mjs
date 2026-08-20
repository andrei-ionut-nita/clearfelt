#!/usr/bin/env node
/**
 * clearfelt detector: parses the Markdown rule files under rules/, scans a
 * target file against them, and prints a deterministic JSON score report.
 * Zero external dependencies, Node stdlib only. Thin CLI entrypoint; the
 * actual logic lives in scripts/lib/ (config precedence, rule matching,
 * scoring, reporting).
 *
 * Usage:
 *   node scripts/detect.mjs --mode report <path> [--save-baseline <file>] [--baseline <file>] [--voice <name>] [--register <value>]
 *   node scripts/detect.mjs --mode score <path>
 */

import { existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join, resolve, sep, extname } from 'node:path';
import {
  loadConfig,
  loadVoiceProfileOverrides,
  loadDomainOverrides,
  loadVoiceProfileCalibration,
  loadVoiceRegister,
} from './lib/config.mjs';
import { loadRules } from './lib/rules.mjs';
import { runFile } from './lib/report.mjs';

// Refuses to scan a path outside the project (process.cwd()), the CLI's
// implicit trust boundary: a crafted `/clearfelt audit <path>` argument or,
// more importantly, a crafted PostToolUse payload reaching hook.mjs (which
// calls this same script) could otherwise direct the detector at something
// like ~/.ssh/id_rsa, and its contents (up to 120 chars/line, as `snippet`)
// would then flow into JSON that Claude reads and may render as prose.
// Resolves symlinks (realpathSync) so a symlink inside the project pointing
// outside it doesn't bypass the check.
function assertWithinCwd(targetPath, label) {
  const cwdReal = realpathSync(process.cwd());
  const targetReal = realpathSync(targetPath);
  const withinCwd = targetReal === cwdReal || targetReal.startsWith(cwdReal + sep);
  if (!withinCwd) {
    console.error(
      `Error: ${label} "${targetPath}" resolves outside the current project (${cwdReal}). ` +
        'clearfelt only scans files inside the project it was invoked from.',
    );
    process.exit(1);
  }
  return targetReal;
}

const USAGE = `clearfelt detector: scans a file or directory and prints a deterministic JSON score report.

Usage:
  node scripts/detect.mjs --mode <report|score|scan> <path|directory> [options]

Modes:
  report   Full JSON report: score, breakdown, category/pattern summaries, hits, readability. Default.
  score    Just { score } (or { target, score } for a single file, { score, files } for a directory).
  scan     Every rule occurrence with tier-suppression bypassed, used by /clearfelt rewrite's editing tiers.

Options:
  --save-baseline <file>     Snapshot this run's hits to <file> for later --baseline diffing.
  --baseline <file>          Only report hits new since a previous --save-baseline snapshot.
  --voice <name>             Voice profile to apply when clearfelt.config.md's voice.mode is "multi".
  --exempt-repetition <text> A phrase repeated on purpose (anaphora, a hook/CTA callback), excluded
                              from the repeated-phrase penalty. Repeatable. The tool never guesses
                              intent here, so this states it: see docs/decisions/0022.
  --register <value>         Override the resolved voice's tone register for this run:
                              neutral (default) | direct | warm. See docs/decisions/0024.
                              Never affects the score, only --mode report's registerCheck field.
  --help, -h                 Print this message and exit.

<path|directory> must resolve inside the current project directory (process.cwd()); clearfelt refuses to scan a path outside it.`;

function parseArgs(argv) {
  const args = { mode: 'report', paths: [], help: false, exemptRepetition: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--save-baseline') args.saveBaseline = argv[++i];
    else if (a === '--baseline') args.baseline = argv[++i];
    else if (a === '--voice') args.voice = argv[++i];
    else if (a === '--exempt-repetition') args.exemptRepetition.push(argv[++i]);
    else if (a === '--register') args.register = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else args.paths.push(a);
  }
  return args;
}

const SCANNABLE_EXTENSIONS = new Set(['.md', '.txt', '.mdx']);

// ---- main ----

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (args.paths.length === 0) {
    console.error(USAGE);
    process.exit(1);
  }

  const validModes = new Set(['report', 'score', 'scan']);
  if (!validModes.has(args.mode)) {
    console.error(`Error: unknown --mode "${args.mode}". Expected one of: ${[...validModes].join(', ')}`);
    process.exit(1);
  }

  const validRegisters = new Set(['neutral', 'direct', 'warm']);
  if (args.register && !validRegisters.has(args.register)) {
    console.error(`Error: unknown --register "${args.register}". Expected one of: ${[...validRegisters].join(', ')}`);
    process.exit(1);
  }

  const targetPath = resolve(args.paths[0]);
  if (!existsSync(targetPath)) {
    console.error(`Error: path not found: ${targetPath}`);
    process.exit(1);
  }
  assertWithinCwd(targetPath, 'target path');

  const baseConfig = loadConfig();
  // Personal calibration (see loadVoiceProfileCalibration's own comment)
  // overrides the generic, fixture-derived statistical baselines for this
  // project's scoring when a voice profile has computed them; absent that,
  // this is a no-op and baseConfig's shipped/default values pass through
  // unchanged.
  const config = { ...baseConfig, ...loadVoiceProfileCalibration(process.cwd(), baseConfig, args.voice) };
  const { all: rules } = loadRules(config);
  const voiceOverrides = loadVoiceProfileOverrides(process.cwd(), config, args.voice);
  const domainOverrides = loadDomainOverrides(process.cwd());
  const overrides = new Set([...voiceOverrides, ...domainOverrides]);
  // CLI flag wins over the resolved voice profile, same precedence as
  // --exempt-repetition being a per-invocation add-on: useful for testing a
  // register without editing a voice file, but the voice profile (docs/decisions/0024)
  // is where a project states its actual, persistent choice.
  const register = args.register ?? loadVoiceRegister(process.cwd(), config, args.voice);

  if (!statSync(targetPath).isDirectory()) {
    const { format, payload } = runFile(targetPath, args, rules, config, overrides, register);
    console.log(format === 'compact' ? JSON.stringify(payload) : JSON.stringify(payload, null, 2));
    return;
  }

  const files = readdirSync(targetPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SCANNABLE_EXTENSIONS.has(extname(entry.name)))
    .map((entry) => join(targetPath, entry.name))
    .sort();

  if (files.length === 0) {
    console.error(`Error: no .md/.txt/.mdx files found in directory: ${targetPath}`);
    process.exit(1);
  }

  const perFile = files.map((file) => runFile(file, args, rules, config, overrides, register).payload);

  if (args.mode === 'scan') {
    console.log(JSON.stringify({ target: targetPath, isDirectory: true, files: perFile }, null, 2));
    return;
  }

  const score = Math.round(perFile.reduce((sum, f) => sum + f.score, 0) / perFile.length);

  if (args.mode === 'score') {
    console.log(JSON.stringify({ score, files: perFile }));
    return;
  }

  console.log(JSON.stringify({ target: targetPath, isDirectory: true, score, files: perFile }, null, 2));
}

main();
