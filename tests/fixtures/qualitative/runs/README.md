# Recording a qualitative-signals judgment run

`reference/audit.md`'s "Qualitative signals" section (narrative idiosyncrasy, episodic grounding, cognitive friction, synonym cycling, admits real stakes) is explicitly a reasoning step, not something `scripts/detect.mjs` can check with a regex. There is no script in this repo that can judge these signals itself: this project stays dependency-free and makes no API calls of its own (see `CLAUDE.md`), so judging a fixture means a Claude Code session reading `reference/audit.md`'s description of each signal, then reading a fixture, and recording what it concluded. `scripts/qualitative-eval.mjs` only ever scores what's already been recorded here; it cannot produce a judgment on its own.

## To record a run

1. Read `reference/audit.md`'s "Qualitative signals" section fresh, the same prose a real `/clearfelt audit` or `/clearfelt rewrite` Pass 1/2 would read.
2. For each fixture in `../manifest.json`, read the fixture and judge all five signals, using the manifest's polarity (`true` = the fixture exhibits the human-like quality; `noSynonymCycling: true` means it does *not* cycle synonyms).
3. Write a new file here, `run-<N>.json` (next unused number), shaped:
   ```json
   {
     "runId": "run-3",
     "date": "2026-08-13",
     "judge": "one line on who/what judged: a live Claude Code session, a specific model, a spawned subagent, a human reviewer",
     "judgments": {
       "ai-1.md": { "narrativeIdiosyncrasy": false, "episodicGrounding": false, "cognitiveFriction": false, "noSynonymCycling": false, "admitsRealStakes": false },
       "...": "one entry per fixture in manifest.json"
     }
   }
   ```
4. Run `node scripts/qualitative-eval.mjs` to see this run's accuracy against `manifest.json`'s expected labels, and, once two or more runs exist, the pairwise agreement between every pair of runs, the actual measure of how consistent the judgment call is from one pass to the next.

Judge each fixture independently: don't read another run's file before judging, and ideally don't let the same context that judged run N also judge run N+1 without a fresh read, since that measures memory, not independent judgment. A subagent with no prior context (see the `Agent` tool) is a cleaner second rater than the same session re-judging its own earlier read.

Low agreement between runs is itself the finding this harness exists to produce, the same honest-reporting standard `scripts/eval.mjs` already holds the numeric score to. Don't discard a low-agreement run or adjust the manifest's expected labels to make disagreement disappear.
