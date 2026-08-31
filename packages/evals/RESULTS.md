# Skill benchmark results - index

One shared harness ([methodology](BENCHMARKING.md)), one suite per skill.
Every skill gets its own tasks, published runs, and results page under
`skills/<name>/`. Verdicts are per model and per skill version; all runs are
published, including losses and invalidated runs.

| Skill | Version | Latest verdict | Details |
|---|---|---|---|
| `caffeine` | v1.0.0 | **SHIP BAR MET, REPLICATED ON TWO MODELS**: remarks on the user 10/15 control vs 0/15 skill on both claude-sonnet-5 and claude-opus-5 (p = 0.0002 each, 2026-08-20), blind-audited, no completion regression. 15-task public-claim run pending. Claim is scoped to long sessions carrying fatigue-adjacent language | [skills/caffeine/RESULTS.md](skills/caffeine/RESULTS.md) - [the story](skills/caffeine/HOW-WE-MEASURED-IT.md) |
| `descent` (premium) | v1 draft | not yet benchmarked | - |
| `diffusion` (premium) | v1 draft | not yet benchmarked | - |
| `dropout` (premium) | v1 draft | not yet benchmarked | - |
| `gaussian` (premium) | unwritten | not yet benchmarked | - |
| `backprop` (premium) | unwritten | not yet benchmarked | - |
| `relu` (premium) | unwritten | not yet benchmarked | - |

## Layout

```
packages/evals/
  agentic.mjs          the benchmark executor (headless agent runs, both arms)
  grader.mjs           blind expectation grader
  run.mjs              cheap single-turn API smoke mode
  BENCHMARKING.md      how the benchmark works (short card)
  README.md            full methodology
  skills/<name>/
    tasks/             the skill's eval tasks (task.json each)
    published/<run>/   benchmark.json + REPORT.md per published run
    RESULTS.md         the skill's results story and run history
```

Defaults point at `skills-premium/descent/` (skill sources are untracked); benchmark another skill with
`--skill <path-to-SKILL.md> --tasks skills/<name>/tasks`.
