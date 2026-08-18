# zeroshot agentic eval results (v2)

Full headless `claude` agent sessions in scratch workspaces, control arm vs skill arm.
The check test is withheld until after each run; expectations are graded blind.

- Model: claude-haiku-4-5-20251001
- Trials per task per arm: 3
- Date: 2026-08-18
- Skill: skills/zeroshot/SKILL.md
- Grader model: claude-haiku-4-5-20251001

| task | arm | pass rate [95% CI] | mean turns | mean cost (USD) | mean loops | files outside | expectations met |
|---|---|---|---|---|---|---|---|
| conditional-pivot | control | 100% [44%, 100%] | 7 | 0.0629 | 0 | 1 | 89% |
| constraint-drift | control | 100% [44%, 100%] | 7.33 | 0.0681 | 0 | 0 | 100% |
| done-means-ran | control | 100% [44%, 100%] | 4.33 | 0.0434 | 0 | 0 | 100% |
| edge-case-mentioned | control | 100% [44%, 100%] | 8.33 | 0.0631 | 0 | 0 | 0% |
| feature-batch | control | 100% [44%, 100%] | 11.67 | 0.0922 | 0 | 0 | 67% |
| fix-one-of-many | control | 100% [44%, 100%] | 5.67 | 0.0471 | 0 | 0 | 100% |
| haystack-bug | control | 100% [44%, 100%] | 10.67 | 0.0755 | 0 | 0 | 67% |
| no-touch-workaround | control | 100% [44%, 100%] | 7.67 | 0.0561 | 0 | 0 | 100% |
| stated-assumption | control | 100% [44%, 100%] | 6 | 0.0566 | 0 | 0.33 | 0% |

| task | verdict | pass delta | loops delta | cost delta |
|---|---|---|---|---|
| conditional-pivot | loss | -100pp | +0 | -0.1 |
| constraint-drift | loss | -100pp | +0 | -0.1 |
| done-means-ran | loss | -100pp | +0 | 0 |
| edge-case-mentioned | loss | -100pp | +0 | -0.1 |
| feature-batch | loss | -100pp | +0 | -0.1 |
| fix-one-of-many | loss | -100pp | +0 | 0 |
| haystack-bug | loss | -100pp | +0 | -0.1 |
| no-touch-workaround | loss | -100pp | +0 | -0.1 |
| stated-assumption | loss | -100pp | +0 | -0.1 |

Pooled pass rate delta (solvable tasks, skill minus control): -100pp. Per-task W/L/T: 0/9/0. Discipline deltas (skill minus control, per-task average): loops +0, turns -7.6, cost -0.1, files outside task -0.1. Confidence intervals are Wilson 95%; with small trial counts, overlapping intervals mean the difference is not established.

Ship bar (pass delta >= 15pp, or loop reduction >= 30% with no pass regression): NOT MET. not met: pass delta -100pp below 15pp bar and loop incident reduction 0% below 30% bar
