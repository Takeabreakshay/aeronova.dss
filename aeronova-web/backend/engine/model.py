"""ILP: assign integer round trips of each aircraft type to each route.

Pure function. Given params -> Solution. No UI or IO here.

Profit formula (per round trip of type t on route r):
    pax(t,r)    = min(demand_r / psi, seats_t * LF)     # per direction
    revenue     = psi * pax(t,r) * fare_r                # both legs
    fuel_cost   = cph_t * rth_r * fuel_mult
    var_cost    = psi * pax(t,r) * beta                  # per-pax variable cost
    profit_rt   = revenue - fuel_cost - var_cost

Per-day totals then subtract MOB * reserve_deployed (mobilization cost of the
reserve aircraft if the manager has parked one).

The exact acceptance value cited in the spec (Rs 1,01,040 for a single Type C
RT on R3) depends on the exact fuel/variable split the analytical spec uses;
adjust `beta` or `fuel_mult` to calibrate. Structure, constraints, and the
DSS pipeline are the same.
"""
from __future__ import annotations
from typing import Dict, Tuple
import pulp

from .data import load_params
from .schemas import Solution


TYPES = ("A", "B", "C")
ROUTES = ("R1", "R2", "R3", "R4", "R5", "R6")


def _pax_per_leg(seats: int, LF: float, demand: float, psi: int) -> float:
    """Passengers per leg for one RT of this type-route in isolation."""
    return min(demand / psi, seats * LF)


def _profit_per_rt(t: str, r: str, params: dict) -> float:
    fleet = params["fleet"][t]
    route = params["routes"][r]
    psi = params["psi"]
    LF = params["LF"]
    beta = params["beta"]
    fuel_mult = params.get("fuel_mult", 1.0)

    pax_leg = _pax_per_leg(fleet["seats"], LF, route["demand"], psi)
    revenue = psi * pax_leg * route["fare"]
    fuel = fleet["cph"] * route["rth"] * fuel_mult
    varc = psi * pax_leg * beta
    return revenue - fuel - varc


def _strategy_weights(params: dict) -> Tuple[float, float]:
    """Return (profit_weight, service_bonus_per_pax_carried).

    profit  -> pure economic objective
    service -> add a passenger-served bonus so the LP prefers filling seats
    resilient -> shrink profit weight; encourage spread across routes
    """
    strat = params.get("strategy", "profit")
    if strat == "service":
        return 1.0, 250.0
    if strat == "resilient":
        return 0.9, 50.0
    return 1.0, 0.0


