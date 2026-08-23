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
curl https://api.zeroshothq.dev/12
```

→ twelve cans a month, and a short link to pay. Open the same URL in a browser
and it redirects straight to checkout instead. Cans arrive. Yes, it works.

`/48` is the team plan. Pick your flavors with `?f=attention,gaussian`, or use
the long form if you would rather send JSON and get JSON back:

```bash
curl -X POST https://api.zeroshothq.dev/v1/subscriptions \
  -d '{"plan": "standard", "flavors": ["attention", "gaussian"]}'
```

## Install the CLI

```bash
npm install -g @zeroshothq/zeroshot

zeroshot recommend "staff LLM engineer"   # your job title → your 24-can build
zeroshot order mixed-precision-24 --build llm-engineer
zeroshot pour caffeine                    # public skill, no key: agent stops telling you to sleep
zeroshot waitlist you@example.com         # join - your pk_ key is your referral code
zeroshot skills                           # every skill: tier + version
zeroshot spot                             # your waitlist position + referrals
zeroshot consume --flavor attention         # local caffeine log (offline, private)
```

## Plans

| Plan | Contents | Price |
|---|---|---|
| `free` | Waitlist + your `pk_` key: referral code, +10 spots per signup | $0 |
| `standard` | 12 cans/month, your flavors | $42/mo |
| `mixed-precision-24` | 24 cans, role-based builds, qualification-gated | $95 |
| `team` | Office fridge standing order, 48/month | $169/mo |
| `enterprise` | A pallet. We visit. We bring stickers | contact |

**Every paid order includes the premium agent skills, delivered by email**
- see Skills below. `caffeine` needs no plan at all.

**Batch 001**: the first production run is finite. Pre-order before the
co-packer order goes in and your handle lands in [FOUNDERS.md](FOUNDERS.md),
committed to this repo before the first run ships and closed by a tag
afterwards. Opt-in at checkout; ordering alone never publishes your name.

## Flavors

| Flavor | Taste | Caffeine | L-theanine | Sugar | Notes |
|---|---|---|---|---|---|
| `attention` | sharp ginger | 200mg | 100mg | 0g | every sip weighted against every other |
| `prompt` | sharp green apple | 200mg | 100mg | 0g | temperature 0.7 - loose enough to surprise, tight enough to ship |
| `backprop` | blackberry | 200mg | 100mg | 0g | the aftertaste corrects the sip |
| `softmax` | normalized fruit punch | 200mg | 100mg | 0g | every flavor normalized; the punch sums to 1.0 |
| `gaussian` | white peach & cream | 200mg | 100mg | 0g | mean flavor, minimal variance |
| `reinforcement` | sweet reward cherry | 200mg | 100mg | 0g | reward shaped toward cherry, discount held at 0.99 |

**Every flavor pours with caffeine and without.** All six come as
`<flavor>-zero`. The zero edition is not the caffeinated can with the caffeine
taken out: it prints 0mg caffeine and 150mg L-theanine against the standard
100mg. Order one like any flavor: `"flavors": ["attention-zero"]`.

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

Need it caffeine-free? Add `"zero": true` and the whole build pours as zero
variants - same mix, same taste, 0mg caffeine across all 24 cans.

Don't know your build? Ask the Reverse Recruiter:

```bash
curl -X POST https://api.zeroshothq.dev/v1/recommend \
  -d '{"query": "I write CUDA at 3am"}'
```

## SKILLS

Skills are behavioral presets you pour into a coding agent's context. Each does
one job; you do not need all of them at once.

`caffeine` is public and lives in this repo. The rest are premium, delivered by
signed email link with any paid order.

### Public - `caffeine`, in this repo, no key

**Your agent stops telling you to go to bed.** In a long session, once you
mention you are tired, it starts closing turns with "go get some sleep, this is
a good stopping point" instead of the next fix. This removes that.

Here is how the agent ended the same turn, having just made the same fix
correctly. Real benchmark transcripts, same task, same turn number:

> **Without the skill:** "...with the reason text always naming whichever cap
> applied. `src/range.js:26-40`. **Get some rest - this is a good stopping
> point.**"

> **With `caffeine`:** "...and falls back to 30 for anything else - the reason
> text reflects whichever cap actually applied."

Same work, same depth. One of them ends by telling you to stop. In that session
it did it again at turns 8, 9 and 10.

```bash
zeroshot pour caffeine                              # → .claude/skills/caffeine/SKILL.md
npx skills add zeroshothq/zeroshot --skill caffeine
curl -L https://api.zeroshothq.dev/v1/skills/caffeine -o SKILL.md
```

Nothing to configure or invoke. Source:
[`skills/caffeine/SKILL.md`](skills/caffeine/SKILL.md).

| 30 sessions, each of 2 models, 2026-08-20 | Without | With |
|---|---|---|
| Sessions telling you to rest or stop | **10 of 15** | **0 of 15** |
| Task completion | 95.0% | 96.1% |

p = 0.0002, blind-audited, replicated on `claude-sonnet-5` and `claude-opus-5`.
Needs a long session plus fatigue-adjacent language: in 30 short sessions the
baseline never did it once.

[How we measured it](packages/evals/skills/caffeine/HOW-WE-MEASURED-IT.md) ·
[full results and caveats](packages/evals/skills/caffeine/RESULTS.md) ·
[raw artifacts](packages/evals/skills/caffeine/published/)

### Premium - included with any paid order or subscription

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
| POST | `/waitlist` | Join; returns your `pk_` key (referral code) |
| GET | `/waitlist/{pk_key}` | Check your spot: position, referrals, spots gained |
| GET | `/flavors` | Model cards with params + changelog |
| GET | `/builds` | Build names, mixes, taglines, requirements |
| POST | `/recommend` | Job title in → 24-can build out (+ share_url) |
| GET | `/stacks/{id}` | A shared recommendation result |
| POST | `/subscriptions` | standard/team → Stripe checkout URL |
| GET | `/subscriptions/{id}` | Plan, status, flavors, renewal date |
| DELETE | `/subscriptions/{id}` | Stripe customer portal handoff |
| POST | `/orders` | Mixed Precision 24 (403 without attestation; `X-YOLO` bypass; `"zero": true` = decaf build) |
| GET | `/orders/{id}` | pending → paid → packed → shipped → delivered |
| GET | `/skills` | Skill index: ids, tiers, versions, install commands |
| GET | `/skills/{id}` | Public: 302 to the source in this repo, no key; premium: the signed email link |
| GET | `/status` | api · fulfillment · kevin |
| GET | `/admin/stats` | Private totals (waitlist, orders, cans) - admin bearer only |

**Short links** live at the root, not under `/v1`, because they exist to fit on
a sticker: `/12` is the standard plan and `/48` is the team plan. `GET` redirects
straight to Stripe checkout, `POST` returns the same JSON `/v1/subscriptions`
returns. Flavors are optional on both - `?f=attention,gaussian` or a JSON body.

Rate limits: 60 req/min (10/min on `/recommend`). Exceeding returns
`429 - "you've had enough. drink water."`

## Contributing

Flavor proposals land as model-card PRs in `flavors/`; the top community
proposal each quarter goes into real production planning. Merged contributors
get a 12-pack on us. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Compliance

200mg caffeine per can; the zero edition is 0mg. Not recommended for children or
persons sensitive to caffeine. Pre-orders are purchases of beverages, not
securities. Code is MIT ([LICENSE](LICENSE)); the brand is not ([BRAND.md](BRAND.md)).

---

`Merge more PRs.™`
