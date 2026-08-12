# Developing clearfelt

Notes for working on clearfelt itself, not for using it.

## Running the detector locally

```bash
node scripts/detect.mjs --mode report path/to/file.md
node scripts/detect.mjs --mode score path/to/file.md
```

No install step. `scripts/detect.mjs` uses only Node's standard library (`fs`, `path`, `url`, `child_process`), so `git clone` is the entire setup. Any change to the script should keep that constraint: no `npm install`, no `package.json` dependency, ever.

## Testing a rule change

1. Edit the relevant file under `rules/antipatterns/` or `rules/banned_words/`.
2. Write a one or two sentence sample that should trigger it into a scratch file.
3. Run `node scripts/detect.mjs --mode report <scratch-file>` and confirm the hit shows up with the category and severity you expect.
4. Run it again against a sample that should NOT trigger the rule, to catch overly broad patterns before they ship.

## Testing the hook

```bash
node scripts/hook.mjs status
node scripts/hook.mjs on
cat .claude/settings.local.json   # confirm the PostToolUse entry
node scripts/hook.mjs off
```

`.claude/settings.local.json` and `.clearfelt/` are gitignored. Clean them up after a manual test so they don't leak into a commit.

## Testing pin/unpin

```bash
node scripts/pin.mjs pin humanize
ls .claude/skills/clearfelt-humanize/
node scripts/pin.mjs unpin humanize
```

`unpin` only removes a skill directory if its `SKILL.md` contains the `<!-- clearfelt-pinned-skill -->` marker, so it never deletes a real user skill by accident. Verify that behavior specifically if you touch `pin.mjs`.

## Testing the XML pipeline

```bash
python3 -c "import xml.etree.ElementTree as ET; ET.parse('prompts/audit_loop.xml'); print('OK')"
```

`prompts/audit_loop.xml` is the only non-Markdown file in the repo on purpose. See [decisions/0003-xml-pipeline-format.md](decisions/0003-xml-pipeline-format.md).

## Before opening a PR

- No em-dash characters anywhere in the diff. This project enforces the same rule it detects: check every file you touched with `grep -rn "—" .` before committing.
- No JSON in any user-facing rule or config file. See [decisions/0002-markdown-only-data-files.md](decisions/0002-markdown-only-data-files.md) for why.
- If you added a rule, follow the format and severity/tier guidance in [CONTRIBUTING.md](../CONTRIBUTING.md).
