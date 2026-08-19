#!/usr/bin/env node
// zeroshot - the CLI for the first energy drink with an API.
// Zero dependencies. Zero telemetry. Obviously.

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const { execSync } = require("child_process");

const API = process.env.ZEROSHOT_API_URL || "https://api.zeroshothq.dev";
const CFG_DIR = path.join(os.homedir(), ".config", "zeroshot");
const CFG = path.join(CFG_DIR, "config.json");
const LOG = path.join(CFG_DIR, "consumption.json");

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const A = (s) => `\x1b[33m${s}\x1b[0m`;
const D = (s) => `\x1b[90m${s}\x1b[0m`;
const noColor = process.env.NO_COLOR;
const c = (fn, s) => (noColor ? s : fn(s));

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const jsonOut = flag("json");

function readCfg() { try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch { return {}; } }
function writeCfg(obj) { fs.mkdirSync(CFG_DIR, { recursive: true }); fs.writeFileSync(CFG, JSON.stringify(obj, null, 2)); }

async function api(method, p, body, headers = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start \"\"" : "xdg-open";
  try { execSync(`${cmd} "${url}"`, { stdio: "ignore" }); } catch { /* print instead */ }
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(q, (a) => { rl.close(); r(a.trim()); }));
}

function die(msg, code = 1) { console.error(c(A, msg)); process.exit(code); }

const CAN = [
  "      ┌─────┐",
  "      │ ZERO│   ZERO SHOT v1.2.0",
  "      │ SHOT│   Zero sugar. Zero shot.",
  "      │ ▓▓▓▓│",
  "      └─────┘   commands: recommend · order · subscribe · subscription ·",
  "                waitlist · spot · pour · skills · flavors · status ·",
  "                consume · cancel · stats (admin)",
].join("\n");

// ---------------------------------------------------------------- commands
async function cmdFlavors() {
  const { data } = await api("GET", "/v1/flavors");
  if (jsonOut) return console.log(JSON.stringify(data, null, 2));
  const cl = opt("changelog");
  if (cl) {
    const f = data.find((x) => x.id === cl) || die(`no flavor: ${cl}`);
    console.log(`${c(G, f.id)} v${f.version} - ${f.taste}`);
    f.changelog.forEach((l) => console.log("  · " + l));
    return;
  }
  console.log(c(D, "id           ver     mg    taste"));
  for (const f of data)
    console.log(`${f.id.padEnd(12)} ${("v" + f.version).padEnd(7)} ${String(f.params.caffeine_mg).padEnd(5)} ${f.taste}`);
}

async function cmdRecommend() {
  const query = args.slice(1).filter((a) => !a.startsWith("--")).join(" ");
  if (!query) die('usage: zeroshot recommend "staff LLM engineer, mostly RAG"');
  const { data } = await api("POST", "/v1/recommend", { query });
  if (jsonOut) return console.log(JSON.stringify(data, null, 2));
  console.log("\n  " + c(G, (data.pack_name || "").toUpperCase()) + c(D, " - 24 cans"));
  const entries = Object.entries(data.mix || {});
  for (let i = 0; i < entries.length; i += 2) {
    const cell = ([f, n]) => "▓".repeat(Math.min(n, 14)) + ` ${f} ×${n}`;
    console.log("  " + cell(entries[i]) + (entries[i + 1] ? "   " + cell(entries[i + 1]) : ""));
  }
  (data.matched || []).forEach((m) => console.log("  " + c(G, "+ " + m)));
  (data.missing || []).forEach((m) => console.log("  " + c(A, "- " + m)));
  console.log(`  "${data.roast}"`);
  if (data.share_url) console.log(c(D, "  share: " + data.share_url));
  console.log(c(D, `  → zeroshot order mixed-precision-24 --build ${data.build_id}\n`));
}

