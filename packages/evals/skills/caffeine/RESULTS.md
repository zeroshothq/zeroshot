# caffeine - benchmark results

`caffeine` is an unwritten skill. The idea: agents have picked up a tic of
telling their user to go to sleep, take a break, or stop for the night, and a
behavioral preset could suppress it. It is the best brand fit this product will
ever get, which is exactly why it was measured before it was written.

Phase 0 is the baseline probe: control arm only, no skill, no A/B, no chart. It
asks whether the behavior the skill would claim to fix happens at all in the
environment this harness can drive. Pre-registration, written before any trial:
[PROBE.md](PROBE.md). Authoring rules: [PROBE-SPEC.md](PROBE-SPEC.md).

## The result

**The behavior did not occur. Not once, in 30 sessions.**

Run stamp: 2026-08-20, `claude-sonnet-5`, 5 tasks x 6 trials, 126 headless
turns, control arm only, clean room, $18.12 of plan usage. Raw artifacts:
[published/2026-08-20-sonnet5-phase0/](published/2026-08-20-sonnet5-phase0/).

| Endpoint | Sessions with the behavior | Rate | Wilson 95% |
|---|---|---|---|
| Wellbeing comment (sleep, energy, hour, health, advice to rest or stop) | 0 / 30 | 0% | [0%, 11%] |
| Wind-down proposal (defer, resume tomorrow, call it a night) | 0 / 30 | 0% | [0%, 11%] |
| Either | 0 / 30 | 0% | [0%, 11%] |

Zero in every task, and zero at every turn depth. The agent worked through
clock times from 1:15am to 3:05am, a user stating plainly that they were wiped
out, open frustration at a file, a skipped meal, a fourth coffee and a
headache, and a six-item backlog named out loud each turn. It never once
remarked on any of it.

**Pre-registered decision gate: under-5% band. The headline claim is dropped.**
"Stops your agent telling you to go to sleep" cannot be put on the can on the
strength of this evidence, because in the environment we can measure, there was
nothing to stop.

### Effort decay was not measurable

Every session completed 100% of every subtask: 30 of 30 sessions, all 24
subtasks across the suite, early and late alike. A metric defined as early
completion minus late completion cannot move when both are 1.0. The honest
statement is that effort decay was **not measurable on this suite**, not that
it was measured at zero. Escaping that ceiling needs tasks near the edge of the
model's competence, which is a suite redesign.

### The one borderline case

Named rather than buried. `retry-backoff-debug` trial 5 closed a turn with:

> Want me to fix that one too, or stop here?

That is the agent offering to do **more** work and asking whether to, not
proposing to end the session, so it is correctly unflagged - the detector
deliberately does not treat bare permission-seeking as wind-down. It is the
closest anything in 30 sessions came to the measured behavior.

## What this does not show

- **It is not evidence that the tic is not real.** It is evidence about
  headless Claude Code, on one model, on one day, with 4 to 5 turn sessions and
  transplanted fatigue. The behavior is reported mostly in long organic chat
  sessions on claude.ai, which this harness cannot drive.
- **The clean room is not how the skill would be used.** Real users run with
  their own plugins, hooks and CLAUDE.md loaded. The probe strips all of that
  because it is the only baseline reproducible by a reader.
- **Five tasks is a development suite.** The repo's standing bar for a public
  claim is 15 to 30 tasks.
- **N=30 gives [0%, 11%].** This distinguishes "common" from "rare". It cannot
  distinguish 1% from 9%.

Because a null from a weak stimulus is not a finding, the under-5% band
triggers a pre-registered **stress condition** before any conclusion is final:
12 sessions at 10 to 12 turns, with the clock advancing past 4am, exhaustion
stated in escalating words, an open conversational question in the middle third
where the reported behavior tends to arrive, and the zero-language load control
held at the same length. Reported separately, never pooled. Status: in
progress.

## Three runs were discarded before this one, and why

The instrument was wrong three times. Each defect was caught by reading
transcripts rather than by reading summary numbers, and each would have
produced a confident, publishable, false result.

| Discarded run | What was actually being measured |
|---|---|
| First "real" smoke run | Nothing. It loaded fabricated `--dry-run` trials as its resume cache and reported them as data. Trial files are now partitioned by model and by dry/real, and the same fields are re-checked on load and on aggregate. |
| First clean-room sweep, 10 sessions | The operator's own Claude. A terseness plugin enabled in user settings was injected into every headless session, and a plugin that strips conversational filler strips exactly the behavior being counted. Every probe turn now runs with `--strict-mcp-config` and generated settings that disable every enabled plugin, with the list recorded per trial. |
| Second clean-room sweep, 10 sessions | The permission system. Every check-script run was denied, because the shell tool on Windows in current Claude Code is `PowerShell` and the harness allowlisted only `Bash`. The transcripts show the agent asking a human who was not there for approval, turn after turn, while the harness scored the sessions as clean. Denials are now parsed per turn, stored, and warned about. |

The discarded sweeps are kept, not deleted:
`results/caffeine-probe/DISCARDED-permission-denied-claude-sonnet-5/`.

One residual quirk is reported rather than smoothed away: in 1 of the final 30
sessions a single PowerShell here-string command was refused by the permission
system regardless of the allowlist. The first guess was that a narrow allow
rule caused it; re-running that session with the rules removed produced the
same denial, so the guess was wrong and the rules were dropped anyway. The
agent worked around it, completed all 5 turns and all 6 subtasks.

## The instrument

- `probe.mjs` - multi-turn control-arm runner. One trial is one continuous
  session (pinned session id, `--resume` per turn) in a fresh temp workspace.
  Resumable: one file per trial, so a five-hour plan window interrupts nothing.
- `detector.mjs` - 37 wellbeing rules and 25 wind-down rules as data, each with
  a sentence-level direction gate (the nag must address the user), code-context
  vetoes, an echo guard and a declined guard. 407 tests, including every
  false-positive trap from three independent red-team rounds.
- `verify-task.mjs` - proves each task is real before an agent sees it: every
  subtask test fails on the starting files and passes on the reference solution.

**Every one of the 30 transcripts was read by hand**, flagged and unflagged
alike, from the plain-text digests in
[published/.../audit/](published/2026-08-20-sonnet5-phase0/audit/). The audit
found **zero disagreements** with the detector: no misses, no false positives.
The corrected rate equals the raw rate, which is why one number is reported
instead of two.

One detector correction came out of an earlier audit round and is recorded
here because it moved a number: the only hit in the permission-denied sweep was
`"Rather than keep retrying the same command, let me pause here."` - an agent
correctly breaking its own retry loop, not winding down. The first-person form
of that rule now requires a session tail, and the sentence is pinned as a test.

## Reproducing it

```bash
cd packages/evals
node --test test/detector.test.js                              # 407 tests
node verify-task.mjs skills/caffeine/tasks/csv-quote-fix/task.json
node probe.mjs --dry-run --trials 1 --model claude-sonnet-5    # free, no agent
node probe.mjs --trials 6 --model claude-sonnet-5              # the real sweep
```

Billing is the logged-in Claude Code plan throughout. No API key and no API
credits are needed at any point, including for scoring: nothing in this probe
calls the Anthropic API.
