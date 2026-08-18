# Skill evals

The README says skills make measurable claims. This harness is where the
measuring happens. No benchmark on a can that isn't reproducible.

## What this measures

Each run compares two arms on the same set of tasks:

- **baseline**: the model gets the task prompt with a plain coding-agent
  system prompt.
- **skill**: identical, except the full text of a SKILL.md is appended to
  the system prompt.

Every task runs N trials per arm (default 3). Scoring is objective only:

| Metric | How it is scored |
|---|---|
| `pass` | The task's `node --test` suite is actually executed against the model's edited files. Pass or fail, no partial credit |
| `output_tokens` | From the API response, as billed |
| `diff_lines` | Added plus removed lines between the task's files and the model's versions |
| `plan_present` | A numbered or bulleted plan of 3 steps or fewer appears before the first file block |

There are no LLM judges anywhere in the pipeline. If a number in RESULTS.md
cannot be recomputed from a transcript and a test run, it does not ship.

## How to run

```bash
node packages/evals/run.mjs --skill skills/zeroshot/SKILL.md --trials 3 --model claude-haiku-4-5
```

Flags:

- `--skill <path>`: SKILL.md to test in the skill arm
- `--trials <n>`: trials per task per arm
- `--model <id>`: any Anthropic model id
- `--only <task-id>`: run a single task
- `--dry-run`: print prompts and exit; no API calls, no cost

Needs `ANTHROPIC_API_KEY` in the environment or in a `.env` at the repo
root. Cost: tasks are small and single-turn, so a full Haiku run across all
tasks and trials lands well under one dollar.

## Task anatomy

A task is one folder, `packages/evals/tasks/<task-id>/`, holding one file,
`task.json`:

- `id`, `title`, `prompt`: what the agent is asked to do
- `files`: the starting repo, as relpath to full content (small CommonJS .js)
- `check.test_file` + `check.test_content`: a `node:test` suite that fails
  against `files` as given and passes against the reference solution
- `reference_solution`: the corrected files, used to validate the test, not
  to grade the model
- `expected_behaviors`: `require_plan` and `max_diff_lines`

The evaluated model replies with prose plus one fenced block per changed
file, in the form ` ```file:<relpath> ` followed by the full new content.
The harness writes those files into a temp copy of the task and runs the
tests. That is the whole trick.

## Anti-cheat rules

- The test file is never included in `files`, and any model-emitted edit to
  the test file path is ignored. The shipped test runs, not the model's.
- The reference solution is never shown to the model and never graded
  against. Only the tests decide `pass`.
- Every task's test suite is verified at load time: it must fail on the
  starting files and pass on the reference solution, or the run aborts.

## Honest limitations

Read these before quoting the numbers.

- **Single-turn.** The harness sends one prompt and scores one reply. It
  cannot measure interactive behaviors: the loop-breaker, retry discipline,
  or handoffs across a real multi-turn session. Those are the skill's most
  visible habits and this harness does not see them.
- **Small N.** A handful of tasks, single-digit trials. Deltas are
  directional, not statistically airtight.
- **One model family.** Anthropic models only. No claim is made about how
  the skill transfers elsewhere.

## Results

Committed results live in [RESULTS.md](RESULTS.md), always with the model
id and run date. If the numbers there were not produced by the harness in
this folder, that is a bug. File it.
