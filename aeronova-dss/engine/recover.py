"""Greedy recovery: an aircraft goes technical mid-morning; re-plan fast.

Heuristic, not a re-solved MILP (build spec explicitly calls this out as a
speed simplification).

Algorithm:
  1. Compute MARGINAL per-RT contribution for every (type, route) in the
     schedule. Marginal means "delta if this RT is removed" — the value
     depends on whether the route is capacity-bound or demand-bound.
  2. Removing the failed aircraft frees `maxhrs` of that type.
  3. Cancel the LOWEST marginal-contribution RTs of that type until enough
     hours are freed.
  4. If a reserve is parked, check if substituting the RESERVE'S OWN
     economics on those routes beats the mobilization cost. The reserve's
     seat count matters — swapping a C for an A caps pax at 78, not 180.
  5. Report protected routes, cancelled RTs, and rupee comparison.
"""
from __future__ import annotations
from copy import deepcopy
from typing import Dict, List, Tuple

from .schemas import RecoveryResult


TYPES = ("A", "B", "C")
ROUTES = ("R1", "R2", "R3", "R4", "R5", "R6")


def _pax_per_leg(seats: int, LF: float, demand: float, psi: int) -> float:
    """Cap by demand or by seats-with-LF, whichever is tighter."""
    return min(demand / psi, seats * LF)


def _isolated_profit(t: str, r: str, params: dict) -> float:
    """Profit of ONE RT of type t on route r, assuming no other RT on that route."""
    fleet = params["fleet"][t]
    route = params["routes"][r]
    psi = params["psi"]
    LF = params["LF"]
    beta = params["beta"]
    fuel_mult = params.get("fuel_mult", 1.0)
    pax = _pax_per_leg(fleet["seats"], LF, route["demand"], psi)
    revenue = psi * pax * route["fare"]
    fuel = fleet["cph"] * route["rth"] * fuel_mult
    varc = psi * pax * beta
    return revenue - fuel - varc


def _marginal_contribution(
    schedule: Dict[Tuple[str, str], int],
    t: str, r: str,
    params: dict,
) -> float:
    """Marginal profit of removing one RT of type t from route r.

    Fixes the F1 bug where every RT was scored as if alone. Now:
      - Compute total pax served on this route by the current schedule.
      - Compute what would be served WITHOUT this RT.
      - Marginal revenue = fare × (before - after) − minus this RT's own fuel and
        variable cost for the pax that would have flown on it.
    """
    psi = params["psi"]
    LF = params["LF"]
    beta = params["beta"]
    fuel_mult = params.get("fuel_mult", 1.0)
    route = params["routes"][r]
    fleet = params["fleet"][t]

    # Current total capacity on this route (pax)
    def cap_of(sched: Dict[Tuple[str, str], int]) -> float:
        return sum(
            psi * params["fleet"][tt]["seats"] * LF * sched.get((tt, r), 0)
            for tt in TYPES
        )
    cap_before = cap_of(schedule)
    if schedule.get((t, r), 0) == 0:
        return 0.0
    reduced = dict(schedule)
    reduced[(t, r)] = reduced[(t, r)] - 1
    if reduced[(t, r)] == 0:
        del reduced[(t, r)]
    cap_after = cap_of(reduced)

    demand = route["demand"]
    pax_before = min(demand, cap_before)
    pax_after = min(demand, cap_after)
    delta_pax = pax_before - pax_after  # pax we'd lose by cancelling this RT

    marginal_revenue = delta_pax * route["fare"]
    fuel = fleet["cph"] * route["rth"] * fuel_mult  # this RT's committed fuel
    marginal_varc = delta_pax * beta
    return marginal_revenue - fuel - marginal_varc


