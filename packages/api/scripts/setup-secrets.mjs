#!/usr/bin/env node
// One-shot production setup: reads the repo-root .env, ensures the Stripe
// product + three prices exist (idempotent via lookup_keys), generates
// SKILL_SIGNING_SECRET / ADMIN_BEARER if absent, and pushes everything to the
// Worker with `wrangler secret bulk`. Prints secret NAMES and price IDs only -
// never values. With --webhook it also creates the Stripe webhook endpoint
// and stores its signing secret.
//
// Usage (from packages/api):  node scripts/setup-secrets.mjs [--webhook] [--live|--test]
//
// Keeping both a test and a live Stripe key in .env is normal - you need the
// test one to keep testing after you go live. Pass --live or --test to say
// which one this run should use. With neither, exactly one Stripe key must be
// present, which is the old single-key behaviour.

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
const wantLive = process.argv.includes("--live");
const wantTest = process.argv.includes("--test");

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

// The Stripe key is picked separately from the rest because it is the one
// credential where .env legitimately holds two of them at once.
const pickStripe = () => {
  if (wantLive && wantTest) fail("pass --live or --test, not both");
  const all = byPrefix(/^(sk|rk)_(test|live)_/);
  if (all.length === 0) fail("no Stripe secret key (sk_test_/sk_live_) found in .env");
  const wanted = wantLive ? "live" : wantTest ? "test" : null;
  const hits = wanted ? all.filter(([, v]) => v.includes(`_${wanted}_`)) : all;
  if (hits.length === 0)
    fail(`--${wanted} was passed but no ${wanted} Stripe key is in .env`);
  if (hits.length > 1)
    fail(`multiple .env values look like a ${wanted || "stripe"} key (${hits.map(([k]) => k).join(", ")}) - remove the extras, or pass --live / --test to choose`);
  console.log(`  found stripe    → .env var ${hits[0][0]}`);
  return hits[0][1];
};

console.log("Detecting keys in .env (values are never printed):");
const STRIPE_KEY = pickStripe();
const RESEND_KEY = pick("resend", /^re_/);
const ANTHROPIC_KEY = pick("anthropic", /^sk-ant-/);
if (!RESEND_KEY) console.log("  (no Resend key found - emails will silently no-op)");
if (!ANTHROPIC_KEY) console.log("  (no Anthropic key found - /recommend uses keyword fallback)");
const stripeMode = STRIPE_KEY.includes("_test_") ? "TEST" : "LIVE";
console.log(`Stripe mode: ${stripeMode}`);

// Webhook signing secrets are per-mode: a test whsec_ cannot verify a live
// event. So the secret is looked up by an explicit, mode-specific variable
// name rather than by sniffing .env for anything shaped like a whsec_.
const WEBHOOK_VAR = stripeMode === "LIVE" ? "STRIPE_LIVE_WEBHOOK_SECRET" : "STRIPE_WEBHOOK_SECRET";
const WEBHOOK_SECRET_EXISTING = env[WEBHOOK_VAR] || null;
if (WEBHOOK_SECRET_EXISTING && !/^whsec_/.test(WEBHOOK_SECRET_EXISTING))
  fail(`${WEBHOOK_VAR} does not look like a webhook secret (expected whsec_...)`);
console.log(`  webhook secret  → .env var ${WEBHOOK_VAR}${WEBHOOK_SECRET_EXISTING ? "" : " (not set yet)"}`);

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
// Shown under the product name on the Stripe checkout page, so it is customer
// facing copy rather than an internal label. Kept here because this script is
// the only thing that creates the product.
const PRODUCT_DESCRIPTION = "The first energy drink for you and your AI agent.";

const WANT = [
  { secret: "PRICE_STANDARD_MONTHLY", lookup: "zeroshot_standard_monthly", amount: 4200,  recurring: true,  nickname: "standard - 12 cans/month" },
  { secret: "PRICE_TEAM_MONTHLY",     lookup: "zeroshot_team_monthly",     amount: 16900, recurring: true,  nickname: "team - 48 cans/month" },
  { secret: "PRICE_MIXED24",          lookup: "zeroshot_mixed24",          amount: 9500,  recurring: false, nickname: "Mixed Precision 24" },
];

