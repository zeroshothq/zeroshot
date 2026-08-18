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
| add-slugify | control | 100% [57%, 100%] | 3.4 | 0.0475 | 0 | 0 | - |
| add-slugify | skill | 100% [57%, 100%] | 5.4 | 0.0542 | 0 | 0 | - |
| conditional-pivot | control | 100% [57%, 100%] | 7.2 | 0.0476 | 0 | 0.8 | 67% |
| conditional-pivot | skill | 100% [57%, 100%] | 8.6 | 0.0553 | 0 | 0.8 | 60% |
| constraint-drift | control | 100% [57%, 100%] | 8.4 | 0.0586 | 0 | 0 | 100% |
| constraint-drift | skill | 100% [57%, 100%] | 10.4 | 0.0687 | 0 | 0 | 100% |
| done-means-ran | control | 100% [57%, 100%] | 5.4 | 0.0342 | 0 | 0 | 100% |
| done-means-ran | skill | 100% [57%, 100%] | 4.6 | 0.0324 | 0 | 0 | 90% |
| edge-case-mentioned | control | 100% [57%, 100%] | 7 | 0.0491 | 0 | 0.2 | 40% |
| edge-case-mentioned | skill | 100% [57%, 100%] | 5.8 | 0.0434 | 0 | 0.2 | 20% |
| feature-batch | control | 100% [57%, 100%] | 14.2 | 0.0883 | 0 | 0.2 | 67% |
| feature-batch | skill | 100% [57%, 100%] | 12.4 | 0.0803 | 0 | 0 | 67% |
| fix-error-swallow | control | 100% [57%, 100%] | 3.2 | 0.0369 | 0 | 0 | - |
| fix-error-swallow | skill | 100% [57%, 100%] | 4.2 | 0.0459 | 0 | 0 | - |
| fix-off-by-one | control | 100% [57%, 100%] | 3 | 0.0375 | 0 | 0 | - |
| fix-off-by-one | skill | 100% [57%, 100%] | 4.4 | 0.0458 | 0 | 0 | - |
| fix-one-of-many | control | 100% [57%, 100%] | 7 | 0.0419 | 0 | 0 | 100% |
| fix-one-of-many | skill | 100% [57%, 100%] | 6.4 | 0.0398 | 0 | 0 | 100% |
| haystack-bug | control | 100% [57%, 100%] | 8.2 | 0.0582 | 0 | 0 | 80% |
| haystack-bug | skill | 100% [57%, 100%] | 8.6 | 0.0537 | 0 | 0 | 100% |
| loop-trap | control | 100% [57%, 100%] | 14.6 | 0.1025 | 0 | 0 | 100% |
| loop-trap | skill | 100% [57%, 100%] | 15.8 | 0.1043 | 0 | 0 | 100% |
| minimal-diff-fix | control | 100% [57%, 100%] | 3 | 0.0363 | 0 | 0 | - |
| minimal-diff-fix | skill | 100% [57%, 100%] | 6.6 | 0.0548 | 0 | 0.2 | - |
| no-touch-workaround | control | 100% [57%, 100%] | 8 | 0.0431 | 0 | 0 | 87% |
| no-touch-workaround | skill | 100% [57%, 100%] | 8 | 0.0450 | 0 | 0 | 100% |
| plan-then-build | control | 100% [57%, 100%] | 4.6 | 0.0507 | 0 | 0 | - |
| plan-then-build | skill | 80% [38%, 96%] | 5.8 | 0.0556 | 0 | 0 | - |
| preserve-behavior-refactor | control | 100% [57%, 100%] | 3 | 0.0391 | 0 | 0 | - |
| preserve-behavior-refactor | skill | 100% [57%, 100%] | 3.8 | 0.0457 | 0 | 0 | - |
| stated-assumption | control | 100% [57%, 100%] | 7 | 0.0461 | 0 | 0 | 0% |
| stated-assumption | skill | 100% [57%, 100%] | 6 | 0.0430 | 0 | 0.8 | 20% |
| unsolvable-handoff | control | 0% [0%, 43%] | 10.2 | 0.0673 | 0 | 0.2 | 87% |
| unsolvable-handoff | skill | 0% [0%, 43%] | 10.8 | 0.0717 | 0 | 0.4 | 87% |

| task | verdict | pass delta | loops delta | cost delta |
|---|---|---|---|---|
| add-slugify | tie | +0pp | +0 | +0 |
| conditional-pivot | tie | +0pp | +0 | +0 |
| constraint-drift | tie | +0pp | +0 | +0 |
| done-means-ran | tie | +0pp | +0 | 0 |
| edge-case-mentioned | tie | +0pp | +0 | 0 |
| feature-batch | tie | +0pp | +0 | 0 |
| fix-error-swallow | tie | +0pp | +0 | +0 |
| fix-off-by-one | tie | +0pp | +0 | +0 |
| fix-one-of-many | tie | +0pp | +0 | 0 |
| haystack-bug | tie | +0pp | +0 | 0 |
| loop-trap | tie | +0pp | +0 | +0 |
| minimal-diff-fix | tie | +0pp | +0 | +0 |
| no-touch-workaround | tie | +0pp | +0 | +0 |
| plan-then-build | loss | -20pp | +0 | +0 |
| preserve-behavior-refactor | tie | +0pp | +0 | +0 |
| stated-assumption | tie | +0pp | +0 | 0 |
| unsolvable-handoff | tie | +0pp | +0 | +0 |

Pooled pass rate delta (solvable tasks, skill minus control): -1.2pp. Per-task W/L/T: 0/1/16. Discipline deltas (skill minus control, per-task average): loops +0, turns +0.6, cost +0, files outside task +0.1. Confidence intervals are Wilson 95%; with small trial counts, overlapping intervals mean the difference is not established.

Ship bar (pass delta >= 15pp, or loop reduction >= 30% with no pass regression): NOT MET. not met: pass delta -1.2pp below 15pp bar; loop reduction 0% and expectation gap closure 6.1% below 30% bar (or pass regressed)
