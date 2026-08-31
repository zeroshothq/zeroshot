// Zero Shot CLI tests - run with `node --test packages/cli/test/`.
// Spawns the real binary against $ZEROSHOT_API_URL (default http://localhost:8787).
// HOME/USERPROFILE are pointed at a temp dir so config + consumption logs never
// touch the real user profile. ZEROSHOT_TEST_WRITES=1 enables tests that insert
// server-side rows (recommend).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const { mkdtempSync, existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const BIN = path.join(__dirname, "..", "bin", "zeroshot.js");
const API = process.env.ZEROSHOT_API_URL || "http://localhost:8787";
const WRITES = process.env.ZEROSHOT_TEST_WRITES === "1";
const FAKE_HOME = mkdtempSync(path.join(os.tmpdir(), "zs-cli-test-"));

function run(...args) {
  return new Promise((resolve) => {
    execFile("node", [BIN, ...args], {
      env: { ...process.env, ZEROSHOT_API_URL: API, NO_COLOR: "1", HOME: FAKE_HOME, USERPROFILE: FAKE_HOME, ZEROSHOT_ADMIN_BEARER: "" },
      timeout: 30000,
    }, (error, stdout, stderr) => resolve({ code: error ? error.code || 1 : 0, out: stdout, err: stderr }));
  });
}

test("help shows the can and command list", async () => {
  const { code, out } = await run("help");
  assert.equal(code, 0);
  assert.ok(out.includes("ZERO SHOT"));
  assert.ok(out.includes("recommend"));
  assert.ok(out.includes("Zero telemetry"));
});

test("unknown command exits 2 with hint", async () => {
  const { code, err } = await run("chug");
  assert.equal(code, 2);
  assert.ok(err.includes("unknown command"));
});

test("flavors lists all six with caffeine", async () => {
  const { code, out } = await run("flavors");
  assert.equal(code, 0);
  for (const id of ["attention", "prompt", "backprop", "softmax", "gaussian", "reinforcement"]) assert.ok(out.includes(id), id);
  assert.ok(out.includes("200"), "the shelf-wide 200mg dose");
});

test("flavors --json emits parseable JSON", async () => {
  const { out } = await run("flavors", "--json");
  const data = JSON.parse(out);
  assert.equal(data.length, 6);
});

test("flavors --changelog shows version history", async () => {
  const { code, out } = await run("flavors", "--changelog", "backprop");
  assert.equal(code, 0);
  assert.ok(out.includes("1.0.3"));
});

test("status shows operational services", async () => {
  const { code, out } = await run("status");
  assert.equal(code, 0);
  assert.ok(out.includes("api - operational"));
  assert.ok(out.includes("kevin"));
});

test("consume logs a can and warns near the FDA line", async () => {
  let r = await run("consume", "--flavor", "attention");
  assert.equal(r.code, 0);
  assert.ok(r.out.includes("Logged: attention (200mg)"));
  assert.ok(r.out.includes("Today: 200mg"));
  r = await run("consume", "--flavor", "attention");
  assert.ok(r.out.includes("400mg/day"), "a second can puts the day at 400mg, on the FDA line");
});

test("consume --stats renders the 7-day sparkline", async () => {
  const { code, out } = await run("consume", "--stats");
  assert.equal(code, 0);
  assert.ok(out.includes("7d mg/day"));
  assert.ok(out.includes("400mg"), "the two cans logged above, at 200mg each");
});

test("consume rejects unknown flavors", async () => {
  const { code, err } = await run("consume", "--flavor", "espresso");
  assert.equal(code, 1);
  assert.ok(err.includes("unknown flavor"));
});

// The public skill is served by redirecting to the copy on GitHub, so this test
// needs the branch pushed and network access. It is opt-in for that reason, not
// because the path is untested: the redirect itself is asserted in the API suite.
test("pour caffeine installs the public skill with no key", { skip: process.env.ZEROSHOT_TEST_NETWORK !== "1" && "set ZEROSHOT_TEST_NETWORK=1 (needs the pushed repo copy)" }, async () => {
  const dest = path.join(FAKE_HOME, "skills-public");
  const { code, out } = await run("pour", "caffeine", "--to", dest);
  assert.equal(code, 0);
  assert.ok(out.includes("Poured caffeine"));
  const file = path.join(dest, "caffeine", "SKILL.md");
  assert.ok(existsSync(file));
  const body = readFileSync(file, "utf8");
  assert.match(body, /^name: caffeine$/m, "the installed file is the real skill, not a pointer");
});

test("pour of a premium id routes to email delivery, not a waitlist gate", async () => {
  const { code, out } = await run("pour", "diffusion");
  assert.equal(code, 0);
  assert.ok(out.includes("premium"));
  assert.ok(!out.includes("waitlist"), "no skill is waitlist-gated any more");
});

test("pour of a premium skill name explains email delivery", async () => {
  const { code, out } = await run("pour", "descent");
  assert.equal(code, 0);
  assert.ok(out.includes("premium skill"));
});

test("recommend requires a query", async () => {
  const { code, err } = await run("recommend");
  assert.equal(code, 1);
  assert.ok(err.includes("usage"));
});

test("recommend renders a 24-can build", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const { code, out } = await run("recommend", "I write CUDA kernels at 3am");
  assert.equal(code, 0);
  assert.ok(out.includes("24 cans"));
  assert.ok(out.includes("zeroshot order mixed-precision-24 --build"));
});

test("skills lists the public skill and the premium set", async () => {
  const { code, out } = await run("skills");
  assert.equal(code, 0);
  assert.ok(out.includes("caffeine"));
  assert.ok(out.includes("public"));
  assert.ok(out.includes("descent"));
  assert.ok(out.includes("premium"));
});

test("stats requires the admin bearer env", async () => {
  const { code, err } = await run("stats");
  assert.equal(code, 1);
  assert.ok(err.includes("admin only"));
});

test("spot without key or config shows usage", async () => {
  // Fresh HOME: earlier waitlist tests may have saved a pk_ key to config.
  const home = mkdtempSync(path.join(os.tmpdir(), "zs-cli-spot-"));
  const { code, err } = await new Promise((resolve) => {
    execFile("node", [BIN, "spot"], {
      env: { ...process.env, ZEROSHOT_API_URL: API, NO_COLOR: "1", HOME: home, USERPROFILE: home, ZEROSHOT_ADMIN_BEARER: "" },
      timeout: 30000,
    }, (error, stdout, stderr) => resolve({ code: error ? error.code || 1 : 0, err: stderr }));
  });
  assert.equal(code, 1);
  assert.ok(err.includes("usage"));
});

test("subscription requires an id", async () => {
  const { code, err } = await run("subscription");
  assert.equal(code, 1);
  assert.ok(err.includes("usage"));
});

test("order rejects unknown sku", async () => {
  const { code, err } = await run("order", "espresso-pack");
  assert.equal(code, 1);
  assert.ok(err.includes("usage"));
});
