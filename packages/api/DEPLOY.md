# Deploying the Zero Shot API

Operator notes for deploying to Cloudflare Workers. Product users never need
this - it's for maintainers and self-hosting forks.

All commands run from `packages/api` unless noted. Prereqs: Node ≥ 20 and a
Cloudflare account (`npx wrangler login`).

## 1. Cloudflare resources (one-time)

```bash
npx wrangler d1 create zeroshot
npx wrangler kv namespace create CACHE
npx wrangler kv namespace create PREMIUM_SKILLS
```

Paste the three printed IDs into `wrangler.toml`, then initialize the schema
on the **remote** database (the plain `npm run db:init` targets local dev):

```bash
npx wrangler d1 execute zeroshot --file=./schema.sql --remote
```

## 2. Third-party accounts

- **Stripe** - a secret key (`sk_test_...` to start). Products/prices are
  created for you in step 3.
- **Resend** - verify your sending domain, grab the API key. Without it the
  API works but sends no email - including the paid skill-delivery email.
- **Anthropic** - key for `/v1/recommend`. Optional: without it the endpoint
  falls back to keyword matching.

## 3. Secrets + Stripe wiring

Put the Stripe/Resend/Anthropic keys in the repo-root `.env` (gitignored;
any variable names - keys are detected by prefix). Then:

```bash
node scripts/setup-secrets.mjs
```

Idempotent. It creates the Stripe product + three prices (lookup-keyed, so
re-runs reuse them), generates `SKILL_SIGNING_SECRET` and `ADMIN_BEARER`,
and pushes everything to the Worker with `wrangler secret bulk`. Secret
names and price IDs are printed; values never are.

## 4. Skills into KV

```bash
scripts/upload-premium-skills.sh
```

Uploads the free skill (served openly at `/v1/skills/zeroshot`) and every
premium `SKILL.md` present in `skills-premium/` (gitignored - premium content
never lands in the public repo).

## 5. Deploy + domain

```bash
npx wrangler deploy
```

`wrangler.toml` declares the custom domain route; the first deploy
provisions it automatically (the zone must be in your Cloudflare account).
Declaring routes disables the `workers.dev` preview URL - add
`workers_dev = true` if you want both.

## 6. Stripe webhook (after the domain is live)

```bash
node scripts/setup-secrets.mjs --webhook
```

Creates the `checkout.session.completed` endpoint against the API domain and
stores its signing secret. This is the path that marks orders paid and emails
buyers their premium skill links - test it with a full test-mode checkout
(card `4242 4242 4242 4242`) before going live.

## 7. CI

GitHub secrets: `CLOUDFLARE_API_TOKEN` (deploy-api workflow deploys on every
push to `main` touching the API or flavors) and `NPM_TOKEN` (publish-cli
publishes on `cli-v*` tags).

## Tests

```bash
node --test packages/api/test/*.test.js packages/cli/test/*.test.js
```

Read-only by default. `ZEROSHOT_API_URL` targets a deployment (default
`http://localhost:8787` for `wrangler dev`); `ZEROSHOT_TEST_WRITES=1` adds
row-inserting tests; `ZEROSHOT_TEST_STRIPE=1` adds tests that create real
checkout sessions (use a test-mode key).
