# Corporate Neologisms

Nouns forced into verb slots ("solutioning," "actioning," "diligences it"). Not a general denominal-verb detector, that needs real infrastructure (a verb-lemma dictionary or n-gram surprisal, see `docs/ROADMAP.md`'s Feature G) and isn't built yet: these are narrow, observed phrase patterns, hand-caught one at a time, the same way every other entry in this dictionary started. Deliberately scoped to require a pronoun object immediately after the verbed form ("diligences it," not just "diligence"), so a legitimate noun use ("due diligence document," "audit the term sheet the way you'd diligence a deal") never trips this. One bullet per pronoun, not one bullet with internal alternation: a bullet line splits on `|` with no escaping (see `CONTRIBUTING.md`), so a regex here can never contain a literal `|` itself.

- "diligenc\w*\s+it\b" | regex: true | severity: 4 | source: clearfelt-heuristic
- "diligenc\w*\s+this\b" | regex: true | severity: 4 | source: clearfelt-heuristic
- "diligenc\w*\s+that\b" | regex: true | severity: 4 | source: clearfelt-heuristic
- "diligenc\w*\s+them\b" | regex: true | severity: 4 | source: clearfelt-heuristic
