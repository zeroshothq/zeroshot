# How the skill benchmarks work

The short version. Deep methodology: [README.md](README.md). Published numbers:
[RESULTS.md](RESULTS.md) and `results/benchmark.json`.

## The claim being tested

A SKILL.md changes agent behavior for the better. That is testable: same tasks,
same model, two configurations (with_skill vs without_skill), repeated runs,
graded against pre-written expectations. Anything less is vibes.

## How one run works

1. Fresh temporary working directory per run, so runs cannot contaminate each other.
2. The task's starting files are written in. The grading test is withheld; the
   agent never sees it and cannot edit it.
3. Headless agent run (`claude -p`) with a pinned model and a turn cap. The only
   difference between arms is whether the SKILL.md is installed in the run
   directory. Full transcript is captured.
4. The harness then drops in the withheld test and executes it. Pass/fail is
   mechanical, not opinion.
5. A blind grader (a separate model call) checks behavioral expectations against
   the transcript only. It never sees the skill text or which arm it is grading.

## Metrics

| Metric | Direction |
|---|---|
| Task pass rate | up |
| Diff minimality (counted only on passing runs) | down |
| Loop incidents (identical retries without new information) | down |
| Out-of-scope changes | down |
| Bounded attempts + structured handoff (unsolvable tasks) | present |
| Cost, tokens, turns | reported honestly; skills often add tokens |

The correctness gate matters: rewarding small diffs alone teaches under-fixing,
so diff size only counts when the task passed.

## Protocol rules

- 5+ trials per task per arm. Agents are stochastic; single runs prove nothing.
- Report mean and stddev, and per-task win/loss/tie. Never a best run.
- All runs are published, including the ones the skill loses.
- Ship bar: claim improvement only if the pass-rate delta is at least +15
  points, or pass rate holds while discipline metrics improve by 30%+, across
  5+ runs per arm. Discipline metrics are loop-incident reduction and
  expectation-gap closure (how much of the baseline's unmet blind-graded
  process expectations the skill closes). The expectation-gap metric was
  pre-registered 2026-08-18 after a control-only discovery round measured the
  baseline at 100% task pass with 0% compliance on several process
  expectations, and before any skill-arm runs on the expanded suite. Below
  the bar: iterate the skill and re-run. No chart.
- Results are stamped with the exact model ID and date. Public claims need a
  15-30 task suite; the current 8 tasks are a development suite.

## Run it yourself

```bash
cd packages/evals
node run.mjs --dry-run --trials 1     # free end-to-end pipeline check, no API
node run.mjs --trials 5               # single-turn API smoke (cheap, limited)
node agentic.mjs --trials 5           # the real benchmark: headless Claude Code
```

Needs Node 22+, `ANTHROPIC_API_KEY` in the environment or repo-root `.env`
(smoke mode + grader), and an authenticated `claude` CLI for agentic mode.
Agentic runs consume your Claude Code plan usage or API credits; a full Haiku
suite costs a few dollars or the plan equivalent.

## Anti-cheat

- Tasks are adversarially reviewed before use: the test must fail on the
  starting code, pass on the reference solution, and resist lazy shortcuts
  (leaked answers, weak assertions, wrap-without-refactor).
- Trap tasks (loop trap, scope trap, unsolvable handoff) exist because tasks a
  competent baseline already aces cannot show gains.
