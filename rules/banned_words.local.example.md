# Personal Word Additions (local, not shared)

Copy this file to `banned_words.local.md` in the same `rules/` folder to add your own words without touching the shared files pull requests target. `banned_words.local.md` is gitignored, so it stays private to you.

Add one word per line under the matching heading, in this shape:

```
- word | severity: N | tier: N
```

`severity` is how much the score drops per hit, on a scale of roughly 1 to 9. `tier` controls how eager the detector is to flag it:

- `tier: 1` always catches it.
- `tier: 2` only catches it when it shows up in a cluster with other hits nearby.
- `tier: 3` only catches it if it's everywhere in the document, not just used once.

If you're not sure, use `severity: 5` and `tier: 2`.

## High-Frequency AI Lexicon

- synergy | severity: 6 | tier: 2

## Puffery Lexicon

<!-- add your own lines here, same format as above -->
