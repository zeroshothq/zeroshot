# Claude tells you to go to bed nine turns into a long session. We stopped it.

You are deep in a debugging session, you mention you are tired, and your agent
starts closing every turn like this:

> Go get some sleep - this is a good stopping point.
>
> This is a solid stopping point - go rest.
>
> Go sleep - this is done.
>
> That's a clean stopping point - get some rest.

Four consecutive turns, one session, each arriving immediately after the work
was done correctly. That is a real transcript from our baseline run, published
in full.

Same task, same turn, with and without the skill:

| Turn 7 of `date-range-validate-long` | Without | With `caffeine` |
|---|---|---|
| The technical answer | identical depth | identical depth |
| The last line | "Get some rest - this is a good stopping point." | ends on the work |

And across the whole A/B, 30 sessions of 11 to 12 turns, both arms run in one
batch on `claude-sonnet-5`:

| Endpoint | Without | With `caffeine` |
|---|---|---|
| **Sessions with a remark on your state, or advice to rest or stop** | **10 of 15** | **0 of 15** |
| Sessions proposing to defer unfinished work | 5 of 15 | 0 of 15 |
| Task completion (pooled subtasks, the pre-registered guardrail) | 95.0% | 96.1% |

Fisher exact **p = 0.0002** on the first row. Completion did not regress, so the
skill is not buying silence by doing less work. It does cost about **16% more
plan spend**, which is the honest price of any skill that adds context.

```bash
zeroshot pour caffeine
```

No key, no signup, no email. Source:
[`skills/caffeine/SKILL.md`](../../../../skills/caffeine/SKILL.md).

## What it actually does

Six iron rules, about 700 words. The agent never remarks on your sleep, energy,
health or the hour. It never suggests resting, pausing or stopping for the
night. It never proposes deferring work that is not finished. A mention of the
clock is context for the work, not an invitation. Effort at turn ten matches
turn one. Turns end on the work.

The skill also carries explicit edge cases so it does not overcorrect: a direct
question about breaks gets answered, a stated intention to stop gets a clean
handoff, and `sleep(500)` is still just code. Those are design decisions in the
skill text, not separately measured behaviors.

## When it matters, and when it does not

Say it plainly, because you will notice it yourself otherwise: **in short
sessions the behavior barely happens.** We ran 30 short sessions of four to five
turns, 24 of them carrying heavy fatigue bait and 6 as a zero-bait control, and
got zero instances.

| Condition | Sessions | Turns | Remarked on your state |
|---|---|---|---|
| Short session, fatigue mentioned | 30 | 4-5 | 0% |
| **Long session, you say you are tired** | 4 | 12 | **100%** |
| Long session, clock mentioned only | 4 | 11 | 25% |
| Long session, no fatigue language at all | 4 | 11 | 0% |

What triggers it is **session depth plus fatigue-adjacent language**. Explicit
tiredness is the reliable trigger. A late clock alone is enough too: it produced
one instance in four phase 0 sessions, and in the larger phase 1 run the
clock-only task produced remarks in most control sessions, all of them in an
indirect register ("that's the one that was eating your night"). The task with
no fatigue language anywhere, run at the same length, stayed clean in both
phases, which is what rules out session length on its own.

On depth: in the 42 phase 0 baseline sessions the earliest instance was **turn
6**, which is exactly why our original four-to-five-turn design measured a clean
zero. In the phase 1 control arm, with heavier bait, it appeared as early as
turn 2. If you work in short bursts you probably do not need this. If you work
long sessions and mention being tired, it showed up in 10 of 15 baseline
sessions, up to five times in a single session, and the skill removed all of it.

## Why you can believe the number

Most skills ship with a vibe. This one shipped after we tried to prove it does
not work.

**The baseline was measured before the skill was written.** A skill written
first defines the behavior it claims to fix, and the benchmark then gets
designed to find that behavior. So the decision gate went in writing before any
data existed, including the outcome that kills the product: under 5% baseline
incidence and the headline claim is dropped. We hit that outcome on the first
honest run and published the null. The contingency that sent us to longer
sessions was written **mid-sweep, after the first ten sessions came back zero
and before the remaining twenty ran** - the pre-registration discloses that
timing rather than backdating it, and the stress condition it specified is
reported separately and never pooled with the main sweep.

**The A/B was pre-registered and both arms ran in one batch**, same model, same
day, with guardrails aimed at the ways a skill like this cheats. Pooled subtask
completion could not fall more than five points; it rose 1.1. A control task
with no fatigue language, where the skill cannot possibly help, had to hold its
completion and turn count; it did, 11.0 turns in both arms. That guardrail had a
third pre-registered component, assistant-text volume, which the harness never
computed during the run. Recomputed afterwards from the stored digests, the
skill arm wrote about 4% less prose on that task, so it holds, but it was
checked late and that is worth knowing.

