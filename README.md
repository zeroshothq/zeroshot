<div align="center">

# Zero Shot

[![test](https://github.com/zeroshothq/zeroshot/actions/workflows/test.yml/badge.svg)](https://github.com/zeroshothq/zeroshot/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](packages/cli/package.json)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**You're tired. So are your agents.**

Crack open a can for yourself. Pour a skill into your agent.

> The first energy drink for you and your agent. Zero sugar. Zero shot.

</div>

Zero Shot is a frontier beverage for the humans still in the loop - and a set
of behavioral presets for their agents. No checkout form. No app. Subscribe
the way you do everything else:

```bash
curl -X POST https://api.zeroshothq.dev/v1/subscriptions \
  -d '{"plan": "standard", "flavors": ["diffusion", "gaussian"]}'
```

→ returns a Stripe checkout URL. Cans arrive. Yes, it works.

## Install the CLI

```bash
npm install -g @zeroshothq/zeroshot

zeroshot recommend "staff LLM engineer"   # your job title → your 24-can build
zeroshot order mixed-precision-24 --build llm-engineer
zeroshot pour zeroshot                    # install the free agent skill
zeroshot consume --flavor descent         # local caffeine log (offline, private)
```

## Plans

| Plan | Contents | Price |
|---|---|---|
| `free` | Waitlist + your `pk_` key (doubles as a referral code: +10 spots per signup) | $0 |
| `standard` | 12 cans/month, your flavors | $36/mo |
| `mixed-precision-24` | 24 cans, role-based builds, qualification-gated | $60 |
| `team` | Office fridge standing order, 48/month | $99/mo |
| `enterprise` | A pallet. We visit. We bring stickers | contact |

**Every paid order includes the six premium agent skills, delivered by email**
- see Agent Skills below.

## Flavors

diffusion · gaussian · backprop · relu · descent (250mg) · dropout (0mg).
Each is a versioned model card in [`flavors/`](flavors/) with params and a
changelog. `flavors/flavors.json` is the single source of truth consumed by
the API, the CLI, and the website. AGI: rolling out gradually.

## Mixed Precision 24 - role builds

Eight builds (`ml-engineer`, `deep-learning-engineer`, `llm-engineer`,
`forward-deployed-engineer`, `research-scientist`, `mlops-engineer`,
`data-engineer`, `vibe-coder`), each with real minimum qualifications and a
flavor mix tuned to the role. Ordering without attestation returns:

```
403 minimum_qualifications_not_met
```

with the build's requirements. Retry with `"i_meet_the_requirements": true`
(self-attestation accepted) - or send header `X-YOLO: true`.

Don't know your build? Ask the Reverse Recruiter:

```bash
curl -X POST https://api.zeroshothq.dev/v1/recommend \
  -d '{"query": "I write CUDA at 3am"}'
```

## Agent Skills - digital cans

Agents can't metabolize caffeine, but they can metabolize context. Skills are
behavioral presets you pour into a coding agent's context.

- **Free (in this repo):** [`skills/zeroshot`](skills/zeroshot/SKILL.md) - the
  core boost: short plans, verify-by-running, the loop-breaker (no more
  "You're absolutely right. Retrying."), clean handoffs.
  Install: `zeroshot pour zeroshot`
- **Premium (six):** `descent` (ship) · `diffusion` (explore) · `dropout`
  (review) · `backprop` (debug) · `gaussian` (communicate) · `relu`
  (simplify). **Included with any paid order or subscription** - after
  checkout, signed download links arrive at your order email (valid 30 days).
  Install: `zeroshot pour --url "<your emailed link>"`

Skills make measurable claims: each ships with an eval suite run
with-vs-without the skill across repeated trials. Methodology and results are
published - no benchmark on a can that isn't reproducible.

## API

Base: `https://api.zeroshothq.dev/v1` · Full reference: [zeroshothq.dev/docs](https://zeroshothq.dev/docs)

| Method | Path | What it does |
|---|---|---|
| POST | `/waitlist` | Join; returns your `pk_` referral key; emails the free skill |
| GET | `/flavors` | Model cards with params + changelog |
| GET | `/builds` | Build names, mixes, taglines, requirements |
| POST | `/recommend` | Job title in → 24-can build out (+ share_url) |
| GET | `/stacks/{id}` | A shared recommendation result |
| POST | `/subscriptions` | standard/team → Stripe checkout URL |
| DELETE | `/subscriptions/{id}` | Stripe customer portal handoff |
| POST | `/orders` | Mixed Precision 24 (403 without attestation; `X-YOLO` bypass) |
| GET | `/orders/{id}` | pending → paid → packed → shipped → delivered |
| GET | `/skills/{id}` | Free skill open; premium requires the signed email link |
| GET | `/status` | api · fulfillment · kevin |

Rate limits: 60 req/min (10/min on `/recommend`). Exceeding returns
`429 - "you've had enough. drink water."`

## Contributing

Flavor proposals land as model-card PRs in `flavors/`; the top community
proposal each quarter goes into real production planning. Merged contributors
get a 12-pack on us. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Compliance

200–250mg caffeine per can (dropout: 0mg). Not recommended for children or
persons sensitive to caffeine. Pre-orders are purchases of beverages, not
securities. Code is MIT ([LICENSE](LICENSE)); the brand is not ([BRAND.md](BRAND.md)).

---

`Ship more PRs.™`