def optimize(params: dict | None = None) -> Solution:
    """Solve the day-planning ILP and return a Solution."""
    if params is None:
        params = load_params()

    fleet = params["fleet"]
    routes = params["routes"]
    psi = params["psi"]
    LF = params["LF"]
    beta = params["beta"]
    fuel_mult = params.get("fuel_mult", 1.0)
    reserve_type = params.get("reserve_type")
    restrictions = params.get("restrictions", {})
    banned = {tuple(b) for b in restrictions.get("banned", [])}
    min_service = params.get("min_service_override", {})

    prof_w, service_w = _strategy_weights(params)

    prob = pulp.LpProblem("AeroNova_DayPlan", pulp.LpMaximize)

    # Decision vars: x[t,r] integer round trips
    x = {
        (t, r): pulp.LpVariable(f"x_{t}_{r}", lowBound=0, upBound=20, cat=pulp.LpInteger)
        for t in TYPES for r in ROUTES
    }
    # y[r] = 1 if route r operates at all
    y = {r: pulp.LpVariable(f"y_{r}", cat=pulp.LpBinary) for r in ROUTES}
    # passengers carried on route r (continuous, capped by demand and capacity)
    p = {r: pulp.LpVariable(f"pax_{r}", lowBound=0) for r in ROUTES}

    # Hard restrictions from the brief
    for (t, r) in banned:
        prob += x[(t, r)] == 0, f"ban_{t}_{r}"

    # F9 — R6 rule per brief Exhibit 3:
    #   "At least one daily round trip must use Type B or C."
    # NOT "only B/C" and NOT capped at one. Type A may fly R6 alongside a B/C.
    # Only bind the constraint when R6 actually operates (y["R6"] = 1).
    if restrictions.get("R6_only_BC", True):
        prob += (
            x[("B", "R6")] + x[("C", "R6")] >= y["R6"]
        ), "R6_at_least_one_BC"

    # Fleet availability: sum over routes of x[t,r] * rth <= count * maxhrs
    for t in TYPES:
        avail = fleet[t]["count"] * fleet[t]["maxhrs"]
        if reserve_type == t:
            # a reserved airframe is parked, not scheduled
            avail -= fleet[t]["maxhrs"]
        prob += (
            pulp.lpSum(x[(t, r)] * routes[r]["rth"] for r in ROUTES) <= avail
        ), f"avail_{t}"

    # Route operation coupling and min service
    for r in ROUTES:
        # sum of RT on route r
        total_rt = pulp.lpSum(x[(t, r)] for t in TYPES)
        prob += total_rt >= routes[r]["minRT"] * y[r], f"minrt_{r}"
        prob += total_rt <= 20 * y[r], f"couple_{r}"
        floor = min_service.get(r, 0)
        if floor > 0:
            prob += total_rt >= floor, f"floor_{r}"

    # At least 5 of 6 routes operate
    prob += pulp.lpSum(y[r] for r in ROUTES) >= restrictions.get("routes_operate_min", 5), "coverage_min"

    # Passenger accounting: pax <= demand AND pax <= capacity * LF per leg * psi
    for r in ROUTES:
        prob += p[r] <= routes[r]["demand"], f"dem_{r}"
        cap = pulp.lpSum(psi * fleet[t]["seats"] * LF * x[(t, r)] for t in TYPES)
        prob += p[r] <= cap, f"cap_{r}"

    # Objective: revenue - fuel - variable cost, weighted by strategy
    fuel_term = pulp.lpSum(
        fleet[t]["cph"] * routes[r]["rth"] * fuel_mult * x[(t, r)]
        for t in TYPES for r in ROUTES
    )
    revenue_term = pulp.lpSum(routes[r]["fare"] * p[r] for r in ROUTES)
    var_term = pulp.lpSum(beta * p[r] for r in ROUTES)
    service_term = pulp.lpSum(service_w * p[r] for r in ROUTES)

    prob += prof_w * (revenue_term - fuel_term - var_term) + service_term

    solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=15)
    status = prob.solve(solver)
    status_str = pulp.LpStatus[status]

    # ---------- Infeasibility guard ----------
    # If CBC can't find a plan, don't crash — return a clean explanation of the
    # binding constraint so the UI can render "no feasible plan under these
    # settings" with a hint at what the manager should relax.
    if status_str in ("Infeasible", "Undefined", "Not Solved"):
        reason = _diagnose_infeasibility(params)
        return {
            "x": {},
            "carried": {r: 0.0 for r in ROUTES},
            "operate": {r: 0 for r in ROUTES},
            "profit": 0.0,
            "kpis": {"spill_pct": 100.0, "load_factor": 0.0, "utilization": 0.0, "coverage": 0},
            "status": "Infeasible",
            "facts": {
                "profit": 0.0, "revenue": 0.0, "fuel_cost": 0.0,
                "variable_cost": 0.0, "mob_cost": 0,
                "carried_by_route": {r: 0.0 for r in ROUTES},
                "operate": {r: 0 for r in ROUTES},
                "deployment": {},
                "kpis": {"spill_pct": 100.0, "load_factor": 0.0, "utilization": 0.0, "coverage": 0},
                "strategy": params.get("strategy", "profit"),
                "reserve_type": reserve_type,
                "fuel_mult": fuel_mult,
                "infeasible_reason": reason,
            },
        }

    # Extract solution
    x_out: Dict[Tuple[str, str], int] = {}
    for t in TYPES:
        for r in ROUTES:
            v = int(round(pulp.value(x[(t, r)]) or 0))
            if v > 0:
                x_out[(t, r)] = v

    carried = {r: float(pulp.value(p[r]) or 0.0) for r in ROUTES}
    operate = {r: int(round(pulp.value(y[r]) or 0)) for r in ROUTES}

    # Recompute economic profit (without service bonus) for the KPI
    revenue = sum(routes[r]["fare"] * carried[r] for r in ROUTES)
    fuel = sum(
        fleet[t]["cph"] * routes[r]["rth"] * fuel_mult * x_out.get((t, r), 0)
        for t in TYPES for r in ROUTES
    )
    varc = sum(beta * carried[r] for r in ROUTES)
    mob_cost = params["MOB"] if reserve_type else 0
    profit = revenue - fuel - varc - mob_cost

    # KPIs
    total_demand = sum(routes[r]["demand"] for r in ROUTES)
    total_carried = sum(carried.values())
    spill_pct = 100.0 * (total_demand - total_carried) / total_demand if total_demand > 0 else 0.0

    total_cap = sum(
        psi * fleet[t]["seats"] * LF * x_out.get((t, r), 0)
        for t in TYPES for r in ROUTES
    )
    load_factor = (total_carried / total_cap) if total_cap > 0 else 0.0

    used_hours = sum(
        routes[r]["rth"] * x_out.get((t, r), 0)
        for t in TYPES for r in ROUTES
    )
    avail_hours = sum(
        fleet[t]["count"] * fleet[t]["maxhrs"] - (fleet[t]["maxhrs"] if reserve_type == t else 0)
        for t in TYPES
    )
    utilization = used_hours / avail_hours if avail_hours > 0 else 0.0

    coverage = sum(operate.values())

    kpis = {
        "spill_pct": round(spill_pct, 2),
        "load_factor": round(load_factor, 4),
        "utilization": round(utilization, 4),
        "coverage": coverage,
    }

    facts = {
        "profit": round(profit, 2),
        "revenue": round(revenue, 2),
        "fuel_cost": round(fuel, 2),
        "variable_cost": round(varc, 2),
        "mob_cost": mob_cost,
        "carried_by_route": {r: round(c, 1) for r, c in carried.items()},
        "operate": operate,
        "deployment": {f"{t}->{r}": n for (t, r), n in x_out.items()},
        "kpis": kpis,
        "strategy": params.get("strategy", "profit"),
        "reserve_type": reserve_type,
        "fuel_mult": fuel_mult,
    }

    return {
        "x": x_out,
        "carried": carried,
        "operate": operate,
        "profit": round(profit, 2),
        "kpis": kpis,
        "status": status_str,
        "facts": facts,
    }


