// Zero Shot API smoke tests - run with `node --test packages/api/test/`.
//
//   ZEROSHOT_API_URL        target base URL (default http://localhost:8787, i.e. `wrangler dev`)
//   ZEROSHOT_TEST_WRITES=1  also run tests that insert rows (recommend → stacks)
//   ZEROSHOT_TEST_STRIPE=1  also run tests that create real Stripe checkout sessions
//
// Read-only by default so the suite is safe against production.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.ZEROSHOT_API_URL || "http://localhost:8787";
const WRITES = process.env.ZEROSHOT_TEST_WRITES === "1";
const STRIPE = process.env.ZEROSHOT_TEST_STRIPE === "1";

const get = (p, opts) => fetch(BASE + p, opts);
const post = (p, body, headers = {}) =>
  fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("status reports operational", async () => {
  const res = await get("/v1/status");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.api, "operational");
  assert.equal(body.kevin, "caffeinated");
});

test("root returns name, docs, motto", async () => {
  const body = await (await get("/v1")).json();
  assert.equal(body.name, "zeroshot");
  assert.match(body.docs, /^https:\/\//);
  assert.ok(body.motto.length > 0);
});

test("flavors: six, correct caffeine params", async () => {
  const res = await get("/v1/flavors");
  assert.equal(res.status, 200);
  const flavors = await res.json();
  assert.equal(flavors.length, 6);
  const byId = Object.fromEntries(flavors.map((f) => [f.id, f]));
  assert.deepEqual(Object.keys(byId).sort(),
    ["backprop", "descent", "diffusion", "dropout", "gaussian", "relu"]);
  assert.equal(byId.descent.params.caffeine_mg, 250);
  assert.equal(byId.dropout.params.caffeine_mg, 0);
  for (const f of flavors) {
    assert.equal(f.params.sugar_g, 0, `${f.id} must be zero sugar`);
    assert.ok(f.version && f.changelog.length > 0, `${f.id} needs version + changelog`);
  }
});

test("builds: eight, every mix sums to 24, requirements present", async () => {
  const builds = await (await get("/v1/builds")).json();
  assert.equal(Object.keys(builds).length, 8);
  for (const [id, b] of Object.entries(builds)) {
    assert.ok(b.name && b.tagline, `${id} needs name + tagline`);
    assert.ok(Array.isArray(b.requirements) && b.requirements.length > 0, `${id} needs requirements`);
    if (b.mix) {
      const sum = Object.values(b.mix).reduce((a, c) => a + c, 0);
      assert.equal(sum, 24, `${id} mix sums to ${sum}, not 24`);
    }
  }
});

test("agi is rolling out gradually (404)", async () => {
  const res = await get("/v1/agi");
  assert.equal(res.status, 404);
  assert.equal((await res.json()).status, "rolling out gradually");
});

test("unknown route: 404 with CORS headers in HEADERS, not body", async () => {
  const res = await get("/v1/definitely-not-a-route");
  assert.equal(res.status, 404);
  assert.ok(res.headers.get("access-control-allow-origin"), "error responses must carry CORS headers");
  const body = await res.json();
  assert.ok(body.error.includes("not found"));
  assert.equal(body["access-control-allow-origin"], undefined, "CORS must not leak into the body");
});

test("OPTIONS preflight returns CORS headers", async () => {
  const res = await fetch(BASE + "/v1/flavors", { method: "OPTIONS", headers: { origin: "http://localhost:3000" } });
  assert.ok(res.headers.get("access-control-allow-methods").includes("POST"));
});

test("waitlist rejects invalid email", async () => {
  const res = await post("/v1/waitlist", { email: "notanemail" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "valid email required");
});

test("recommend rejects empty query", async () => {
  const res = await post("/v1/recommend", { query: "  " });
  assert.equal(res.status, 400);
});

test("orders: qualification gate returns 403 with requirements + hint", async () => {
  const res = await post("/v1/orders", { sku: "mixed-precision-24", build: "llm-engineer" });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "minimum_qualifications_not_met");
  assert.equal(body.build, "llm-engineer");
  assert.ok(body.requirements.length >= 3);
  assert.ok(body.hint.includes("X-YOLO"));
});

test("orders: bad sku is 400, unknown order is 404", async () => {
  assert.equal((await post("/v1/orders", { sku: "nope" })).status, 400);
  assert.equal((await get("/v1/orders/ord_doesnotexist")).status, 404);
});

test("subscriptions: enterprise short-circuits to sales contact", async () => {
  const res = await post("/v1/subscriptions", { plan: "enterprise" });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).contact, "sales@zeroshothq.dev");
});

test("subscriptions: unknown plan is 400", async () => {
  assert.equal((await post("/v1/subscriptions", { plan: "mega" })).status, 400);
});

test("skills: free skill is served openly", async () => {
  const res = await get("/v1/skills/zeroshot");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/markdown/);
  assert.ok((await res.text()).length > 0);
});

test("skills: premium requires a valid signed link", async () => {
  assert.equal((await get("/v1/skills/descent")).status, 403);
  assert.equal((await get("/v1/skills/descent?email=a@b.c&exp=9999999999&sig=bogus")).status, 403);
  assert.equal((await get("/v1/skills/not-a-skill")).status, 404);
});

test("stripe webhook rejects unsigned payloads", async () => {
  const res = await post("/v1/stripe/webhook", { type: "checkout.session.completed" });
  assert.equal(res.status, 400);
});

test("admin endpoint rejects missing bearer", async () => {
  const res = await post("/v1/admin/orders/ord_x/status", { status: "shipped" });
  assert.equal(res.status, 401);
});

// ---- write tests (insert rows) --------------------------------------------

test("recommend → stack share roundtrip", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const res = await post("/v1/recommend", { query: "staff LLM engineer, mostly RAG and evals" });
  assert.equal(res.status, 200);
  const rec = await res.json();
  assert.ok(rec.build_id);
  assert.ok(rec.roast.length > 0);
  const sum = Object.values(rec.mix).reduce((a, c) => a + c, 0);
  assert.equal(sum, 24, "mix must sum to 24 cans");
  assert.match(rec.share_url, /\/stack\/[a-z0-9]+$/);
  const stackId = rec.share_url.split("/").pop();
  const stack = await (await get(`/v1/stacks/${stackId}`)).json();
  assert.equal(stack.build_id, rec.build_id);
  assert.equal((await get("/v1/stacks/nope")).status, 404);
});

// ---- stripe tests (create real checkout sessions; test-mode key expected) --

test("subscriptions: standard returns a Stripe checkout URL", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const res = await post("/v1/subscriptions", { plan: "standard", flavors: ["diffusion", "gaussian"] });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "requires_payment");
  assert.match(body.checkout_url, /^https:\/\/checkout\.stripe\.com\//);
  const order = await (await get(`/v1/orders/${body.id}`)).json();
  assert.equal(order.status, "pending");
});

test("orders: attested order returns a Stripe checkout URL", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const res = await post("/v1/orders", { sku: "mixed-precision-24", build: "vibe-coder", i_meet_the_requirements: true });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.checkout_url, /^https:\/\/checkout\.stripe\.com\//);
});

test("orders: X-YOLO header bypasses the gate", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const res = await post("/v1/orders", { sku: "mixed-precision-24" }, { "x-yolo": "true" });
  assert.equal(res.status, 200);
  assert.match((await res.json()).checkout_url, /^https:\/\/checkout\.stripe\.com\//);
});
