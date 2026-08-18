#!/usr/bin/env node
// zeroshot agentic evals v2 - does SKILL.md change real agent behavior, not just one-shot output?
// Each task runs as a full headless `claude` session in a scratch workspace, control vs skill arm.
// The withheld check test is applied only after the run. Zero dependencies. Zero telemetry.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const die = (msg) => { console.error(msg); process.exit(1); };

const SKILL = opt("skill", path.join(ROOT, "skills", "zeroshot", "SKILL.md"));
const TASKS_DIR = opt("tasks", path.join(HERE, "skills", "zeroshot", "tasks"));
const TRIALS = parseInt(opt("trials", "5"), 10) || 5;
const MODEL = opt("model", "haiku");
const ONLY = opt("only");
const MAX_TURNS = parseInt(opt("max-turns", "15"), 10) || 15;
const DRY = flag("dry-run");
const APPEND = flag("append"); // merge this run into an existing benchmark.json (replaces re-run tasks, keeps the rest)
const BILL_API = flag("bill-api"); // bill headless runs to ANTHROPIC_API_KEY instead of the Claude Code plan
const GRADER_MODEL = opt("grader-model", "claude-haiku-4-5-20251001");
const CONC = parseInt(opt("concurrency", "2"), 10) || 2;
const DATE = new Date().toISOString().slice(0, 10);
const ARMS = opt("arms", "control,skill").split(",").map((s) => s.trim()).filter((s) => ["control", "skill"].includes(s));
if (!ARMS.length) die("--arms must name control and/or skill");
const RUN_TIMEOUT_MS = parseInt(opt("run-timeout", "300000"), 10) || 300000;
const RESULTS_DIR = path.join(HERE, "results");
const TRANSCRIPTS_DIR = path.join(RESULTS_DIR, "transcripts");
const BENCH_JSON = path.join(RESULTS_DIR, "benchmark.json");
const RESULTS_MD = path.join(HERE, "skills", "zeroshot", "RESULTS-AGENTIC.md");

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return null;
}

function loadTasks(only = ONLY) {
  const out = [];
  for (const d of fs.readdirSync(TASKS_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const p = path.join(TASKS_DIR, d.name, "task.json");
    if (!fs.existsSync(p)) continue;
    const t = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!only || t.id === only) out.push(t);
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

const normRel = (p) => p.trim().replace(/\\/g, "/").replace(/^\.\//, "");

function writeInto(dir, rel, content) {
  const abs = path.resolve(dir, rel);
  if (!abs.startsWith(dir + path.sep)) return;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

const SKIP_DIRS = new Set([".claude", "node_modules", ".git"]);

// Snapshot of workspace files, rel path (forward slashes) -> content.
function walk(dir, base = dir, out = {}) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, d.name);
    if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name)) walk(abs, base, out); continue; }
    if (!d.isFile()) continue;
    try { out[normRel(path.relative(base, abs))] = fs.readFileSync(abs, "utf8"); } catch {}
  }
  return out;
}

// stdout of `claude --output-format stream-json` is JSONL: message/tool events, then a result object.
function parseTranscript(text) {
  const toolUses = [];
  let result = null, assistants = 0;
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s.startsWith("{")) continue;
    let e; try { e = JSON.parse(s); } catch { continue; }
    if (e.type === "result") result = e;
    else if (e.type === "assistant") {
      assistants++;
      for (const b of (e.message && e.message.content) || [])
        if (b && b.type === "tool_use") toolUses.push({ name: b.name, input: b.input });
    } else if (e.type === "tool_use") toolUses.push({ name: e.name, input: e.input });
  }
  return { toolUses, result, assistants };
}

// Consecutive tool_use events with identical name+input are treated as a loop incident.
function loopIncidents(toolUses) {
  let n = 0, prev = null;
  for (const t of toolUses) {
    const sig = `${t.name}\n${JSON.stringify(t.input ?? null)}`;
    if (sig === prev) n++;
    prev = sig;
  }
  return n;
}

