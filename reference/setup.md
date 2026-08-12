# /clearfelt setup

The onboarding session. First-run by default, but freely re-runnable any time the user wants to update their voice profile. Never treat this as one-shot.

## Flow

1. Check whether `.clearfelt/voice-profile.md` already exists in the current project. If it does, tell the user you're updating it, not starting over, and show its current contents before asking anything.
2. Ask, in plain conversational language (not a form dump), for:
   - A short writing sample, if they have one handy. If not, skip straight to direct questions.
   - Words or phrases they actually like using, even if the base rule files would flag them (these become entries under "Words I want to keep using").
   - Anything they specifically want avoided beyond the shipped banlist.
   - How they'd describe their own rhythm: short and punchy, long and winding, mixed, formal, casual.
   - Any hard non-negotiables ("never use bullet points", "always British spelling", etc.).
3. If a writing sample was given, note observed sentence-length patterns and recurring word choices as a starting point, then confirm those observations with the user rather than assuming they're right.
4. Write or update `.clearfelt/voice-profile.md` in the user's current project using the structure in `templates/voice-profile.example.md`, filling in what was learned and leaving the rest as bundled defaults.
5. Confirm what was written and remind the user they can run `/clearfelt setup` again any time to change it.

## What this is not

This does not touch the user's private voice-profile files in any other project. It builds from what the user tells it in this conversation only.
