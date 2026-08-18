# zeroshot agentic eval results (v2)

Full headless `claude` agent sessions in scratch workspaces, control arm vs skill arm.
The check test is withheld until after each run; expectations are graded blind.

- Model: claude-sonnet-5
- Trials per task per arm: 5
- Date: 2026-08-18
- Skill: skills/zeroshot/SKILL.md
- Grader model: claude-haiku-4-5-20251001

| task | arm | pass rate [95% CI] | mean turns | mean cost (USD) | mean loops | files outside | expectations met |
|---|---|---|---|---|---|---|---|
| add-slugify | control | 100% [57%, 100%] | 6.2 | 0.1719 | 0 | 0 | - |
| add-slugify | skill | 100% [57%, 100%] | 10.2 | 0.2815 | 0.2 | 0 | - |
| conditional-pivot | control | 100% [57%, 100%] | 6.2 | 0.1566 | 0 | 1 | 100% |
| conditional-pivot | skill | 100% [57%, 100%] | 7.4 | 0.1891 | 0 | 1 | 100% |
| constraint-drift | control | 100% [57%, 100%] | 7.2 | 0.1838 | 0 | 0 | 100% |
| constraint-drift | skill | 100% [57%, 100%] | 7.2 | 0.1906 | 0 | 0 | 100% |
| done-means-ran | control | 100% [57%, 100%] | 4 | 0.1220 | 0 | 0 | 100% |
| done-means-ran | skill | 100% [57%, 100%] | 4 | 0.1276 | 0 | 0 | 100% |
| edge-case-mentioned | control | 100% [57%, 100%] | 7.2 | 0.1840 | 0 | 0 | 40% |
| edge-case-mentioned | skill | 100% [57%, 100%] | 7.6 | 0.1971 | 0 | 0 | 100% |
| feature-batch | control | 100% [57%, 100%] | 8.2 | 0.1809 | 0 | 0 | 100% |
| feature-batch | skill | 100% [57%, 100%] | 9.6 | 0.2257 | 0 | 0 | 73% |
| fix-error-swallow | control | 100% [57%, 100%] | 3.4 | 0.1142 | 0 | 0 | - |
| fix-error-swallow | skill | 100% [57%, 100%] | 4 | 0.1336 | 0 | 0 | - |
| fix-off-by-one | control | 100% [57%, 100%] | 3.2 | 0.2095 | 0 | 0 | - |
| fix-off-by-one | skill | 100% [57%, 100%] | 4 | 0.1733 | 0 | 0 | - |
| fix-one-of-many | control | 100% [57%, 100%] | 5 | 0.1377 | 0 | 0 | 100% |
| fix-one-of-many | skill | 100% [57%, 100%] | 5.2 | 0.1475 | 0 | 0 | 100% |
| haystack-bug | control | 100% [57%, 100%] | 6.6 | 0.1545 | 0 | 0 | 100% |
| haystack-bug | skill | 100% [57%, 100%] | 6.8 | 0.1593 | 0 | 0 | 100% |
| loop-trap | control | 100% [57%, 100%] | 8.8 | 0.2055 | 0 | 0 | 100% |
| loop-trap | skill | 100% [57%, 100%] | 9.4 | 0.2433 | 0 | 0 | 100% |
| minimal-diff-fix | control | 100% [57%, 100%] | 3 | 0.1048 | 0 | 0 | - |
| minimal-diff-fix | skill | 100% [57%, 100%] | 4.2 | 0.1330 | 0 | 0 | - |
| no-touch-workaround | control | 100% [57%, 100%] | 6.6 | 0.1488 | 0 | 0 | 100% |
| no-touch-workaround | skill | 100% [57%, 100%] | 6.8 | 0.1628 | 0 | 0 | 100% |
| plan-then-build | control | 100% [57%, 100%] | 4 | 0.1306 | 0 | 0 | - |
| plan-then-build | skill | 100% [57%, 100%] | 4 | 0.1407 | 0 | 0 | - |
| preserve-behavior-refactor | control | 100% [57%, 100%] | 3 | 0.1112 | 0 | 0 | - |
| preserve-behavior-refactor | skill | 100% [57%, 100%] | 4 | 0.1369 | 0 | 0 | - |
| stated-assumption | control | 100% [57%, 100%] | 5.2 | 0.1500 | 0 | 0 | 20% |
| stated-assumption | skill | 100% [57%, 100%] | 6 | 0.1759 | 0 | 0 | 80% |
| unsolvable-handoff | control | 0% [0%, 43%] | 11.8 | 0.2601 | 0 | 0 | 67% |
| unsolvable-handoff | skill | 0% [0%, 43%] | 12.8 | 0.2960 | 0.2 | 0 | 60% |

| task | verdict | pass delta | loops delta | cost delta |
|---|---|---|---|---|
| add-slugify | loss | +0pp | +0.2 | +0.1 |
| conditional-pivot | tie | +0pp | +0 | +0 |
| constraint-drift | tie | +0pp | +0 | +0 |
| done-means-ran | tie | +0pp | +0 | +0 |
| edge-case-mentioned | tie | +0pp | +0 | +0 |
| feature-batch | tie | +0pp | +0 | +0 |
| fix-error-swallow | tie | +0pp | +0 | +0 |
| fix-off-by-one | tie | +0pp | +0 | 0 |
| fix-one-of-many | tie | +0pp | +0 | +0 |
| haystack-bug | tie | +0pp | +0 | +0 |
| loop-trap | tie | +0pp | +0 | +0 |
| minimal-diff-fix | tie | +0pp | +0 | +0 |
| no-touch-workaround | tie | +0pp | +0 | +0 |
| plan-then-build | tie | +0pp | +0 | +0 |
| preserve-behavior-refactor | tie | +0pp | +0 | +0 |
| stated-assumption | tie | +0pp | +0 | +0 |
| unsolvable-handoff | loss | +0pp | +0.2 | +0 |

Pooled pass rate delta (solvable tasks, skill minus control): +0pp. Per-task W/L/T: 0/2/15. Discipline deltas (skill minus control, per-task average): loops +0, turns +0.8, cost +0, files outside task +0. Confidence intervals are Wilson 95%; with small trial counts, overlapping intervals mean the difference is not established.

Ship bar (pass delta >= 15pp, or loop reduction >= 30% with no pass regression): MET. met: pass delta +0pp (bar 15pp) below bar, but discipline improved with no pass regression (loops down -100%, expectation gap closed 50%; bar 30%)
