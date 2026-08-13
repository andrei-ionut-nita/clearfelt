# Sources

Every rule in `rules/antipatterns/` and `rules/banned_words/` carries a `source:` field pointing to a key on this page, so nothing in the rule dictionary is asserted without a disclosed origin. Two kinds of origin exist here, and both are legitimate, but they're not the same kind of evidence:

- **Academic and institutional research** on human-vs-AI text, with a real, checkable URL.
- **Community prior art**: the open-source anti-slop tools this project drew on for specific phrase lists (see `decisions/0001-deterministic-scored-detection.md` for the full comparison). These are pattern observations from people who've read a lot of AI output, not peer-reviewed findings, and are labeled `community:<name>` accordingly.

A handful of claims below are things the research synthesis discussed but for which no direct paper URL could be resolved from the source export. Those are marked **unresolved** and should be treated as leads to verify, not citations to lean on, until someone tracks down the actual paper.

## How to read a source key

A rule bullet like `- delve | severity: 8 | tier: 1 | source: carnegie-mellon-2025` means: look up `carnegie-mellon-2025` on this page for what backs that entry.

## Academic and institutional sources

| Key | Title | Venue / Year | URL |
|---|---|---|---|
| `rodrigues-2026` | A linguistic comparison between human- and AI-generated content | iScience (Cell Press), 2026 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12969083/ |
| `ucc-2025` | New study reveals that AI cannot fully write like a human (press release) | University College Cork / Humanities and Social Sciences Communications (Nature Portfolio), 2025 | https://www.ucc.ie/en/news/2025/new-study-reveals-that-ai-cannot-fully-write-like-a-human.html |
| `distilbert-2025` | Identifying artificial intelligence-generated content using the DistilBERT transformer and NLP techniques | Scientific Reports (Nature Portfolio), 2025 | https://www.nature.com/articles/s41598-025-08208-7 |
| `academic-science-writing-2023` | Distinguishing academic science writing from humans or ChatGPT using prevalent and accessible features | PLOS ONE (via PMC), 2023 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10328544/ |
| `medical-detection-2025` | Detecting Artificial Intelligence-Generated Versus Human-Written Texts in Medical Contexts: Decision-Making Study | JMIR Medical Education, 2025 | https://mededu.jmir.org/2025/1/e62779/ |
| `frontiers-2024` | Investigating generative AI models and detection techniques | Frontiers in Artificial Intelligence, 2024 | https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2024.1469197/full |
| `comparative-framework-2025` | Comparative linguistic analysis framework of human-written vs. machine-generated text | Connection Science (Taylor & Francis), 2025 | https://www.tandfonline.com/doi/full/10.1080/09540091.2025.2507183 |
| `mda-comparison-2024` | AI-generated vs human-authored texts: A multidimensional comparison | Natural Language Processing Journal (Elsevier), 2024 | https://www.sciencedirect.com/science/article/abs/pii/S2666799123000436 |
| `ijimai-review-2025` | Distinguishing Human From Machine: A Review of Advances and Challenges in AI-Generated Text Detection | International Journal of Interactive Multimedia and Artificial Intelligence, 2025 | https://revistas.unir.net/index.php/ijimai/article/view/234 |
| `opara-2025` | Distinguishing AI-Generated and Human-Written Text Through Psycholinguistic Analysis (StyloAI) | arXiv, 2025 | https://arxiv.org/abs/2505.01800 |
| `linguistic-features-2024` | Differentiating Between Human-Written and AI-Generated Texts Using Automatically Extracted Linguistic Features | arXiv (2024) / Information journal (2025) | https://arxiv.org/abs/2407.03646 |
| `explainable-ai-2026` | Evidence from Explainable AI Beyond Benchmark Accuracy | arXiv, 2026 | https://arxiv.org/html/2603.23146v2 |
| `diveye-2025` | Diversity Boosts AI-Generated Text Detection (DivEye) | arXiv, 2025 | https://arxiv.org/pdf/2509.18880.pdf |
| `peer-review-detection-2026` | Detecting AI-Generated Content in Academic Peer Reviews | arXiv, 2026 | https://arxiv.org/html/2602.00319v2 |
| `genaidetect-2025` | Benchmarking AI Text Detection: Assessing Detectors Against New Datasets, Evasion Tactics, and Enhanced LLMs | GenAIDetect Workshop, COLING 2025 | https://aclanthology.org/2025.genaidetect-1.4/ |
| `eacl-2026` | Explaining Generalization of AI-Generated Text Detectors | EACL 2026 | https://aclanthology.org/2026.eacl-long.307.pdf |
| `latechclfl-2026` | Stylometric Approach to AI-generated Texts | ACL Anthology (LateCHCLFL 2026) | https://aclanthology.org/2026.latechclfl-1.21.pdf |
| `perplexity-trap-2026` | The Perplexity Trap: When Patent Law Makes Human Writing... | arXiv, 2026 | https://arxiv.org/html/2607.13044v1 |
| `stanford-hai-detection-2023` | Was this written by a human or AI? | Stanford HAI, 2023 | https://hai.stanford.edu/news/was-written-human-or-ai-tsu |
| `stanford-hai-bias-2023` | AI-Detectors Biased Against Non-Native English Writers | Stanford HAI, 2023 | https://hai.stanford.edu/news/ai-detectors-biased-against-non-native-english-writers |
| `stanford-scale-gptzero-2025` | Assessing GPTZero's Accuracy in Identifying AI vs Human Written Essays | Stanford SCALE, 2025 | https://scale.stanford.edu/ai/repository/assessing-gptzeros-accuracy-identifying-ai-vs-human-written-essays |
| `watermark-robust-2024` | Provably Robust Watermarks for Open-Source Language Models | IACR ePrint, 2024 | https://eprint.iacr.org/2024/1739 |
| `fingerprinting-2025` | LLM Fingerprinting via Semantically Conditioned Watermarks | arXiv / OpenReview, 2025 | https://arxiv.org/html/2505.16723v3 |
| `mit-tech-review-2022` | How to spot AI-generated text | MIT Technology Review, 2022 | https://www.technologyreview.com/2022/12/19/1065596/how-to-spot-ai-generated-text/ |
| `eyesift-2026` | AI Text Detection Signals 2026: Perplexity, Burstiness and... | EyeSift, 2026 | https://www.eyesift.com/ai-text-detection-stylometric-signals-2026-burstiness-perplexity-repetition-watermarks-fingerprints/ |
| `pangram-2025` | Why Perplexity and Burstiness Fail to Detect AI | Pangram, 2025 | https://www.pangram.com/blog/why-perplexity-and-burstiness-fail-to-detect-ai |
| `evalhub-2026` | Perplexity & Burstiness in AI Detection | EvalHub, 2026 | https://www.evalhub.tech/en/blog/perplexity-burstiness-ai-detection-science |
| `groundy-2026` | Detecting AI Content in 2026: The Arms Race Nobody Is Winning | Groundy, 2026 | https://groundy.com/articles/detecting-ai-content-2026-arms-race-nobody/ |
| `sandler-2024` | LIWC-22 comparison of human vs. ChatGPT dialogue | arXiv, 2024 | https://arxiv.org/html/2401.16587v2 |
| `messingschlager-appel-2025` | LIWC comparison of human vs. LLM short stories | Humanities and Social Sciences Communications (Nature Portfolio), 2025 | https://www.nature.com/articles/s41599-025-06341-2 |
| `flesch-1948` | A new readability yardstick | Journal of Applied Psychology, 32(3), 221-233, 1948 (DOI 10.1037/h0057532) | https://pubmed.ncbi.nlm.nih.gov/18867058/ |
| `kincaid-1975` | Derivation of new readability formulas (Automated Readability Index, Fog Count, and Flesch Reading Ease Formula) for Navy enlisted personnel | Research Branch Report 8-75, Naval Air Station Memphis, 1975 | https://apps.dtic.mil/sti/html/tr/ADA006655/ |
| `gunning-1952` | The Technique of Clear Writing (source of the Gunning Fog Index) | McGraw-Hill, 1952 | No free full text for the book itself; description verified via https://en.wikipedia.org/wiki/Gunning_fog_index |
| `oppenheimer-2006` | Consequences of erudite vernacular utilized irrespective of necessity: problems with using long words needlessly | Applied Cognitive Psychology, 20, 139-156, 2006 | https://onlinelibrary.wiley.com/doi/abs/10.1002/acp.1178 |
| `alter-oppenheimer-2009` | Uniting the tribes of fluency to form a metacognitive nation | Personality and Social Psychology Review, 13, 219-235, 2009 | https://journals.sagepub.com/doi/10.1177/1088868309341564 |
| `guiraud-1954` | Root TTR ("Guiraud's R", V/sqrt(N), vocabulary richness normalized for text length), Guiraud 1954, as cited in Tweedie & Baayen, 1998 | Les caractères statistiques du vocabulaire, Presses Universitaires de France, 1954 | No free full text for the book itself; formula and attribution verified via https://quanteda.io/reference/textstat_lexdiv.html |
| `covington-mcfall-2010` | MATTR (Moving-Average Type-Token Ratio): ordinary type-token ratio computed inside a fixed-size sliding window and averaged across every window position, proposed specifically to remove length as a variable in lexical-diversity measurement rather than merely reduce its effect | Covington, M. A., & McFall, J. D. (2010). Cutting the Gordian Knot: The Moving-Average Type-Token Ratio (MATTR). Journal of Quantitative Linguistics, 17(2), 94-100 | https://doi.org/10.1080/09296171003643098 |

