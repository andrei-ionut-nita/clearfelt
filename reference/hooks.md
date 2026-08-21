# $clearfelt-writing hooks

Manages the auto-audit hook for the current project. Adapted from the same pattern as the `impeccable` skill's hook admin.

The hook runs `scripts/detect.mjs` on direct edits to text files (`.md`, `.mdx`, `.txt`) via a Claude Code PostToolUse hook on Edit/Write/MultiEdit, and prints a short score line after the edit rather than blocking it.

State (enabled, quiet, ignored rules, ignored files) lives in `.clearfelt-writing/hook-state.md`, a gitignored per-project file, kept separate from the tracked `clearfelt-writing.config.md` so toggling the hook never shows up as a diff in the shared repo. Installing the hook itself means writing a `PostToolUse` entry into the project's `.claude/settings.local.json`, which is Claude Code's own machine-local config format, not a clearfelt-writing-authored file.

## Routing

The first argument is the action. Defaults to `status`.

| Action | What it does |
|---|---|
| `status` | Print enabled/quiet state and current ignore lists. |
| `on` | Enable the hook and install the `PostToolUse` entry in `.claude/settings.local.json`. |
| `off` | Disable the hook and remove the entry. |
| `ignore-rule <category>` | Stop surfacing hits from that rule category, project-wide. |
| `ignore-file <glob>` | Stop running the hook on files matching that glob. |
| `reset` | Clear all hook state and remove the installed hook entry. |

## Flow

1. Resolve the action from the user's argument, defaulting to `status`.
2. Run: `node scripts/hook.mjs <action> [arg]` and relay its output verbatim.
3. Don't add commentary beyond what the script printed unless the user asks a follow-up question.
