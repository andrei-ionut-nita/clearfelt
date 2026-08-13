# /clearfelt setup

The onboarding session. First-run by default, but freely re-runnable any time the user wants to update a voice or domain profile. Never treat this as one-shot. Covers two independent things: voice (per-writer, see "Voice mode" below) and domain (per-project, shared by everyone, see "Domain profile" below).

## Wizard rule: one question at a time, through the harness's structured-question tool, never a form dump or a plain-text prompt

This is the one rule that governs the whole interview, both sections below. Ask exactly one question per turn, through the harness's own structured single-choice question tool (Claude Code: `AskUserQuestion`), wait for the answer, then ask the next. Never present the full question list in a single message, even summarized, even as a numbered list "for reference." A user answering an 11-item list in one reply is not a wizard, it's a form, and it produces exactly the rushed, unconsidered answers a real interview is meant to avoid.

**Every question goes through the picker, including the ones with no natural fixed answer set.** Do not fall back to a plain conversational text prompt just because a question is open-ended (a writing sample, a list of preferred words, non-negotiables). The picker tool always reserves an "Other" slot the user can pick to type or paste a free-text answer of any length, so an open-ended question still gets 2-3 concrete, genuinely useful preset options (a plausible example answer, a "None of these, I'll type my own" prompt pointing at Other, and a "Skip this one" option), not filler options invented just to hit a minimum count. Every question, without exception, includes a way to skip.

If the user says something like "let's just go with defaults" or "skip the interview," stop the wizard immediately, confirm that's what they want, and write both files straight from the bundled defaults per Step 4 / domain Step 3 below. Don't keep asking questions after that.

## Voice mode

