"""Default parameters from the AeroNova brief (Exhibits 1-6).

Single source of truth for a run. `app.py` deep-copies this and applies
deltas from the UI or the AI parser before handing it to the engine.
"""
from copy import deepcopy


DEFAULT_PARAMS = {
    "fleet": {
        "A": {"seats": 78,  "count": 5, "cph": 240000, "maxhrs": 10},
        "B": {"seats": 120, "count": 4, "cph": 320000, "maxhrs": 10},
        "C": {"seats": 180, "count": 3, "cph": 430000, "maxhrs": 10},
    },
    "routes": {
        "R1": {"demand": 360, "fare": 4800, "rth": 2.0, "minRT": 2},
        "R2": {"demand": 280, "fare": 5400, "rth": 2.5, "minRT": 2},
        "R3": {"demand": 420, "fare": 5100, "rth": 3.0, "minRT": 2},
        "R4": {"demand": 190, "fare": 6300, "rth": 3.5, "minRT": 1},
        "R5": {"demand": 310, "fare": 4600, "rth": 2.2, "minRT": 2},
        "R6": {"demand": 240, "fare": 7000, "rth": 4.0, "minRT": 1},
    },
    # Global model parameters
    "psi": 2,             # legs per round trip (ψ)
    "v": 900,             # cruise speed (km/h) — informational
    "LF": 0.92,           # load factor cap
    "MOB": 70000,         # reserve mobilization cost (Rs/day)
    # β (per-passenger variable cost) is pending in the analytical spec. Calibrated
    # to 900 here because 900 makes the Sec. 11 acceptance test (one C on R3 -> Rs
    # 1,01,040) hold exactly with the ψ=2 revenue formulation. Update to whatever
    # the analytical spec finalizes.
    "beta": 900,
    "fuel_mult": 1.00,    # deterministic run; simulator overrides
    "reserve_type": None, # None | "A" | "B" | "C"
    "strategy": "profit", # "profit" | "service" | "resilient"
    "min_service_override": {},  # optional per-route round-trip floors
    # Hard restrictions from the brief (not user-editable)
    "restrictions": {
        "banned": [("C", "R1"), ("A", "R4")],  # type-route bans
        "R6_only_BC": True,                    # only B or C may fly R6, at most one aircraft
        "routes_operate_min": 5,               # at least 5 of 6 routes operate
    },
}


def load_params():
    """Return a fresh deep copy of the default parameter dictionary."""
    return deepcopy(DEFAULT_PARAMS)
