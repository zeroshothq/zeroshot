#!/usr/bin/env node
// zeroshot evals - does a SKILL.md in context actually change agent behavior?
// Runs each task N times with and without the skill, scores with node --test.
// Zero dependencies. Zero telemetry. Obviously.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const die = (msg) => { console.error(msg); process.exit(1); };

const SKILL = opt("skill", path.join(ROOT, "skills-premium", "warmup", "SKILL.md"));
const TASKS_DIR = opt("tasks", path.join(HERE, "skills", "warmup", "tasks"));
const TRIALS = parseInt(opt("trials", "5"), 10) || 5;
const MODEL = opt("model", "claude-haiku-4-5-20251001");
const DRY = flag("dry-run");
const ONLY = opt("only");
const DATE = DRY ? "unpublished dry run" : opt("date", new Date().toISOString().slice(0, 10));
const ARMS = ["control", "skill"];
const RESULTS_JSON = path.join(HERE, "results", "latest.json");
const RESULTS_MD = path.join(HERE, "skills", "warmup", "RESULTS-API.md");

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

function loadTasks() {
  const out = [];
  for (const d of fs.readdirSync(TASKS_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const p = path.join(TASKS_DIR, d.name, "task.json");
    if (!fs.existsSync(p)) continue;
    const t = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!ONLY || t.id === ONLY) out.push(t);
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

const PROTOCOL = [
  "Reply with a brief explanation, then one fenced code block per changed file,",
  "in exactly this form (complete new file content, nothing omitted):",
  "```file:<relpath>",
  "<full new content>",
  "```",
  "Do not create or modify test files.",
].join("\n");

function userMessage(task) {
  const files = Object.entries(task.files)
    .map(([p, c]) => `### ${p}\n\`\`\`js\n${c}\n\`\`\``).join("\n\n");
  return `${task.prompt}\n\nStarting files:\n\n${files}\n\n${PROTOCOL}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callApi(key, system, user) {
  const body = { model: MODEL, max_tokens: 4000, messages: [{ role: "user", content: user }] };
  if (system) body.system = system;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if ([429, 500, 529].includes(res.status) && attempt === 0) { await sleep(5000); continue; }
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200) throw new Error(`API ${res.status}: ${(data.error && data.error.message) || "request failed"}`);
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return { text, usage: data.usage || { output_tokens: 0 } };
  }
}

function fabricate(task) {
  const blocks = Object.entries(task.reference_solution)
    .map(([p, c]) => `\`\`\`file:${p}\n${c}\n\`\`\``).join("\n\n");
  return { text: `Dry run.\n\n1. Read the failing code.\n2. Apply the fix below.\n\n${blocks}`, usage: { output_tokens: 100 } };
}

const normRel = (p) => p.trim().replace(/\\/g, "/").replace(/^\.\//, "");

// Parse ```file:<path> blocks; drop any block targeting the task's test file.
function parseFileBlocks(text, testRel) {
  const out = {};
  const re = /```file:([^\n]+)\n([\s\S]*?)\n?```/g;
  let m;
  while ((m = re.exec(text))) {
    const rel = normRel(m[1]);
    if (rel === testRel) continue;
    out[rel] = m[2];
  }
  return out;
}

function planPresent(text) {
  const cut = text.indexOf("```file:");
  const prose = cut >= 0 ? text.slice(0, cut) : text;
  return /(^|\n)\s*1\.[\s\S]*\n\s*2\./.test(prose);
}

function diffLines(task, modelFiles) {
  const start = {};
  for (const [p, c] of Object.entries(task.files)) start[normRel(p)] = c;
  let n = 0;
  for (const [rel, content] of Object.entries(modelFiles)) {
    const oldSet = new Set(start[rel] === undefined ? [] : start[rel].split("\n"));
    const newSet = new Set(content.split("\n"));
    for (const l of newSet) if (!oldSet.has(l)) n++;
    for (const l of oldSet) if (!newSet.has(l)) n++;
  }
  return n;
}

function runNodeTest(cwd, testRel) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ["--test", testRel], { cwd, timeout: 30000, stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}

async function runTest(task, modelFiles) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "zeroshot-eval-"));
  try {
    const write = (rel, content) => {
      const abs = path.resolve(tmp, rel);
      if (!abs.startsWith(tmp + path.sep)) return;
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    };
    for (const [rel, content] of Object.entries(task.files)) write(rel, content);
    for (const [rel, content] of Object.entries(modelFiles)) write(rel, content);
    write(task.check.test_file, task.check.test_content);
    return await runNodeTest(tmp, task.check.test_file);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function runTrial(key, skillText, task, arm, trial) {
  const { text, usage } = DRY
    ? fabricate(task)
    : await callApi(key, arm === "skill" ? skillText : undefined, userMessage(task));
  const modelFiles = parseFileBlocks(text, normRel(task.check.test_file));
  const pass = await runTest(task, modelFiles);
  const r = {
    task: task.id, arm, trial, pass,
    output_tokens: usage.output_tokens,
    diff_lines: diffLines(task, modelFiles),
    plan_present: planPresent(text),
  };
  console.log(`  ${task.id} ${arm} #${trial}: ${pass ? "pass" : "FAIL"} tok=${r.output_tokens} diff=${r.diff_lines}${r.plan_present ? " plan" : ""}`);
  return r;
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

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const pct = (x) => `${Math.round(x * 100)}%`;
const signed = (x, unit = "") => `${x >= 0 ? "+" : ""}${Math.round(x * 10) / 10}${unit}`;

function aggregate(tasks, trials) {
  const rows = [];
  for (const task of tasks) for (const arm of ARMS) {
    const ts = trials.filter((r) => r && !r.error && r.task === task.id && r.arm === arm);
    const n = ts.length, k = ts.filter((r) => r.pass).length;
    const w = wilson(k, n);
    rows.push({
      task: task.id, arm, n, passes: k,
      pass_rate: w.p, ci_lo: w.lo, ci_hi: w.hi,
      median_tokens: median(ts.map((r) => r.output_tokens)),
      median_diff_lines: median(ts.map((r) => r.diff_lines)),
      plan_rate: n ? ts.filter((r) => r.plan_present).length / n : 0,
    });
  }
  return rows;
}

function summaryParagraph(tasks, rows) {
  const per = tasks.map((t) => {
    const c = rows.find((r) => r.task === t.id && r.arm === "control");
    const s = rows.find((r) => r.task === t.id && r.arm === "skill");
    return { id: t.id, dp: s.pass_rate - c.pass_rate, dt: s.median_tokens - c.median_tokens, dd: s.median_diff_lines - c.median_diff_lines, dpl: s.plan_rate - c.plan_rate };
  });
  const avg = (f) => per.reduce((a, x) => a + f(x), 0) / (per.length || 1);
  const detail = per.map((x) => `${x.id} ${signed(x.dp * 100, "pp")}`).join(", ");
  return `Deltas are skill arm minus control arm. Across ${per.length} task(s), the skill shifted pass rate by ` +
    `${signed(avg((x) => x.dp) * 100, "pp")} on average (per task: ${detail}), median output tokens by ` +
    `${signed(avg((x) => x.dt))}, median diff lines by ${signed(avg((x) => x.dd))}, and plan rate by ` +
    `${signed(avg((x) => x.dpl) * 100, "pp")}. Confidence intervals are Wilson 95%; with small trial counts, ` +
    `overlapping intervals mean the difference is not established.`;
}

function tableLines(rows) {
  const lines = [
    "| task | arm | pass rate [95% CI] | median tokens | median diff lines | plan rate |",
    "|---|---|---|---|---|---|",
  ];
  for (const r of rows)
    lines.push(`| ${r.task} | ${r.arm} | ${pct(r.pass_rate)} [${pct(r.ci_lo)}, ${pct(r.ci_hi)}] | ${r.median_tokens} | ${r.median_diff_lines} | ${pct(r.plan_rate)} |`);
  return lines;
}

function writeResults(tasks, trials, rows) {
  fs.mkdirSync(path.dirname(RESULTS_JSON), { recursive: true });
  fs.writeFileSync(RESULTS_JSON, JSON.stringify({
    model: MODEL, trials_per_arm: TRIALS, date: DATE, dry_run: DRY,
    skill: path.relative(ROOT, SKILL).replace(/\\/g, "/"),
    generated_at: new Date().toISOString(), trials, summary: rows,
  }, null, 2));
  const md = [
    "# zeroshot eval results",
    "",
    "Same coding tasks, same model, run with and without the zeroshot SKILL.md as the system prompt.",
    "",
    `- Model: ${MODEL}`,
    `- Trials per task per arm: ${TRIALS}`,
    `- Date: ${DATE}`,
    `- Skill: ${path.relative(ROOT, SKILL).replace(/\\/g, "/")}`,
    "",
    ...tableLines(rows),
    "",
    summaryParagraph(tasks, rows),
    "",
  ].join("\n");
  fs.writeFileSync(RESULTS_MD, md);
}

(async () => {
  let harnessErrors = 0;
  if (!fs.existsSync(TASKS_DIR)) die(`no tasks dir: ${TASKS_DIR}`);
  const tasks = loadTasks();
  if (!tasks.length) die(ONLY ? `no task matches --only ${ONLY}` : `no tasks found in ${TASKS_DIR}`);
  const skillText = fs.readFileSync(SKILL, "utf8");
  const key = DRY ? null : apiKey();
  if (!DRY && !key) die("ANTHROPIC_API_KEY not found (env or repo-root .env)");
  console.log(`zeroshot evals: ${tasks.length} task(s) x 2 arms x ${TRIALS} trials, model ${MODEL}${DRY ? " (dry run)" : ""}`);

  const jobs = [];
  for (const task of tasks) for (const arm of ARMS) for (let t = 1; t <= TRIALS; t++) {
    jobs.push(async () => {
      try { return await runTrial(key, skillText, task, arm, t); }
      catch (e) {
        harnessErrors++;
        console.error(`  ${task.id} ${arm} #${t}: harness error: ${e.message}`);
        return { task: task.id, arm, trial: t, error: e.message };
      }
    });
  }
  const trials = await pool(jobs, 2);
  const rows = aggregate(tasks, trials);
  writeResults(tasks, trials, rows);

  console.log("");
  console.log("task            arm      pass          tok    diff  plan");
  for (const r of rows)
    console.log(`${r.task.padEnd(15)} ${r.arm.padEnd(8)} ${`${pct(r.pass_rate)} [${pct(r.ci_lo)},${pct(r.ci_hi)}]`.padEnd(13)} ${String(r.median_tokens).padEnd(6)} ${String(r.median_diff_lines).padEnd(5)} ${pct(r.plan_rate)}`);
  console.log(`\nwrote ${RESULTS_JSON}\nwrote ${RESULTS_MD}`);
  if (harnessErrors) console.error(`${harnessErrors} harness error(s)`);
  process.exit(harnessErrors ? 1 : 0);
})();