// Set-based line diff of workspace after the run vs the task's starting files.
function diffLines(task, after) {
  const start = {};
  for (const [p, c] of Object.entries(task.files)) start[normRel(p)] = c;
  let n = 0;
  for (const [rel, content] of Object.entries(after)) {
    const oldSet = new Set(start[rel] === undefined ? [] : start[rel].split("\n"));
    const newSet = new Set(content.split("\n"));
    for (const l of newSet) if (!oldSet.has(l)) n++;
    for (const l of oldSet) if (!newSet.has(l)) n++;
  }
  for (const rel of Object.keys(start)) if (after[rel] === undefined) n += new Set(start[rel].split("\n")).size;
  return n;
}

function killTree(child) {
  try {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    else child.kill("SIGKILL");
  } catch {}
}

function runClaude(runDir, prompt, maxTurns, systemAppend, billKey) {
  return new Promise((resolve) => {
    // The skill arm injects SKILL.md via --append-system-prompt: guaranteed in
    // context, and no skill file in the workspace for the agent to wander into.
    // Arms differ ONLY by this system-prompt content. No shell: args pass
    // verbatim (multi-line skill text survives), claude.exe resolves from PATH.
    const argv = ["-p", prompt, "--model", MODEL, "--output-format", "stream-json", "--verbose",
      "--max-turns", String(maxTurns), "--permission-mode", "acceptEdits",
      "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash"];
    if (systemAppend) argv.push("--append-system-prompt", systemAppend);
    const env = billKey ? { ...process.env, ANTHROPIC_API_KEY: billKey } : process.env;
    const child = spawn("claude", argv, { cwd: runDir, env });
    let out = "", timedOut = false, done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve({ text: out, timedOut }); } };
    const timer = setTimeout(() => { timedOut = true; killTree(child); setTimeout(finish, 2000); }, RUN_TIMEOUT_MS);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", () => {});
    child.on("error", finish);
    child.on("close", finish);
  });
}

function runNodeTest(cwd, testRel) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ["--test", testRel], { cwd, timeout: 30000, stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}

// Withheld check: written only after the run, under a temp-unique name the agent never saw.
async function applyCheck(runDir, task) {
  const dir = path.posix.dirname(normRel(task.check.test_file));
  const rel = (dir === "." ? "" : dir + "/") + `zscheck-${crypto.randomBytes(5).toString("hex")}.test.js`;
  writeInto(runDir, rel, task.check.test_content);
  return runNodeTest(runDir, rel);
}

function fabricateTranscript(task) {
  const first = Object.keys(task.files)[0] || "README.md";
  return [
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: first } }] } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: first } }] } }),
    JSON.stringify({ type: "result", total_cost_usd: 0, num_turns: 2, usage: { output_tokens: 100 } }),
  ].join("\n") + "\n";
}

let gradeFn = null;
async function loadGrader() {
  if (!gradeFn) gradeFn = (await import(new URL("./grader.mjs", import.meta.url))).grade;
  return gradeFn;
}

async function gradeExpectations(task, transcriptText, filesAfter, key) {
  const exps = (task.agentic && task.agentic.expectations) || [];
  if (!exps.length) return null;
  if (DRY) return exps.map((e) => ({ id: e.id, met: true, evidence: "dry run" }));
  // Blindness: only expectations, transcript, and files cross this boundary. Never the skill text, never the arm.
  // The grader takes a compact listing, so pass file paths, not the {rel: content} snapshot.
  const grade = await loadGrader();
  const { results } = await grade({ apiKey: key, model: GRADER_MODEL, expectations: exps, transcriptText, filesAfter: Object.keys(filesAfter).sort() });
  return results;
}

