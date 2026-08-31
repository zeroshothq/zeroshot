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
    ["attention", "backprop", "gaussian", "prompt", "reinforcement", "softmax"]);
  // One spec across the shelf, read off the printed can.
  for (const f of flavors) {
    assert.equal(f.params.caffeine_mg, 200, `${f.id} must be 200mg`);
    assert.equal(f.params.l_theanine_mg, 100, `${f.id} must be 100mg L-theanine`);
    assert.equal(f.params.sugar_g, 0, `${f.id} must be zero sugar`);
    assert.equal(f.zero_variant, true, `${f.id} must pour as a zero edition`);
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

test("skills: the public skill needs no key and redirects to the repo source", async () => {
  const res = await fetch(`${BASE}/v1/skills/caffeine`, { redirect: "manual" });
  assert.equal(res.status, 302, "public skills are a redirect, not a second copy of the text");
  assert.match(res.headers.get("location") || "", /raw\.githubusercontent\.com\/.+\/skills\/caffeine\/SKILL\.md$/);
  assert.ok(res.headers.get("access-control-allow-origin"), "CORS headers travel with the redirect");
});

test("skills: the index lists the public skill with no requirement", async () => {
  const { skills } = await (await get("/v1/skills")).json();
  const pub = skills.find((s) => s.id === "caffeine");
  assert.ok(pub, "caffeine is in the index");
  assert.equal(pub.tier, "public");
  assert.equal(pub.install, "zeroshot pour caffeine");
  assert.match(pub.requires, /no key/);
  // Adding a public tier must not un-gate anything else: every other skill is premium.
  assert.ok(skills.some((s) => s.tier === "premium"));
  assert.equal(skills.filter((s) => s.tier === "free").length, 0, "no skill is waitlist-gated any more");
});

test("skills: a waitlist key no longer unlocks anything", async () => {
  // No skill is waitlist-gated, so a pk_ key buys nothing on a premium id.
  const res = await get("/v1/skills/descent?key=pk_zs_bogus");
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /signature|expired/);
  assert.equal((await get("/v1/skills/descent")).status, 403);
});

test("skills: the retired zeroshot alias is gone, not silently served", async () => {
  // `zeroshot` aliased to warmup until warmup was retired. With the skill gone
  // the alias goes with it, so the id must 404 rather than resolve to anything.
  assert.equal((await get("/v1/skills/zeroshot?email=a@b.c&exp=9999999999&sig=bogus")).status, 404);
  assert.equal((await get("/v1/skills/nosuchskill")).status, 404);
});

test("skills: premium requires a valid signed link", async () => {
  assert.equal((await get("/v1/skills/descent")).status, 403);
  assert.equal((await get("/v1/skills/descent?email=a@b.c&exp=9999999999&sig=bogus")).status, 403);
  assert.equal((await get("/v1/skills/not-a-skill")).status, 404);
});

test("founders roster is admin-only and never leaks more than handles", async () => {
  assert.equal((await get("/v1/admin/founders")).status, 401);
  assert.equal((await get("/v1/admin/founders", { headers: { authorization: "Bearer wrong" } })).status, 401);
  const bearer = process.env.ZEROSHOT_ADMIN_BEARER;
  if (!bearer) return; // the unauthorized paths are the security-relevant half
  const res = await get("/v1/admin/founders", { headers: { authorization: `Bearer ${bearer}` } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.batch, "001");
  assert.equal(typeof body.markdown, "string");
  // The roster is generated from the opt-in table, so an order that did not opt
  // in must not appear, and nothing but a handle may cross this boundary.
  assert.ok(!JSON.stringify(body).includes("@"), "no email may appear in the roster response");
});

test("stripe webhook rejects unsigned payloads", async () => {
  const res = await post("/v1/stripe/webhook", { type: "checkout.session.completed" });
  assert.equal(res.status, 400);
});

test("admin endpoint rejects missing bearer", async () => {
  const res = await post("/v1/admin/orders/ord_x/status", { status: "shipped" });
  assert.equal(res.status, 401);
});

test("admin stats rejects missing bearer", async () => {
  assert.equal((await get("/v1/admin/stats")).status, 401);
});

test("admin stats returns totals with bearer", { skip: !process.env.ZEROSHOT_ADMIN_BEARER && "set ZEROSHOT_ADMIN_BEARER" }, async () => {
  const res = await fetch(BASE + "/v1/admin/stats", { headers: { authorization: `Bearer ${process.env.ZEROSHOT_ADMIN_BEARER}` } });
  assert.equal(res.status, 200);
  const s = await res.json();
  for (const k of ["waitlist", "orders_placed", "orders_paid", "cans_allocated"]) assert.equal(typeof s[k], "number", k);
  assert.equal(s.flavors, 6);
  assert.equal(s.sugar_g, 0);
});

test("waitlist spot: unknown key is 404", async () => {
  assert.equal((await get("/v1/waitlist/pk_zs_doesnotexist")).status, 404);
});

test("skills index lists the public skill and the premium set with versions", async () => {
  const res = await get("/v1/skills");
  assert.equal(res.status, 200);
  const { skills } = await res.json();
  assert.equal(skills.length, 7);
  assert.equal(skills.filter((s) => s.tier === "public").length, 1);
  assert.equal(skills.filter((s) => s.tier === "premium").length, 6);
  assert.equal(skills.find((s) => s.id === "warmup"), undefined, "warmup is retired");
  const caf = skills.find((s) => s.id === "caffeine");
  assert.equal(caf.tier, "public");
  assert.match(caf.version, /^\d+\.\d+\.\d+$/);
});

test("subscriptions: unknown id is 404 on GET", async () => {
  assert.equal((await get("/v1/subscriptions/sub_doesnotexist")).status, 404);
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
  const res = await post("/v1/subscriptions", { plan: "standard", flavors: ["attention", "gaussian"] });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "requires_payment");
  assert.match(body.checkout_url, /^https:\/\/checkout\.stripe\.com\//);
  const order = await (await get(`/v1/orders/${body.id}`)).json();
  assert.equal(order.status, "pending");
  const sub = await (await get(`/v1/subscriptions/${body.id}`)).json();
  assert.equal(sub.plan, "standard");
  assert.equal(sub.status, "pending");
  assert.equal(sub.cans_per_month, 12);
});

test("short link: POST /12 matches the standard plan", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const res = await post("/12", { flavors: ["attention"] });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.checkout_url, /^https:\/\/checkout\.stripe\.com\//);
  const sub = await (await get(`/v1/subscriptions/${body.id}`)).json();
  assert.equal(sub.plan, "standard");
  assert.equal(sub.cans_per_month, 12);
  assert.deepEqual(sub.flavors, ["attention"]);
});

