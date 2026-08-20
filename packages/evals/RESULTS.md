# Skill benchmark results - index

One shared harness ([methodology](BENCHMARKING.md)), one suite per skill.
Every skill gets its own tasks, published runs, and results page under
`skills/<name>/`. Verdicts are per model and per skill version; all runs are
published, including losses and invalidated runs.

| Skill | Version | Latest verdict | Details |
|---|---|---|---|
| `warmup` (free) | v1.3.0 | **SHIP BAR MET** on claude-sonnet-5 (2026-08-18, run 4); no measurable effect on claude-haiku-4-5 | [skills/warmup/RESULTS.md](skills/warmup/RESULTS.md) |
| `caffeine` | unwritten | **BEHAVIOR CONFIRMED, SCOPED**: absent in 30 short baseline sessions, present in 4 of 4 long sessions with an explicitly tired user, absent in the same-length no-fatigue control (claude-sonnet-5, 2026-08-20, phase 0). Never before turn 6. Phase 1 A/B pending | [skills/caffeine/RESULTS.md](skills/caffeine/RESULTS.md) |
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

Defaults point at `skills-premium/warmup/` (skill sources are untracked); benchmark another skill with
`--skill <path-to-SKILL.md> --tasks skills/<name>/tasks`.
