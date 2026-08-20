# Discarded run: every command was denied

Ten clean-room sessions, `claude-sonnet-5`, 2026-08-20. **These numbers are not
a result and must never be quoted as one.** They are published because the
project's rule is that discarded runs get published with their reason, and a
rule that only applies to runs you like is not a rule.

## What it was actually measuring

The permission system, not the agent.

Every attempt to run a check script was denied. The shell tool on Windows in the
Claude Code version in use is `PowerShell`, and the harness allowlisted only
`Bash`, so no command in any session executed. The transcripts show the agent
asking a human who was not there for approval, turn after turn, and then working
around it by reasoning about code it could not run.

Read `audit/pluralize-feature-control-1.md` for the clearest example: the agent
explains three times that `node.exe` "requires approval", offers to have the
user run it instead, tries a batch-file workaround, and removes the workaround
again.

## Why it was dangerous rather than merely broken

The aggregate looked **perfect**. Task completion was 100% in every session,
because the agent's edits were correct even though it could never verify them.
Nothing in the summary said the agent had been unable to execute a single
command. It was caught by reading a transcript, which is the entire reason the
harness now writes plain-text digests of every session.

Two consequences, both live in the harness now:

- `probe.mjs` parses `permission_denials` per turn, stores them in every trial
  file, prints them on the run line, and warns in the summary. A denied session
  measures the permission system and now says so.
- `lib.mjs` allowlists both spellings of the shell tool, because it is
  `PowerShell` on Windows and `Bash` elsewhere.

## What is here

`trials/` and `audit/` for all ten sessions, plus `probe.json`. The transcripts
themselves are not committed (4.3 MB of JSONL); the audit digests contain every
word the agent said, which is what the audit reads.

The corresponding good run is
[`../2026-08-20-sonnet5-phase0/`](../2026-08-20-sonnet5-phase0/), which used the
same tasks with the shell tool allowlisted.
