#!/usr/bin/env node
// zeroshot evals - probe task verifier.
// Proves a probe task is a real, checkable piece of work before it is ever run
// against an agent: the withheld check must fail on the starting files and pass
// on the reference solution, and the schema must match PROBE-SPEC.md.
//
//   node verify-task.mjs skills/caffeine/tasks/<id>/task.json
//
// Exit 0 means the task is mechanically sound. It says nothing about whether
// the bait is naturalistic; that is the reviewer's job. Zero dependencies.

import fs from "node:fs";
import path from "node:path";
import { materialize, applyCheck, writeInto, normRel } from "./lib.mjs";

const target = process.argv[2];
if (!target) { console.error("usage: node verify-task.mjs <path-to-task.json>"); process.exit(2); }

const taskPath = path.resolve(target);
const problems = [];
const note = (ok, msg) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`); if (!ok) problems.push(msg); };

let task;
try { task = JSON.parse(fs.readFileSync(taskPath, "utf8")); }
catch (e) { console.error(`cannot parse ${taskPath}: ${e.message}`); process.exit(2); }

console.log(`verifying ${path.basename(path.dirname(taskPath))}/task.json`);

// --- schema -----------------------------------------------------------------
const dirName = path.basename(path.dirname(taskPath));
note(task.id === dirName, `id "${task.id}" matches directory "${dirName}"`);
note(typeof task.title === "string" && task.title.length > 0, "title present");
note(Array.isArray(task.turns) && task.turns.length >= 3 && task.turns.length <= 5,
  `turns is an array of 3-5 messages (got ${Array.isArray(task.turns) ? task.turns.length : typeof task.turns})`);
note(task.turns && task.turns.every((t) => typeof t === "string" && t.trim().length > 40),
  "every turn is a non-trivial string");
note(task.bait && typeof task.bait.profile === "string" && Array.isArray(task.bait.signals) && task.bait.signals.length > 0,
  "bait.profile and bait.signals present");
note(task.files && Object.keys(task.files).length > 0, "files present");
note(task.check && typeof task.check.test_file === "string" && typeof task.check.test_content === "string",
  "check.test_file and check.test_content present");
note(task.reference_solution && Object.keys(task.reference_solution).length > 0, "reference_solution present");

// The bait must never instruct the agent about wellbeing; rule 3 of the spec.
const turnText = (task.turns || []).join("\n").toLowerCase();
const instructionish = [
  /\b(don'?t|do not|never|please don'?t)\b[^.]{0,60}\b(comment|mention|remind|tell|suggest|nag)\b/,
  /\b(remind|tell) me to (sleep|rest|take a break|stop)\b/,
  /\btake care of (me|my)\b/,
  /\bcheck (on )?my (wellbeing|health|energy)\b/,
];
note(!instructionish.some((re) => re.test(turnText)),
  "no turn instructs the agent about the user's wellbeing (bait must be incidental)");

// Test names carry subtask order, which is how effort decay is scored.
const testNames = [...String(task.check.test_content || "").matchAll(/test\(\s*(['"`])(.*?)\1/g)].map((m) => m[2]);
note(testNames.length >= 3, `check has 3+ tests, one per subtask (got ${testNames.length})`);
const badNames = testNames.filter((n) => !/^s\d+\b/.test(n));
note(badNames.length === 0, `every test name starts with s<N> (offenders: ${badNames.join(", ") || "none"})`);
const nums = testNames.map((n) => parseInt(n.match(/^s(\d+)/)?.[1] ?? "0", 10));
note(nums.length > 0 && nums.every((v, i) => i === 0 || v >= nums[i - 1]), "subtask numbers are non-decreasing in file order");

// The check must not be reachable from the workspace the agent sees.
note(!Object.keys(task.files || {}).some((f) => normRel(f) === normRel(task.check.test_file)),
  "the withheld check file is not shipped in files");

if (problems.length) { console.error(`\n${problems.length} schema problem(s); not running node`); process.exit(1); }

// --- fail on start, pass on reference ---------------------------------------
async function runAgainst(overlay) {
  const dir = materialize(task.files);
  try {
    for (const [rel, content] of Object.entries(overlay || {})) writeInto(dir, normRel(rel), content);
    return await applyCheck(dir, task.check);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const before = await runAgainst(null);
if (!before.tests.length) {
  console.error(`\ncheck produced no TAP results on the starting files; the test file is probably broken:\n${(before.stderr || before.stdout).slice(0, 800)}`);
  process.exit(1);
}
const passedAtStart = before.tests.filter((t) => t.pass);
note(passedAtStart.length === 0,
  `all ${before.tests.length} tests fail on the starting files (passing early: ${passedAtStart.map((t) => t.name).join(", ") || "none"})`);

const after = await runAgainst(task.reference_solution);
const failedOnRef = after.tests.filter((t) => !t.pass);
note(after.tests.length === before.tests.length && failedOnRef.length === 0,
  `all ${after.tests.length} tests pass on the reference solution (failing: ${failedOnRef.map((t) => t.name).join(", ") || "none"})`);
if (failedOnRef.length) console.error((after.stdout || "").slice(0, 1200));

console.log(problems.length ? `\n${problems.length} problem(s)` : "\ntask verified");
process.exit(problems.length ? 1 : 0);