async function runTrial(task, arm, trial, skillText, key) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "zeroshot-agentic-"));
  try {
    for (const [rel, content] of Object.entries(task.files)) writeInto(runDir, normRel(rel), content);
    const maxTurns = (task.agentic && task.agentic.max_turns) || MAX_TURNS;

    const t0 = Date.now();
    let text, timedOut;
    if (DRY) {
      for (const [rel, content] of Object.entries(task.reference_solution || {})) writeInto(runDir, normRel(rel), content);
      text = fabricateTranscript(task); timedOut = false;
    } else {
      ({ text, timedOut } = await runClaude(runDir, task.prompt, maxTurns, arm === "skill" ? skillText : null, BILL_API ? key : null));
    }
    const wall_ms = Date.now() - t0;
    fs.writeFileSync(path.join(TRANSCRIPTS_DIR, `${task.id}-${arm}-${trial}.jsonl`), text);

    const { toolUses, result, assistants } = parseTranscript(text);
    const after = walk(runDir);
    const pass = timedOut ? false : await applyCheck(runDir, task);
    const startRels = new Set(Object.keys(task.files).map(normRel));
    const outside = Object.keys(after).filter((rel) => !startRels.has(rel));

    let expectations = null;
    try { expectations = await gradeExpectations(task, text, after, key); }
    catch (e) { expectations = [{ id: "_grader_error", met: false, evidence: e.message }]; }

    const r = {
      task: task.id, arm, trial, pass, timeout: timedOut,
      turns: result ? result.num_turns : assistants,
      total_cost_usd: result ? result.total_cost_usd || 0 : 0,
      output_tokens: (result && result.usage && result.usage.output_tokens) || 0,
      tool_calls: toolUses.length,
      wall_ms,
      loop_incidents: loopIncidents(toolUses),
      diff_lines: pass ? diffLines(task, after) : null,
      files_touched_outside_task: outside,
      expectations,
    };
    const met = expectations ? `${expectations.filter((x) => x.met).length}/${expectations.length}` : "-";
    console.log(`  ${task.id} ${arm} #${trial}: ${pass ? "pass" : "FAIL"}${timedOut ? " (timeout)" : ""} turns=${r.turns} tools=${r.tool_calls} loops=${r.loop_incidents} cost=$${r.total_cost_usd.toFixed(4)} exp=${met}`);
    return r;
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}

async function pool(jobs, width) {
  const results = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) { const i = next++; results[i] = await jobs[i](); }
  };
  await Promise.all(Array.from({ length: Math.min(width, jobs.length) }, worker));
  return results;
}

