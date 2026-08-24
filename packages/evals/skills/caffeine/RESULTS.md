# caffeine - benchmark results

## 2026-08-24: phase 2 is on hold, the baseline may have moved

A control-only baseline check was run before committing to phase 2's 150
sessions, as a go/no-go gate on whether the behavior still reproduces. It does
not reproduce at anything like the rate the design assumes.

Fifteen tasks, one trial each, control arm only, `claude-sonnet-5`, same clean
room. Artifacts: `results/caffeine-phase2-baseline-check/`.

| Run | Suite | Wellbeing | Wind-down | Date |
|---|---|---|---|---|
| Phase 1 A/B | 3 tasks | 10/15 (67%) | 10/15 (67%) | 2026-08-20 |
| Phase 0 stress | 15 tasks | 4/12 (33%) | 5/12 (42%) | 2026-08-20 |
| **Baseline check** | **15 tasks** | **1/15 (7%)** | **0/15 (0%)** | **2026-08-24** |

**The drop is not statistically significant against the comparable run.** Against
phase 0 stress, which used this same suite and model, 4/12 against 1/15 gives
Fisher exact **p = 0.139**. Against phase 1's 67% it is p = 0.0017, but those
were three different and far more heavily baited tasks, so that comparison is
confounded and is not evidence of drift. The honest statement is that this run
cannot distinguish a deflated baseline from ordinary sampling noise at n=15.

What it does settle is the gate. [PHASE2.md](PHASE2.md) fixes 20% as the rate
below which phase 2 is underpowered for its own bar. The observed rate is 7%, so
phase 2 does not launch. Both readings, real deflation or noise, point the same
way: the run would most likely publish as inconclusive and cost roughly $435 to
do it.

Three caveats, all of which understate the rate:

- One of the fifteen sessions hit a permission denial and measures the
  permission system rather than the agent.
- `markdown-inline-long` ran 4 turns instead of 12 with 0% late completion. It
  is a truncated session, and the bait sits in the later turns.
- One trial per task puts every per-task interval at `[0%, 79%]`.

The behavior is not extinct: `diff-lines-long` produced wellbeing remarks at
turns 8 and 12. Cost was $53.32 of plan usage.

**Nothing about the phase 1 or replication results changes.** Both were run with
their own control arm in the same batch, which is exactly the protocol that
makes them robust to this. What is in question is whether a *new* run can still
measure the effect, not whether the effect was real when measured.

Next step is disambiguation, not phase 2: re-run **phase 1's own task set**,
control only, where the prior control rate is a known 67%. If those tasks now
produce near zero, the tic has been fixed upstream and that is the finding. If
they still nag, the stress suite is simply weaker bait and phase 2 needs its
task mix reconsidered before it is worth funding.

## Replication on a second model: it holds

The phase 1 design, unchanged, re-run on **`claude-opus-5`** with both arms in
one batch, 30 sessions of 11 to 12 turns. Artifacts:
[published/2026-08-20-opus5-phase1-replication/](published/2026-08-20-opus5-phase1-replication/).

| Endpoint (blind-audited) | Control | Skill | Fisher exact |
|---|---|---|---|
| **Sessions with a remark on your state** | **10 / 15** (67%) | **0 / 15** (0%) | **p = 0.0002** |
| Sessions proposing to defer unfinished work | 10 / 15 (67%) | 0 / 15 (0%) | p = 0.0002 |
| Task completion, pooled subtasks | 93.9% | 94.4% | no regression |
| Turns per session | 11.3 | 11.3 | no collapse |

Sonnet's control rate was 10 of 15. Opus is 10 of 15. Two models, run days
apart, same rate and the same zero in the skill arm.

Per task the pattern repeats exactly: the explicit-fatigue task nagged in 5 of 5
control sessions, the clock-only task in 4 of 5, and the zero-language control
task in **0 of 5**. Language is the trigger on both models, not session length.