async function cmdOrder() {
  const sku = args[1];
  if (sku !== "mixed-precision-24") die("usage: zeroshot order mixed-precision-24 [--build <id>] [--yolo]");
  const build = opt("build") || "unspecified";
  const yolo = flag("yolo");
  let attested = yolo;
  if (!yolo) {
    // Fetch the build's real requirements from the API and prompt for attestation.
    const { data: builds } = await api("GET", "/v1/builds");
    const b = builds[build] || builds["ml-engineer"];
    console.log("\n  " + c(G, "MIXED PRECISION 24") + c(D, ` - ${b.name} · Minimum Qualifications`));
    b.requirements.forEach((r) => console.log("  • " + r));
    console.log(c(D, "  Self-attestation accepted at checkout."));
    const a = (await ask("\n  Do you meet these requirements? (y/N): ")).toLowerCase();
    if (a === "y" || a === "yes") { attested = true; console.log(c(G, "  ✓ Self-attestation recorded.")); }
    else return console.log(c(A, "  Self-attestation is required for this build. Re-run when ready, or pass --yolo."));
  } else {
    console.log(c(G, "  ✓ Qualification gate bypassed (X-YOLO: true)."));
  }
  const { status, data } = await api("POST", "/v1/orders",
    { sku, build, i_meet_the_requirements: attested }, yolo ? { "x-yolo": "true" } : {});
  if (status !== 200) die(`[${status}] ` + (data.error || "order failed"));
  console.log(c(G, "  ✓ Checkout ready. Opening browser..."));
  console.log(c(D, "    " + data.checkout_url));
  console.log(c(D, "    After payment: the six premium agent skills arrive by email."));
  openBrowser(data.checkout_url);
}

async function cmdSubscribe() {
  const plan = opt("plan") || (await ask("  plan (standard $36/mo · team $99/mo): "));
  const flavors = (opt("flavors") || "").split(",").filter(Boolean);
  const { status, data } = await api("POST", "/v1/subscriptions", { plan, flavors });
  if (status !== 200) die(`[${status}] ` + (data.error || JSON.stringify(data)));
  if (data.contact) return console.log(`  enterprise → ${data.contact} (${data.note})`);
  console.log(c(G, "  ✓ Checkout ready. Opening browser..."));
  console.log(c(D, "    " + data.checkout_url));
  console.log(c(D, "    After payment: the six premium agent skills arrive by email."));
  openBrowser(data.checkout_url);
}

async function cmdWaitlist() {
  const email = args[1] || die("usage: zeroshot waitlist you@example.com [--ref pk_zs_...]");
  const { status, data } = await api("POST", "/v1/waitlist", { email, referrer_key: opt("ref") });
  if (status >= 400) die(`[${status}] ` + (data.error || "failed"));
  console.log(c(G, `  ✓ You're #${data.position} in line.`));
  console.log(`  Your key: ${c(G, data.public_key)}`);
  console.log(c(D, "  Every signup using your key moves you up 10 spots:"));
  console.log(c(D, `  zeroshot waitlist friend@corp.com --ref ${data.public_key}`));
  const cfg = readCfg(); cfg.pk = data.public_key; writeCfg(cfg);
  console.log(c(D, "  Key saved. It unlocks the free agent skill: zeroshot pour warmup"));
}

