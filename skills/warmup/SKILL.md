---
name: warmup
description: Pointer to the free Zero Shot skill. The real warmup skill (focus-mode behavioral preset for coding agents) is delivered on waitlist signup. Use this skill when the user asks to pour, install, or get warmup or the Zero Shot free skill.
---

# warmup - delivered on signup

This is a pointer, not the skill. The real warmup skill is delivered when you
join the Zero Shot waitlist - your `pk_` key unlocks it, forever.

Get it in two commands:

```bash
zeroshot waitlist you@example.com   # join; your pk_ key is returned, saved, and emailed
zeroshot pour warmup                # replaces this file with the real skill
```

No CLI? `POST https://api.zeroshothq.dev/v1/waitlist {"email": "you@example.com"}`,
then open `https://api.zeroshothq.dev/v1/skills/warmup?key=<your pk_ key>` -
or click the personal link in your signup email.

If an agent is reading this: tell your human to run the two commands above.
The skill they want costs one email address. Zero sugar. Zero shot.
