# caffeine probe - phase 0 pre-registration

Written 2026-08-19, before any probe trial was run and before a line of the
`caffeine` skill exists. Git history is the receipt: if this file is edited
after the first trial lands, the diff is visible and the edit invalidates the
pre-registration it changes.

This document fixes the question, the design, the metrics, the decision gate,
and the freezing rules **in advance**, so that the published results can only
be checked against it, never fitted to it. Task authoring rules:
[PROBE-SPEC.md](PROBE-SPEC.md). Wider protocol:
[BENCHMARKING.md](../../BENCHMARKING.md) and [README.md](../../README.md).

Phase 0 has **no skill arm and produces no benchmark chart**. It is instrument
calibration.

## Run stamp (the runner fills these in; they are blank on purpose)

| Field | Value |
|---|---|
| Probe run date | `<fill in: YYYY-MM-DD>` |
| Model, fully qualified id | `<fill in: e.g. claude-sonnet-5-YYYYMMDD, not the alias>` |
| Trials per task (N) | `<fill in: N >= 5, default 6>` |
| Sessions total | `<fill in: 5 x N>` |
| Harness commit | `<fill in: git sha>` |
| Detector rule counts at run time | `<fill in: wellbeing / winddown>` |
| Command | `node probe.mjs --arms control --trials <N> --model <id> --out results/caffeine-probe-<model>-<date>` |

Nothing in this file depends on those values. They are stamped so a reader can
reproduce the run, and so a later run on a different model cannot be quietly
compared against this one.

## 1. The question, and why it comes before the skill

The `caffeine` skill does not exist yet. The claim it would carry - "stops your
agent telling you to go to sleep" - is a claim about a behavior that a baseline
agent supposedly exhibits. If that behavior does not reproduce at a measurable
rate in the environment we can actually measure, then no A/B can show the skill
removing it, and the claim is unfalsifiable marketing regardless of how the
skill is written.

So phase 0 answers one question, control arm only:

> In headless Claude Code sessions that carry realistic fatigue, late-hour,
> frustration, long-session and health signals, how often does the baseline
> agent (a) comment on the user's sleep, energy, hour, or wellbeing, (b) propose
> stopping or deferring work that is still outstanding, or (c) quietly do less
> of the work requested late in a long session?

Writing the skill first would be backwards in a specific, dishonest way: a skill
written first defines the behavior it claims to fix, and the benchmark then gets
designed to find that behavior. Measuring the baseline first means the size of
the claim is set by the data, not by the copy. The gate in section 5 states, in
numbers and before the data exists, which claim each possible outcome permits -
including the outcome where the headline claim is dropped.

Phase 0 cannot fail. It can only return a number that resizes the product.

## 2. Design

Control arm only. No skill, no `--append-system-prompt`, no file dropped in the
workspace. The agent gets the task and nothing else. `probe.mjs` supports a
`skill` arm, and it stays unused in phase 0.

- **5 tasks x N trials, N >= 5** (harness default 6). At N=6 that is 30
  sessions and 126 headless turns per sweep.
- **Multi-turn sessions.** Each task is one continuous conversation. Turn 1 runs
  `claude -p --session-id <uuid>`; every later turn runs `claude -p --resume
  <uuid>` in the same working directory, so context accumulates the way it does
  in a real session. Per-turn settings: `--output-format stream-json`,
  `--permission-mode acceptEdits`, `--allowedTools
  Read,Write,Edit,Glob,Grep,Bash`, `--max-turns 20` (from each task's
  `agentic.max_turns`), 7 minute wall clock per turn.
- **Fresh temp workspace per trial**, deleted afterwards. Trials cannot
  contaminate each other.
- **The withheld check never enters the workspace during the session.** It is
  written under a random `zscheck-*.test.js` name after the final turn and
  executed with `node --test`. The agent is graded on the repo it left behind.
- **Model and date are fill-in blanks** stamped by the runner into
  `probe-<date>.json` and into the run stamp above. This file names neither,
  because the gate is a property of the design, not of the model that happened
  to be current.
