"""Typed dictionaries for engine inputs and outputs.

Kept lightweight (TypedDict) so the engine stays pure-Python and testable
without pydantic. The AI narrator reads only from the `facts` objects
these produce — everything numeric flows through here.
"""
from __future__ import annotations
from typing import Dict, List, Optional, Tuple, TypedDict


AircraftType = str  # "A" | "B" | "C"
RouteId = str       # "R1"..."R6"


class KPIs(TypedDict):
    spill_pct: float
    load_factor: float
    utilization: float
    coverage: int


class Solution(TypedDict):
    x: Dict[Tuple[AircraftType, RouteId], int]
    carried: Dict[RouteId, float]
    operate: Dict[RouteId, int]
    profit: float
    kpis: KPIs
    status: str
    facts: dict


class RiskResult(TypedDict):
    mean_profit: float
    p5: float
    p10: float
    worst: float
    cvar5: float
    cancel_rate: float
    avg_spill_pct: float
    avg_load_factor: float
    avg_utilization: float
    avg_coverage: float
    disruption_loss: float
    profit_distribution: List[float]
    facts: dict


class RecoveryResult(TypedDict):
    revised_x: Dict[Tuple[AircraftType, RouteId], int]
    cancelled: List[Tuple[AircraftType, RouteId]]
    protected_routes: List[RouteId]
    reserve_deployed: bool
    reserve_type: Optional[AircraftType]
    loss_without_reserve: float
    loss_with_reserve: float
    net_benefit: float
    facts: dict
