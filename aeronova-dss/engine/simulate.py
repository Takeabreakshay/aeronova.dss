"""Monte Carlo simulator: freeze a schedule, sample demand/fuel/availability.

Vectorized NumPy — 10k trials finish in well under a second.
"""
from __future__ import annotations
from typing import Dict, Tuple
import numpy as np

from .schemas import RiskResult


TYPES = ("A", "B", "C")
ROUTES = ("R1", "R2", "R3", "R4", "R5", "R6")


def simulate(
    schedule: Dict[Tuple[str, str], int],
    params: dict,
    trials: int = 10000,
    seed: int = 42,
) -> RiskResult:
    """Run `trials` day-scenarios against a frozen schedule.

    Randomness:
      - Route demand    ~ Normal(mean=demand, sd=15% of demand)
      - Fuel multiplier ~ Normal(mean=params['fuel_mult'], sd=0.08), clipped >=0.7
      - Aircraft avail  ~ Bernoulli(p=params.get('avail_p', 0.97)) per aircraft
        If any aircraft of a type fails, we scale that type's RTs by
        (working/total) and the shortfall flows into spill and cancel_rate.
    """
    rng = np.random.default_rng(seed)

    routes = params["routes"]
    fleet = params["fleet"]
    psi = params["psi"]
    LF = params["LF"]
    beta = params["beta"]
    MOB = params["MOB"]
    reserve_type = params.get("reserve_type")
    fuel_base = params.get("fuel_mult", 1.0)
    avail_p = params.get("avail_p", 0.97)

    route_ids = list(ROUTES)
    demand_mean = np.array([routes[r]["demand"] for r in route_ids], dtype=float)
    fare = np.array([routes[r]["fare"] for r in route_ids], dtype=float)
    rth = np.array([routes[r]["rth"] for r in route_ids], dtype=float)

    # schedule as matrix [type x route] of RT counts
    rt_matrix = np.zeros((3, 6), dtype=float)
    for i, t in enumerate(TYPES):
        for j, r in enumerate(route_ids):
            rt_matrix[i, j] = schedule.get((t, r), 0)

    seats = np.array([fleet[t]["seats"] for t in TYPES], dtype=float)
    cph = np.array([fleet[t]["cph"] for t in TYPES], dtype=float)
    counts = np.array([fleet[t]["count"] for t in TYPES], dtype=float)
    maxhrs = np.array([fleet[t]["maxhrs"] for t in TYPES], dtype=float)

    # --- sample demand shocks
    # Two components:
    #   idiosyncratic  ~ N(0, 12% of route mean)  — route-specific noise
    #   common (system) ~ N(0, 8%)                — market-wide bad/good days
    # This gives correlated bad-day scenarios (weather, macro) instead of the
    # independence-per-route assumption that quietly understates the tail.
    idio = rng.normal(loc=0.0, scale=0.12, size=(trials, 6))
    common = rng.normal(loc=0.0, scale=0.08, size=(trials, 1))
    combined = idio + common  # broadcasts over routes
    demand_samples = (demand_mean * (1.0 + combined)).clip(min=0.0)

    # --- sample fuel multiplier
    fuel_samples = rng.normal(loc=fuel_base, scale=0.08, size=trials).clip(min=0.7)

    # --- sample aircraft availability per type per trial
    # per-aircraft Bernoulli then aggregate: fraction working per type
    frac_working = np.zeros((trials, 3))
    for i, t in enumerate(TYPES):
        n = int(counts[i])
        if n <= 0:
            frac_working[:, i] = 1.0
            continue
        alive = rng.binomial(1, avail_p, size=(trials, n))
        frac_working[:, i] = alive.sum(axis=1) / n

    # If a reserve is parked, treat it as effectively boosting availability
    if reserve_type in TYPES:
        r_idx = TYPES.index(reserve_type)
        # reserve absorbs one failure — cap at 1.0
        frac_working[:, r_idx] = np.minimum(
            1.0, frac_working[:, r_idx] + (1.0 / max(counts[r_idx], 1))
        )

    # effective RT per trial: scale rows by frac_working
    # shape (trials, 3, 6)
    scaled_rt = rt_matrix[None, :, :] * frac_working[:, :, None]

    # capacity per route (per trial): psi * sum_t seats_t * LF * scaled_rt
    capacity = psi * (scaled_rt * seats[None, :, None] * LF).sum(axis=1)  # (trials,6)

    # pax carried = min(demand, capacity)
    pax = np.minimum(demand_samples, capacity)

    # revenue, fuel, variable cost per trial
    revenue = (pax * fare[None, :]).sum(axis=1)
    # fuel scales with what actually flies (scaled_rt), plus a small ground-tax
    # for aircraft that failed pre-departure (10% of the planned burn — cancellation
    # fees, positioning, unused fuel).
    scaled_hours = (scaled_rt * rth[None, None, :]).sum(axis=2)  # (trials, 3)
    planned_hours_per_type = (rt_matrix * rth[None, :]).sum(axis=1)  # (3,)
    cancelled_hours = planned_hours_per_type[None, :] - scaled_hours
    fuel_hours = scaled_hours + 0.10 * cancelled_hours
    fuel_by_type = fuel_hours * cph[None, :]
    fuel = fuel_samples * fuel_by_type.sum(axis=1)
    varc = beta * pax.sum(axis=1)

    mob = MOB if reserve_type in TYPES else 0.0
    profit = revenue - fuel - varc - mob

    # KPIs
    spill = demand_samples.sum(axis=1) - pax.sum(axis=1)
    spill_pct = 100.0 * spill / np.maximum(demand_samples.sum(axis=1), 1.0)
    load_factor = pax.sum(axis=1) / np.maximum(capacity.sum(axis=1), 1.0)

    used_hours = (scaled_rt * rth[None, None, :]).sum(axis=(1, 2))
    avail_hours = (counts * maxhrs).sum() - (
        fleet[reserve_type]["maxhrs"] if reserve_type in TYPES else 0
    )
    utilization = used_hours / max(avail_hours, 1.0)

    # coverage per trial: route "operates" if scheduled RT > 0 AND capacity delivered > 0
    covered = ((rt_matrix.sum(axis=0)[None, :] > 0) & (capacity > 0)).sum(axis=1)
    coverage = covered.astype(float)

    # cancellations: trials where at least one type had a failed aircraft
    cancels = (frac_working < 1.0).any(axis=1)
    cancel_rate = float(cancels.mean())

    # disruption loss = mean profit(no-fail trials) - mean profit(fail trials)
    if cancels.any() and (~cancels).any():
        disruption_loss = float(profit[~cancels].mean() - profit[cancels].mean())
    else:
        disruption_loss = 0.0

    p5 = float(np.percentile(profit, 5))
    p10 = float(np.percentile(profit, 10))
    worst = float(profit.min())
    tail = profit[profit <= p5]
    cvar5 = float(tail.mean()) if tail.size else p5

    # ---- Per-route vulnerability (Task 6): which routes cancel or spill most under stress ----
    route_vuln = {}
    for j, r_id in enumerate(route_ids):
        d = demand_samples[:, j]
        p = pax[:, j]
        c = capacity[:, j]
        spill = np.maximum(d - p, 0.0)
        spill_rate = float(spill.mean() / max(demand_mean[j], 1.0))
        cancel_rate_r = float((c == 0).mean())  # route lost all capacity that trial
        route_vuln[r_id] = {
            "avg_spill_pax": round(float(spill.mean()), 1),
            "spill_rate": round(spill_rate, 4),
            "cancel_rate": round(cancel_rate_r, 4),
            "avg_load_factor": round(float(np.divide(p.sum(), np.maximum(c.sum(), 1))), 4),
        }

    facts = {
        "trials": trials,
        "mean_profit": round(float(profit.mean()), 2),
        "route_vulnerability": route_vuln,
        "p5": round(p5, 2),
        "p10": round(p10, 2),
        "worst": round(worst, 2),
        "cvar5": round(cvar5, 2),
        "cancel_rate": round(cancel_rate, 4),
        "avg_spill_pct": round(float(spill_pct.mean()), 2),
        "avg_load_factor": round(float(load_factor.mean()), 4),
        "avg_utilization": round(float(utilization.mean()), 4),
        "avg_coverage": round(float(coverage.mean()), 2),
        "disruption_loss": round(disruption_loss, 2),
        "reserve_type": reserve_type,
        "mob_cost": mob,
    }

    return {
        "mean_profit": facts["mean_profit"],
        "p5": facts["p5"],
        "p10": facts["p10"],
        "worst": facts["worst"],
        "cvar5": facts["cvar5"],
        "cancel_rate": facts["cancel_rate"],
        "avg_spill_pct": facts["avg_spill_pct"],
        "avg_load_factor": facts["avg_load_factor"],
        "avg_utilization": facts["avg_utilization"],
        "avg_coverage": facts["avg_coverage"],
        "disruption_loss": facts["disruption_loss"],
        "profit_distribution": profit.tolist(),
        "facts": facts,
    }