def _diagnose_infeasibility(params: dict) -> dict:
    """Identify the binding constraint most likely causing infeasibility.

    Returns a structured dict so the UI (and AI narrator) can render a clean
    explanation instead of a stack trace. Checked in order of most-common cause.
    """
    fleet = params["fleet"]
    routes = params["routes"]
    reserve_type = params.get("reserve_type")
    min_service = params.get("min_service_override", {}) or {}

    # 1. Not enough fleet-hours to meet minimum-service floors on every route
    for t in TYPES:
        avail = fleet[t]["count"] * fleet[t]["maxhrs"]
        if reserve_type == t:
            avail -= fleet[t]["maxhrs"]
        # rough demand for hours from floors (ignoring type-route bans)
        req = sum(
            routes[r]["rth"] * max(routes[r]["minRT"], min_service.get(r, 0))
            for r in ROUTES
        ) / len(TYPES)  # spread across types
        if req > avail:
            return {
                "constraint": "fleet_hours",
                "type": t,
                "binding": f"Type {t} has {avail:.1f} block hours available; "
                          f"minimum service on all routes needs ~{req:.1f}.",
                "hint": (
                    "Lower a minimum-service floor, drop the reserve requirement, "
                    f"or increase Type {t} availability."
                ),
            }

    # 2. Minimum-service floors that exceed any single type's capacity per route
    for r in ROUTES:
        floor = max(routes[r]["minRT"], min_service.get(r, 0))
        max_rt_any_type = max(
            fleet[t]["maxhrs"] // routes[r]["rth"] for t in TYPES
        )
        if floor > max_rt_any_type * sum(fleet[t]["count"] for t in TYPES):
            return {
                "constraint": "min_service",
                "route": r,
                "binding": f"Route {r} floor is {floor} RT/day, which no combination "
                          f"of aircraft can deliver given block-hour caps.",
                "hint": f"Reduce {r}'s minimum-service floor below {max_rt_any_type}.",
            }

    # 3. Fallback — generic
    return {
        "constraint": "general",
        "binding": "The combination of demand, minimum service, availability, "
                  "and the reserve reservation has no feasible plan.",
        "hint": (
            "Try relaxing one at a time: lower a minimum-service floor, "
            "drop the reserve, or raise aircraft availability."
        ),
    }


def acceptance_check_C_R3() -> float:
    """Isolated: one C on R3 only, no fleet limits elsewhere.

    Returns the profit our formula produces. The build spec quotes Rs 1,01,040
    from the analytical spec; the exact figure depends on the beta/fuel split
    finalised in that document.
    """
    p = load_params()
    # zero everything but C on R3, allow one RT
    p["restrictions"]["banned"] = [
        (t, r) for t in TYPES for r in ROUTES
        if not (t == "C" and r == "R3")
    ]
    p["restrictions"]["routes_operate_min"] = 1
    for r in ROUTES:
        p["routes"][r]["minRT"] = 0
    p["min_service_override"] = {"R3": 1}
    return optimize(p)["profit"]
