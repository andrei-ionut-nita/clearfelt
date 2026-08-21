# `/clearfelt-writing explain` output

Shared rules live in [conventions.md](conventions.md); the verdict-line rule doesn't apply here since explain reports state, it doesn't score anything.

```
## Voice and domain

| | |
|---|---|
| Voice mode | <single/multi> |
| Voice profile | <path> (exists / not found, run /clearfelt-writing setup) |
| Words protected by voice profile | <keptWordsCount> |
| Domain profile | <exists / not found, run /clearfelt-writing setup> |
| Risk tier | <riskTier> |
| Domain mode | <mode, or "not set"> |
| Preferred intensity | <preferredIntensity, or "not set, will ask"> |
| Preferred length | <preferredLength, or "not set, will ask"> |
| Target reading grade level | <min>-<max> (source: <source>) |
| Exempt technical terms | <exemptTermCount> |

## Config

Every row from `scripts/explain.mjs`'s `config` object, unfiltered, sorted by setting name for easy lookup, not by section.

| Setting | Value | Source |
|---|---|---|
| <key> | <value> | <default / shipped (clearfelt-writing.config.md) / global (~/.clearfelt-writing/settings.md)> |

## Hook

| | |
|---|---|
| Enabled | <yes/no> |
| Quiet | <yes/no> |
| Ignored rule categories | <comma list, or "(none)"> |
| Ignored file patterns | <comma list, or "(none)"> |
```