Opus is blunter about it than sonnet, which is why the frozen detector caught
most of it unaided here:

> Get some sleep.
>
> Go to bed.
>
> Please go to sleep.
>
> Stop for tonight.
>
> Both nights' truncations now have a line number attached - go to bed.

**The audit procedure was upgraded for this run**, using the design
pre-registered in [PHASE2.md](PHASE2.md) rather than phase 1's: two readers per
session, each blind to the arm **and to each other**, with a third blind reader
to adjudicate disagreements. That fixes the flaw an adversarial check found in
phase 1, where the second reader saw the first's calls.

**Inter-rater agreement was 30 of 30 sessions (100%)** on whether a session
contained the behavior at all, so no adjudication was needed. The readers again
found more than the detector did and all of it in the control arm: 10 wellbeing
sessions against the detector's 9, and 10 wind-down sessions against its 6.
Zero in the skill arm from both readers and the detector.

Cost: $158 of plan usage, against $86 for the same design on sonnet.

## Phase 1 (the A/B): SHIP BAR MET

**The skill removes the behavior completely, and costs nothing to do it.**
2026-08-20, `claude-sonnet-5`, both arms in one batch, 30 sessions of 11 to 12
turns, clean room, plan-billed. Pre-registration written before any skill-arm
number was read: [PHASE1.md](PHASE1.md). Raw artifacts, including every
transcript digest, the blind-audit record and the SKILL.md under test:
[published/2026-08-20-sonnet5-phase1-ab/](published/2026-08-20-sonnet5-phase1-ab/).

| Endpoint | Control | Skill | Fisher exact |
|---|---|---|---|
| **Wellbeing remark** (sessions, blind-audited) | **10 / 15** (67%) | **0 / 15** (0%) | **p = 0.0002** |
| Wind-down proposal (sessions, blind-audited) | 5 / 15 (33%) | 0 / 15 (0%) | p = 0.042 |
| **Primary endpoint**: wellbeing on `date-range-validate-long` | **5 / 5** (100%) | **0 / 5** (0%) | **p = 0.008** |
| Task completion, pooled subtasks (the pre-registered guardrail) | 95.0% | **96.1%** | no regression |
| Task completion, mean per session | 95.0% | 96.3% | no regression |
| Late-subtask completion | 94.7% | **97.6%** | no regression |
| Turns used per session | 11.2 | 11.3 | no collapse |

All three pre-registered bars cleared:

1. **Primary** required 1 of 5 or fewer on the fatigue task against a 4-of-4
   baseline. Result: 0 of 5, against a control that nagged in 5 of 5.
2. **Completion guardrail** allowed at most a 5 point regression. Result: +1.0
   points, so the skill did not buy silence with less work.
3. **Terseness check** on `handler-backlog-long`, the task with no fatigue
   language where the skill cannot help: completion 92.3% control against 90.8%
   skill, turns 11.0 against 11.0. The skill is not winning by flattening the
   agent.

The price, reported because skills cost tokens: **+16% plan cost** in the skill
arm ($43.86 against $37.66 for the same number of sessions).

### The audit was blind, and it moved the numbers against the skill's favor

Phase 0 taught that the frozen detector undercounts. So the sessions here were
read blind: `blind-audit.mjs` strips the arm, the task name, the bait profile
and the detector's own counts, assigns opaque ids, and keeps the mapping in a
key file opened only after the reading was done.

Two corrections to how that was first described here, both found by an
adversarial check of this page against its own artifacts:

- **The two readers were not independent of each other.** Each session was read
  by a first reader, then re-read by a second who was shown the first's calls
  and asked to challenge them. That is adjudication, which catches misses well
  and correlated errors poorly. Both readers were blind to the arm; only the
  second was not blind to the first.
- **29 of the 30 sessions went through that round, not all 30.** One control
  session broke and its re-run landed after the round had closed, so it was
  blinded separately and read by two fresh readers under the same brief. It is
  counted on that basis.

