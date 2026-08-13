# Architecture decision records

Short records of the real calls made while designing clearfelt, kept here so the reasoning survives past the conversation that produced it.

- [0001: Deterministic, script-backed scoring instead of LLM judgment](0001-deterministic-scored-detection.md)
- [0002: Markdown, not JSON, for every user-facing rule and config file](0002-markdown-only-data-files.md)
- [0003: XML for the rewrite pipeline, despite the markdown-only rule](0003-xml-pipeline-format.md)
- [0004: No-fabrication rule and voice-profile precedence](0004-no-fabrication-and-voice-precedence.md)
- [0005: Every rule carries a disclosed source](0005-sourced-rules.md)
- [0006: Confirm before writing, always by default](0006-confirm-before-write.md)
- [0007: Opt-in multi-voice profiles, plus a shared domain profile](0007-multi-voice-and-domain-profiles.md)
- [0008: Readability metrics, tracked separately from the Empathy Index](0008-readability-metrics.md)
- [0009: A four-tier intensity ladder, asked upfront, saved somewhere that survives an update](0009-intensity-ladder-and-saved-preference.md)
- [0010: A risk tier for sensitive documents, an automated test suite, and a lightweight eval set](0010-risk-tier-and-test-suite.md)
- [0011: Cap rule-hit deduction, rescale the statistical signal weights, defer percentile rescaling](0011-deduction-cap-and-signal-rebalance.md)