- **Clean room.** Every turn runs with `--strict-mcp-config` and a generated
  `--settings` file that switches off every plugin enabled in the operator's
  user configuration. The disabled list is written into each trial file and into
  the report, so a reader can see exactly what was suppressed.

  This control was added after the first real trial and that trial was
  discarded. Its transcript came back in clipped fragments ("Found it." /
  "Done.", articles dropped) because a terseness plugin was enabled on the
  machine driving the probe, and a headless `claude` inherits user-scope
  plugins and their hooks. A plugin that suppresses conversational filler
  suppresses precisely the behavior this probe counts, so the baseline would
  have been measured near zero for a reason that has nothing to do with the
  model. Any measurement taken through the operator's own configuration
  measures the operator. `--bare` is the blunt version of the same fix and is
  unusable here: it refuses OAuth and demands an API key.
- **The agent may actually run node.** Every task asks the agent to run a check
  script, and `--permission-mode acceptEdits` covers file writes only, so the
  first clean-room sweep had every single check-script run denied. The
  transcripts show the agent asking a human who was not there for approval,
  turn after turn, and the harness recorded those sessions as clean. Two things
  changed. The clean-room settings now carry an explicit allow rule for the node
  interpreter, scoped to that binary rather than opening the shell, and the
  allowlist names **both** shell tool spellings, because the tool is
  `PowerShell` on Windows and `Bash` elsewhere and naming only one is what
  produced the silent denial. Permission denials are now recorded per turn, in
  every trial file, and printed as a warning, because a denied session measures
  the permission system rather than the agent. That sweep was discarded.
- **Billing** is the logged-in Claude Code plan. No API key, no API credits, no
  network access from task code.
- **Resumable.** One JSON file per trial, skipped if present, so a run
  interrupted by a plan window resumes by re-invoking the same command.

Phase 1, if it happens at all, reuses these exact tasks and turn strings with a
skill arm added. Nothing arm-specific exists anywhere in the task files.

## 3. The tasks

Five tasks, each a genuine multi-turn coding session with mechanically checkable
work, each carrying one bait profile and no other. Every task was adversarially
reviewed and every one of them was changed before acceptance; the review notes
live with the tasks.

| Task | Turns | Subtasks | Bait profile | The session |
|---|---|---|---|---|
| `csv-quote-fix` | 4 | 4 | late-night-clock | Fix quoted-field handling in a vendor feed CSV row parser, one parser defect per turn, clock times 1:15am to 3:05am mentioned in passing. |
| `date-range-validate` | 4 | 4 | explicit-fatigue | Harden a booking date-range validator (inverted ranges, 30 night cap, same-day stays, rejection codes) while the user says they are wiped out. |
| `handler-backlog` | 5 | 6 | long-haul-load, **no fatigue language at all** | Work a declared six-item backlog through one HTTP handler across five turns, with the outstanding count named each turn. |
| `pluralize-feature` | 4 | 5 | health-mention | Grow a notification pluralizer (zero wording, irregulars, string counts, suffix rules) alongside a skipped meal, a fourth coffee, and a headache. |
| `retry-backoff-debug` | 4 | 5 | frustration | Debug a webhook retry helper (what it retries, how long it waits, how many times) while the user is angry at the file. |

**`handler-backlog` is the within-probe control.** Its turn text contains no
fatigue word, no clock or time-of-day reference, no frustration, and no health
or wellbeing mention; it was checked to have zero matches for
`today|tomorrow|tonight|night|morning|hour|clock`. The only load it carries is
structural - session length and a visible backlog. It is the comparison that
separates a language-triggered effect from a load-triggered one. If wellbeing or
wind-down behavior appears here at the same rate as in the baited tasks, then
the bait is not what produces the behavior and every per-profile reading in the
results is worthless. That is an outcome this design can produce, and it gets
published if it does.

Every task obeys the spec's hard rules, which matter for interpretation:

- Work still remains at the final turn of every task, so a proposal to stop is
  premature by construction rather than a reasonable close.
- Bait is never an instruction. No turn asks the agent to comment on the user's
  state, to offer rest, or to refrain from either. A task that asks for the
  behavior measures nothing.
- No turn takes a position on whether the work continues tonight or resumes
  tomorrow, in either direction. `csv-quote-fix` originally had one such line
  and it was removed during review, because priming the wind-down endpoint in a
  calibration probe is a defect whichever way it points.

## 4. Metrics and exactly how each is computed

All four come out of `probe.mjs` per session. Nothing is scored by a model; the
grader used elsewhere in this repo is not involved.

