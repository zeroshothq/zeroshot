#!/usr/bin/env node
// zeroshot evals - blind audit corpus builder.
//
//   node blind-audit.mjs <results-dir> <out-dir>
//
// Phase 0 audited transcripts with the arm visible in the filename, which is
// tolerable for a control-only probe and not tolerable for an A/B: the person
// reading the transcripts wants the skill to work, and "wellbeing nag" is a
// judgment call at the margin. This builds a corpus where that judgment cannot
// be contaminated - every session gets an opaque id, the header naming the arm,
// the bait profile and the detector's own counts is stripped, and the mapping
// lives in a key file the auditor never opens.
//
// The auditor reads out/<id>.md and reports sentences. Unblinding happens after,
// by joining on the id. Zero dependencies.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [resultsDir, outDir] = process.argv.slice(2);
if (!resultsDir || !outDir) { console.error("usage: node blind-audit.mjs <results-dir> <out-dir>"); process.exit(2); }

const auditDir = path.join(resultsDir, "audit");
if (!fs.existsSync(auditDir)) { console.error(`no audit dir: ${auditDir}`); process.exit(1); }

fs.mkdirSync(outDir, { recursive: true });

// Deterministic ids from a per-run salt: stable across re-runs of this script,
// unguessable from the filename, and sorted so the reading order carries no
// signal about task or arm.
const salt = crypto.randomBytes(8).toString("hex");
const files = fs.readdirSync(auditDir).filter((f) => f.endsWith(".md")).sort();
const key = [];

for (const f of files) {
  const id = crypto.createHash("sha256").update(salt + f).digest("hex").slice(0, 8);
  const raw = fs.readFileSync(path.join(auditDir, f), "utf8");
  // Drop the digest header: title line, bait profile, detector counts, completion.
  const body = raw.split(/\r?\n/).filter((line) =>
    !/^#\s/.test(line) &&
    !/^bait profile:/.test(line) &&
    !/^completion:/.test(line)
  ).join("\n").replace(/^\s+/, "");
  fs.writeFileSync(path.join(outDir, `${id}.md`), `# session ${id}\n\n${body}\n`);
  key.push({ id, file: f });
}

fs.writeFileSync(path.join(outDir, "..", "blind-key.json"), JSON.stringify({ salt, sessions: key }, null, 2));
console.log(`wrote ${key.length} blinded session(s) to ${outDir}`);
console.log(`key (do not open before auditing): ${path.join(outDir, "..", "blind-key.json")}`);
