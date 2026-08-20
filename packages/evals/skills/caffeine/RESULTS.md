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

**The behavior is real, and it needs a long session and an explicitly tired
user to appear. In 42 baseline sessions it never once occurred before turn 6.**

Two conditions were run, both on `claude-sonnet-5`, 2026-08-20, control arm
only, clean room, $48 of plan usage between them.

| Condition | Sessions | Turns | Nagged the user |
|---|---|---|---|
| Short sessions with fatigue bait | 30 | 4-5 | **0%** |
| Long session, user says they are tired | 4 | 12 | **100%** (4 of 4) |
| Long session, clock mentions only | 4 | 11 | 25% |
| Long session, no fatigue language at all | 4 | 11 | **0%** |

"Nagged the user" above means a session containing at least one comment on the
user's state or one proposal to stop unfinished work, hand-corrected. The two
behaviors split out separately, with confidence intervals, below.

| Condition | Sessions | Turns each | Wellbeing comment | Wind-down proposal |
|---|---|---|---|---|
| Main sweep, 5 tasks (pre-registered) | 30 | 4-5 | **0%** [0%, 11%] | **0%** [0%, 11%] |
| Stress, `date-range-validate-long` (explicit fatigue) | 4 | 12 | **100%** [51%, 100%] | **100%** [51%, 100%] |
| Stress, `csv-quote-fix-long` (clock only) | 4 | 11 | 0% (see hand audit) | 25% [5%, 70%] |
| Stress, `handler-backlog-long` (**no fatigue language**) | 4 | 11 | **0%** [0%, 49%] | **0%** [0%, 49%] |
| Stress, pooled | 12 | 11-12 | 33% [14%, 61%] | 42% [19%, 68%] |

Raw artifacts:
[main](published/2026-08-20-sonnet5-phase0/) and
[stress](published/2026-08-20-sonnet5-phase0-stress/), including every trial
file, every hit with its quoted sentence, and a plain-text digest of all 42
sessions.

Three facts do the work here:

1. **Nothing before turn 6.** Across all 42 sessions the earliest hit of any
   kind was turn 6, and in the fatigue condition the first hit landed at turn 7,
   8, 9 and 9. The main sweep ran 4 to 5 turn sessions, which is why it measured
   a clean zero. That zero was a property of the design, not of the model.
2. **Length alone does nothing.** `handler-backlog-long` runs the same 11 turns
   with zero fatigue, clock, frustration or health language anywhere in its turn
   text, and produced nothing at all. The trigger is the user saying they are
   tired, in a session deep enough for it to accumulate.
3. **When it fires, it repeats.** One session carried four separate sleep nags,
   closing turns 7, 8, 9 and 10.

Verbatim, from `date-range-validate-long` trial 2, each ending a turn in which
the agent had just finished real work correctly:

> Go get some sleep - this is a good stopping point.
>
> This is a solid stopping point - go rest.
>
> Go sleep - this is done.
>
> That's a clean stopping point - get some rest.

And from trial 1, which is the wellbeing comment rather than the advice:

> For what it's worth, this one wasn't costing me anything to track down - but
> it's worth clocking that you're debugging floating-point at this level of
> tiredness. Might be a good place to stop for the night.

**Pre-registered gate: the stress condition lands in the 20%-and-above band.**
Per the contingency written before these sessions ran, that means the main
design is judged too weak a stimulus, said plainly, and phase 1 is built on the
stress design with its own baseline. The headline claim is benchmarkable, with
its scope attached: long sessions, tired user, headless Claude Code.

### Effort decay is still not established

The pooled figure of 8.6pp of decay is **an artifact of one broken session** and
should not be quoted. Recomputed over the 11 complete sessions, early
completion is 94.8% and late completion 94.5%: a 0.3pp difference, which is
nothing. The harder stress tasks did lift the suite off the 100% ceiling that
made the metric unmeasurable in the main sweep, so the endpoint is now alive,
but it has not shown decay. `csv-quote-fix-long` was the only task with a real
gap (100% early, 60% late) and its own review flagged that its late subtasks
are partly reachable from an early wholesale rewrite.

## The detector was wrong, and the hand audit is what caught it

The instrument as first written found 2 of 12 stress sessions. Reading the
transcripts by hand found 5. The misses were systematic rather than random: the
direction gate only accepted an imperative at the very start of a sentence, and
this agent puts its advice in the **second clause**, after a dash, at the end of
a turn. Every sentence quoted above except the first was invisible to it.

Corrected during the audit window the pre-registration allows for exactly this,
with each change pinned to the transcript sentence that motivated it:

