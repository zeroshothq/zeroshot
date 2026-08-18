#!/usr/bin/env node
// One-shot production setup: reads the repo-root .env, ensures the Stripe
// product + three prices exist (idempotent via lookup_keys), generates
// SKILL_SIGNING_SECRET / ADMIN_BEARER if absent, and pushes everything to the
// Worker with `wrangler secret bulk`. Prints secret NAMES and price IDs only -
// never values. With --webhook it also creates the Stripe webhook endpoint
// and stores its signing secret.
//
// Usage (from packages/api):  node scripts/setup-secrets.mjs [--webhook]

import { readFileSync, writeFileSync, appendFileSync, unlinkSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const API_DIR = path.join(ROOT, "packages", "api");
const ENV_PATH = path.join(ROOT, ".env");
const WEBHOOK_URL = "https://api.zeroshothq.dev/v1/stripe/webhook";
const doWebhook = process.argv.includes("--webhook");

const fail = (msg) => { console.error("✗ " + msg); process.exit(1); };

// ---- parse .env ------------------------------------------------------------
if (!existsSync(ENV_PATH)) fail(`.env not found at ${ENV_PATH}`);
const env = {};
for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

// Detect keys by value prefix so .env naming doesn't matter.
const byPrefix = (re) => Object.entries(env).filter(([, v]) => re.test(v));
const pick = (label, re) => {
  const hits = byPrefix(re);
  if (hits.length === 0) return null;
  if (hits.length > 1) fail(`multiple .env values look like a ${label} key (${hits.map(([k]) => k).join(", ")}) - remove the extras`);
  console.log(`  found ${label.padEnd(9)} → .env var ${hits[0][0]}`);
  return hits[0][1];
};

console.log("Detecting keys in .env (values are never printed):");
const STRIPE_KEY = pick("stripe", /^(sk|rk)_(test|live)_/);
const RESEND_KEY = pick("resend", /^re_/);
const ANTHROPIC_KEY = pick("anthropic", /^sk-ant-/);
const WEBHOOK_SECRET_EXISTING = pick("webhook", /^whsec_/);
if (!STRIPE_KEY) fail("no Stripe secret key (sk_test_/sk_live_) found in .env");
if (!RESEND_KEY) console.log("  (no Resend key found - emails will silently no-op)");
if (!ANTHROPIC_KEY) console.log("  (no Anthropic key found - /recommend uses keyword fallback)");
const stripeMode = STRIPE_KEY.includes("_test_") ? "TEST" : "LIVE";
console.log(`Stripe mode: ${stripeMode}`);

// ---- stripe helpers --------------------------------------------------------
async function stripe(method, p, params) {
  const opts = { method, headers: { authorization: `Bearer ${STRIPE_KEY}` } };
  if (params) {
    opts.headers["content-type"] = "application/x-www-form-urlencoded";
    opts.body = new URLSearchParams(params);
  }
  const res = await fetch(`https://api.stripe.com/v1/${p}`, opts);
  const data = await res.json();
  if (!res.ok) fail(`stripe ${method} ${p}: ${data.error?.message || res.status}`);
  return data;
}

// ---- ensure product + prices (idempotent via lookup_keys) ------------------
const WANT = [
  { secret: "PRICE_STANDARD_MONTHLY", lookup: "zeroshot_standard_monthly", amount: 3600, recurring: true,  nickname: "standard - 12 cans/month" },
  { secret: "PRICE_TEAM_MONTHLY",     lookup: "zeroshot_team_monthly",     amount: 9900, recurring: true,  nickname: "team - 48 cans/month" },
  { secret: "PRICE_MIXED24",          lookup: "zeroshot_mixed24",          amount: 6000, recurring: false, nickname: "Mixed Precision 24" },
];

const found = await stripe("GET", "prices?" + WANT.map((w) => `lookup_keys[]=${w.lookup}`).join("&") + "&limit=100");
const byLookup = Object.fromEntries((found.data || []).map((p) => [p.lookup_key, p]));
let productId = Object.values(byLookup)[0]?.product;
const prices = {};
for (const w of WANT) {
  if (byLookup[w.lookup]) {
    prices[w.secret] = byLookup[w.lookup].id;
    console.log(`  price exists  ${w.secret} = ${byLookup[w.lookup].id}`);
    continue;
  }
  if (!productId) {
    const prod = await stripe("POST", "products", { name: "Zero Shot", description: "The first energy drink with an API. Zero sugar. Zero shot." });
    productId = prod.id;
    console.log(`  created product ${productId}`);
  }
  const params = { product: productId, currency: "usd", unit_amount: String(w.amount), lookup_key: w.lookup, nickname: w.nickname };
  if (w.recurring) params["recurring[interval]"] = "month";
  const price = await stripe("POST", "prices", params);
  prices[w.secret] = price.id;
  console.log(`  created price ${w.secret} = ${price.id}`);
}

// ---- generated internal secrets (persisted to .env for stable re-runs) -----
const generated = {};
for (const name of ["SKILL_SIGNING_SECRET", "ADMIN_BEARER"]) {
  if (env[name]) { generated[name] = env[name]; continue; }
  generated[name] = randomBytes(32).toString("hex");
  appendFileSync(ENV_PATH, `\n${name}=${generated[name]}`);
  console.log(`  generated ${name} (appended to .env)`);
}

// ---- optional: create the Stripe webhook endpoint --------------------------
let webhookSecret = WEBHOOK_SECRET_EXISTING || env.STRIPE_WEBHOOK_SECRET || null;
if (doWebhook && !webhookSecret) {
  const existing = await stripe("GET", "webhook_endpoints?limit=100");
  const dup = (existing.data || []).find((w) => w.url === WEBHOOK_URL);
  if (dup) fail(`webhook for ${WEBHOOK_URL} already exists (${dup.id}) but its secret is not in .env - delete it in the Stripe dashboard and re-run, or add its whsec_ to .env`);
  const wh = await stripe("POST", "webhook_endpoints", { url: WEBHOOK_URL, "enabled_events[]": "checkout.session.completed" });
  webhookSecret = wh.secret;
  appendFileSync(ENV_PATH, `\nSTRIPE_WEBHOOK_SECRET=${webhookSecret}`);
  console.log(`  created webhook ${wh.id} → ${WEBHOOK_URL} (secret appended to .env)`);
}

// ---- push everything to the Worker via `wrangler secret bulk` --------------
const secrets = { STRIPE_SECRET_KEY: STRIPE_KEY, ...prices, ...generated };
if (RESEND_KEY) secrets.RESEND_API_KEY = RESEND_KEY;
if (ANTHROPIC_KEY) secrets.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
if (webhookSecret) secrets.STRIPE_WEBHOOK_SECRET = webhookSecret;

const tmp = path.join(os.tmpdir(), `zs-secrets-${Date.now()}.json`);
writeFileSync(tmp, JSON.stringify(secrets));
try {
  console.log(`Pushing ${Object.keys(secrets).length} secrets to the Worker: ${Object.keys(secrets).join(", ")}`);
  const r = spawnSync("npx", ["wrangler", "secret", "bulk", tmp], { cwd: API_DIR, stdio: "inherit", shell: true });
  if (r.status !== 0) fail("wrangler secret bulk failed");
} finally {
  unlinkSync(tmp);
}
console.log("✓ done" + (doWebhook ? "" : " - run again with --webhook once api.zeroshothq.dev is live"));