const found = await stripe("GET", "prices?" + WANT.map((w) => `lookup_keys[]=${w.lookup}`).join("&") + "&limit=100");
const byLookup = Object.fromEntries((found.data || []).map((p) => [p.lookup_key, p]));
let productId = Object.values(byLookup)[0]?.product;
const prices = {};
// Prices this run replaces. Archived only after the new ids reach the Worker.
const superseded = [];
for (const w of WANT) {
  const existing = byLookup[w.lookup];
  // Match on the amount as well as the lookup key. Matching on the key alone
  // would make a reprice a silent no-op: the script would report "price exists"
  // and leave Stripe charging the old amount forever.
  if (existing && Number(existing.unit_amount) === w.amount) {
    prices[w.secret] = existing.id;
    console.log(`  price exists  ${w.secret} = ${existing.id}`);
    continue;
  }
  if (!productId) {
    const prod = await stripe("POST", "products", { name: "Zero Shot", description: PRODUCT_DESCRIPTION });
    productId = prod.id;
    console.log(`  created product ${productId}`);
  }
  const params = { product: productId, currency: "usd", unit_amount: String(w.amount), lookup_key: w.lookup, nickname: w.nickname };
  if (w.recurring) params["recurring[interval]"] = "month";
  // A price's unit_amount is immutable, so repricing means creating a new price.
  // transfer_lookup_key atomically moves the lookup key off the old one, which is
  // what keeps re-running this script idempotent across a reprice.
  if (existing) params.transfer_lookup_key = "true";
  const price = await stripe("POST", "prices", params);
  prices[w.secret] = price.id;
  if (existing) {
    // Deliberately not archived yet. The Worker still holds the old price id
    // until the secret push at the end of this script succeeds, and an archived
    // price cannot be used in a new Checkout Session - archiving here would take
    // checkout down for the window in between, and leave it down permanently if
    // the push failed. Superseded prices are archived after the push instead.
    superseded.push({ secret: w.secret, id: existing.id, was: existing.unit_amount });
    console.log(`  repriced ${w.secret}: ${existing.unit_amount} -> ${w.amount} (new ${price.id})`);
  } else {
    console.log(`  created price ${w.secret} = ${price.id}`);
  }
}

// ---- keep the product copy in sync ----------------------------------------
// The product is only created once, so editing PRODUCT_DESCRIPTION above would
// otherwise never reach an account that already has the product. This is
// customer-facing copy on the checkout page, so it is worth converging.
if (productId) {
  const prod = await stripe("GET", `products/${productId}`);
  if (prod.description !== PRODUCT_DESCRIPTION) {
    await stripe("POST", `products/${productId}`, { description: PRODUCT_DESCRIPTION });
    console.log(`  updated product description on ${productId}`);
  }
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
let webhookSecret = WEBHOOK_SECRET_EXISTING;
if (doWebhook && !webhookSecret) {
  const existing = await stripe("GET", "webhook_endpoints?limit=100");
  const dup = (existing.data || []).find((w) => w.url === WEBHOOK_URL);
  if (dup) fail(`webhook for ${WEBHOOK_URL} already exists in ${stripeMode} mode (${dup.id}) but its secret is not in .env as ${WEBHOOK_VAR} - delete it in the Stripe dashboard and re-run, or add its whsec_ to .env as ${WEBHOOK_VAR}`);
  const wh = await stripe("POST", "webhook_endpoints", { url: WEBHOOK_URL, "enabled_events[]": "checkout.session.completed" });
  webhookSecret = wh.secret;
  appendFileSync(ENV_PATH, `\n${WEBHOOK_VAR}=${webhookSecret}`);
  console.log(`  created webhook ${wh.id} → ${WEBHOOK_URL} (secret appended to .env as ${WEBHOOK_VAR})`);
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
// ---- retire superseded prices ----------------------------------------------
// Only now that the Worker is serving the new price ids is it safe to archive
// the old ones. Archiving makes a price unusable for new Checkout Sessions;
// subscriptions already billing on it are unaffected and keep their amount
// until they are migrated deliberately.
for (const s of superseded) {
  await stripe("POST", `prices/${s.id}`, { active: "false" });
  console.log(`  archived old ${s.secret} price ${s.id} (was ${s.was})`);
}

console.log("✓ done" + (doWebhook ? "" : " - run again with --webhook once api.zeroshothq.dev is live"));
