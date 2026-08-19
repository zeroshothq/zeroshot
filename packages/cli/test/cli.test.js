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
  for (const id of ["diffusion", "gaussian", "backprop", "relu", "descent", "dropout"]) assert.ok(out.includes(id), id);
  assert.ok(out.includes("250"), "descent's 250mg");
});

test("flavors --json emits parseable JSON", async () => {
  const { out } = await run("flavors", "--json");
  const data = JSON.parse(out);
  assert.equal(data.length, 6);
});

test("flavors --changelog shows version history", async () => {
  const { code, out } = await run("flavors", "--changelog", "descent");
  assert.equal(code, 0);
  assert.ok(out.includes("1.1.0"));
});

test("status shows operational services", async () => {
  const { code, out } = await run("status");
  assert.equal(code, 0);
  assert.ok(out.includes("api - operational"));
  assert.ok(out.includes("kevin"));
});

test("consume logs a can and warns near the FDA line", async () => {
  let r = await run("consume", "--flavor", "descent");
  assert.equal(r.code, 0);
  assert.ok(r.out.includes("Logged: descent (250mg)"));
  assert.ok(r.out.includes("Today: 250mg"));
  r = await run("consume", "--flavor", "descent");
  assert.ok(r.out.includes("400mg/day"), "second descent (500mg) should trigger the warning");
});

test("consume --stats renders the 7-day sparkline", async () => {
  const { code, out } = await run("consume", "--stats");
  assert.equal(code, 0);
  assert.ok(out.includes("7d mg/day"));
  assert.ok(out.includes("500mg"), "two descents logged above");
});

test("consume rejects unknown flavors", async () => {
  const { code, err } = await run("consume", "--flavor", "espresso");
  assert.equal(code, 1);
  assert.ok(err.includes("unknown flavor"));
});

test("pour warmup without a key explains the waitlist gate", async () => {
  const { code, err } = await run("pour", "warmup");
  assert.equal(code, 1);
  assert.ok(err.includes("waitlist"));
});

test("waitlist signup saves the pk_ key, which unlocks pour", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const w = await run("waitlist", "cli-gate-test@example.com");
  assert.equal(w.code, 0);
  assert.ok(w.out.includes("pk_zs_"));

  const dest = path.join(FAKE_HOME, "skills");
  const { code, out } = await run("pour", "warmup", "--to", dest);
  assert.equal(code, 0);
  assert.ok(out.includes("Poured warmup"));
  const file = path.join(dest, "warmup", "SKILL.md");
  assert.ok(existsSync(file));
  assert.ok(readFileSync(file, "utf8").length > 0);
});

test("pour zeroshot (legacy alias) still installs the warmup skill", { skip: !WRITES && "set ZEROSHOT_TEST_WRITES=1" }, async () => {
  const dest = path.join(FAKE_HOME, "skills-alias");
  const { code, out } = await run("pour", "zeroshot", "--to", dest);
  assert.equal(code, 0);
  assert.ok(out.includes("Poured warmup"));
  assert.ok(existsSync(path.join(dest, "warmup", "SKILL.md")));
});

test("pour warmup with a bogus --key is rejected", async () => {
  const { code, err } = await run("pour", "warmup", "--key", "pk_zs_bogus");
  assert.equal(code, 1);
  assert.ok(err.includes("Join first") || err.includes("waitlist"));
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

test("skills lists warmup and the premium six", async () => {
  const { code, out } = await run("skills");
  assert.equal(code, 0);
  assert.ok(out.includes("warmup"));
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
