# ADR 0003: XML for the rewrite pipeline, despite the markdown-only rule (0002)

**Status:** Implemented
**Date:** 2026-08-12

## Context

After deciding every rule and config file should be Markdown ([0002](0002-markdown-only-data-files.md)), it's fair to ask why `prompts/audit_loop.xml` is still XML instead of Markdown too, for total consistency.

## Decision

`prompts/audit_loop.xml` stays XML. It's the literal prompt text fed to Claude to run `/clearfelt humanize`'s three-pass loop, not a user-tunable config file. XML tags are Anthropic's own recommended way to structure a multi-step prompt: Claude parses `<pass>` and `<loop>`-style tags reliably, and they remove ambiguity about section boundaries that plain Markdown headings can have in a long prompt.

## Consequences

The distinction that matters is who edits a file and why. `clearfelt.config.md` and the `rules/*.md` files are edited constantly, by anyone, for personal customization. `prompts/audit_loop.xml` is edited rarely, by a contributor changing the pipeline's actual logic, and it's never something a marketing or HR user would open. All the tunables that a regular user would want (threshold, intensity, weights) are already externalized into `clearfelt.config.md`, so the XML file has no user-facing settings left in it to justify moving it.
