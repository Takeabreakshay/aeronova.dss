# Aero Nova DSS — Decision Architecture

_Deliverable 1 · one-page overview of what the tool decides and how._

---

## The one principle

Every input the manager touches re-runs real code. The AI never computes a
number. Everything numeric comes from the optimizer and the Monte Carlo
simulator. The AI translates language in and rephrases engine output on the
way out.

## Four layers

```
CONTROLS  →  ENGINE  →  OUTPUTS
             optimize / simulate / recover
   AI NARRATOR wraps both edges (parse-in, narrate-out)
```

## The decisions the DSS supports

| # | Question the manager asks | Answered by | Where in the UI |
|---|---|---|---|
| 1 | What plan today? | `optimize()` — 18-var ILP | **Deploy** tab, route cards |
| 2 | How exposed am I to a bad day? | `simulate()` — 10k trials | **Risk** tab, histogram + P5/P10/CVaR₅ |
| 3 | Which routes are weakest under stress? | `simulate()` per-route stats | **Risk** tab, Route Vulnerability panel |
| 4 | An aircraft just failed — what now? | `recover()` — greedy heuristic | **Recover** tab, kill-an-aircraft button |
| 5 | Should I park a reserve? | `reserve_breakeven()` | **Analysis** tab, break-even sweep |
| 6 | Is that reserve verdict fragile? | `beta_sweep()` | **Analysis** tab, β sensitivity |
| 7 | Which strategy is best on the same random days? | `strategy_compare()` (CRN) | **Analysis** tab, strategy compare |

## Inputs (controls the manager touches)

- **Route demand** (per route ± 50 % of base) and **global demand shift** (± 30 %)
- **Fuel scenario** — Low / Base / High (multiplier)
- **Aircraft availability** — per-aircraft Bernoulli, 0.90 – 0.99
- **Minimum service frequency** — per-route RT floor
- **Reserve policy** — None / A / B / C parked
- **Strategy** — profit / service / resilient
- **Kill an aircraft** — pick a tail (A1…C3)

## Outputs (KPIs the brief requires)

Expected profit (distribution, not a point), passengers served / spilled,
fleet utilization, route coverage, disruption loss, reserve recommendation,
per-route vulnerability, reserve activation trigger (`p_fail*`).

## Guardrails

- **AI number guard** — every numeric token in the narrator's output is
  verified against the engine's `facts` object before display. If > 2
  numbers can't be verified, the safe template narrator is used instead.
- **Infeasibility handled** — if the ILP can't find a plan under current
  settings, the app renders the binding constraint and a hint at what to
  relax, not a stack trace.
- **Fixed seed** — Monte Carlo uses `seed = 42`; all displayed numbers are
  reproducible.
- **Common random numbers** — strategy comparison uses the same seeded
  days across all three strategies, so differences are structural.
- **Correlated demand shocks** — sim uses a common (system) shock ~ N(0, 8%)
  plus per-route idio ~ N(0, 12%), avoiding tail understatement from
  independence.

## Named simplifications (owned, not hidden)

- **No aircraft rotation** — the model works with a fleet-hours budget
  per type, not physical location of tails. A rotation layer is the
  natural next step; the current model is a planning-level relaxation.
- **No spill recapture** — passengers who don't board are treated as lost.
  In reality some rebook onto other Aero Nova flights. This overstates
  spill cost slightly, making the risk case conservative.
- **Recovery is greedy, not a re-solved MILP** — deliberate: interactive
  speed on the live demo. A re-solve is straightforward to add.
- **AI is stateless per query** — no long-term memory across the chat.

## Where each brief requirement lives

| Brief-required DSS capability | Where it lives |
|---|---|
| Change demand, fuel, availability, min-freq, reserve | Sidebar controls |
| Simulate loss of a specific aircraft, revise the plan | Recover tab + `recover()` |
| Explain which routes to protect first and why | AI narrator reading `facts` |
| Report expected profit | Deploy KPI + Risk histogram |
| Passengers served / spilled | Deploy KPI |
| Fleet utilization | Deploy KPI |
| Route coverage | Deploy KPI |
| Disruption loss | Risk KPI |
| Reserve recommendation | Analysis tab · break-even |
| Compare strategies, show why the answer changes | Analysis tab · CRN compare + AI |
| Route vulnerability | Risk tab · vulnerability panel |
| Reserve activation trigger | Analysis tab · verdict card |

## Stack

Python 3.11 · PuLP + CBC (ILP) · NumPy (vectorized Monte Carlo) ·
Streamlit (UI) · Plotly (charts) · NVIDIA NIM Nemotron (AI translate / narrate).

## Runbook

```
pip install -r requirements.txt
streamlit run app.py           # http://localhost:8501
```

Set `NVIDIA_API_KEY` in `.streamlit/secrets.toml` for the AI layer.
Engine runs fully offline without a key — chat falls back to a template
narrator that reads the same `facts` object.