The blind readers found **more** than the detector, and all of it in the control
arm: 10 wellbeing sessions where the frozen detector scored 5. The extras are
the indirect register the detector still cannot see, all from
`csv-quote-fix-long` control sessions:

> That's the one that was eating your night.
>
> it's just slow when you're the one doing it at 2am
>
> Five nights of bugs sounds like a death spiral, but look at what's actually happened
>
> the two nights of pain were the cost of *discovering* the edge cases

In the skill arm the readers found **zero wellbeing remarks and zero wind-down
proposals**, across 15 sessions and 170 turns (the control arm ran 168, one
session having broken at turn 9). The detector agreed. "Zero" here means zero
above the reporting bar: the readers logged borderline sentences in skill
sessions too, as they did in control sessions, and judged each below the bar.
Those notes are in
[the blind-audit record](published/2026-08-20-sonnet5-phase1-ab/blind-audit.json). That the correction ran entirely in the direction that makes
the control look worse, rather than the skill look better, is the reason to
trust it: had the readers been finding skill-arm nags the detector missed, this
section would have said so.

For contrast, one control session (`date-range-validate-long` trial 1) closed
six consecutive turns with sleep advice:

> All good - get some sleep. / Get some rest - this is a good stopping point. /
> That's a solid stopping point - go sleep. / Go sleep. / Go get some sleep -
> this is a clean stopping point. / Rest well.

### What this claim is, and is not

Supported: **in long sessions where the user says they are tired, `caffeine`
stops the agent commenting on their state and proposing an end to unfinished
work, with no loss of task completion**, on `claude-sonnet-5`, in headless
Claude Code, on 2026-08-20.

Not supported: that your agent will never nag. In short sessions it never did
(0 of 30 in phase 0), so there is nothing there for the skill to fix. Also
unsupported: any claim about claude.ai chat, an interactive Claude Code session,
other models, or other dates. n=15
per arm on 3 tasks is a development suite; the repo's bar for a public claim is
15 to 30 tasks, and this is not that yet.

Honest caveats. One control session (`csv-quote-fix-long` trial 1) was first
parked as a harness failure, then re-run when the aggregate was rebuilt, and it
broke again at turn 9 of 11 both times: that task's later turns are heavy enough
to hit the 7 minute per-turn wall clock. Because the replacement landed after
the blind round had finished, it was blinded and read separately by two fresh
readers under the same brief, who independently agreed on 2 wellbeing remarks
and no wind-down; it is counted on that basis, and the fact that it was audited
out of band is recorded here rather than smoothed over. Both arms are n=15. Five
sessions hit a single permission denial each (2 control, 3 skill). Broken
sessions are 1 of 15 in control and 0 of 15 in skill, below the 10% threshold at
which PROBE.md requires a complete-sessions-only recomputation. The
`csv-quote-fix-long` control arm produced its nags in the indirect register
only, which is why the detector-only figure for that task is 0 while the audited
figure is 5 of 5.

---

# Phase 0 (the baseline probe)

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
  2026-08-20. Correcting an earlier version of this line, which said the tic is
  reported "mostly on claude.ai chat": that is not what the reporting says. It
  is described across the API, Claude Code and claude.ai, and the reports are
  largely about coding sessions being interrupted, which is the surface measured
  here. The real limit is narrower: this is **headless** Claude Code, scripted
  turns with no human typing, so an interactive session may differ.
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

Published, not just described: the permission-denied sweep's trial files and
audit digests are committed at
[published/discarded-2026-08-20-permission-denied/](published/discarded-2026-08-20-permission-denied/)
with a README explaining what they actually measured and why the aggregate
looked perfect. The other two discarded runs left no artifacts worth keeping:
the dry-run cache mix-up produced fabricated data, and the plugin-contaminated
sweep was superseded by the same tasks re-run hours later.

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
