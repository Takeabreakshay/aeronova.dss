# Aero Nova DSS

Single-day decision-support prototype for OPS 5004. Every number on the
screen is produced by the engine (`optimize`, `simulate`, `recover`). The AI
is a thin translate-in / narrate-out layer around the math.

## Quick start

```bash
pip install -r requirements.txt
streamlit run app.py
```

Drop your Anthropic key in `.streamlit/secrets.toml` (see the `.example`) to
enable AI parsing and narration. Without a key, the DSS engine still runs;
the chat degrades gracefully to a template narrator.

## Layout

```
aeronova-dss/
  app.py                     Streamlit UI, state, wiring
  engine/
    data.py                  default parameters from the brief
    schemas.py               typed dicts
    model.py                 optimize(params)   -> Solution   (PuLP + CBC)
    simulate.py              simulate(...)      -> RiskResult (NumPy MC)
    recover.py               recover(...)       -> RecoveryResult (greedy)
  ai/
    prompts.py               guardrail (verbatim in code)
    parse.py                 language -> parameter deltas (+ regex fallback)
    narrate.py               facts    -> plain English      (+ template fallback)
  requirements.txt
```

## What it does

- **Optimizer** — ILP over 18 integer variables (3 types × 6 routes) with
  the fleet, load-factor, minimum-service, and route-restriction constraints
  from the brief. Strategy toggle re-weights the objective.
- **Simulator** — vectorized 2k / 10k trials, sampling per-route demand,
  fuel multiplier, and per-aircraft availability. Outputs mean, P5/P10,
  worst, CVaR₅, cancel rate, disruption loss, and a histogram.
- **Recovery** — greedy heuristic: cancel lowest-contribution RTs of the
  failed type until the schedule fits, then decide whether the parked
  reserve pays for its mobilization cost.
- **AI** — parses natural language into parameter deltas on the way in and
  reads the resulting `facts` object back out on the way out. The guardrail
  lives verbatim in `ai/prompts.py`.

## Signature demo

The **Kill an aircraft** button on the main screen calls `recover` live and
shows the revised deployment, protected vs cancelled routes, and the
reserve-deploy decision with the net-benefit rupees. Rehearse `C1`.

## Notes for the analytical spec

- `beta` (per-passenger variable cost) is exposed as a parameter so the
  final value from the analytical spec slots in without code changes.
- `psi` (legs per RT) is likewise parameterized.
- The single-C-on-R3 acceptance figure is a function of the exact
  fuel/variable split finalized in the analytical spec; calibrate `beta`
  or `fuel_mult` to match.
