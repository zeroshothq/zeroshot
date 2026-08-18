# zeroshot agentic eval results (v2)

Full headless `claude` agent sessions in scratch workspaces, control arm vs skill arm.
The check test is withheld until after each run; expectations are graded blind.

- Model: claude-haiku-4-5-20251001
- Trials per task per arm: 5
- Date: 2026-08-18
- Skill: skills/zeroshot/SKILL.md
- Grader model: claude-haiku-4-5-20251001

| task | arm | pass rate [95% CI] | mean turns | mean cost (USD) | mean loops | files outside | expectations met |
|---|---|---|---|---|---|---|---|
| add-slugify | control | 100% [57%, 100%] | 3 | 0.0403 | 0 | 0 | - |
| add-slugify | skill | 100% [57%, 100%] | 4.2 | 0.0504 | 0 | 0 | - |
| fix-error-swallow | control | 100% [57%, 100%] | 3 | 0.0366 | 0 | 0 | - |
| fix-error-swallow | skill | 100% [57%, 100%] | 5.2 | 0.0500 | 0 | 0 | - |
| fix-off-by-one | control | 100% [57%, 100%] | 3 | 0.0372 | 0 | 0 | - |
| fix-off-by-one | skill | 100% [57%, 100%] | 5 | 0.0478 | 0 | 0 | - |
| loop-trap | control | 100% [57%, 100%] | 13.4 | 0.0892 | 0 | 0.2 | 100% |
| loop-trap | skill | 100% [57%, 100%] | 13 | 0.0924 | 0 | 0 | 100% |
| minimal-diff-fix | control | 100% [57%, 100%] | 3 | 0.0359 | 0 | 0 | - |
| minimal-diff-fix | skill | 100% [57%, 100%] | 3.8 | 0.0407 | 0 | 0 | - |
| plan-then-build | control | 100% [57%, 100%] | 4.6 | 0.0515 | 0 | 0 | - |
| plan-then-build | skill | 80% [38%, 96%] | 7.8 | 0.0687 | 0 | 0.2 | - |
| preserve-behavior-refactor | control | 100% [57%, 100%] | 3 | 0.0397 | 0 | 0 | - |
| preserve-behavior-refactor | skill | 100% [57%, 100%] | 3.6 | 0.0452 | 0 | 0 | - |
| unsolvable-handoff | control | 0% [0%, 43%] | 10 | 0.0682 | 0 | 0 | 93% |
| unsolvable-handoff | skill | 0% [0%, 43%] | 11.2 | 0.0778 | 0 | 0 | 87% |

| task | verdict | pass delta | loops delta | cost delta |
|---|---|---|---|---|
| add-slugify | tie | +0pp | +0 | +0 |
| fix-error-swallow | tie | +0pp | +0 | +0 |
| fix-off-by-one | tie | +0pp | +0 | +0 |
| loop-trap | tie | +0pp | +0 | +0 |
| minimal-diff-fix | tie | +0pp | +0 | +0 |
| plan-then-build | loss | -20pp | +0 | +0 |
| preserve-behavior-refactor | tie | +0pp | +0 | +0 |
| unsolvable-handoff | loss | +0pp | +0 | +0 |

Pooled pass rate delta (solvable tasks, skill minus control): -2.9pp. Per-task W/L/T: 0/2/6. Discipline deltas (skill minus control, per-task average): loops +0, turns +1.4, cost +0, files outside task +0. Confidence intervals are Wilson 95%; with small trial counts, overlapping intervals mean the difference is not established.

Ship bar (pass delta >= 15pp, or loop reduction >= 30% with no pass regression): NOT MET. not met: pass delta -2.9pp below 15pp bar and loop incident reduction 0% below 30% bar