// A browser gets the redirect that opens checkout. A terminal must not, because
// curl -L would follow it and print ~38kB of Stripe's checkout markup.
test("short link: GET /12 redirects a browser to Stripe", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const res = await get("/12?f=attention,gaussian",
    { redirect: "manual", headers: { accept: "text/html,application/xhtml+xml" } });
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location"), /^https:\/\/checkout\.stripe\.com\//);
});

test("short link: GET /12 gives a terminal short readable text", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const res = await get("/12", { redirect: "manual", headers: { accept: "*/*" } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /^text\/plain/);
  const body = await res.text();
  // The whole point: it fits on a screen and wraps in no terminal.
  assert.ok(body.length < 400, `receipt was ${body.length} bytes`);
  for (const line of body.split("\n")) assert.ok(line.length <= 80, `line too wide: ${line.length}`);
  assert.match(body, /\$42\/mo/);
  assert.match(body, /\/o\/sub_[a-f0-9]+/);
  assert.match(body, /The first energy drink for you and your AI agent\./);
  assert.match(body, /Batch 001 pre-order: cans ship November 2026\./);
});

// Ordering is not consent to be published, so the receipt must invite a buyer
// who supplied no handle rather than telling them they are being listed.
test("short link: receipt only claims a FOUNDERS.md listing when opted in", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const plain = await (await get("/12", { headers: { accept: "*/*" } })).text();
  assert.match(plain, /Add \?founder=yourhandle to be listed in FOUNDERS\.md\./);
  assert.doesNotMatch(plain, /goes in FOUNDERS\.md/);

  const opted = await (await get("/12?founder=testhandle", { headers: { accept: "*/*" } })).text();
  assert.match(opted, /Your handle testhandle goes in FOUNDERS\.md\./);
  assert.doesNotMatch(opted, /Add \?founder=/);
});

test("short link: /o/:id resolves back to the Stripe session", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const body = await (await post("/12", {})).json();
  assert.match(body.short_url, /\/o\/sub_[a-f0-9]+$/);
  const res = await get(`/o/${body.id}`, { redirect: "manual" });
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location"), /^https:\/\/checkout\.stripe\.com\//);
});

test("short link: /o/:id on an unknown order is a 404", async () => {
  const res = await get("/o/sub_deadbeefdead", { redirect: "manual" });
  assert.equal(res.status, 404);
});

// Every checkout endpoint answers a terminal the same way, so there is one
// receipt to keep correct rather than four.
test("checkout: every endpoint renders the same receipt on Accept: text/plain", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const bodies = await Promise.all([
    get("/12", { headers: { accept: "text/plain" } }).then((r) => r.text()),
    post("/v1/subscriptions", { plan: "standard" }, { accept: "text/plain" }).then((r) => r.text()),
    post("/v1/orders", { sku: "mixed-precision-24", build: "llm-engineer" },
      { accept: "text/plain", "x-yolo": "true" }).then((r) => r.text()),
  ]);
  for (const b of bodies) {
    assert.match(b, /The first energy drink for you and your AI agent\./);
    assert.match(b, /Click on the URL below to pay:/);
    assert.match(b, /Batch 001 pre-order: cans ship November 2026\./);
    assert.match(b, /Your premium agent skills are emailed the moment you pay\./);
    assert.match(b, /\/o\/(sub|ord)_[a-f0-9]+/);
    for (const line of b.split("\n")) assert.ok(line.length <= 80, `line too wide: ${line.length}`);
  }
});

// Installed CLI versions parse JSON and send no Accept header. If a bare */* on
// POST ever starts returning text, every one of them breaks mid-order.
test("checkout: POST without an Accept header still returns JSON", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  for (const [p, b] of [["/12", {}], ["/v1/subscriptions", { plan: "standard" }]]) {
    const res = await post(p, b);
    assert.match(res.headers.get("content-type"), /^application\/json/, `${p} stopped returning JSON`);
    const body = await res.json();
    assert.match(body.checkout_url, /^https:\/\/checkout\.stripe\.com\//);
    assert.match(body.short_url, /\/o\/sub_[a-f0-9]+$/);
  }
});

test("short link: /48 is the team plan", { skip: !STRIPE && "set ZEROSHOT_TEST_STRIPE=1" }, async () => {
  const body = await (await post("/48", {})).json();
  const sub = await (await get(`/v1/subscriptions/${body.id}`)).json();
  assert.equal(sub.plan, "team");
  assert.equal(sub.cans_per_month, 48);
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
