# Changelog

All notable changes to Zero Shot - the API, the CLI, and the flavors - are
documented here. Format follows [Keep a Changelog](https://keepachangelog.com/);
versions track releases cut from this repo (`cli-v*` tags publish the CLI).

## [Unreleased]

### Added
- Automated Stripe setup: `setup-secrets.mjs` creates the product + prices,
  generates internal secrets, and pushes Worker secrets from a local `.env`
  (values never printed), with `--webhook` wiring checkout webhooks.
- API smoke tests and CLI tests (`node --test`), run in CI against a local
  `wrangler dev` with emulated D1/KV.
- Operator deploy runbook at `packages/api/DEPLOY.md`.

### Changed
- npm package renamed to `@zeroshothq/zeroshot` (the bare name is squatted);
  the command is still `zeroshot`.
- Home is now `zeroshothq.dev` / `api.zeroshothq.dev` under the `zeroshothq`
  GitHub org; custom domain is provisioned from `wrangler.toml` on deploy.
- API root motto: "Push to main."

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
