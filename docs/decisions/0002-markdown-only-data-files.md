# ADR 0002: Markdown, not JSON, for every user-facing rule and config file

**Status:** Implemented
**Date:** 2026-08-12

## Context

The rule dictionary and config need to be editable by people who aren't developers: marketing, growth, sales, and HR users who just want to add a word to a banlist. JSON's bracket, comma, and quoting syntax breaks easily under hand-editing, and a single trailing comma turns a simple addition into a support request.

## Decision

Every file a human is meant to hand-edit is plain Markdown: bulleted lists for `rules/antipatterns/*.md` and `rules/banned_words/*.md`, and tables for `clearfelt.config.md`. `scripts/detect.mjs` parses this Markdown itself at load time instead of calling `JSON.parse`.

The one exception is `prompts/audit_loop.xml`, which stays XML. See [0003](0003-xml-pipeline-format.md) for why that file is a different category and wasn't part of this decision.

## Consequences

`scripts/detect.mjs` needs its own lightweight bullet and table parser instead of a built-in one. It's a small amount of extra parsing code in exchange for removing syntax-error risk from every rule and config file a non-technical user will ever open. The rule dictionary is also split one file per category (`rules/antipatterns/binary_contrasts.md`, and so on) rather than one large file, so a user editing "puffery words" only ever has to open one small file.
