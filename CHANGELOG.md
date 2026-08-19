# Changelog

All notable changes to Zero Shot - the API, the CLI, and the flavors - are
documented here. Format follows [Keep a Changelog](https://keepachangelog.com/);
versions track releases cut from this repo (`cli-v*` tags publish the CLI).

## [Unreleased]

### Changed (delivery gate)
- The free skill is now delivered on waitlist signup instead of being
  publicly downloadable. `GET /v1/skills/warmup` requires `?key=pk_zs_...`
  (waitlist membership, checked server-side in D1); without it: 403 with a
  join hint. The signup email carries a personal one-click link, and
  `zeroshot pour warmup` uses the key saved by `zeroshot waitlist` (or
  `--key`). The skill source moved out of the public repo (KV is the only
  serving copy), so the `npx skills add` and Claude Code plugin install
  paths were removed along with the `.claude-plugin/` manifests. Eval suite
  and published results remain public; harness defaults now point at the
  local (untracked) source copy. The ecosystem paths were then restored as
  a funnel: `skills/warmup/SKILL.md` is a signup pointer (join + pour
  instructions), so `npx skills add` and the plugin marketplace install the
  pointer, never the skill.

### Added
- Zero-caffeine variants: every caffeinated flavor also pours as
  `<flavor>-zero` (same can, 0mg) - flagged per model card
  (`zero_variant`), accepted in subscription flavor lists, noted by
  `zeroshot flavors`. Mixed Precision 24 orders take `"zero": true` to pour
  the whole build decaf. `dropout` has no variant; it is already the zero.
- Four new endpoints: `GET /v1/skills` (skill index with ids, tiers,
  versions), `GET /v1/waitlist/{pk_key}` (position + referrals earned),
  `GET /v1/subscriptions/{id}` (plan, status, renewal date), and
  `GET /v1/admin/stats` (private totals, admin bearer only - never callable
  from the site).
- CLI 1.2.0: `skills`, `spot`, `subscription <id>`, and `stats` (reads
  `ZEROSHOT_ADMIN_BEARER` from the environment).
- Skill eval harness (`packages/evals/`): with-vs-without A/B benchmark,
  zero dependencies. Six adversarially hardened tasks with real failing
  tests, Wilson confidence intervals, anti-cheat rules, and a CI dry-run
  smoke test. Results publish only after clearing the ship bar.
- Automated Stripe setup: `setup-secrets.mjs` creates the product + prices,
  generates internal secrets, and pushes Worker secrets from a local `.env`
  (values never printed), with `--webhook` wiring checkout webhooks.
- API smoke tests and CLI tests (`node --test`), run in CI against a local
  `wrangler dev` with emulated D1/KV.
- Operator deploy runbook at `packages/api/DEPLOY.md`.

### Changed
- The free skill is now named `warmup` (zeroshot is the product, warmup is
  its free skill). `zeroshot pour warmup` is canonical; `pour zeroshot` and
  the old API path keep working as legacy aliases. CLI 1.1.0.
- README skills section restructured: per-skill install commands and a table
  of all skills (folder, install name, job, status).
- Build minimum qualifications refreshed from real 2025-2026 job postings
  (researched across OpenAI, Anthropic, Meta, Scale, Databricks, and others);
  README flavors and builds sections are now tables.
- npm package renamed to `@zeroshothq/zeroshot` (the bare name is squatted);
  the command is still `zeroshot`.
- Home is now `zeroshothq.dev` / `api.zeroshothq.dev` under the `zeroshothq`
  GitHub org; custom domain is provisioned from `wrangler.toml` on deploy.
- API root motto: "git push --force origin main"

### Fixed
- Error responses now send CORS headers as HTTP headers instead of leaking
  them into the JSON body (browser clients couldn't read API errors).
- Rate-limit (429) responses carry CORS headers.
- Checkout no longer requires Stripe terms-of-service consent until a public
  terms page exists.
- CI: wrangler pinned (older workerd rejected our compatibility date),
  Node 22 (wrangler ≥4.123 requirement), lockfile + `npm ci` for
  reproducible runs, valid YAML in the publish workflow.

## [1.0.2] - 2026-08-18

Initial public release.

### Added
- **API** (Cloudflare Worker): waitlist with referral keys, flavors and
  builds catalogs, the Reverse Recruiter (`/v1/recommend`, Claude-powered
  with keyword fallback), shareable stacks, Stripe subscriptions and the
  qualification-gated Mixed Precision 24 order flow (`X-YOLO` honored),
  signed expiring premium-skill downloads, Stripe webhook fulfillment with
  email delivery, admin order-status endpoint, per-IP rate limiting.
- **CLI** (`zeroshot`): recommend, order, subscribe, waitlist, pour, flavors,
  status, cancel, and a fully local `consume` caffeine log. Zero
  dependencies. Zero telemetry.
- **Flavors**: six model cards in `flavors/flavors.json` - the single source
  of truth for API, CLI, and site.
- **Skills**: the free `zeroshot` core preset in-repo; six premium presets
  delivered by signed email links with any paid order.
- **CI/CD**: tests on every push and PR, API deploy on `main`, CLI publish
  on `cli-v*` tags.