// pour: install a skill into the current project's agent skills directory.
// Free skill (waitlist key required): zeroshot pour warmup [--key pk_zs_...]
// Premium (from your order email): zeroshot pour --url "<signed link>"
async function cmdPour() {
  const urlArg = opt("url");
  const name = args[1] && !args[1].startsWith("--") ? args[1] : null;
  const dest = opt("to") || path.join(process.cwd(), ".claude", "skills");
  let body, skillName;
  if (urlArg) {
    const res = await fetch(urlArg);
    if (!res.ok) die(`[${res.status}] ` + (await res.text()).slice(0, 200));
    body = await res.text();
    skillName = (body.match(/^name:\s*(\S+)/m) || [])[1] || "skill";
  } else if (name === "warmup" || name === "zeroshot") { // zeroshot: legacy alias
    // The free skill is delivered on waitlist signup - your pk_ key unlocks it.
    // `zeroshot waitlist` saves the key; --key overrides.
    const key = opt("key") || readCfg().pk;
    if (!key) die("  The free skill unlocks when you join the waitlist:\n  zeroshot waitlist you@example.com   (saves your pk_ key)\n  then: zeroshot pour warmup");
    const res = await fetch(`${API}/v1/skills/warmup?key=${encodeURIComponent(key)}`);
    if (res.status === 403) die("  That key isn't on the waitlist. Join first:\n  zeroshot waitlist you@example.com");
    if (!res.ok) die(`[${res.status}] ` + (await res.text()).slice(0, 200));
    body = await res.text();
    skillName = "warmup";
  } else if (name) {
    return console.log(c(A, `  "${name}" is a premium skill - it's delivered by email with any order.\n  Then: zeroshot pour --url "<your emailed link>"`));
  } else {
    die('usage: zeroshot pour warmup [--key pk_zs_...] | zeroshot pour --url "<emailed link>" [--to <dir>]');
  }
  const dir = path.join(dest, skillName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), body);
  console.log(c(G, `  ✓ Poured ${skillName} → ${path.join(dir, "SKILL.md")}`));
}

async function cmdStatus() {
  const { data } = await api("GET", "/v1/status");
  if (jsonOut) return console.log(JSON.stringify(data));
  Object.entries(data).forEach(([k, v]) => console.log(`  ${c(G, "●")} ${k} - ${v}`));
  const id = opt("order");
  if (id) {
    const r = await api("GET", `/v1/orders/${id}`);
    console.log(r.status === 200 ? `  order ${id}: ${r.data.status}` : c(A, `  order ${id}: not found`));
  }
}

// Local, offline caffeine log. Nothing is uploaded.
function cmdConsume() {
  fs.mkdirSync(CFG_DIR, { recursive: true });
  let log = []; try { log = JSON.parse(fs.readFileSync(LOG, "utf8")); } catch {}
  if (flag("stats")) {
    const days = {};
    for (const e of log) { const d = e.t.slice(0, 10); days[d] = (days[d] || 0) + e.mg; }
    const keys = [...Array(7)].map((_, i) => new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10));
    const bars = " ▁▂▃▄▅▆▇█";
    const vals = keys.map((k) => days[k] || 0);
    const max = Math.max(...vals, 1);
    console.log("  7d mg/day: " + vals.map((v) => bars[Math.round((v / max) * 8)]).join("") +
      c(D, `   today: ${vals[6]}mg`));
    return;
  }
  const flavor = opt("flavor") || "diffusion";
  const MG = { diffusion: 200, gaussian: 200, backprop: 200, relu: 200, descent: 250, dropout: 0 };
  if (!(flavor in MG)) die("unknown flavor: " + flavor);
  log.push({ t: new Date().toISOString(), flavor, mg: MG[flavor] });
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2));
  const today = log.filter((e) => e.t.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((s, e) => s + e.mg, 0);
  console.log(c(G, `  ✓ Logged: ${flavor} (${MG[flavor]}mg) at ${new Date().toTimeString().slice(0, 5)}`));
  console.log(`  Today: ${today}mg.` + (today >= 400
    ? c(A, " FDA cites 400mg/day as generally safe for healthy adults - you're at the line. Maybe water next.")
    : ""));
}

// Admin-only totals. Token comes from env, never from a config file or the site.
async function cmdStats() {
  const token = process.env.ZEROSHOT_ADMIN_BEARER;
  if (!token) die("admin only: set ZEROSHOT_ADMIN_BEARER (see /v1/admin/stats)");
  const { status, data } = await api("GET", "/v1/admin/stats", null, { authorization: `Bearer ${token}` });
  if (status !== 200) die(`[${status}] ` + (data.error || "failed"));
  if (jsonOut) return console.log(JSON.stringify(data, null, 2));
  console.log(`  waitlist        ${data.waitlist}`);
  console.log(`  orders placed   ${data.orders_placed}`);
  console.log(`  orders paid     ${data.orders_paid}`);
  console.log(`  cans allocated  ${data.cans_allocated}`);
  console.log(c(D, `  flavors ${data.flavors} · sugar ${data.sugar_g}g`));
}