def recover(
    schedule: Dict[Tuple[str, str], int],
    failed: str,     # tail id like "C1" — only the type prefix matters here
    params: dict,
) -> RecoveryResult:
    failed_type = failed[0].upper()
    if failed_type not in TYPES:
        raise ValueError(f"Unknown aircraft type in tail id: {failed}")

    fleet = params["fleet"]
    maxhrs = fleet[failed_type]["maxhrs"]
    reserve_type = params.get("reserve_type")

    # ---- 1. Rank failed-type RTs by MARGINAL contribution (ascending) ----
    working = deepcopy(schedule)
    ranked: List[Tuple[Tuple[str, str], float]] = sorted(
        [((t, r), _marginal_contribution(working, t, r, params))
         for (t, r) in working if t == failed_type],
        key=lambda kv: kv[1],
    )

    # ---- 2. Cancel lowest-marginal RTs until we free `maxhrs` ----
    revised = deepcopy(schedule)
    cancelled: List[Tuple[str, str]] = []
    freed = 0.0
    loss_without_reserve = 0.0

    for (t, r), _stale_val in ranked:
        rth = params["routes"][r]["rth"]
        while revised.get((t, r), 0) > 0 and freed < maxhrs:
            # Recompute marginal at each step — earlier cancellations change it.
            marginal = _marginal_contribution(revised, t, r, params)
            revised[(t, r)] -= 1
            freed += rth
            cancelled.append((t, r))
            loss_without_reserve += marginal
            if revised[(t, r)] == 0:
                del revised[(t, r)]

    # ---- 3. Reserve deployment decision ----
    # Fixes F2: value recovered = what the RESERVE'S seat count can carry,
    # not what the original (possibly bigger) type would have carried.
    reserve_deployed = False
    reserve_recovered_value = 0.0
    proto: List[Tuple[str, str]] = []
    if reserve_type in TYPES and cancelled:
        banned = {tuple(b) for b in params.get("restrictions", {}).get("banned", [])}
        # Rank cancellations by ISOLATED profit of RESERVE type (descending).
        cand_scored = []
        for (_orig_t, r) in cancelled:
            if (reserve_type, r) in banned:
                continue
            if r == "R6" and reserve_type == "A":
                continue
            v = _isolated_profit(reserve_type, r, params)
            cand_scored.append((v, r))
        cand_scored.sort(reverse=True)

        capacity_left = fleet[reserve_type]["maxhrs"]
        # R6 special rule: at most one B/C total. We can only sub-in on R6 if
        # the revised schedule doesn't already have a B or C on R6.
        r6_taken = sum(revised.get((tt, "R6"), 0) for tt in ("B", "C")) > 0

        for v, r in cand_scored:
            rth = params["routes"][r]["rth"]
            if rth > capacity_left:
                continue
            if r == "R6" and r6_taken:
                continue
            proto.append((reserve_type, r))
            reserve_recovered_value += v
            capacity_left -= rth
            if r == "R6":
                r6_taken = True

        # Deploy only if the value the reserve creates beats MOB
        if reserve_recovered_value > params["MOB"]:
            reserve_deployed = True
            for (rt_t, r) in proto:
                revised[(rt_t, r)] = revised.get((rt_t, r), 0) + 1

    # ---- 4. Loss accounting ----
    if reserve_deployed:
        loss_with_reserve = loss_without_reserve - reserve_recovered_value + params["MOB"]
    else:
        loss_with_reserve = loss_without_reserve
    net_benefit = loss_without_reserve - loss_with_reserve

    # F7 cleanup: single computation of protected routes.
    protected_routes = [r for r in ROUTES if any(rr == r for _, rr in revised.keys())]

    facts = {
        "failed_tail": failed,
        "failed_type": failed_type,
        "hours_freed": round(freed, 2),
        "cancelled": [f"{t}->{r}" for (t, r) in cancelled],
        "protected_routes": protected_routes,
        "reserve_type": reserve_type,
        "reserve_deployed": reserve_deployed,
        "reserve_recovered_value": round(reserve_recovered_value, 2),
        "mob_cost": params["MOB"],
        "loss_without_reserve": round(loss_without_reserve, 2),
        "loss_with_reserve": round(loss_with_reserve, 2),
        "net_benefit": round(net_benefit, 2),
        "revised_deployment": {f"{t}->{r}": n for (t, r), n in revised.items()},
    }

    return {
        "revised_x": revised,
        "cancelled": cancelled,
        "protected_routes": protected_routes,
        "reserve_deployed": reserve_deployed,
        "reserve_type": reserve_type if reserve_deployed else None,
        "loss_without_reserve": round(loss_without_reserve, 2),
        "loss_with_reserve": round(loss_with_reserve, 2),
        "net_benefit": round(net_benefit, 2),
        "facts": facts,
    }
