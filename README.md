# Aero Nova Decision Support System

Decision Science group project (OPS 5004). Two apps sharing one engine.

| Directory | What it is | Run it |
|---|---|---|
| [`aeronova-dss/`](./aeronova-dss/) | Streamlit prototype — the demo build. Engine + Monte-Carlo + AI narrator, single-file UI | `pip install -r requirements.txt && streamlit run app.py` |
| [`aeronova-web/`](./aeronova-web/) | React + FastAPI rebuild — polished product shell over the same engine | See [`aeronova-web/DEPLOY.md`](./aeronova-web/DEPLOY.md) |

## The engine (shared)

Three pure functions in `aeronova-dss/engine/`:

- `optimize(params)` — 18-variable ILP over routes × aircraft types (PuLP + CBC). Guarded against infeasibility with a binding-constraint diagnosis
- `simulate(schedule, params, trials)` — vectorized NumPy Monte Carlo with correlated demand shocks (common + idiosyncratic), fuel volatility, and per-aircraft Bernoulli availability
- `recover(schedule, failed_tail, params)` — greedy heuristic using **marginal** contribution (not isolated) so it ranks cancellations correctly when routes have multiple aircraft assigned

Plus `sensitivity.py`:

- `reserve_breakeven()` — failure-probability sweep with common random numbers (the Task 6 trigger)
- `beta_sweep()` — sensitivity of the reserve verdict to β
- `strategy_compare()` — profit vs service vs resilient on the same seeded days

## The AI layer

`aeronova-dss/ai/` — thin translate-in / narrate-out around the engine. Uses NVIDIA Nemotron by default (OpenAI-compatible client at `integrate.api.nvidia.com/v1`), falls back to a template narrator when the network drops. A number-guard verifies every figure in the AI's reply appears in the engine's `facts` object before display — the "AI never computes" claim is enforced by code, not by hope.

## The design system

Both apps share:

- **Geist / Geist Mono** self-hosted (SIL OFL 1.1)
- **shadcn/ui** primitives adapted (MIT, copy-paste distribution model)
- **hugeicons** free set (Apache 2.0)
- **Motion catalog** — every transition ≤ 300 ms, `transform`/`opacity` only, `active:scale(0.97)` on presses, `prefers-reduced-motion` respected

## Guardrails and provenance

- Optimizer wraps every solve, catches infeasibility, and renders the binding constraint
- Simulator uses `seed=42` and Common Random Numbers across strategies
- Correlated demand shocks (system + idio) so tail risk isn't understated
- Reserve substitution uses the reserve's **own** seat count, not the failed aircraft's — a smaller reserve honestly can't recover the value of a bigger one
- Every AI narration is number-checked against the engine's facts before display

## Deliverables

- [`aeronova-dss/docs/DECISION_ARCHITECTURE.md`](./aeronova-dss/docs/DECISION_ARCHITECTURE.md) — one-page architecture map (Deliverable 1)
- [`aeronova-web/DEPLOY.md`](./aeronova-web/DEPLOY.md) — production deploy guide (Vercel + Render)
