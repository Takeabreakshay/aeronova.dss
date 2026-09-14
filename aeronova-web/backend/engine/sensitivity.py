"""Sensitivity + break-even analysis on top of the core engine.

Two questions the brief actually scores:
  1. At what aircraft-failure probability does the reserve start paying off?
     (`reserve_breakeven` — Task 6 trigger, the closing scored line)
  2. Does the reserve verdict flip inside the plausible β range?
     (`beta_sweep` — Tier-2 credibility, so the recommendation isn't fragile)

Both call the engine directly; they never invent numbers.
"""
from __future__ import annotations
from copy import deepcopy
from typing import Dict, List

from .model import optimize
from .simulate import simulate


def reserve_breakeven(
    base_params: dict,
    reserve_type: str = "C",
    probs: List[float] | None = None,
    trials: int = 2000,
) -> Dict:
    """Return the failure-probability point at which reserving pays.

    Compares expected profit with vs without the reserve across a sweep of
    per-aircraft failure probabilities. The break-even p* is the first
    probability where `mean(with_reserve) >= mean(without_reserve)`.
    """
    probs = probs or [0.01, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15, 0.20]
    curve = []
    breakeven = None
    for p in probs:
        p_no = deepcopy(base_params); p_no["reserve_type"] = None
        p_yes = deepcopy(base_params); p_yes["reserve_type"] = reserve_type
        p_no["avail_p"] = 1.0 - p
        p_yes["avail_p"] = 1.0 - p

        # solve both (they may pick different schedules because the reserve
        # takes an airframe out of the productive pool)
        sol_no = optimize(p_no)
        sol_yes = optimize(p_yes)

        # skip infeasible sides — record and continue
        if sol_no["status"] != "Optimal" or sol_yes["status"] != "Optimal":
            curve.append({
                "p_fail": p, "mean_no_reserve": None, "mean_with_reserve": None,
                "delta": None, "note": "infeasible on one side",
            })
            continue

        r_no = simulate(sol_no["x"], p_no, trials=trials, seed=42)
        r_yes = simulate(sol_yes["x"], p_yes, trials=trials, seed=42)

        delta = r_yes["mean_profit"] - r_no["mean_profit"]
        curve.append({
            "p_fail": p,
            "mean_no_reserve": r_no["mean_profit"],
            "mean_with_reserve": r_yes["mean_profit"],
            "delta": round(delta, 2),
        })
        if breakeven is None and delta >= 0:
            breakeven = p

    verdict = (
        f"Reserve pays off from p_fail ≥ {breakeven*100:.1f}% per aircraft."
        if breakeven is not None
        else "Reserve does not pay off inside the tested probability range."
    )

    return {
        "reserve_type": reserve_type,
        "sweep": curve,
        "breakeven_p": breakeven,
        "verdict": verdict,
    }


def beta_sweep(
    base_params: dict,
    betas: List[float] | None = None,
    trials: int = 2000,
) -> Dict:
    """Test whether the reserve verdict flips across a plausible β range.

    Solves and simulates with reserve on / off at each β, then reports the
    smallest β where the verdict flips (or that it stays stable).
    """
    betas = betas or [400, 600, 800, 900, 1000, 1200, 1500, 1800, 2100]
    curve = []
    flip_beta = None
    prev_favor_reserve = None
    for b in betas:
        p_no = deepcopy(base_params); p_no["beta"] = b; p_no["reserve_type"] = None
        p_yes = deepcopy(base_params); p_yes["beta"] = b; p_yes["reserve_type"] = "C"

        sol_no  = optimize(p_no)
        sol_yes = optimize(p_yes)
        if sol_no["status"] != "Optimal" or sol_yes["status"] != "Optimal":
            curve.append({"beta": b, "mean_no": None, "mean_yes": None, "favor_reserve": None})
            continue

        r_no  = simulate(sol_no["x"],  p_no,  trials=trials, seed=42)
        r_yes = simulate(sol_yes["x"], p_yes, trials=trials, seed=42)
        favor_reserve = r_yes["mean_profit"] >= r_no["mean_profit"]
        curve.append({
            "beta": b,
            "mean_no": r_no["mean_profit"],
            "mean_yes": r_yes["mean_profit"],
            "favor_reserve": favor_reserve,
        })
        if prev_favor_reserve is not None and favor_reserve != prev_favor_reserve and flip_beta is None:
            flip_beta = b
        prev_favor_reserve = favor_reserve

    if flip_beta is None:
        verdict = "Reserve verdict is stable across the tested β range."
    else:
        verdict = f"Reserve verdict flips at β ≈ {flip_beta}. Below/above, the answer changes."

    return {
        "betas": betas,
        "sweep": curve,
        "flip_beta": flip_beta,
        "verdict": verdict,
    }


def strategy_compare(
    base_params: dict,
    trials: int = 3000,
    seed: int = 42,
) -> Dict:
    """Compare the three strategies with COMMON RANDOM NUMBERS.

    Each strategy is solved once, then simulated against the SAME seeded
    demand/fuel/availability draws, so differences are structural, not
    sampling noise.
    """
    out = []
    for strat in ("profit", "service", "resilient"):
        p = deepcopy(base_params); p["strategy"] = strat
        sol = optimize(p)
        if sol["status"] != "Optimal":
            out.append({"strategy": strat, "status": "Infeasible"})
            continue
        r = simulate(sol["x"], p, trials=trials, seed=seed)
        out.append({
            "strategy": strat,
            "status": "Optimal",
            "profit_opt": sol["profit"],
            "mean_profit": r["mean_profit"],
            "p5": r["p5"],
            "cvar5": r["cvar5"],
            "coverage": sol["kpis"]["coverage"],
            "spill_pct": r["avg_spill_pct"],
        })
    return {"seed": seed, "trials": trials, "results": out}