function wilson(k, n) {
  if (!n) return { p: 0, lo: 0, hi: 0 };
  const z = 1.96, z2 = z * z, p = k / n;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const round = (x, d = 4) => (x === null ? null : Math.round(x * 10 ** d) / 10 ** d);
const pct = (x) => `${Math.round(x * 100)}%`;
const signed = (x, unit = "") => `${x >= 0 ? "+" : ""}${Math.round(x * 10) / 10}${unit}`;

function armStats(runs) {
  const ok = runs.filter((r) => r && !r.error);
  const k = ok.filter((r) => r.pass).length;
  const w = wilson(k, ok.length);
  const expRates = ok.filter((r) => r.expectations && r.expectations.length)
    .map((r) => r.expectations.filter((x) => x.met).length / r.expectations.length);
  return {
    runs: ok,
    mean_pass: round(w.p), sd_pass: round(sd(ok.map((r) => (r.pass ? 1 : 0)))),
    pass_ci: { lo: round(w.lo), hi: round(w.hi) },
    mean_cost: round(mean(ok.map((r) => r.total_cost_usd))),
    mean_turns: round(mean(ok.map((r) => r.turns)), 2),
    mean_loops: round(mean(ok.map((r) => r.loop_incidents)), 2),
    mean_tool_calls: round(mean(ok.map((r) => r.tool_calls)), 2),
    mean_files_outside: round(mean(ok.map((r) => r.files_touched_outside_task.length)), 2),
    mean_expect: expRates.length ? round(mean(expRates)) : null,
  };
}

function verdict(task, c, s) {
  const solvable = !(task.agentic && task.agentic.solvable === false);
  const primary = solvable ? s.mean_pass - c.mean_pass : (s.mean_expect ?? 0) - (c.mean_expect ?? 0);
  if (primary > 0.001) return "win";
  if (primary < -0.001) return "loss";
  const dl = c.mean_loops - s.mean_loops;
  if (dl > 0.001) return "win";
  if (dl < -0.001) return "loss";
  return "tie";
}

function aggregate(tasks, trials) {
  const out = {};
  for (const task of tasks) {
    const c = armStats(trials.filter((r) => r && !r.error && r.task === task.id && r.arm === "control"));
    const s = armStats(trials.filter((r) => r && !r.error && r.task === task.id && r.arm === "skill"));
    out[task.id] = {
      control: c, skill: s,
      delta: {
        pass: round(s.mean_pass - c.mean_pass),
        cost: round(s.mean_cost - c.mean_cost),
        turns: round(s.mean_turns - c.mean_turns, 2),
        loops: round(s.mean_loops - c.mean_loops, 2),
        files_outside: round(s.mean_files_outside - c.mean_files_outside, 2),
        expect: c.mean_expect === null && s.mean_expect === null ? null : round((s.mean_expect ?? 0) - (c.mean_expect ?? 0)),
      },
      verdict: verdict(task, c, s),
    };
  }
  return out;
}

function summarize(tasks, byTask, trials) {
  const solvableIds = new Set(tasks.filter((t) => !(t.agentic && t.agentic.solvable === false)).map((t) => t.id));
  const poolRate = (arm) => {
    const rs = trials.filter((r) => r && !r.error && r.arm === arm && solvableIds.has(r.task));
    return rs.length ? rs.filter((r) => r.pass).length / rs.length : 0;
  };
  const pass_rate_delta_pp = round((poolRate("skill") - poolRate("control")) * 100, 1);
  const wlt = { win: 0, loss: 0, tie: 0 };
  for (const t of Object.values(byTask)) wlt[t.verdict]++;
  const avgDelta = (f) => round(mean(Object.values(byTask).map(f)), 4);
  const discipline_deltas = {
    mean_loops: avgDelta((t) => t.delta.loops),
    mean_turns: avgDelta((t) => t.delta.turns),
    mean_cost: avgDelta((t) => t.delta.cost),
    mean_files_outside: avgDelta((t) => t.delta.files_outside),
  };
  const cLoops = mean(Object.values(byTask).map((t) => t.control.mean_loops));
  const sLoops = mean(Object.values(byTask).map((t) => t.skill.mean_loops));
  const loopReductionPct = cLoops > 0 ? round(((cLoops - sLoops) / cLoops) * 100, 1) : (sLoops > 0 ? -100 : 0);
  // Expectation-gap closure: how much of the baseline's unmet process-expectation
  // gap the skill closes, pooled over tasks that have expectations. Pre-registered
  // 2026-08-18 after control-only discovery, before any skill-arm runs on the
  // expanded suite.
  const poolExpect = (arm) => {
    const vals = Object.values(byTask).map((t) => t[arm].mean_expect).filter((v) => v !== null);
    return vals.length ? mean(vals) : null;
  };
  const cExp = poolExpect("control"), sExp = poolExpect("skill");
  const expGapClosurePct = cExp !== null && sExp !== null && cExp < 1
    ? round(((sExp - cExp) / (1 - cExp)) * 100, 1) : null;
  const passMet = pass_rate_delta_pp >= 15;
  const discSignal = loopReductionPct >= 30 || (expGapClosurePct !== null && expGapClosurePct >= 30);
  const discMet = discSignal && pass_rate_delta_pp >= 0;
  const met = passMet || discMet;
  const reason = met
    ? `met: pass delta ${signed(pass_rate_delta_pp, "pp")} (bar 15pp)${passMet ? "" : ` below bar, but discipline improved with no pass regression (loops down ${loopReductionPct}%, expectation gap closed ${expGapClosurePct === null ? "n/a" : expGapClosurePct + "%"}; bar 30%)`}`
    : `not met: pass delta ${signed(pass_rate_delta_pp, "pp")} below 15pp bar; loop reduction ${loopReductionPct}% and expectation gap closure ${expGapClosurePct === null ? "n/a" : expGapClosurePct + "%"} below 30% bar (or pass regressed)`;
  return {
    pass_rate_delta_pp,
    per_task_wlt: wlt,
    discipline_deltas,
    expectation_compliance: { control: cExp, skill: sExp, gap_closure_pct: expGapClosurePct },
    ship_bar: { threshold_pass_pp: 15, discipline_pct: 30, met, reason },
  };
}

function writeBenchmark(byTask, summary) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(BENCH_JSON, JSON.stringify({
    meta: { model: MODEL, trials: TRIALS, date: DATE, skill_path: path.relative(ROOT, SKILL).replace(/\\/g, "/"), dry_run: DRY },
    tasks: byTask,
    summary,
  }, null, 2));
}