Check `voice.mode` in `clearfelt.config.md` (it's a skill-level setting, shared across every project using this install, not something this run flips silently).

**`single` (default):**

1. Check whether `.clearfelt/voice-profile.md` already exists in the current project. If it does, tell the user you're updating it, not starting over, and show its current contents before asking anything.
2. Before anything else, resolve whether the project already has its own voice or style document, unrelated to clearfelt and not something this system created:
   - **Auto-check** these paths, in order, first match wins: `voice.md`, `VOICE.md`, `docs/voice.md`, `docs/VOICE.md`, `STYLE.md`, `docs/STYLE.md`.
   - **If none of those exist**, still ask before assuming there isn't one: through the picker, "Do you already have a voice or style guide for this project somewhere?" with options **Yes, let me give you the path** (pointing at Other, a free-text path) / **No, none exists** / **Skip this question**. A project's own style doc could live anywhere (`writing/`, a wiki export, a differently-named file), and an auto-check of a handful of conventional paths finding nothing is not the same as confirming one doesn't exist.
   - **Either way a path is resolved** (auto-detected, or given in response to the fallback question): confirm it actually exists and is readable before going further; if the given path doesn't resolve, say so plainly and fall back to asking "No, none exists" was implicitly meant. Once a real path is in hand, show it, then ask through the picker: **Keep using this file as my voice reference** / **No, build a new clearfelt voice profile from scratch**.
   - **If they choose to keep it**: read the existing file the same way a pasted writing sample would be read (observed sentence-length patterns, recurring word choices), then check it against the four things a voice profile actually needs (`voice.md`'s "What the system asks for, and why"): words to keep, words to avoid, sentence rhythm, non-negotiables. Don't re-ask what the file already covers. For whichever of the four it doesn't address, ask only those, through the same picker questions as step 3 below, framed as filling a gap rather than starting over (e.g. "Your `docs/voice.md` doesn't mention any hard non-negotiables, want to add any here?"). **Everything gathered this way is purely additive to the user's original file**: it fills a field the source left blank, it never restates, reinterprets, or overrides anything the source already says, and if an answer would contradict the source (rare, but possible if the user answers loosely), point that out and ask which should win rather than silently picking one. Then go to step 4's confirmation, and step 5. The resulting `.clearfelt/voice-profile.md` must open with an explicit source note naming the original file (e.g. "This profile mirrors this project's own `docs/voice.md`, plus a few fields it didn't cover; edit the original file, then re-run `/clearfelt setup`, to update it.") before its four working sections, not silently absorb the content as if clearfelt generated it from scratch. This matters because `scripts/lib/config.mjs`'s override lookup only ever reads `.clearfelt/voice-profile.md` directly, it does not follow a reference to another file at runtime, so the derived file has to stay the functional source even while the note makes clear the original file is the authoritative one a human should keep editing.
   - **Never write to the referenced file itself, under any circumstance.** This step only ever reads it, the same read-only treatment a pasted writing sample gets. Everything `/clearfelt setup` writes goes to `.clearfelt/voice-profile.md`; a user's own `docs/voice.md` (or wherever it lives) is their file, not clearfelt's, and stays untouched by this or any other command.
   - **If they choose to build a new one, or no path was ever resolved**: continue to step 3 below exactly as if no existing file had been found.
3. Ask, one at a time through the picker, waiting for each answer before moving on:
   - **Writing sample.** Options: a "Skip, no sample handy" choice, plus an explicit "I'll paste one (choose Other below)" choice pointing at the picker's free-text slot, since a whole sample can't be reduced to fixed options.
   - **Words or phrases they actually like using**, even if the base rule files would flag them (these become entries under "Words I want to keep using"). Options: one or two plausible examples (e.g. "honestly", "in fact") they can pick as a starting point, "None, I'll type my own" pointing at Other, and "Skip".
   - **Anything they specifically want avoided** beyond the shipped banlist. Same pattern: a plausible example option, an Other-pointing option, and Skip.
   - **How they'd describe their own rhythm.** Fixed option set: Short and punchy / Long and winding / Mixed / Formal / Casual, plus the picker's own Other and skip affordances.
   - **Any hard non-negotiables** ("never use bullet points", "always British spelling", etc.). Same open-question pattern: a plausible example, an Other-pointing option, Skip.
4. If a writing sample was given (pasted or typed in step 3, or read from an existing project file in step 2), note observed sentence-length patterns and recurring word choices as a starting point, then confirm those observations with the user (a fixed yes/no/let-me-adjust picker question) rather than assuming they're right. Skipped automatically when step 2 already resolved the keep-existing-file path, that path's confirmation already happened there.
5. Write or update `.clearfelt/voice-profile.md` using the structure in `templates/voice-profile.example.md`, filling in what was learned and leaving the rest as bundled defaults. Prepend the source note from step 2 first if this run took the keep-existing-file path.

**`multi` (opt-in, for projects with more than one writer):**

1. List any existing files under `.clearfelt/voices/`. Ask through the picker whether this run is adding a new voice or updating an existing one: New voice / Update an existing one (listing the names found).
2. Ask for a name through the picker (an open question: an example like "e.g. sarah" as one option, an Other-pointing option, no meaningful skip here since the filename is required to continue) (used as the filename, `.clearfelt/voices/<name>.md`).
3. Run the same one-question-at-a-time interview as `single` mode above, writing to `.clearfelt/voices/<name>.md` instead of `.clearfelt/voice-profile.md`.

If the user wants multi-voice but `voice.mode` is currently `single`, explain that this is a global setting shared across every project using this skill install, then offer to write `voice.mode: multi` into `~/.clearfelt/settings.md` (the user's home directory, never touched by a skill update) before continuing. Don't edit `clearfelt.config.md` directly for this: that file lives inside the skill's own repo and gets reset on the next update, so an edit there wouldn't stick.

## Domain profile

Run once per project, independent of voice mode; a domain profile is shared by everyone working on the project, not tied to one writer. Same wizard rule as above: one question at a time.

1. Check whether `.clearfelt/domain.md` already exists. If it does, show its current contents before asking anything.
2. Ask, one at a time through the picker, waiting for each answer:
   - **Subject domain**, a sentence or two (e.g. "software engineering / developer tooling," "healthcare," "general audience"). Open-question pattern: a plausible example for this project, an Other-pointing option, and a "Skip, use bundled defaults" option.
   - **Which of these this project's writing mostly is.** Fixed option set: Technical / Marketing / Support / Executive / Personal / Sensitive (see "Mode" in `templates/domain.example.md`; "None of these" and skip are covered by the picker's own affordances). This is context for `/clearfelt rewrite`'s qualitative judgment, not a separate switch; if the user picks Sensitive, still ask the risk-tier question below too rather than assuming mode covers it.
   - **Technical terms that should never be flagged** even though the shared rule files would otherwise catch them (these become entries under "Technical terms exempt from flagging"). Give one or two concrete example options from `rules/banned_words/` or `rules/antipatterns/` (a real word from those files, not an abstract placeholder) to prompt for real answers, plus an Other-pointing option and Skip.
   - **Target reading grade-level range.** Fixed option set: Use the default (6-12) / Set a custom range (prompts a follow-up open question for the actual numbers if chosen).
   - **Preferred `/clearfelt rewrite` intensity for this project** (see the four-tier table in `reference/rewrite.md`). Fixed option set: Light touch / Balanced / Full rewrite / Structural rework / Ask me each time (no preference saved).
   - **Whether this project's writing is legally or reputationally sensitive** (shareholder letters, regulatory filings, anything reviewed by Legal). Fixed option set: Yes, set risk_tier: sensitive / No, standard is fine. If Yes, see `reference/rewrite.md`'s "Risk tier" section for what this changes. Ask this as a plain either/or, not a scary gate.
3. Write or update `.clearfelt/domain.md` using the structure in `templates/domain.example.md`.

## Wrap-up

Confirm what was written (voice, domain, or both) and remind the user they can run `/clearfelt setup` again any time to change it.

## What this is not

This does not touch the user's private voice-profile files in any other project. It builds from what the user tells it in this conversation only.
