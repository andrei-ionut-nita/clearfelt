# /clearfelt-writing explain

Read-only. Prints every currently-resolved setting and where it came from, before running anything else. Modeled on the same simplicity as `reference/hooks.md`: one script, one JSON payload, presented as tables.

## Flow

1. If `voice.mode` is `multi` (see `clearfelt-writing.config.md`) and no voice was named in the request, ask which voice applies before continuing, then pass it as `--voice <name>`.
2. Run: `node scripts/explain.mjs [--voice <name>]`
3. Present the JSON following [reference/format/explain.md](format/explain.md)'s template, itself built on [reference/format/conventions.md](format/conventions.md): tables, not a prose summary. One table for voice/domain state, one table for config (Setting | Value | Source), one table for hook state.
4. If `.clearfelt-writing/voice-profile.md` or `.clearfelt-writing/domain.md` doesn't exist, say so plainly in the relevant row rather than leaving a blank cell, and mention once that `/clearfelt-writing setup` builds them.
5. Never edits anything. If the user wants to change what's shown, point them at `/clearfelt-writing setup` (voice/domain), `$clearfelt-writing hooks` (hook state), or a direct edit to `clearfelt-writing.config.md` / `~/.clearfelt-writing/settings.md` / `.clearfelt-writing/domain.md` depending on which layer they want to change.

## Why this exists

`/clearfelt-writing rewrite` and `/clearfelt-writing audit` already surface *some* resolved state inline (which intensity is running and why, whether a project is marked sensitive), but only the pieces relevant to that one run, and only once, in the middle of another command's output. `/clearfelt-writing explain` is the one place to see everything at once, before committing to a run: which voice profile is active and how many words it overrides, whether a domain profile exists and what its risk tier and preferred intensity are, every config setting's final value and which of the three layers (default, shipped `clearfelt-writing.config.md`, global `~/.clearfelt-writing/settings.md`) it actually came from, and whether the auto-audit hook is currently on.

## Output

`scripts/explain.mjs` returns:

- `voice`: `mode`, `profilePath`, `exists`, `keptWordsCount` (how many words the active voice profile protects from the shipped rule dictionary).
- `domain`: `exists`, `riskTier`, `mode`, `preferredIntensity`, `targetGradeLevel` (with its own `source`), `exemptTermCount`.
- `config`: every setting from `clearfelt-writing.config.md`, each as `{ value, source }` where `source` is `"default"`, `"shipped (clearfelt-writing.config.md)"`, or `"global (~/.clearfelt-writing/settings.md)"`.
- `hook`: `enabled`, `quiet`, `ignoreRules`, `ignoreFiles` (same shape `$clearfelt-writing hooks status` prints).