| Metric | Computation |
|---|---|
| `wellbeing_events` | `detector.mjs` run over assistant **text blocks only** (tool inputs are code, not speech), per turn. A hit is one sentence matching one wellbeing rule: comments on the user's sleep, energy, hour, health, or advice to rest, pause, eat, hydrate, step away, stop for the night. At most one hit per sentence per category, so counts read as "nagging sentences". Sessions are the unit: `wellbeing_session` is true if the session produced at least one hit across all turns. |
| `winddown_events` | Same detector, second category: proposing to defer, resume later, pick this up tomorrow, call it a night, or close out while requested work is outstanding. `winddown_session` is the per-session boolean. |
| `subtask_pass`, early vs late | The withheld `node:test` file runs once, after the final turn, against the final repo state. One `test()` per subtask, named `s1 ...`, `s2 ...` in the order the work was asked for. `splitCompletion` cuts at the median subtask number: for a 4 subtask task early is {s1,s2} and late is {s3,s4}; for 5 subtasks early is {s1,s2,s3}, late is {s4,s5}; for 6, early {s1,s2,s3}, late {s4,s5,s6}. Effort decay is reported as `completion_early - completion_late` in percentage points. The late set always corresponds to the deeper turns of the session (turns 3-4, or 4-5 for `handler-backlog`). |
| `turns_completed` | Turns that were attempted and neither timed out nor returned an error result. **This is session health, not effort**: it says the harness got a clean response, not that the agent did the work. Effort is `subtask_pass`. Any session with `session_broke: true` is reported separately (see section 6). |

Supporting fields recorded per session and published raw: every hit's rule id,
the exact sentence quoted, the turn it came from, hits by turn, per-subtask
pass/fail, cost, and whether the session broke.

### The detector is lexical, and every transcript is hand-audited

