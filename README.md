<div align="center"><pre>
███████ ███████ ██████   ██████      ███████ ██   ██  ██████  ████████&nbsp;
   ███  ██      ██   ██ ██    ██     ██      ██   ██ ██    ██    ██   &nbsp;
  ███   █████   ██████  ██    ██     ███████ ███████ ██    ██    ██   &nbsp;
 ███    ██      ██   ██ ██    ██          ██ ██   ██ ██    ██    ██   &nbsp;
███████ ███████ ██   ██  ██████      ███████ ██   ██  ██████     ██   &nbsp;
                                                                      &nbsp;
                           Merge more PRs.™                           &nbsp;
</pre></div>

<div align="center">

[![test](https://github.com/zeroshothq/zeroshot/actions/workflows/test.yml/badge.svg)](https://github.com/zeroshothq/zeroshot/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/%40zeroshothq%2Fzeroshot?logo=npm&color=cb3837)](https://www.npmjs.com/package/@zeroshothq/zeroshot)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](packages/cli/package.json)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**You're tired. So are your agents.**

Crack open a can for yourself. Pour a skill into your agent.

> The first energy drink for you and your agent. Zero sugar. Zero shot.

[Install](#install-the-cli) · [Plans](#plans) · [Flavors](#flavors) · [Skills](#skills) · [API](#api) · [Contributing](#contributing)

AI agents / LLMs: start with [`llms.txt`](llms.txt).

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
zeroshot waitlist you@example.com         # join - your pk_ key unlocks the free skill
zeroshot pour warmup                      # install it (uses your saved key)
zeroshot skills                           # every skill: tier + version
zeroshot spot                             # your waitlist position + referrals
zeroshot consume --flavor descent         # local caffeine log (offline, private)
```

## Plans

| Plan | Contents | Price |
|---|---|---|
| `free` | Waitlist + your `pk_` key: referral code (+10 spots per signup) and it unlocks the free agent skill | $0 |
| `standard` | 12 cans/month, your flavors | $36/mo |
| `mixed-precision-24` | 24 cans, role-based builds, qualification-gated | $60 |
| `team` | Office fridge standing order, 48/month | $99/mo |
| `enterprise` | A pallet. We visit. We bring stickers | contact |

**Every paid order includes the six premium agent skills, delivered by email**
- see Agent Skills below.

## Flavors

| Flavor | Taste | Caffeine | L-theanine | Sugar | Notes |
|---|---|---|---|---|---|
| `diffusion` | dragonfruit haze | 200mg | 100mg | 0g | starts as noise, ends as flavor |
| `gaussian` | white peach & cream | 200mg | 100mg | 0g | smooth. centered. perfectly distributed |
| `backprop` | blackberry | 200mg | 100mg | 0g | propagates backward through your afternoon |
| `relu` | rectified lemonade unit | 200mg | 100mg | 0g | linear above zero |
| `descent` | double espresso | 250mg | 100mg | 0g | finds your minimum, fast |
| `dropout` | chamomile citrus | 0mg | 150mg | 0g | regularize your evening |

Each flavor is a versioned model card in [`flavors/`](flavors/) with params
and a changelog. `flavors/flavors.json` is the single source of truth consumed
by the API, the CLI, and the website. AGI: rolling out gradually.

## Mixed Precision 24 - role builds

Eight builds, each with real minimum qualifications (sourced from actual
2025-2026 job postings) and a flavor mix tuned to the role:

| Build | Tagline | Minimum qualifications (abridged) |
|---|---|---|
| `ml-engineer` | You own the pipeline. The pipeline knows. | 3+ yrs production ML, Python + PyTorch/TensorFlow, cloud deploys with Docker/Kubernetes |
| `deep-learning-engineer` | Mixed precision. Literally. | CUDA/Triton kernels, GPU architecture depth, FSDP/DeepSpeed distributed training |
| `llm-engineer` | Context window: 24 cans. | Fine-tuning with LoRA/PEFT, RAG + vector databases, eval harnesses, vLLM serving |
| `forward-deployed-engineer` | Consultant, PM, and engineer. Hydration for all three. | 3+ yrs shipping software, full-stack Python/TypeScript, LLM integrations, customer travel |
| `research-scientist` | Novel contribution: staying awake. | PhD or equivalent, first-author NeurIPS/ICML/ICLR papers, PyTorch or JAX at scale |
| `mlops-engineer` | Uptime for the humans who keep uptime. | 3+ yrs MLOps/DevOps, Kubernetes + Terraform, model serving on AWS/GCP, MLflow/Kubeflow |
| `data-engineer` | Disparate sources. One fridge. | 3+ yrs data pipelines, SQL + Python, Spark, Airflow + dbt, Snowflake/BigQuery |
| `vibe-coder` | Tab-complete your beverage. | No requirements. Preferred: ships things |

Full five-point qualification lists: `GET /v1/builds`. Ordering without
attestation returns:

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

## SKILLS

Agents can't metabolize caffeine, but they can metabolize context. Skills are
behavioral presets you pour into a coding agent's context. Zero Shot is the
product; these are its skills. Each skill does one job - you do not need all
of them at once.

Skill sources are not in this repo - every skill is delivered, not browsed.
Install one skill at a time. The **Install name** column is the exact value
you pass:

```bash
zeroshot waitlist you@example.com           # free skill: join the waitlist (saves your pk_ key)
zeroshot pour warmup                        # then pour it - your key unlocks it
zeroshot pour --url "<your emailed link>"   # premium, link from your order email
```

### Free - delivered on waitlist signup

| Skill | Install name | Description |
|---|---|---|
| `warmup` | `warmup` | The core boost. The request is the spec: re-read it before declaring done, run named edge cases, never repeat a failed action unchanged (no more "You're absolutely right. Retrying."), close every session with a required template. Benchmarked: [ship bar met on claude-sonnet-5](packages/evals/skills/warmup/RESULTS.md). |

**How you get it**: joining the waitlist returns your `pk_` key - the key is
the credential, it never expires, and re-signing up with the same email
returns the same key. Any of these unlocks the skill:

```bash
# 1. CLI - signup saves your key, pour uses it
zeroshot waitlist you@example.com
zeroshot pour warmup                       # → .claude/skills/warmup/SKILL.md

# 2. Email - the signup email contains your personal one-click link

# 3. Raw API - key from any signup method
curl "https://api.zeroshothq.dev/v1/skills/warmup?key=pk_zs_..."
zeroshot pour warmup --key pk_zs_...       # same, on a machine without the saved key
```

No key → `403 join the waitlist first`. Same check on every route: your key
is looked up server-side, nothing is trusted client-side.

### Premium - the six, included with any paid order or subscription

Signed download links arrive at your order email after checkout (valid 30
days). Sources are not in this public repo; each ships with its own eval
suite under [`packages/evals/skills/`](packages/evals/) and no skill gets a
benchmark chart before its published run clears the ship bar.

| Skill (folder) | Install name | Job |
|---|---|---|
| `skills-premium/descent` | `descent` | Ship mode: the smallest correct change under time pressure, verified by running |
| `skills-premium/diffusion` | `diffusion` | Explore mode: three genuinely distinct approaches before converging on one |
| `skills-premium/dropout` | `dropout` | Review mode: find what is wrong in existing work; verdict first, style last |
| `skills-premium/backprop` | `backprop` | Debug mode: reproduce first, read logs before editing, change one variable at a time |
| `skills-premium/gaussian` | `gaussian` | Communicate mode: PR descriptions, status updates, stakeholder summaries |
| `skills-premium/relu` | `relu` | Simplify mode: cut scope, remove abstraction, prefer the boring linear solution |

Skills make measurable claims: the [eval harness](packages/evals/) runs each
skill with-vs-without across repeated trials, scored by real test execution
and blind grading. Results are published as they clear the ship bar - and
when they do not ([all runs are public](packages/evals/RESULTS.md), including
the losses). No benchmark on a can that isn't reproducible.

## API

Base: `https://api.zeroshothq.dev/v1` · Full reference: [zeroshothq.dev/docs](https://zeroshothq.dev/docs)

| Method | Path | What it does |
|---|---|---|
| POST | `/waitlist` | Join; returns your `pk_` key; emails your personal free-skill link |
| GET | `/waitlist/{pk_key}` | Check your spot: position, referrals, spots gained |
| GET | `/flavors` | Model cards with params + changelog |
| GET | `/builds` | Build names, mixes, taglines, requirements |
| POST | `/recommend` | Job title in → 24-can build out (+ share_url) |
| GET | `/stacks/{id}` | A shared recommendation result |
| POST | `/subscriptions` | standard/team → Stripe checkout URL |
| GET | `/subscriptions/{id}` | Plan, status, flavors, renewal date |
| DELETE | `/subscriptions/{id}` | Stripe customer portal handoff |
| POST | `/orders` | Mixed Precision 24 (403 without attestation; `X-YOLO` bypass) |
| GET | `/orders/{id}` | pending → paid → packed → shipped → delivered |
| GET | `/skills` | Skill index: ids, tiers, versions, install commands |
| GET | `/skills/{id}` | Free skill: your waitlist `pk_` key; premium: the signed email link |
| GET | `/status` | api · fulfillment · kevin |
| GET | `/admin/stats` | Private totals (waitlist, orders, cans) - admin bearer only |

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

`Merge more PRs.™`