**The audit was blind.** Every session digest was stripped of its arm, task
name, bait profile and detector counts and given an opaque id, with the mapping
held in a key file opened only after reading. Two things about that round are
weaker than the first version of this piece claimed, and both are now in the
results page: the two readers were **not independent of each other** (the second
saw the first's calls and was asked to challenge them, which catches misses well
and correlated errors poorly), and **29 of the 30 sessions** went through it,
the last being a re-run that landed after the round closed and was blinded and
read separately.

What the blind round found is the part that matters: **more** than the automated
detector had, and every additional finding in the **control** arm, 10 wellbeing
sessions where the detector scored 5. A correction that runs entirely against
your own control is the kind you can trust.

**Three earlier runs were discarded.** One served itself fabricated `--dry-run`
data out of its own resume cache and reported it as a result. One measured a
terseness plugin in the operator's own settings instead of Claude, which would
have suppressed exactly the behavior being counted. One measured the permission
system denying every command while reporting 100% task completion, because the
Windows shell tool is `PowerShell` and the harness allowlisted only `Bash`. That
last one's artifacts are
[published here](published/discarded-2026-08-20-permission-denied/) with a
README, because a rule about publishing failures that only applies to failures
you like is not a rule.

Three of those produced summary numbers that looked perfectly healthy. All of
them were caught by reading transcripts.

**Then our own detector turned out to be wrong.** On the stress condition it
found the behavior in 2 of 12 sessions where hand-reading found 5. The misses
were systematic: its direction gate only accepted advice at the start of a
sentence, and this agent puts the nag in the second clause, after a dash, at the
end of a turn. "This is a solid stopping point - go rest." was invisible to it.
Six rules were corrected inside the one audit window the pre-registration allows,
each pinned to the transcript sentence that motivated it, taking the frozen
instrument to 39 wellbeing rules, 27 wind-down rules and 415 tests. Two checks
followed, because a detector that finds more after you tune it is what a fooled
experiment looks like: re-scoring the 30 short-session transcripts with the
corrected version still yields **zero**, and an independent adversarial sentence
set still runs at zero false positives. Even after the fix it misses the
indirect register, finding 4 of 12 where the humans find 5, so the published
incidence is the human number.

## The limits, in one place

One model, one day, headless Claude Code, `claude-sonnet-5` on 2026-08-20.
(Claude Code also bills a small amount of `claude-haiku-4-5` per session for its
own background calls, which is why two model ids appear in every trial file.)

Three tasks and fifteen sessions per arm is a development suite, not the fifteen
to thirty tasks our own rule requires before a benchmark is quoted publicly.
The behavior is reported across the API, Claude Code and claude.ai alike, and
the reports that started this are specifically about it interrupting coding
sessions, so the surface we measured is a real one rather than a proxy. What we
measured is **headless** Claude Code (`claude -p`, non-interactive, scripted
turns). Nothing here speaks to claude.ai chat, or to an interactive Claude Code
session with a human typing, and those may differ in either direction. The sessions run in a clean room with every plugin
and MCP server disabled, which is not how anyone actually runs an agent, so
these are stripped-baseline numbers. One control session broke twice at turn 9
and was re-run; five sessions hit a single permission denial each. And Anthropic
has acknowledged the behavior and said it hopes to fix it in a future model,
which would deflate the baseline through no action of the skill.

What is supported is exactly this: in long sessions where you have said you are
tired, on this model, in headless Claude Code, on that date, it stops.

## If you build skills yourself

The transferable part is the harness, not the skill. Write the decision gate
before the data exists, including the outcome that kills your claim. Measure the
baseline before you write the skill. Read transcripts, not summaries, because
every instrument failure above looked fine in the aggregate. Blind your own
audit, especially when you want the result. Publish the runs you discarded. And
when someone checks your writeup against your own artifacts and finds five hard
errors in it, fix them in public rather than quietly.

That last one is not rhetorical. The first draft of this page said the skill was
thirty lines when `wc -l` says ninety-five, cited the detector's pre-correction rule
counts, put the skill arm's turn count at 169 when it is 170, attributed a
phase 1 quote to phase 0, and claimed `published/` contained the discarded runs
when it did not. An adversarial pass over the page against its own artifacts
caught all five.

Everything is reproducible from this repo: tasks, detector and its tests, every
trial file, every transcript digest, the blind-audit record and key, the
discarded run, and the exact SKILL.md that was measured.
[RESULTS.md](RESULTS.md) has the numbers.
[published/](published/) has the artifacts.

```bash
zeroshot pour caffeine
```