## Referenced but unresolved

These came up in the research synthesis with a specific, checkable claim attached, but no direct paper URL survived into the export this repo's rules were built from. Treat these as things to verify, not as settled citations. If you track down the real paper, open a PR updating this table and the `unresolved-*` key on any rule bullet that cites it.

| Key | Claim | What's missing |
|---|---|---|
| `unresolved-carnegie-mellon-pnas-2025` | A 2025 Carnegie Mellon / PNAS study reportedly found that LLMs use words like "camaraderie," "tapestry," "palpable," and "intricate" orders of magnitude more often than humans in matched-genre writing. | No PNAS or Carnegie Mellon URL was recoverable from the source export. The claim is specific enough to be worth verifying rather than discarding, but it should not be treated as confirmed until a real paper is found. |
| `unresolved-storyscope-2026` | StoryScope (described as a University of Maryland / Google DeepMind 2026 project, 10,272 prompts, 61,608 stories, 304 narrative features, 93.2% macro-F1 for human-vs-AI detection) found human stories land in the rarest 10% of narrative-feature space at roughly triple the rate of AI stories. | Only a LinkedIn post surfaced in the export (https://www.linkedin.com/posts/sandeepde_storyscope-investigating-idiosyncrasies-activity-7474063253531164672-i-_6), not the paper itself. |
| `unresolved-munoz-ortiz-2024` | Muñoz-Ortiz et al. (2024, Artificial Intelligence Review) reportedly compared human NYT leads against six LLMs (Mistral, Falcon, LLaMa 7B-65B) and found all LLMs cluster in a 10-30 token sentence-length range while humans produce more long-tail sentences over 40 tokens. | No direct URL recovered; venue and year are stated in the synthesis but unverified here. |

## Synthesis notes and this project's own observations

Two more source keys used in the rule files, for honesty about what they actually are:

| Key | What it means |
|---|---|
| `research-synthesis-2026` | A specific claim (e.g. that AI text overuses "furthermore," "in conclusion," "leverage") that came from the multi-round research synthesis this project was built from, but that the synthesis itself didn't trace to one specific paper. It's a secondhand pattern observation from a research assistant reading across many of the sources above, not a citation to a single study. |
| `clearfelt-heuristic` | This project's own observation, not attributed to any external source. Used sparingly, and only for things that are hard to get wrong (like "identical paragraph lengths read as templated") rather than anything that needed a study to establish. |

## Community prior art

Not academic research: pattern lists assembled by people building anti-AI-slop tools, cited here because several of clearfelt's phrase and lexicon rules were adapted from them directly. See `decisions/0001-deterministic-scored-detection.md` for how each one compares architecturally.

| Key | What it is | URL |
|---|---|---|
| `community:no-ai-slop` | Peter Yang's flagged-pattern matrix (binary contrasts, fake-profound endings, throat-clearing openers, faux-insight setups, weasel attribution, colon-reveal, synonym cycling) | https://github.com/petergyang/no-ai-slop |
| `community:anti-slop-slop-canon` | codeSTACKr's default-removed habits (game-changer, seamless, robust, delve, em dash, semicolon, exclamation points, rule of three, in conclusion) | https://github.com/codeSTACKr/anti-slop-slop-canon |
| `community:brandonwise-humanizer` | brandonwise's tiered vocabulary and statistical-analysis design (burstiness, type-token ratio, trigram repetition), which shaped `scripts/detect.mjs`'s scoring approach | https://github.com/brandonwise/humanizer |
| `community:blader-humanizer` | blader's no-fabrication rule and voice-sample-overrides-default-ban precedent, which shaped `reference/rewrite.md`'s two hard rules | https://github.com/blader/humanizer |
| `wikipedia-ai-signs` | Wikipedia's own "Signs of AI writing" essay, a crowd-maintained pattern list, not academic research; moved here from the academic table since it's the same kind of evidence as the other rows in this table | https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing |

## A note on the readability rows

The five readability/fluency citations above (`flesch-1948` through `alter-oppenheimer-2009`) were each independently verified for a real, resolvable URL before being added, not recalled from memory. Which formulas to report, and in what order, came from practitioner guidance (readabilityformulas.com, ckmtools.dev) layered on top of those primary sources; that guidance isn't itself a citation, it's editorial judgment about presentation, kept separate from the peer-reviewed formulas it's applied to. See [decisions/0008-readability-metrics.md](decisions/0008-readability-metrics.md) for why Kahneman's System 1/2 thinking was considered and rejected as a citation here: it's a psychological theory with no computable formula, and citing it would have meant attributing a claim to a framework the tool doesn't actually implement.

## How this list gets maintained

New rules need a `source:` key from this file, or a new row added here first if the source isn't listed yet. See `../CONTRIBUTING.md` for the exact requirement. Don't invent a URL to fill in a row: an honest `unresolved-*` entry is worth more to this project than a citation nobody can check.
