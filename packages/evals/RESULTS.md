# zeroshot eval results

## Published runs

### 2026-08-18 run 3, claude-haiku-4-5-20251001, 17 tasks x 2 arms x 5 trials

**Ship bar: NOT MET.** Skill v1.2.0 on the expanded 17-task suite with the
pre-registered expectation-gap metric: pass delta -1.2pp (one recurring
skill-arm failure on plan-then-build), expectation gap closure +6.1% (bar:
30%), win/loss/tie 0/1/16, overhead +0.6 turns per run (down from +1.35 in
run 2). Full data: [benchmark.json](published/2026-08-18-haiku45-run3/benchmark.json)
and [REPORT.md](published/2026-08-18-haiku45-run3/REPORT.md).

Honest read: even action-shaped system-prompt rules bind weakly on this model
during agentic work. The two rules written directly against measured 0%
baseline gaps moved compliance by at most one run in five (assumption-stated
0/5 to 1/5; edge-case-tested went 2/5 to 1/5). Two genuine small wins
(frozen-file discipline 3/5 to 5/5, evidence-before-edit 4/5 to 5/5) do not
clear the bar. Conclusion after three runs: a generic discipline preset has
hit its measurable ceiling on claude-haiku-4-5. Open paths: test whether a
stronger model follows skill instructions more faithfully (Sonnet run), or
reposition skills around domain-specific behavior models do not already have.

### 2026-08-18 run 2, claude-haiku-4-5-20251001, 8 tasks x 2 arms x 5 trials

**Ship bar: NOT MET. The skill is currently a net negative on this suite and
model.** Pass delta -2.9pp; win/loss/tie 0/2/6; the skill added +1.35 turns
and about +21% cost per run with no measurable behavioral gain. First valid
run (skill injection canary-verified). Full data:
[benchmark.json](published/2026-08-18-haiku45-run2/benchmark.json) and
[REPORT.md](published/2026-08-18-haiku45-run2/REPORT.md).

Honest read: the baseline model already exhibits the behaviors the skill
teaches (5/5 bounded attempts, 5/5 no fabrication, zero loop incidents even in
the hardened trap), so the skill's generic discipline buys nothing here and
its overhead is real. On plan-then-build the skill arm caused the only
failure. Open hypotheses for iteration, untested: longer-horizon tasks where
drift accumulates, different models, and skill content that encodes behaviors
models do not already have. No improvement claim; per the ship bar, iterate.

### 2026-08-18 run 1, claude-haiku-4-5-20251001 - INVALIDATED

**This run measured nothing and is kept only for transparency.** A harness bug
meant the skill arm never received the skill: the executor installed SKILL.md
as a workspace file but excluded the Skill tool from the agent's allowed
tools, so the skill was never activated and never entered context. Transcript
audit confirmed zero skill activations across all 40 skill-arm runs. Both arms
were effectively control. The apparent +2.9pp delta, one win, and one loss
were noise. Data preserved unchanged in
[published/2026-08-18-haiku45/](published/2026-08-18-haiku45/).

The fix: the executor now injects the skill body via the agent's system prompt
(verified with an action canary present in the skill arm and absent from
control), so arms differ only by that content. Run 2 with the fixed executor,
skill v1.1.0, and a hardened loop trap is the first valid benchmark.

## Policy

Results land here only from real benchmark runs: named model version, 5+ trials
per arm, all runs included. Dry runs never land here. Improvement claims
require the ship bar: pass-rate delta of at least +15 points, or a held pass
rate with 30%+ improvement on discipline metrics, across 5+ runs per arm.
Until a run clears it: no chart, no claim.
