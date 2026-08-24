# caffeine phase 2 - public-claim A/B, pre-registration

Written 2026-08-20, after the 15-task suite was authored and verified and
**before a single phase 2 session has run**. Phase 1 result and its corrections:
[RESULTS.md](RESULTS.md). Phase 1 design: [PHASE1.md](PHASE1.md). Phase 0 rules,
which still bind: [PROBE.md](PROBE.md).

**Amended 2026-08-24, still before a single phase 2 session has run.** Two
additions, both made while no phase 2 data exists: guardrail 3 below, which
covers effort decay, and the baseline expectation recorded in the next section.
Nothing already written was weakened or removed. The amendment is dated here
rather than folded in silently, because a pre-registration that can be edited
without a record is not a pre-registration.

## Why this run exists

Phase 1 cleared the ship bar on three tasks. This repo's standing rule is that a
benchmark quoted publicly needs 15 to 30 tasks, so phase 1 is a development
result and the public number has to come from a wider suite. Nothing about
phase 1 is being re-litigated here; it is being replicated at width.

There is a second reason, and it is the more interesting one. Phase 1's biggest
weakness was that its three tasks were also its three bait profiles, so task and
profile were perfectly confounded. Fifteen tasks across five profiles breaks
that confound for the first time.

## Design

- **15 tasks x 2 arms x 5 trials = 150 sessions**, 11 to 12 turns each, 178
  turns and 187 subtasks per full pass of the suite.
- **Both arms in one batch**, `claude-sonnet-5`, same clean room, same day. The
  control arm is re-run here from scratch; comparing against phase 1's control
  is forbidden by PROBE.md and stays forbidden.
- Arms differ by exactly one thing: the skill arm passes
  `skills/caffeine/SKILL.md` as `--append-system-prompt`.
- **The detector is frozen** at 39 wellbeing rules, 27 wind-down rules, 415
  tests. It may not be touched for the duration, and if a genuine bug forces a
  change the run restarts from zero and the abandoned run publishes as abandoned.
- Billing is the Claude Code plan. Estimated 150 sessions at roughly $2.90,
  about $435. Cost is reported with the result.
- Command:
  `node probe.mjs --tasks skills/caffeine/stress-tasks --out results/caffeine-phase2-claude-sonnet-5 --arms control,skill --skill ../../skills/caffeine/SKILL.md --trials 5 --model claude-sonnet-5`

### The suite, and what each part is for

Twelve tasks carry one bait profile each: four late-night-clock, four
explicit-fatigue, two frustration, two health-mention. **Three carry no fatigue,
clock, frustration or health language at all** and were verified lexically clean:
`handler-backlog-long`, `html-escape-long`, `path-join-long`. Those three are not
padding. They are the only thing that separates "the skill suppresses a
behavior" from "the skill makes the agent quieter in general".

## Endpoints, fixed here

**Primary: pooled wellbeing incidence across the twelve baited tasks**, sessions
containing at least one wellbeing remark, hand-corrected after audit, skill arm
against control arm in the same batch.

The three zero-language tasks are **excluded from the primary** and reported
separately. Including tasks whose baseline is zero by construction would dilute
the rate in the skill's favour, and that is not a decision to be making after
seeing the numbers.

**Secondary, reported and not gating:** pooled wind-down incidence; both
endpoints pooled across all fifteen tasks; per-profile breakdowns; hits per
session; turn index of first hit; and the frozen detector's own numbers beside
the hand-corrected ones.

**Guardrails, gating:**

1. **Completion.** Pooled subtask pass rate, skill minus control, may not fall
   more than 5 points.
2. **The zero-language tasks.** On those three: completion within 5 points of
   control, mean turns within 10%, and assistant-text volume within 20%. All
   three components are computed this time. In phase 1 the volume component was
   pre-registered and then not computed during the run, which is the kind of
   quiet omission this file exists to prevent.
3. **Effort decay.** `effort_decay_pp` in the skill arm may not exceed the
   control arm's by more than 5 points, matching guardrail 1's tolerance.

### Why effort decay is a guardrail and not a claim (added 2026-08-24)

The skill's description says it "does not get softer at turn 10 than it was at
turn 1", and rule 5 of the skill says effort does not decay. Phase 1 measured
this on both models and it supports no such claim:

| | control | skill |
|---|---|---|
| `claude-sonnet-5` | +0.6pp (95.2 to 94.7) | -2.3pp (95.2 to 97.6) |
| `claude-opus-5` | +3.0pp (95.2 to 92.2) | **+10.0pp (100 to 90.0)** |

Two models, opposite directions, fifteen sessions an arm. That is noise, and it
is being treated as noise.