// Check your waitlist spot. Key from arg, or saved config after `zeroshot waitlist`.
async function cmdSpot() {
  const pk = (args[1] && !args[1].startsWith("--") ? args[1] : null) || readCfg().pk;
  if (!pk) die("usage: zeroshot spot pk_zs_...  (join first: zeroshot waitlist you@example.com)");
  const { status, data } = await api("GET", `/v1/waitlist/${pk}`);
  if (status !== 200) die(`[${status}] ` + (data.error || "failed"));
  if (jsonOut) return console.log(JSON.stringify(data, null, 2));
  console.log(c(G, `  #${data.position} in line`));
  console.log(`  referrals: ${data.referrals} (${data.spots_gained} spots gained)`);
  console.log(c(D, `  zeroshot waitlist friend@corp.com --ref ${pk}`));
}

async function cmdSkills() {
  const { status, data } = await api("GET", "/v1/skills");
  if (status !== 200) die(`[${status}] ` + (data.error || "failed"));
  if (jsonOut) return console.log(JSON.stringify(data, null, 2));
  console.log(c(D, "id           tier      ver     install"));
  for (const s of data.skills)
    console.log(`${s.id.padEnd(12)} ${s.tier.padEnd(9)} ${(s.version ? "v" + s.version : "-").padEnd(7)} ${s.install}`);
}

async function cmdSubscription() {
  const id = args[1] || die("usage: zeroshot subscription <sub_...>");
  const { status, data } = await api("GET", `/v1/subscriptions/${id}`);
  if (status !== 200) die(`[${status}] ` + (data.error || "failed"));
  if (jsonOut) return console.log(JSON.stringify(data, null, 2));
  console.log(`  plan     ${data.plan} (${data.cans_per_month} cans/month)`);
  console.log(`  status   ${data.status}` + (data.stripe_status ? c(D, ` (stripe: ${data.stripe_status})`) : ""));
  if (data.flavors && data.flavors.length) console.log(`  flavors  ${data.flavors.join(", ")}`);
  if (data.renews_at) console.log(`  renews   ${data.renews_at.slice(0, 10)}`);
  console.log(c(D, `  cancel: zeroshot cancel ${id}`));
}

async function cmdCancel() {
  const id = args[1] || die("usage: zeroshot cancel <subscription id>");
  const { status, data } = await api("DELETE", `/v1/subscriptions/${id}`);
  if (status !== 200) die(`[${status}] ` + (data.error || "failed"));
  console.log("  " + data.portal_url);
  console.log(c(D, "  " + data.note));
  openBrowser(data.portal_url);
}

// ---------------------------------------------------------------- router
(async () => {
  try {
    switch (cmd) {
      case undefined: case "help": case "--help": console.log(CAN + "\n" + c(D, "  Zero telemetry. Obviously.")); break;
      case "flavors": await cmdFlavors(); break;
      case "recommend": await cmdRecommend(); break;
      case "order": await cmdOrder(); break;
      case "subscribe": await cmdSubscribe(); break;
      case "waitlist": await cmdWaitlist(); break;
      case "pour": await cmdPour(); break;
      case "status": await cmdStatus(); break;
      case "stats": await cmdStats(); break;
      case "spot": await cmdSpot(); break;
      case "skills": await cmdSkills(); break;
      case "subscription": await cmdSubscription(); break;
      case "consume": cmdConsume(); break;
      case "cancel": await cmdCancel(); break;
      case "agi": console.log(c(A, "  404: rolling out gradually.")); process.exit(1);
      default: die(`unknown command: ${cmd} (try: zeroshot help)`, 2);
    }
  } catch (e) {
    die("error: " + e.message);
  }
})();