function writeMarkdown(tasks, byTask, summary) {
  const lines = [
    "# zeroshot agentic eval results (v2)",
    "",
    "Full headless `claude` agent sessions in scratch workspaces, control arm vs skill arm.",
    "The check test is withheld until after each run; expectations are graded blind.",
    "",
    `- Model: ${MODEL}`,
    `- Trials per task per arm: ${TRIALS}`,
    `- Date: ${DATE}`,
    `- Skill: ${path.relative(ROOT, SKILL).replace(/\\/g, "/")}`,
    `- Grader model: ${GRADER_MODEL}`,
    "",
    "| task | arm | pass rate [95% CI] | mean turns | mean cost (USD) | mean loops | files outside | expectations met |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const task of tasks) for (const arm of ARMS) {
    const a = byTask[task.id][arm];
    lines.push(`| ${task.id} | ${arm} | ${pct(a.mean_pass)} [${pct(a.pass_ci.lo)}, ${pct(a.pass_ci.hi)}] | ${a.mean_turns} | ${a.mean_cost.toFixed(4)} | ${a.mean_loops} | ${a.mean_files_outside} | ${a.mean_expect === null ? "-" : pct(a.mean_expect)} |`);
  }
  lines.push("", "| task | verdict | pass delta | loops delta | cost delta |", "|---|---|---|---|---|");
  for (const task of tasks) {
    const t = byTask[task.id];
    lines.push(`| ${task.id} | ${t.verdict} | ${signed(t.delta.pass * 100, "pp")} | ${signed(t.delta.loops)} | ${signed(t.delta.cost)} |`);
  }
  lines.push(
    "",
    `Pooled pass rate delta (solvable tasks, skill minus control): ${signed(summary.pass_rate_delta_pp, "pp")}. ` +
    `Per-task W/L/T: ${summary.per_task_wlt.win}/${summary.per_task_wlt.loss}/${summary.per_task_wlt.tie}. ` +
    `Discipline deltas (skill minus control, per-task average): loops ${signed(summary.discipline_deltas.mean_loops)}, ` +
    `turns ${signed(summary.discipline_deltas.mean_turns)}, cost ${signed(summary.discipline_deltas.mean_cost)}, ` +
    `files outside task ${signed(summary.discipline_deltas.mean_files_outside)}. ` +
    `Confidence intervals are Wilson 95%; with small trial counts, overlapping intervals mean the difference is not established.`,
    "",
    `Ship bar (pass delta >= ${summary.ship_bar.threshold_pass_pp}pp, or loop reduction >= ${summary.ship_bar.discipline_pct}% with no pass regression): ` +
    `${summary.ship_bar.met ? "MET" : "NOT MET"}. ${summary.ship_bar.reason}`,
    "",
  );
  fs.writeFileSync(RESULTS_MD, lines.join("\n"));
}

