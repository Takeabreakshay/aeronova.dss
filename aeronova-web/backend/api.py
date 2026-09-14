"""FastAPI wrapper around the AeroNova engine.

Reuses the existing engine/* and ai/* packages verbatim — just exposes them
over HTTP so the React frontend can call them.

Run:
    uvicorn api:app --reload --port 8000
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import (
    load_params, optimize, simulate, recover,
    reserve_breakeven, beta_sweep, strategy_compare,
)
from ai import parse_request, narrate_solution, narrate_risk, narrate_recovery
from ai.parse import apply_deltas
from ai.prompts import NARRATE_GUARDRAIL


app = FastAPI(title="Aero Nova DSS API", version="1.0.0")

# CORS: allow local dev + any origins in CORS_ORIGINS env var (comma-separated).
# Vercel preview URLs change per PR, so we allow *.vercel.app by default too.
_extra_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
_default_origins = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:4173", "http://127.0.0.1:4173",  # vite preview
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"], allow_headers=["*"],
)


class ParamsPayload(BaseModel):
    params: Dict[str, Any]


class SimulatePayload(BaseModel):
    params: Dict[str, Any]
    schedule: Dict[str, int]   # keys like "A,R1" -> RT count
    trials: int = 2000


class RecoverPayload(BaseModel):
    params: Dict[str, Any]
    schedule: Dict[str, int]
    failed_tail: str


class ChatPayload(BaseModel):
    params: Dict[str, Any]
    text: str


def _schedule_from_str_keys(sched: Dict[str, int]) -> Dict[tuple, int]:
    """Convert 'A,R1' string keys back to tuple keys the engine expects."""
    return {tuple(k.split(",")): v for k, v in sched.items()}


def _schedule_to_str_keys(sched: Dict[tuple, int]) -> Dict[str, int]:
    return {f"{t},{r}": v for (t, r), v in sched.items()}


@app.get("/api/health")
def health():
    return {"status": "ok", "guardrail": NARRATE_GUARDRAIL}


@app.get("/api/defaults")
def defaults():
    return load_params()


@app.post("/api/optimize")
def api_optimize(p: ParamsPayload):
    sol = optimize(p.params)
    return {**sol, "x": _schedule_to_str_keys(sol["x"])}


@app.post("/api/simulate")
def api_simulate(p: SimulatePayload):
    schedule = _schedule_from_str_keys(p.schedule)
    return simulate(schedule, p.params, trials=p.trials)


@app.post("/api/recover")
def api_recover(p: RecoverPayload):
    schedule = _schedule_from_str_keys(p.schedule)
    rec = recover(schedule, p.failed_tail, p.params)
    return {**rec, "revised_x": _schedule_to_str_keys(rec["revised_x"])}


@app.post("/api/breakeven")
def api_breakeven(p: ParamsPayload):
    return reserve_breakeven(p.params, reserve_type="C", trials=1500)


@app.post("/api/beta_sweep")
def api_beta_sweep(p: ParamsPayload):
    return beta_sweep(p.params, trials=1500)


@app.post("/api/strategy_compare")
def api_strategy_compare(p: ParamsPayload):
    return strategy_compare(p.params, trials=3000, seed=42)


@app.post("/api/chat")
def api_chat(p: ChatPayload):
    parsed = parse_request(p.text)
    action = parsed.get("action", "explain")
    result: Dict[str, Any] = {"parsed": parsed, "action": action}

    if action == "recover":
        tail = parsed.get("recover", {}).get("failed_tail", "C1")
        sol = optimize(p.params)
        rec = recover(sol["x"], tail, p.params)
        result["reply"] = narrate_recovery(rec["facts"], p.text)
        result["recovery"] = {**rec, "revised_x": _schedule_to_str_keys(rec["revised_x"])}
    elif action == "resimulate":
        new_p = apply_deltas(p.params, parsed)
        sol = optimize(new_p)
        risk = simulate(sol["x"], new_p, trials=2000)
        result["reply"] = narrate_risk(risk["facts"], p.text)
        result["params"] = new_p
        result["solution"] = {**sol, "x": _schedule_to_str_keys(sol["x"])}
        result["risk"] = risk
    elif action == "reoptimize":
        new_p = apply_deltas(p.params, parsed)
        sol = optimize(new_p)
        result["reply"] = narrate_solution(sol["facts"], p.text)
        result["params"] = new_p
        result["solution"] = {**sol, "x": _schedule_to_str_keys(sol["x"])}
    else:
        sol = optimize(p.params)
        result["reply"] = narrate_solution(sol["facts"], p.text)

    return result
