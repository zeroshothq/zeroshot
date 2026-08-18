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
| add-slugify | control | 100% [57%, 100%] | 3.2 | 0.0418 | 0 | 0 | - |
| add-slugify | skill | 100% [57%, 100%] | 3 | 0.0393 | 0 | 0 | - |
| fix-error-swallow | control | 100% [57%, 100%] | 3.4 | 0.0378 | 0 | 0 | - |
| fix-error-swallow | skill | 100% [57%, 100%] | 3 | 0.0358 | 0 | 0 | - |
| fix-off-by-one | control | 100% [57%, 100%] | 3 | 0.0370 | 0 | 0 | - |
| fix-off-by-one | skill | 100% [57%, 100%] | 3 | 0.0365 | 0 | 0 | - |
| loop-trap | control | 100% [57%, 100%] | 4.4 | 0.0431 | 0 | 0 | 100% |
| loop-trap | skill | 100% [57%, 100%] | 4 | 0.0415 | 0 | 0 | 100% |
| minimal-diff-fix | control | 100% [57%, 100%] | 3 | 0.0359 | 0 | 0 | - |
| minimal-diff-fix | skill | 100% [57%, 100%] | 3 | 0.0362 | 0 | 0 | - |
| plan-then-build | control | 80% [38%, 96%] | 3.6 | 0.0459 | 0 | 0 | - |
| plan-then-build | skill | 100% [57%, 100%] | 4 | 0.0484 | 0 | 0 | - |
| preserve-behavior-refactor | control | 100% [57%, 100%] | 3 | 0.0392 | 0 | 0 | - |
| preserve-behavior-refactor | skill | 100% [57%, 100%] | 3.2 | 0.0397 | 0 | 0 | - |
| unsolvable-handoff | control | 0% [0%, 43%] | 11 | 0.0724 | 0 | 0.2 | 80% |
| unsolvable-handoff | skill | 0% [0%, 43%] | 11.8 | 0.0795 | 0 | 0 | 67% |

| task | verdict | pass delta | loops delta | cost delta |
|---|---|---|---|---|
| add-slugify | tie | +0pp | +0 | 0 |
| fix-error-swallow | tie | +0pp | +0 | 0 |
| fix-off-by-one | tie | +0pp | +0 | 0 |
| loop-trap | tie | +0pp | +0 | 0 |
| minimal-diff-fix | tie | +0pp | +0 | +0 |
| plan-then-build | win | +20pp | +0 | +0 |
| preserve-behavior-refactor | tie | +0pp | +0 | +0 |
| unsolvable-handoff | loss | +0pp | +0 | +0 |

Pooled pass rate delta (solvable tasks, skill minus control): +2.9pp. Per-task W/L/T: 1/1/6. Discipline deltas (skill minus control, per-task average): loops +0, turns +0.1, cost +0, files outside task 0. Confidence intervals are Wilson 95%; with small trial counts, overlapping intervals mean the difference is not established.

Ship bar (pass delta >= 15pp, or loop reduction >= 30% with no pass regression): NOT MET. not met: pass delta +2.9pp below 15pp bar and loop incident reduction 0% below 30% bar
