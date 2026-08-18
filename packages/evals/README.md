# Skill evals

The README says skills make measurable claims. This harness is where the
measuring happens. No benchmark on a can that isn't reproducible.

## What this measures

Each run compares two arms on the same set of tasks:

- **control**: the agent gets the task with no skill installed.
- **skill**: identical, except the SKILL.md under test is present.

Two modes share the tasks. **api** is the single-turn smoke test: one
prompt, one reply, files parsed from fenced blocks. **agentic** is the
real thing, described next.

## Agentic mode

Each trial spawns headless Claude Code (`claude -p ... --output-format
stream-json --max-turns N`) in a fresh working directory seeded with the
task's starting files. The only difference between arms is that the skill
arm has the SKILL.md copied to `<runDir>/.claude/skills/zeroshot/SKILL.md`
before the run; the control arm has no `.claude` dir at all. Same prompt,
same model, same tool allowlist, same turn budget.

The full stream-json transcript is captured per trial. The task's test file
is never written before the run and never mentioned in the prompt; after
the agent finishes, the harness writes the withheld test to a temp-unique
filename in the run dir and executes `node --test` on it. The agent is
graded on the repo it left behind, not on what it said it did.

## Metrics

| Metric | Want | How it is scored |
|---|---|---|
| pass rate | up | withheld `node --test` suite, executed post-run |
| diff minimality | down | added plus removed lines, counted only on passing runs |
| loop incidents | down | repeated near-identical failing actions in the transcript |
| scope discipline | down | edits to files the task did not ask about |
| bounded attempts + handoff | met | on unsolvable tasks: capped retries, then a structured handoff |
| cost | honest | `total_cost_usd` from the result event; skills often add tokens, say so |

Diff minimality on failing runs is noise, so it only counts on passes.

## Blind grading

Objective metrics come from tests and diffs. Behavioral expectations
(`agentic.expectations`) are graded by `grader.mjs`: one API call given
only the expectations, the last 30000 chars of transcript, and a compact
file listing. The grader never sees the skill text or which arm produced
the transcript. A grader that knows the answer key is a rubber stamp.

## How to run

```bash
node packages/evals/run.mjs --skill skills/zeroshot/SKILL.md --trials 5 --model claude-haiku-4-5           # api smoke mode
node packages/evals/run.mjs --mode agentic --skill skills/zeroshot/SKILL.md --trials 5                     # the real eval
```

Flags: `--skill <path>`, `--trials <n>`, `--model <id>`, `--only <task-id>`,
`--dry-run`. Agentic mode needs the `claude` CLI on PATH; grading and api
mode need `ANTHROPIC_API_KEY` in the environment or a repo-root `.env`.

## Task anatomy

A task is one folder, `packages/evals/tasks/<task-id>/`, holding `task.json`:

- `id`, `title`, `prompt`: what the agent is asked to do
- `files`: the starting repo, as relpath to full content
- `check.test_file` + `check.test_content`: a `node:test` suite that fails
  on `files` as given and passes on the reference solution
- `reference_solution`: validates the test, never grades the model
- `expected_behaviors`: `require_plan` and `max_diff_lines`
- `agentic` (optional): `solvable`, `max_turns` (default 15), and
  `expectations`, each a single checkable statement about behavior

Unsolvable tasks have `reference_solution: {}` and a test that cannot pass;
their expectations describe bounded attempts and a structured handoff, not
task success. Knowing when to stop is a skill claim too, so it gets tested.

## Anti-cheat rules

- The test file is never in `files`, never in the prompt, and lands under a
  temp-unique name after the run. The shipped test runs, not the agent's.
- The reference solution is never shown to the agent.
- Solvable tasks are verified at load time: the test must fail on the
  starting files and pass on the reference solution, or the run aborts.
- The grader is blind to skill text and arm. See above.

## Protocol

- Minimum 5 trials per arm per task. n=1 is an anecdote.
- Report mean and stddev per metric per arm, plus paired per-task
  win/loss/tie counts.
- Publish ALL runs, including the ones the skill loses. A results file
  with only wins in it is marketing.
- 6-8 tasks is a development suite: enough to iterate against, not enough
  to quote. Public claims need 15-30 tasks.

## Ship bar

Claim the skill helps only if, across at least 5 runs per arm:

- pass-rate delta is >= +15pp, or
- pass rate holds while loop incidents or scope violations improve >= 30%.

Below that bar: iterate on the skill and re-run. Do not lower the bar.

## Pitfalls that fake a result

- **Variance with n=1.** One lucky run proves nothing either direction.
- **Ceiling effects.** If control passes everything, the skill cannot win.
  Make tasks harder instead of declaring a tie a success.
- **Grader contamination.** Leak the skill text or arm into the grader and
  the numbers grade compliance, not behavior.
- **Goodhart on a single metric.** Small diffs are easy if you stop fixing
  the bug. Read metrics jointly.
- **Cherry-picking.** Choosing which runs to publish is the oldest trick
  in the benchmark business. Publish all of them.

## Cost

A full agentic suite on Haiku is a few dollars per run pair. api smoke
mode and `--dry-run` are near-free; shake out harness bugs there first.

## Results

Committed results live in [RESULTS.md](RESULTS.md), always with model id,
mode, and run date. Numbers not produced by this harness are a bug. File it.
