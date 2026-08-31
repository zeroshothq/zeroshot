// Zero Shot API smoke tests - run with `node --test packages/api/test/`.
//
//   ZEROSHOT_API_URL        target base URL (default http://localhost:8787, i.e. `wrangler dev`)
//   ZEROSHOT_TEST_WRITES=1  also run tests that insert rows (recommend → stacks)
//   Batch 001 is a waitlist: no route creates a Stripe session, so there is no
//   ZEROSHOT_TEST_STRIPE gate any more. Signup tests use ZEROSHOT_TEST_WRITES.
//
// Read-only by default so the suite is safe against production.

const { test } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.ZEROSHOT_API_URL || "http://localhost:8787";
const WRITES = process.env.ZEROSHOT_TEST_WRITES === "1";

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

// ---- waitlist mode -----------------------------------------------------
// Batch 001 takes emails, not payments. These write rows (waitlist + orders),
// so they sit behind ZEROSHOT_TEST_WRITES like every other writing test.
const mail = (tag) => `smoke-${tag}-${Math.random().toString(36).slice(2, 10)}@example.com`;

test("short link: GET /12 without an email tells a terminal what to run", async () => {
  const res = await get("/12", { headers: { accept: "*/*" } });
  assert.equal(res.status, 400);
  assert.match(res.headers.get("content-type"), /^text\/plain/);
  const body = await res.text();
  assert.match(body, /email=you@example\.com/);
  assert.doesNotMatch(body, /stripe/i, "nothing should point at a checkout any more");
});

test("short link: GET /12 with an email joins the list", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const res = await get(`/12?email=${encodeURIComponent(mail("get12"))}&founder=smoketest`, { headers: { accept: "*/*" } });
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /You're #\d+ on the list\./);
  assert.match(body, /key pk_zs_[a-f0-9]+/);
  assert.match(body, /Nobody is charged today/);
  assert.match(body, /Your handle smoketest goes in FOUNDERS\.md\./);
  for (const line of body.split("\n")) assert.ok(line.length <= 80, `line too wide: ${line.length}`);
});

test("short link: POST /12 returns a waitlist spot, not a checkout", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const body = await (await post("/12", { email: mail("post12"), flavors: ["attention"] })).json();
  assert.equal(body.status, "waitlisted");
  assert.equal(body.plan, "standard");
  assert.match(body.public_key, /^pk_zs_/);
  assert.ok(body.position >= 1);
  assert.equal(body.checkout_url, undefined, "no checkout url may survive in waitlist mode");
});

test("short link: /48 is the team plan and a repeat email is idempotent", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const email = mail("repeat");
  const first = await (await post("/48", { email })).json();
  assert.equal(first.plan, "team");
  assert.equal(first.already_on_list, false);
  const second = await (await post("/48", { email })).json();
  assert.equal(second.already_on_list, true);
  assert.equal(second.public_key, first.public_key, "the same email keeps its key and spot");
  assert.equal(second.position, first.position);
});

test("subscriptions and orders both require an email", async () => {
  assert.equal((await post("/v1/subscriptions", { plan: "standard" })).status, 400);
  assert.equal((await post("/v1/orders",
    { sku: "mixed-precision-24", build: "llm-engineer" }, { "x-yolo": "true" })).status, 400);
});

test("orders: an attested build joins the list", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const res = await post("/v1/orders",
    { sku: "mixed-precision-24", build: "llm-engineer", email: mail("order"), zero: true },
    { "x-yolo": "true" });
  const body = await res.json();
  assert.equal(body.status, "waitlisted");
  assert.equal(body.build, "llm-engineer-zero");
  assert.match(body.public_key, /^pk_zs_/);
  assert.equal(body.checkout_url, undefined);
});

test("short link: /o/:id reports the spot it stands for", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const made = await (await post("/12", { email: mail("shorto") })).json();
  const body = await (await get(`/o/${made.id}`)).json();
  assert.equal(body.id, made.id);
  assert.equal(body.status, "waitlisted");
  assert.equal(body.public_key, made.public_key);
  assert.match(body.spot_url, /\/v1\/waitlist\/pk_zs_/);
});

