# /clearfelt setup

The onboarding session. First-run by default, but freely re-runnable any time the user wants to update a voice or domain profile. Never treat this as one-shot. Covers two independent things: voice (per-writer, see "Voice mode" below) and domain (per-project, shared by everyone, see "Domain profile" below).

## Voice mode

Check `voice.mode` in `clearfelt.config.md` (it's a skill-level setting, shared across every project using this install, not something this run flips silently).

**`single` (default):**

1. Check whether `.clearfelt/voice-profile.md` already exists in the current project. If it does, tell the user you're updating it, not starting over, and show its current contents before asking anything.
2. Ask, in plain conversational language (not a form dump), for:
   - A short writing sample, if they have one handy. If not, skip straight to direct questions.
   - Words or phrases they actually like using, even if the base rule files would flag them (these become entries under "Words I want to keep using").
   - Anything they specifically want avoided beyond the shipped banlist.
   - How they'd describe their own rhythm: short and punchy, long and winding, mixed, formal, casual.
   - Any hard non-negotiables ("never use bullet points", "always British spelling", etc.).
3. If a writing sample was given, note observed sentence-length patterns and recurring word choices as a starting point, then confirm those observations with the user rather than assuming they're right.
4. Write or update `.clearfelt/voice-profile.md` using the structure in `templates/voice-profile.example.md`, filling in what was learned and leaving the rest as bundled defaults.

**`multi` (opt-in, for projects with more than one writer):**

1. List any existing files under `.clearfelt/voices/`. Ask whether this run is adding a new voice or updating an existing one.
2. Ask for a name (used as the filename, `.clearfelt/voices/<name>.md`).
3. Run the same interview as `single` mode above, writing to `.clearfelt/voices/<name>.md` instead of `.clearfelt/voice-profile.md`.

If the user wants multi-voice but `voice.mode` is currently `single`, explain that this is a global setting shared across every project using this skill install, then offer to write `voice.mode: multi` into `~/.clearfelt/settings.md` (the user's home directory, never touched by a skill update) before continuing. Don't edit `clearfelt.config.md` directly for this: that file lives inside the skill's own repo and gets reset on the next update, so an edit there wouldn't stick.

## Domain profile

Run once per project, independent of voice mode; a domain profile is shared by everyone working on the project, not tied to one writer.

1. Check whether `.clearfelt/domain.md` already exists. If it does, show its current contents before asking anything.
2. Ask:
   - A sentence or two describing the subject domain (e.g. "software engineering / developer tooling," "healthcare," "general audience"). Offer to skip this and use bundled (empty) defaults.
   - Any technical terms that should never be flagged even though the shared rule files would otherwise catch them (these become entries under "Technical terms exempt from flagging"). Give one or two concrete examples from `rules/banned_words/` or `rules/antipatterns/` to prompt for real answers, don't leave this abstract.
   - Optionally, a target reading grade-level range for this project's audience, if the user has one in mind. Skip if they don't; the shipped default in `clearfelt.config.md` applies instead.
   - Optionally, a preferred `/clearfelt humanize` intensity for this project (see the four-tier table in `reference/humanize.md`). This is the same thing `/clearfelt humanize`'s own save prompt can set later; asking here just saves a step for someone who already knows what they want.
   - Optionally, whether this project's writing is legally or reputationally sensitive (shareholder letters, regulatory filings, anything reviewed by Legal). If so, set `risk_tier: sensitive`, see `reference/humanize.md`'s "Risk tier" section for what this changes. Default is `standard`, don't ask this as a scary gate, just a plain question.
3. Write or update `.clearfelt/domain.md` using the structure in `templates/domain.example.md`.

## Wrap-up

Confirm what was written (voice, domain, or both) and remind the user they can run `/clearfelt setup` again any time to change it.

## What this is not

This does not touch the user's private voice-profile files in any other project. It builds from what the user tells it in this conversation only.