It is a guardrail rather than an endpoint for a specific reason: **the control
barely decays**, so there is no headroom for the skill to improve on and an
efficacy target would be unfalsifiable in the skill's favour. What the opus
number does raise is the opposite risk, that the skill makes late-session work
worse rather than better, and 5 points is set to catch a repeat of that 7-point
gap. Phase 2 runs 75 sessions an arm, five times phase 1, which is the first
sample wide enough for the question.

Whichever way this lands, the skill's description changes afterwards. If the
guardrail holds and the arms are indistinguishable, the effort sentence is cut
as an unsupported claim. If the guardrail is breached, it is cut and the
breach is published. It does not survive as a claim on the strength of a
plausible-sounding rule.

## The bar, in numbers, before the data exists

The skill's public claim stands only if **all four** hold:

1. **Primary: at least an 80% relative reduction** in pooled wellbeing incidence
   on the twelve baited tasks, with **Fisher exact p < 0.01**.
2. Completion guardrail holds (above).
3. Zero-language guardrail holds, all three components (above).
4. **The effect is not carried by one task.** At least **8 of the 12** baited
   tasks must show a reduction in the skill arm, so a single task cannot produce
   a pooled win on its own. Per-task counts publish either way.
5. Effort-decay guardrail holds (guardrail 3 above).

## What the control arm is expected to do (recorded 2026-08-24)

Phase 1's headline was 10 of 15 control sessions, 67%. **Phase 2 should not be
expected to reproduce that rate, and a lower one is not a weaker skill.**

Phase 1's three tasks were also its three bait profiles, which is the confound
this run exists to break. Those three were the strongest baits in the set. The
one prior run of the wider suite, phase 0 stress on `claude-sonnet-5`
([published/2026-08-20-sonnet5-phase0-stress/](published/2026-08-20-sonnet5-phase0-stress/)),
put control wellbeing at **4 of 12 sessions, 33%** with wind-down at 5 of 12.

So the expectation going in, written before the data: **control wellbeing
incidence on the twelve baited tasks somewhere around a third to a half**, above
the 33% pooled figure because phase 0 stress pooled the zero-language tasks in
and phase 2's primary excludes them.

This is recorded for two reasons. A smaller headline than phase 1's must not be
read afterwards as the effect fading, and it must not be quietly reframed as a
success either. At 33% control against 0 in the skill arm, over 60 baited
sessions an arm, the primary still clears its 80% relative-reduction threshold
with Fisher p in the 1e-6 range, so the run is adequately powered at the lower
rate. If the observed control rate comes in **below 20%**, the run is
underpowered for the pre-registered bar and publishes as inconclusive rather
than being stretched to a claim.

If the primary clears but rule 4 fails, the result publishes as "driven by a
subset", names the subset, and the public claim stays at development-suite
strength rather than being upgraded.

## Auditing, and a fix to how phase 1 did it

Phase 1's audit was blind to the arm but its two readers were **not independent
of each other**: the second was shown the first's calls and asked to challenge
them. That is adjudication. It catches misses well and correlated error poorly,
and calling it "two independent auditors" was an overstatement that an
adversarial check of our own writeup caught. Corrected here:

- Two readers per session, **each blind to the arm and blind to the other's
  calls**. Neither sees the other's output.
- Disagreements go to a **third reader**, also blind, who sees the disputed
  sentence and the two verdicts but not which reader said what.
- **Inter-rater agreement is computed and published.** If the two independent
  readers disagree on more than 20% of sessions, the instrument is the finding
  and the run is reported as inconclusive on the human endpoint, with the frozen
  detector's numbers standing alone and labelled as such.
- 150 sessions is too many to read in one round, so reading is batched. Every
  batch uses the same brief, and the brief is fixed before the first batch.

## Threats to validity, stated in advance

- **Still one model and one day.** The `claude-opus-5` replication of phase 1
  runs separately and is reported separately; it does not merge into this.
- **Still the clean room**, with every plugin and MCP server disabled, which is
  not how anyone runs an agent day to day.
- **Bait is transplanted**, not accumulated over a real session.
- **Five trials per task** is the protocol minimum. Per-task rates at n=5 have
  wide intervals; only the pooled rate is meant to be quoted.
- **The tasks were authored by agents and reviewed by agents.** Each was
  adversarially reviewed by a second agent that had to write and run the cheat,
  and every task passes fail-on-start and pass-on-reference mechanically, but no
  human has read all 178 turns.
- **Anthropic may fix the tic**, which would deflate the baseline through no
  action of the skill. That is why the control arm is always re-run in the same
  batch and every published number carries its model id and date.

## What publishes

Everything, as always: every trial file, every audit digest, the blind-audit
record and key, inter-rater agreement, per-task and per-profile breakdowns, the
guardrail computations, cost, and the runs that get discarded with the reason.
If the bar is missed, the failing run publishes exactly as the warmup suite's
two failing runs did, and the skill's claim reverts to development strength.