test("short link: /o/:id on an unknown order is a 404", async () => {
  assert.equal((await get("/o/sub_deadbeefdead")).status, 404);
});

test("withdrawing an interest leaves the waitlist row alone", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const made = await (await post("/12", { email: mail("withdraw") })).json();
  const gone = await (await fetch(`${BASE}/v1/subscriptions/${made.id}`, { method: "DELETE" })).json();
  assert.equal(gone.status, "withdrawn");
  const spot = await (await get(`/v1/waitlist/${made.public_key}`)).json();
  assert.ok(spot.position >= 1, "the person is still on the list");
});

test("waitlist: DELETE removes the row and scrubs the email off orders", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const made = await (await post("/12", { email: mail("leave") })).json();
  assert.equal((await get(`/v1/waitlist/${made.public_key}`)).status, 200);

  const res = await fetch(`${BASE}/v1/waitlist/${made.public_key}`, { method: "DELETE" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.deleted, true);
  assert.ok(body.orders_scrubbed >= 1, "the email must be cleared off the order row too");

  // Gone, and gone idempotently.
  assert.equal((await get(`/v1/waitlist/${made.public_key}`)).status, 404);
  assert.equal((await fetch(`${BASE}/v1/waitlist/${made.public_key}`, { method: "DELETE" })).status, 404);

  // The intent row survives without an address: it is what Batch 001 is sized
  // against, and a count is not personal data.
  const order = await (await get(`/o/${made.id}`)).json();
  assert.equal(order.status, "waitlisted");
  assert.equal(order.public_key, null, "no key should resolve once the waitlist row is gone");
});

test("waitlist: DELETE on an unknown key is a 404", async () => {
  assert.equal((await fetch(`${BASE}/v1/waitlist/pk_zs_deadbeefdead`, { method: "DELETE" })).status, 404);
});

// A hint is only worth emitting if it runs. This asserts the shape and that the
// build it names is one /v1/orders will actually honour - that route maps an
// unknown build to "unspecified", so echoing a build id blindly would hand the
// caller a command that quietly orders something else.
test("recommend: the next hint names a build orders will honour", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const rec = await (await post("/v1/recommend", { query: "staff LLM engineer" })).json();
  assert.ok(rec.next, "recommend must say what to do next");
  assert.match(rec.next, /^curl -X POST \S+\/v1\/orders /);
  assert.match(rec.next, /"sku":"mixed-precision-24"/);
  assert.match(rec.next, /"i_meet_the_requirements":true/);

  const build = rec.next.match(/"build":"([^"]+)"/)[1];
  const builds = await (await get("/v1/builds")).json();
  assert.ok(build === "unspecified" || builds[build],
    `the hint names ${build}, which /v1/orders would silently replace`);
});

// curl defaults to GET, so a POST-only route used to answer `curl .../v1/orders`
// with a 404 that blamed the path and sent people hunting for a typo that was
// not there. Wrong method is 405, wrong path is 404, and they must not swap.
test("wrong method is a 405 that names the verb, not a 404", async () => {
  for (const [p, verb] of [["/v1/orders", "POST"], ["/v1/subscriptions", "POST"],
                           ["/v1/waitlist", "POST"], ["/v1/recommend", "POST"]]) {
    const res = await get(p);
    assert.equal(res.status, 405, `${p} should be 405 on GET`);
    assert.equal(res.headers.get("allow"), verb, `${p} must advertise Allow: ${verb}`);
    assert.match((await res.json()).error, new RegExp(`${p} accepts ${verb}`));
  }
});

test("a singular/plural slip names the route it meant", async () => {
  const body = await (await get("/v1/order")).json();
  assert.match(body.error, /did you mean \/v1\/orders\?/);
  // A genuinely unknown path gets no guess.
  assert.match((await (await get("/v1/nonsense")).json()).error, /^not found - see /);
});
