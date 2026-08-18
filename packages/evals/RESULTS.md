# zeroshot eval results

## Published runs

### 2026-08-18, claude-haiku-4-5-20251001, 8 tasks x 2 arms x 5 trials

**Ship bar: NOT MET.** Pooled pass-rate delta +2.9pp (bar: +15pp); loop-incident
reduction 0% (bar: 30%). Per-task win/loss/tie: 1/1/6. Full data:
[benchmark.json](published/2026-08-18-haiku45/benchmark.json) and
[REPORT.md](published/2026-08-18-haiku45/REPORT.md).

Honest read: the baseline model already aces 6 of 8 tasks (ceiling effect), the
loop trap failed to induce looping in any of the 10 baseline runs, and the one
win (plan-then-build, +20pp) and one loss (unsolvable-handoff, -13pp on blind
expectation grading) are both within noise at n=5. Per the protocol this means:
no improvement claim, iterate the tasks and the skill, re-run.

Next iteration targets: harder trap tasks that actually trap the baseline, a
larger suite (15-30 tasks), a Sonnet 5 run, and skill revisions for handoff
quality (the blind grader scored the skill arm lower on the unsolvable task).

## Policy

Results land here only from real benchmark runs: named model version, 5+ trials
per arm, all runs included. Dry runs never land here. Improvement claims
require the ship bar: pass-rate delta of at least +15 points, or a held pass
rate with 30%+ improvement on discipline metrics, across 5+ runs per arm.
Until a run clears it: no chart, no claim.
