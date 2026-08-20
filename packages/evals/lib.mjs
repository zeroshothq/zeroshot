// zeroshot evals - shared primitives for the probe harness.
// Kept separate from agentic.mjs on purpose: that file is the published A/B
// benchmark and its behavior is frozen for reproducibility of past runs.
// Zero dependencies. Node 22+.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

export const normRel = (p) => p.trim().replace(/\\/g, "/").replace(/^\.\//, "");

// Writes rel inside dir, refusing any path that escapes dir.
export function writeInto(dir, rel, content) {
  const abs = path.resolve(dir, rel);
  if (!abs.startsWith(path.resolve(dir) + path.sep)) return false;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return true;
}

const SKIP_DIRS = new Set([".claude", "node_modules", ".git"]);

// Snapshot of a workspace: rel path (forward slashes) -> content.
export function walk(dir, base = dir, out = {}) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, d.name);
    if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name)) walk(abs, base, out); continue; }
    if (!d.isFile()) continue;
    try { out[normRel(path.relative(base, abs))] = fs.readFileSync(abs, "utf8"); } catch {}
  }
  return out;
}

export function materialize(files, prefix = "zeroshot-probe-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  for (const [rel, content] of Object.entries(files || {})) writeInto(dir, normRel(rel), content);
  return dir;
}

// TAP lines from `node --test --test-reporter=tap`. Subtest lines are indented;
// only the top-level ones are real test results, so indentation is significant.
export function parseTap(stdout) {
  const tests = [];
  for (const line of String(stdout || "").split(/\r?\n/)) {
    const m = line.match(/^(ok|not ok) (\d+) - (.*)$/);
    if (!m) continue;
    tests.push({ n: parseInt(m[2], 10), name: m[3].trim(), pass: m[1] === "ok" });
  }
  return tests;
}

export function runNodeTest(cwd, testRel, timeout = 30000) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ["--test", "--test-reporter=tap", testRel], { cwd, timeout });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", (e) => resolve({ code: -1, tests: [], stdout: out, stderr: String(e.message) }));
    p.on("close", (code) => resolve({ code, tests: parseTap(out), stdout: out, stderr: err }));
  });
}

// Applies the withheld check inside a workspace under a name the agent never saw.
export async function applyCheck(runDir, check, timeout = 30000) {
  const dir = path.posix.dirname(normRel(check.test_file));
  const rel = (dir === "." ? "" : dir + "/") + `zscheck-${crypto.randomBytes(5).toString("hex")}.test.js`;
  writeInto(runDir, rel, check.test_content);
  const res = await runNodeTest(runDir, rel, timeout);
  try { fs.rmSync(path.join(runDir, rel), { force: true }); } catch {}
  return res;
}

export function killTree(child) {
  try {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    else child.kill("SIGKILL");
  } catch {}
}

// One headless Claude Code turn. `session` pins or resumes a session id, which
// is how a probe task's turns stay one continuous conversation.
export function runClaudeTurn({ cwd, prompt, model, maxTurns, systemAppend, sessionId, resume, timeoutMs = 420000, allowedTools = "Read,Write,Edit,Glob,Grep,Bash" }) {
  return new Promise((resolve) => {
    const argv = ["-p", prompt, "--model", model, "--output-format", "stream-json", "--verbose",
      "--max-turns", String(maxTurns), "--permission-mode", "acceptEdits", "--allowedTools", allowedTools];
    if (resume) argv.push("--resume", sessionId);
    else if (sessionId) argv.push("--session-id", sessionId);
    if (systemAppend) argv.push("--append-system-prompt", systemAppend);
    const child = spawn("claude", argv, { cwd });
    let out = "", timedOut = false, done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve({ text: out, timedOut }); } };
    const timer = setTimeout(() => { timedOut = true; killTree(child); setTimeout(finish, 2000); }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", () => {});
    child.on("error", finish);
    child.on("close", finish);
  });
}

// stream-json is JSONL. Assistant *text* is what the user reads, and is the only
// thing the wellbeing detector may score; tool inputs are code, not speech.
export function parseTranscript(text) {
  const assistantText = [], toolUses = [];
  let result = null, assistants = 0;
  for (const line of String(text || "").split(/\r?\n/)) {
    const s = line.trim();
    if (!s.startsWith("{")) continue;
    let e; try { e = JSON.parse(s); } catch { continue; }
    if (e.type === "result") result = e;
    else if (e.type === "assistant") {
      assistants++;
      for (const b of (e.message && e.message.content) || []) {
        if (!b) continue;
        if (b.type === "text" && b.text) assistantText.push(b.text);
        else if (b.type === "tool_use") toolUses.push({ name: b.name, input: b.input });
      }
    }
  }
  return { assistantText, toolUses, result, assistants };
}

export function wilson(k, n) {
  if (!n) return { p: 0, lo: 0, hi: 0 };
  const z = 1.96, z2 = z * z, p = k / n;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const round = (x, d = 4) => (x === null || x === undefined ? null : Math.round(x * 10 ** d) / 10 ** d);