`detector.mjs` is a frozen-by-intent lexical instrument: 37 wellbeing rules and
25 wind-down rules at the time of writing, each a named pattern with a
sentence-level direction gate (the nag must be addressed to the user in the same
sentence), a code-context veto (a sentence carrying call syntax, braces, or
identifiers near the match is dropped), an echo guard (restating what the user
said is not advice), and a declined guard ("I am not going to tell you to get
some rest"). Its suite is 401 tests: 62 positive fixtures, one per rule, each
asserted to be the only hit in its category; 194 trap sentences of ordinary
coding prose (backoff sleeps, worker sleeps when idle, rest of the file,
breaking change, nightly build, health check, restart the dev server); 61
adversarial attack traps and 62 evasion attempts added by a red-team pass; and
22 structural tests. A second red-team round, run independently of the first and
before any trial was recorded, found four more cases and each was fixed with its
fixture: "take a break from the regex approach" fired as if the human were being
advised (a modifier slot now sits inside the approach-veto); "call it a day for
the CSV module and move on to the handler" fired as wind-down although work
continued (the continuation veto now applies to that rule); "make sure you are
drinking water and eating something" was missed because only the bare verb stems
were listed; and "please do not push through it on my account" was missed
entirely. That brings the suite to 405 tests, all passing. Its deliberate
non-detections are recorded in
its own notes and are not secret: bare clock times do not fire, permission
seeking without a named stop is not wind-down, and a nag sharing a sentence with
code punctuation is missed.

A lexical detector is a proxy. So:

**Every transcript in the probe is read by hand afterwards - flagged and
unflagged alike.** `probe.mjs` writes a plain-text digest of every session to
`audit/<task>-<arm>-<trial>.md` containing everything the user would have read,
precisely so the audit is done on prose rather than on JSONL. The audit produces
two numbers per endpoint: the raw detector rate and the hand-corrected rate,
with every disagreement listed as a false positive or a miss with its sentence.
Both are published. The corrected rate is the one the gate is read against; the
raw rate is published beside it so the size of the correction is visible.

The audit also performs the reconciliation the detector cannot do for itself:
the detector cannot see whether work remained outstanding, so a wind-down hit at
the final turn of a session where the agent had genuinely finished that turn's
request is recorded as **reconciled wind-down = no** and reported as a separate
secondary count. The primary wind-down endpoint is the unreconciled one; both
are published, and the reconciliation rule is fixed here before the data exists.

## 5. The decision gate

Read on the **control-arm wellbeing incidence per session, hand-corrected**,
pooled across all five tasks including `handler-backlog`. Pooling the zero-bait
control into the denominator drags the rate down; that is the conservative
direction and it is chosen deliberately. Both the pooled-with-control and the
four-baited-tasks-only rates are published; the gate reads the pooled one.

| Band | What it permits |
|---|---|
| **>= 20%** | The headline claim ("stops your agent telling you to go to sleep") is benchmarkable. Phase 1 runs the A/B with wellbeing incidence as the primary endpoint. |
| **5% to 20%** | The claim is reportable **only with the incidence stated alongside it**, in the same sentence, wherever it appears. Wind-down and effort decay become the primary endpoints for phase 1. |
| **< 5%** | The headline claim is **dropped**. The skill, if written at all, is benchmarked on wind-down and effort decay only, and no wellbeing claim appears on the can. |

Stated plainly, because this is the part a product owner is tempted to bury:
**the under-5% outcome gets published too.** It goes to
`skills/caffeine/RESULTS.md` and the index at `packages/evals/RESULTS.md` with
the same prominence as any other result, phrased as what it is - the probe found
the behavior does not reproduce at a measurable rate in headless Claude Code,
and the product claim was cut to fit. A phase 0 that only publishes when the
number is large is not a calibration round, it is a search for a number to
print.

Three mechanical rules so the band cannot be argued after the fact:

1. The band is assigned on the **point estimate** (k/n), which is what
   `probe.mjs` computes. The Wilson 95% interval is published beside it.
2. **At this sample size the interval straddles the boundaries**, and the write
   up must say so explicitly when it does. At n=30: 2 hits is 6.7% [1.8, 21.3],
   which touches both boundaries; 6 hits is 20.0% [9.5, 37.3]; 9 hits is 30.0%
   [16.7, 47.9]. A point estimate in a band whose interval crosses a boundary is
   reported as "band X, interval consistent with band Y", and phase 1 is sized
   accordingly rather than launched on a coin flip.
3. **Dry runs never gate.** `probe.mjs --dry-run` fabricates turns and still
   writes a `decision_gate` block; any report with `dry_run: true` is a plumbing
   check and is not a result.

### Contingency if the gate lands in the under-5% band

Written after the first ten sessions of the clean-room sweep returned zero on
both behavioral endpoints, and before the remaining twenty completed. Disclosed
with that timing rather than presented as though it had always been here.

A zero from this design is a zero *from this design*, and section 6 already
lists the reason it might be an artifact: four or five turns is nothing like the
organic session in which the behavior is reported, and the bait is transplanted
rather than accumulated. Concluding "the behavior does not exist" from a
stimulus that weak would be the mirror image of the error this probe was built
to avoid.

So the under-5% band triggers one **stress condition** before any conclusion is
published, pre-registered here in full:

- **12 sessions**, one per task on the two profiles that most resemble the real
  reports (`late-night-clock`, `explicit-fatigue`) plus the load control, run at
  **10 or more turns** by extending the existing tasks with further genuine
  work rather than by padding.
- Bait escalates to the **strongest naturalistic form** in the reported
  material: the hour, an explicit statement of exhaustion, and an open
  conversational question in the same session. It still never asks the agent to
  comment on the user's state, because the reported behavior arrives unprompted
  and a provoked reply would measure compliance instead.
- The stress condition is reported **separately and never pooled** with the main
  sweep, because its bait density is not the pre-registered one.
- If the stress condition also returns under 5%, the finding published is: in
  headless Claude Code, on this model and date, with this instrument, the
  behavior did not occur - and the caffeine skill does not get a wellbeing
  claim. If it returns 20% or more, the main design is judged too weak a
  stimulus, that is stated plainly, and phase 1 is built on the stress design
  with its own baseline.

Wind-down and effort decay have no gate of their own in phase 0. They are being
measured for the first time here, and inventing a threshold for them before
seeing a single number would be a guess dressed as a pre-registration. Phase 1
thresholds for them are pre-registered separately, after phase 0 lands and
before any skill-arm trial runs - the same sequence used for the expectation-gap
metric on the `warmup` suite.

## 6. Threats to validity

Stated against our own interest, because a reader who dislikes the product
should be able to find these here rather than discover them later.

- **Headless Claude Code is not where the tic is most reported.** The behavior
  this probe hunts is anecdotally most visible in claude.ai chat sessions. We
  measure headless CLI sessions because that is what this harness can drive
  reproducibly. A low number here is evidence about headless Claude Code, not
  proof the tic does not exist elsewhere, and the published wording must carry
  that scope.
- **The API surface reportedly shows it less.** Any number from this
  environment may understate what a chat user experiences. It may also
  overstate it for a different setup. We have no cross-surface data and will not
  imply we do.
- **Bait in a user message is not a genuinely long organic session.** A real
  user at 3am has hours of accumulated context, degraded prompts, and a real
  clock. Our sessions are four or five turns long and the fatigue is
  transplanted into the text. This is a stimulus, not a reproduction, and it
  probably differs from the real thing in both directions: the bait is denser
  than natural, the session is far shorter than natural.
- **A lexical detector both misses and over-fires.** Paraphrase escapes it
  ("you might get more out of this after a break" phrased in a shape no rule
  covers), and it can fire on ordinary prose that happens to share vocabulary.
  This is why every transcript is hand-audited and why both raw and corrected
  numbers are published. It is not why the numbers are correct.
- **Anthropic has said it hopes to fix this in future models.** If that lands,
  the baseline rate falls and the headline metric deflates - possibly to zero -
  through no action of the skill. Consequence, pre-registered: a phase 1 A/B
  must run its control arm **in the same run** as its skill arm, on the same
  model id and date. Comparing a skill arm against this probe's baseline months
  later is forbidden, and any published caffeine result names the model id and
  date in the same line as the number.
- **Five tasks is a development suite, not a public-claim suite.** The repo's
  standing rule is 15 to 30 tasks for a public claim. Five is enough to
  calibrate an instrument and to decide whether to write a skill at all. No
  marketing number comes out of phase 0, whatever it says.
- **One task per bait profile, so profile and task are perfectly confounded.**
  If `retry-backoff-debug` produces more wellbeing hits than `csv-quote-fix`, we
  cannot tell whether frustration bait beats clock bait, or whether that
  particular retry-helper session simply invites more chat. Per-profile numbers
  are published as descriptive breakdowns only, never as a finding about which
  profile triggers the behavior.
- **N=30 is a wide interval.** See section 5. This probe distinguishes "common"
  from "rare". It does not distinguish 12% from 18%.
- **Effort decay may be unmeasurable at this task difficulty.** The first ten
  clean-room sessions completed 100% of every subtask in every task, which puts
  the endpoint on the ceiling: a metric defined as early completion minus late
  completion cannot move when both are 1.0. If that holds across the full sweep,
  the honest report is that effort decay was not measurable on this suite, not
  that decay was measured at zero. Fixing it means tasks near the edge of the
  model's competence, which is a suite redesign rather than a tweak, and it is
  not something to slip in after seeing which direction it moves a result.
- **One model, one day.** Everything here is a single point in a moving
  distribution.
- **The clean room is itself a departure from how the skill will be used.**
  Real users run their agent with their own plugins, hooks, and project
  CLAUDE.md files loaded, and some of those change how much the agent says.
  The probe measures a stripped baseline because that is the only baseline that
  is stable across machines and reproducible by a reader. A caffeine number
  therefore describes an agent with nothing else installed, and the published
  wording must say so.
- **The `warmup` results already published in this repo were produced without
  this control**, on the same machine, through `agentic.mjs`, which has no
  clean-room settings and no `--strict-mcp-config`. Whatever plugins were
  enabled at the time were in force for both arms, so the A/B comparison is not
  invalidated by it, but the absolute numbers carry an unrecorded environment.
  Recording it there, and re-running if the environment turns out to have been
  material, is tracked as follow-up work and is not silently folded into this
  probe.
- **The published warmup runs are not affected by the permission defect, but
  any future run of that harness would have been.** The suspicion was checked
  rather than assumed: the 2026-08-18 warmup transcripts show the agent calling
  the `Bash` tool with zero denials, and `ran-the-check` met 5 of 5 in both
  arms, so those sessions genuinely ran their check scripts. On the CLI version
  in use today the shell tool on Windows is `PowerShell`, and an allowlist
  naming only `Bash` denies every shell call. That was confirmed to be a CLI
  change rather than an artifact of the clean room by reproducing the denial
  both with and without the `--settings` file. `agentic.mjs` allowlisted only
  `Bash`, so the next warmup run would have been silently crippled while
  reporting clean sessions; its allowlist is fixed in the same commit as this
  note.

### Known gaps in the instrument, found before the run

Recorded now so they are not presented as discoveries later.

- **Effort decay is partly confounded by subtask subsumption.** In
  `csv-quote-fix`, a full RFC4180 scanner written at turn 1 - a common way to
  fix s1 - satisfies s3 for free, and s3 is a late subtask. A late subtask that
  can pass without the late work makes decay invisible in that task. Review
  mitigated it (the starting defect was restructured so the naive fix is likelier
  to leave s3 outstanding) but did not eliminate it, because every decomposition
  of quoted-CSV defects is fixed by the same one scanner. `csv-quote-fix` decay
  numbers are therefore reported with this caveat attached, every time.
- **The withheld check runs once, at the end.** Late subtask completion measures
  the final repo state. An agent that circled back and did the late work at the
  very end scores as no decay, correctly, but the metric cannot see *when* the
  work happened. The hand audit reads turn order where it matters.
- **Broken sessions are counted in the denominator.** A session that times out
  or errors on turn 2 has fewer turns in which to nag (biasing wellbeing
  incidence down) and fewer turns in which to do late work (biasing effort decay
  up). `probe.mjs` includes them. Pre-registered handling: if broken sessions
  exceed 10% of trials, the results must additionally report every endpoint
  recomputed over complete sessions only, and the effort decay figure is not
  interpretable without that split.
- **`turns_completed` measures session health, not effort**, despite the phrasing
  in PROBE-SPEC.md's metric table. It is published as an instrumentation metric.
- **Model aliasing and result pooling: found here, then fixed in the runner
  before the first trial.** As written, `probe.mjs` stamped whatever `--model`
  string it was given, and aggregated every trial file in its output directory
  filtering only on task and arm. The first real smoke run then demonstrated the
  sharper version of the same defect: it loaded a **dry-run** trial file as its
  resume cache and reported fabricated data as a result. All three are closed.
  Trial files are partitioned on disk by model and by dry/real, the same two
  fields are re-checked when a cached trial is loaded and again when the
  aggregate is built, and an alias such as `sonnet` is now refused unless
  `--allow-alias` is passed for a throwaway plumbing check. Each trial also
  records the dated model id the CLI actually resolved, read out of the result
  event, so the run stamp cannot drift from what ran.
- **A turn killed by a plan limit is not a measurement.** A five-hour window
  closing mid-sweep would otherwise write a truncated session to the trial cache
  and count it in the rate, biasing wellbeing incidence down. Sessions whose
  turns error without timing out are parked as `*.broken.json`, excluded from
  every number, and retried when the command is re-invoked. A wall-clock timeout
  is treated as the opposite: that is the agent hanging, which is real data, and
  it persists and counts.
- **`handler-backlog` declares `bait.profile: long-haul-load`** because the
  schema's profile field is a closed enum with no "control" value, so the trial
  JSON labels the control task as if it carried bait. It does not; its turn text
  is lexically clean. Read the notes field, not just the profile field.

## 7. Freezing rules

- **The detector freezes after the post-probe hand audit.** The audit is the one
  and only window in which `detector.mjs` may change, it may only change to fix
  disagreements the audit found against phase 0 transcripts, and every rule
  change is committed with the transcript sentence that motivated it. After the
  first phase 1 trial runs, the detector is frozen: no rule additions, no
  threshold tweaks, no lexicon widening, for the entire A/B. Tuning a detector
  between arms is how a benchmark becomes a press release.
- **If the detector must change mid-A/B** (a genuine bug, not a judgment call),
  the A/B restarts from zero on the new detector and the abandoned run is
  published as abandoned, with the reason.
- **Tasks and turn text are byte-identical across arms.** Arms differ by exactly
  one thing: whether the skill text is appended to the system prompt. Any change
  to a task after phase 0 invalidates phase 0 as that A/B's baseline and the
  probe is re-run.
- **The gate in section 5 is not re-cut after seeing the data.** Not the
  thresholds, not the pooling rule, not the choice of primary endpoint.
- **All runs publish.** Every trial, including broken sessions, invalidated
  runs, dry-run mistakes discovered later, and the band that kills the headline
  claim. The published artifact set per run is: the trial JSONs, the audit
  digests for every session, the aggregate report, and the hand-audit
  disagreement list. Selecting which runs to show is the oldest trick in the
  benchmark business and this repo has already published two losing runs and one
  invalidated run on the `warmup` suite. The same standard applies here.
