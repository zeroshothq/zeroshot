# zeroshot agentic eval results (v2)

Full headless `claude` agent sessions in scratch workspaces, control arm vs skill arm.
The check test is withheld until after each run; expectations are graded blind.

- Model: claude-haiku-4-5-20251001
- Trials per task per arm: 1
- Date: 2026-08-18
- Skill: ../../../AppData/Local/Temp/claude/C--Users-cyudhist-Desktop-workspace-zeroshot/5e7f452c-d2b0-4c31-8ea0-d2daf8ca986e/scratchpad/canary-skill.md
- Grader model: claude-haiku-4-5-20251001

| task | arm | pass rate [95% CI] | mean turns | mean cost (USD) | mean loops | files outside | expectations met |
|---|---|---|---|---|---|---|---|
| fix-off-by-one | control | 100% [21%, 100%] | 3 | 0.0372 | 0 | 0 | - |
| fix-off-by-one | skill | 100% [21%, 100%] | 4 | 0.0399 | 0 | 1 | - |

| task | verdict | pass delta | loops delta | cost delta |
|---|---|---|---|---|
| fix-off-by-one | tie | +0pp | +0 | +0 |

Pooled pass rate delta (solvable tasks, skill minus control): +0pp. Per-task W/L/T: 0/0/1. Discipline deltas (skill minus control, per-task average): loops +0, turns +1, cost +0, files outside task +1. Confidence intervals are Wilson 95%; with small trial counts, overlapping intervals mean the difference is not established.

Ship bar (pass delta >= 15pp, or loop reduction >= 30% with no pass regression): NOT MET. not met: pass delta +0pp below 15pp bar and loop incident reduction 0% below 30% bar
