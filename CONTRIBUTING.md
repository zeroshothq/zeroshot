# Contributing

## Repository layout

```
flavors/           source of truth (flavors.json) + model cards — PR new flavors here
skills/zeroshot/   the free agent skill
skills-premium/    gitignored — premium skill sources, uploaded to KV, emailed on purchase
packages/api/      Cloudflare Worker (Stripe, Resend, D1, KV, the Recruiter)
packages/cli/      npm "@zeroshothq/zeroshot" — zero dependencies, zero telemetry
.github/workflows/ test · deploy-api (on main) · publish-cli (on cli-v* tags)
```

## How to contribute

- Flavor proposals: open a PR adding a model card to `flavors/` using an
  existing card as the template. The top community proposal each quarter
  goes into real production planning.
- Code: PRs to `packages/` need tests green. Keep diffs minimal.
- Merged contributors get a 12-pack shipped via `POST /v1/orders` on us —
  leave a contact in the PR description or email merge@zeroshothq.dev.
