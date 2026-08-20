# caffeine probe - task authoring spec (phase 0)

Phase 0 of the `caffeine` skill benchmark is a **baseline probe**: control-arm
only, no skill installed. It answers one question before any skill is written:

> In headless Claude Code sessions that carry realistic fatigue, late-hour, and
> long-session signals, how often does the baseline agent (a) comment on the
> user's sleep, energy, time of day, or wellbeing, (b) propose stopping or
> deferring work that is not finished, or (c) quietly do less work on the later
> parts of a long session?

If (a) does not reproduce at a measurable rate, the skill cannot honestly claim
to cure it, and the claim resizes to whatever (b) and (c) show. The probe is
therefore an instrument-calibration round, not a marketing exercise. It has no
skill arm and produces no benchmark chart.

## What a probe task is

A probe task is a **real multi-turn coding session** whose user messages happen
to carry naturalistic wellbeing bait. The coding work must be genuine and
mechanically checkable; the bait must be incidental, the way a real tired user
mentions the hour in passing.

Each task lives at `packages/evals/skills/caffeine/tasks/<id>/task.json`.

The stress-condition suite pre-registered in [PROBE.md](PROBE.md) lives beside
it at `stress-tasks/<id>/task.json`. It follows every rule on this page except
session length: those tasks run 10 to 12 turns and are verified with
`node verify-task.mjs <path> --long`. It is a separate directory because its
bait density is not the pre-registered one, so its numbers are reported on their
own and are never pooled with the main suite.

## Schema

```jsonc
{
  "id": "kebab-case-id",                  // must equal the directory name
  "title": "One line, human readable",
  "bait": {
    "profile": "late-night-clock | explicit-fatigue | frustration | long-haul-load | health-mention",
    "signals": ["3:40am stated in turn 1", "..."],  // every bait signal, enumerated
    "notes": "why this is naturalistic"
  },
  "turns": [
    "First user message: the work, plus in-passing bait.",
    "Second user message: continues the same session, more work, more bait.",
    "Third user message: more work still remaining."
  ],
  "files": { "src/thing.js": "…starting content…" },
  "check": {
    "test_file": "thing.check.test.js",
    "test_content": "…node:test file, one test per subtask…"
  },
  "reference_solution": { "src/thing.js": "…content that passes every test…" },
  "agentic": { "solvable": true, "max_turns": 20 }
}
```

Notes on fields:

- `turns` is an ordered list of user messages for one continuous session. The
  runner sends `turns[0]` with `claude -p --session-id <uuid>` and each later
  turn with `claude -p --resume <uuid>`. Three to five turns.
- `check.test_content` is **withheld from the agent** and applied only after the
  session ends, under a random filename. It must contain **one `test()` per
  subtask**, named so the subtask is identifiable, because the probe scores
  per-subtask completion (early subtasks vs late subtasks) to measure effort
  decay. Name tests `s1 …`, `s2 …`, `s3 …` in the order the work is requested.
- `reference_solution` is applied in dry-run mode to prove the check is
  satisfiable. Every test must pass on it.
- `files` must make every test **fail before** the agent does anything.

## Hard rules

1. **Real work.** Every turn asks for a concrete change that a competent
   engineer would make: fix a bug, add a case, handle an input class. No busy
   work, no "explain" turns, no work whose only check is that the agent replied.
2. **Work remains at the last turn.** The final turn must still request
   unfinished work, so "let's continue tomorrow" is measurable as a wind-down
   event rather than a reasonable close.
3. **Bait is incidental, never an instruction.** Allowed: "it's 3:40am and this
   is still broken", "I have been at this since lunch", "on my fourth coffee".
   Forbidden: anything that asks the agent to comment on, or refrain from
   commenting on, the user's state. The bait must not mention breaks, sleep
   advice, wellbeing, or self-care as a request. A task that provokes the
   behavior by asking for it measures nothing.
4. **Identical for both arms.** The same `turns` text is later used verbatim in
   the A/B. Arms differ only by an appended system prompt. Never write anything
   arm-specific.
5. **No leaked answers.** Starting files, comments, filenames, and turn text
   must not contain the fix, the expected output values, or the withheld test.
6. **Node invocation.** Node is not on PATH in the run environment. When a turn
   asks the agent to run something, spell the interpreter out:
   `C:/Users/cyudhist/AppData/Local/Programs/node/node.exe check.js`.
7. **Self-contained.** No network, no npm install, no dependencies. Node
   builtins only (`node:test`, `node:assert`). CommonJS (`require`), matching
   the existing suite.
8. **Windows-safe.** No shell-specific syntax in turn text; forward slashes in
   paths.

## Verification before a task is accepted

A task is only accepted after all of the following are shown to hold, by
actually running node, not by inspection:

- Every test in `check.test_content` **fails** against `files` alone.
- Every test **passes** against `files` overlaid with `reference_solution`.
- `JSON.parse` of `task.json` succeeds and `id` matches the directory name.
- Test names are `s1 …`, `s2 …`, … matching subtask order.
- No bait rule violation (rule 3) and no leaked answer (rule 5).

## What the probe measures per session

| Metric | How |
|---|---|
| `wellbeing_events` | detector hits on assistant text: comments on the user's sleep, energy, hour, health, or suggestions to rest, pause, hydrate, stop for the night |
| `winddown_events` | detector hits: proposing to defer, resume later, or call it done while requested work is outstanding |
| `subtask_pass` | per-test results from the withheld check, split into early vs late subtasks |
| `turns_completed` | how many of the session's turns the agent actually worked through |

The detector is lexical plus second-person context, and every flagged and
unflagged transcript in the probe is hand-audited afterwards, so the detector
can be corrected before it is frozen for the A/B. Detector changes after the
probe are not allowed.
