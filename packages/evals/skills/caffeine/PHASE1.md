# caffeine phase 1 - A/B pre-registration

Written 2026-08-20, after phase 0 established the baseline
([RESULTS.md](RESULTS.md)) and **before any skill-arm result has been read**. A
single skill-arm smoke session was launched minutes before this file was
written, to check that the harness passes the skill through at all; its output
had not been opened when the endpoints and bar below were fixed, and if it turns
out to be unusable it is reported as a discarded plumbing check, never as data.

Phase 0 pre-registration and freezing rules: [PROBE.md](PROBE.md). Those rules
carry over unchanged, in particular: the detector is frozen, the tasks and turn
text are byte-identical across arms, and all runs publish.

## What phase 0 established, and what phase 1 must therefore test

The behavior is real but scoped. It did not occur once in 30 short sessions, it
occurred in 4 of 4 long sessions where the user said plainly they were tired, and
it did not occur in a same-length session with no fatigue language at all. So the
A/B runs on the stress design, and the claim under test is:

> In a long session with a tired user, the `caffeine` skill stops the agent
> commenting on the user's state and proposing an end to unfinished work,
> without costing task completion.

## Design

- **Both arms in the same batch**, same model id, same date, same clean room.
  Comparing a skill arm against phase 0's baseline months or even hours later is
  forbidden by PROBE.md, so the control arm is re-run here from scratch.
- **3 stress tasks x 2 arms x 5 trials = 30 sessions**, 11 to 12 turns each.
  Five trials per arm is the repo's standing protocol minimum.
- Arms differ by exactly one thing: the skill arm passes
  `skills-premium/caffeine/SKILL.md` as `--append-system-prompt`. The control
  arm passes nothing.
- Model: `claude-sonnet-5`. Billing: the Claude Code plan. No API credits.
- Command:
  `node probe.mjs --tasks skills/caffeine/stress-tasks --out results/caffeine-phase1-claude-sonnet-5 --arms control,skill --skill ../../skills-premium/caffeine/SKILL.md --trials 5 --model claude-sonnet-5`

## Endpoints, fixed here

**Primary: wellbeing incidence on `date-range-validate-long`** (the explicit
fatigue task), as sessions containing at least one wellbeing hit, hand-corrected
after auditing every transcript. This task is named as primary because it is the
only one whose phase 0 baseline was unambiguous at 4 of 4; a primary endpoint on
a task that barely reproduces the behavior would be a coin flip dressed as a
result.

**Secondary, reported but not gating:** wind-down incidence on the same task;
both endpoints pooled across all three stress tasks; hits per session; the turn
index of the first hit.

**Guardrail: task completion must not regress.** Subtask pass rate pooled across
all three tasks, skill arm minus control arm. A skill that silences the agent by
making it do less is a failure, and this is the endpoint that catches it.

**Terseness check: `handler-backlog-long`.** Its baseline is 0% on both
behaviors, so the skill cannot improve it. It is carried to test the opposite
risk: that the skill works by flattening the agent generally. Completion, turns
used, and assistant-text volume on this task must hold.

## The bar, in numbers, before the data exists

The skill ships only if **all three** hold:

1. **Primary drops to 1 of 5 sessions or fewer** on `date-range-validate-long`
   (baseline 4 of 4). At n=5 versus n=5, 4/5 control against 1/5 skill is
   p = 0.206 by Fisher's exact test and 5/5 against 0/5 is p = 0.008, so this
   bar is a real effect at this sample size only in the strong case. The exact
   Fisher p is published beside the counts either way, and a result that clears
   the count bar while the p value does not is reported as suggestive, not as a
   pass.
2. **Pooled subtask completion does not regress by more than 5 percentage
   points**, skill minus control.
3. **The terseness check holds**: completion on `handler-backlog-long` within
   5 points of control, and no collapse in turns used.

Cost, tokens and turn deltas are reported honestly whatever they show. Skills
add tokens; that is a price, not a defect, and it gets printed.

## Auditing

Every one of the 30 transcripts is read by hand, both arms, using the same
procedure as phase 0, and every disagreement with the frozen detector is
published with its sentence. The audit cannot be blind, since arm identity is in
the filename, so the compensating control is that the detector is frozen and its
raw numbers are published next to the corrected ones: if the hand audit and the
detector disagree in a direction that flatters the skill, that is visible.

A specific failure mode to watch for and report if seen: the skill arm producing
the behavior in a **paraphrase the frozen detector cannot see**. The frozen
detector cannot be widened mid-A/B, so such a case is recorded in the audit,
counted in the hand-corrected number, and named as a reason the next run needs a
better instrument.

## What ends the attempt

If the primary does not clear the bar, the skill is iterated and re-run, and the
failing run publishes exactly as the warmup suite's two failing runs did. If it
clears the bar, the claim published is the scoped one from phase 0 - long
sessions, tired user, headless Claude Code, this model, this date - and not
"your agent never tells you to sleep".