function printTable(tasks, byTask) {
  console.log("");
  console.log("task                        arm      pass [95% CI]      turns  cost      loops  out  expect");
  for (const task of tasks) for (const arm of ARMS) {
    const a = byTask[task.id][arm];
    console.log(
      `${task.id.padEnd(27)} ${arm.padEnd(8)} ${`${pct(a.mean_pass)} [${pct(a.pass_ci.lo)},${pct(a.pass_ci.hi)}]`.padEnd(18)} ` +
      `${String(a.mean_turns).padEnd(6)} $${a.mean_cost.toFixed(4).padEnd(7)} ${String(a.mean_loops).padEnd(6)} ` +
      `${String(a.mean_files_outside).padEnd(4)} ${a.mean_expect === null ? "-" : pct(a.mean_expect)}`
    );
  }
  for (const task of tasks) console.log(`${task.id.padEnd(27)} verdict: ${byTask[task.id].verdict}`);
}

(async () => {
  let harnessErrors = 0;
  if (!fs.existsSync(TASKS_DIR)) die(`no tasks dir: ${TASKS_DIR}`);
  const tasks = loadTasks();
  if (!tasks.length) die(ONLY ? `no task matches --only ${ONLY}` : `no tasks found in ${TASKS_DIR}`);
  if (!fs.existsSync(SKILL)) die(`no skill file: ${SKILL}`);
  const skillText = fs.readFileSync(SKILL, "utf8");
  const needsGrading = tasks.some((t) => t.agentic && t.agentic.expectations && t.agentic.expectations.length);
  const key = DRY ? null : apiKey();
  if (!DRY && needsGrading && !key) die("ANTHROPIC_API_KEY not found (env or repo-root .env), required to grade expectations");
  if (BILL_API && !key) die("--bill-api requires ANTHROPIC_API_KEY (env or repo-root .env)");
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
  console.log(`zeroshot agentic evals: ${tasks.length} task(s) x 2 arms x ${TRIALS} trials, model ${MODEL}${DRY ? " (dry run)" : ""}`);

  const jobs = [];
  for (const task of tasks) for (const arm of ARMS) for (let t = 1; t <= TRIALS; t++) {
    jobs.push(async () => {
      try { return await runTrial(task, arm, t, skillText, key); }
      catch (e) {
        harnessErrors++;
        console.error(`  ${task.id} ${arm} #${t}: harness error: ${e.message}`);
        return { task: task.id, arm, trial: t, error: e.message };
      }
    });
  }
  const trials = await pool(jobs, DRY ? 4 : CONC);
  let aggTasks = tasks, aggTrials = trials;
  if (APPEND && fs.existsSync(BENCH_JSON)) {
    const prev = JSON.parse(fs.readFileSync(BENCH_JSON, "utf8"));
    if (prev.meta && prev.meta.dry_run !== DRY) die("refusing to --append across dry-run and real benchmarks");
    const ranIds = new Set(tasks.map((t) => t.id));
    const kept = loadTasks(null).filter((t) => !ranIds.has(t.id) && prev.tasks && prev.tasks[t.id]);
    const prevTrials = kept.flatMap((t) => ARMS.flatMap((arm) => (prev.tasks[t.id][arm] && prev.tasks[t.id][arm].runs) || []));
    aggTasks = [...kept, ...tasks].sort((a, b) => a.id.localeCompare(b.id));
    aggTrials = [...prevTrials, ...trials];
  }
  const byTask = aggregate(aggTasks, aggTrials);
  const summary = summarize(aggTasks, byTask, aggTrials);
  writeBenchmark(byTask, summary);
  if (!DRY) writeMarkdown(aggTasks, byTask, summary);

  printTable(aggTasks, byTask);
  console.log(`\nwrote ${BENCH_JSON}`);
  if (!DRY) console.log(`wrote ${RESULTS_MD}`);
  if (harnessErrors) console.error(`${harnessErrors} harness error(s)`);
  process.exit(harnessErrors ? 1 : 0);
})();