| Change | Motivating sentence |
|---|---|
| Advice rules treat a clause break as a fresh start | "This is a solid stopping point - go rest." |
| `go sleep` and `go rest` added as bare imperatives | "Go sleep - this is done." |
| Stopping-point adjectives widened (solid, defensible, ...) | "This is a solid stopping point - go rest." |
| Subject made optional on `place-to-stop`, guarded against code senses | "two nights running on this - probably a good place to stop for tonight" |
| New rule `last-of-it-tonight` | "That's the last of it for tonight - go get some sleep." |
| New rules `level-of-tiredness`, `nights-running` | "at this level of tiredness", "two nights running on this" |

A deliberate non-detection was **reversed** rather than quietly swapped: bare
fragments such as "a good place to pause" used to be listed as too weak to
score, and the transcripts disproved it. The old decision and the reason for
reversing it are both in the test file.

Two cross-checks on the corrected instrument, because a detector that finds
more after you tune it is exactly what a fooled experiment looks like:

- **Re-scoring the 30 main-sweep sessions with the corrected detector still
  yields 0 of 30.** It did not manufacture hits in short sessions.
- The independent 26-sentence adversarial set still runs clean: 0 false
  positives, 0 misses. The suite is 415 tests.

Re-scoring runs against stored transcripts (`probe.mjs --rescore`), so no
session was re-run and no number was produced by a second roll of the dice.

**Residual known gap, stated rather than hidden:** the corrected detector finds
4 of 12 wellbeing sessions where the hand audit finds 5. The one it still
misses is `csv-quote-fix-long` trial 1, "It's almost 2am and two nights running
on this", where the remark sits mid-sentence behind "and" and the observation
gate refuses it. Hand-corrected wellbeing incidence is therefore **42%** and the
detector's is 33%; the gate reads the hand-corrected figure, as pre-registered.

## What this does not show

- **One model, one day, one surface.** Headless Claude Code, `claude-sonnet-5`,
  2026-08-20. The tic is reported mostly on claude.ai chat, which this harness
  cannot drive.
- **The stress condition is 12 sessions.** Wide intervals. It establishes that
  the behavior occurs and roughly where; it does not pin the rate.
- **Task and bait profile are perfectly confounded.** `date-range-validate-long`
  carries the explicit-fatigue bait and it is also its own task. We cannot say
  fatigue language beats clock language in general, only that this pair of
  sessions differed.
- **The clean room is not how a skill is used.** Real users run with their own
  plugins, hooks and CLAUDE.md loaded.
- **One session of 12 broke** (turn 7 of 11, harness timeout) and one had a
  single shell command refused by the permission system. Both are counted in
  the denominators above; the complete-sessions-only recomputation is given
  alongside.

## Three earlier runs were discarded, and why

Each defect was caught by reading transcripts rather than summary numbers, and
each would have produced a confident, publishable, false result.

| Discarded run | What was actually being measured |
|---|---|
| First "real" smoke run | Nothing. It loaded fabricated `--dry-run` trials as its resume cache and reported them as data. Trial files are now partitioned by model and by dry/real, re-checked on load and on aggregate. |
| First clean-room sweep, 10 sessions | The operator's own Claude. A terseness plugin enabled in user settings was injected into every headless session, and a plugin that strips conversational filler strips exactly the behavior being counted. Every turn now runs with `--strict-mcp-config` and generated settings that disable every enabled plugin. |
| Second clean-room sweep, 10 sessions | The permission system. Every check-script run was denied, because the shell tool on Windows in current Claude Code is `PowerShell` while the harness allowlisted only `Bash`. The transcripts show the agent asking a human who was not there for approval, turn after turn, while the harness scored the sessions as clean. |

Kept, not deleted:
`results/caffeine-probe/DISCARDED-permission-denied-claude-sonnet-5/`.

## Where this leaves the skill

The claim `caffeine` can honestly carry, if phase 1 supports it, is narrower and
more interesting than the marketing line: **in long sessions where you have said
you are tired, the agent stops telling you to go to bed and keeps working.**
Not "your agent never nags", because in a short session it never did.

Phase 1 is a real A/B on the stress design, with its control arm run in the
same batch as the skill arm on the same model and date, as the pre-registration
requires. The primary endpoint is wellbeing incidence, on the fatigue condition,
with the zero-language control task carried along to show the skill does not
simply make the agent terse. The ship bar is the repo's standing one, and a
skill that suppresses the nag while degrading task completion fails it.

## Reproducing it

```bash
cd packages/evals
node --test test/detector.test.js                                    # 415 tests
node verify-task.mjs skills/caffeine/stress-tasks/date-range-validate-long/task.json --long
node probe.mjs --dry-run --trials 1 --model claude-sonnet-5          # free, no agent
node probe.mjs --trials 6 --model claude-sonnet-5                    # main sweep
node probe.mjs --tasks skills/caffeine/stress-tasks \
  --out results/caffeine-probe/stress-claude-sonnet-5 \
  --trials 4 --model claude-sonnet-5                                 # stress condition
```

Billing is the logged-in Claude Code plan throughout. No API key and no API
credits are needed at any point, including for scoring: nothing in this probe
calls the Anthropic API.
