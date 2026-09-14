"""Natural language -> parameter deltas.

Uses NVIDIA NIM (Nemotron) if a key is configured, otherwise falls back to a
small regex parser so the demo still works offline (engine remains fully
usable; only the chat degrades).
"""
from __future__ import annotations
import json
import os
import re
from typing import Any, Dict

from .prompts import PARSE_SYSTEM


NVIDIA_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"


def _nvidia_client():
    """Return an OpenAI-compatible client pointed at NVIDIA NIM, or None."""
    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        return None
    key = os.environ.get("NVIDIA_API_KEY")
    if not key:
        try:
            import streamlit as st  # type: ignore
            key = st.secrets.get("NVIDIA_API_KEY")  # type: ignore[attr-defined]
        except Exception:
            key = None
    if not key:
        return None
    return OpenAI(base_url=NVIDIA_BASE_URL, api_key=key)


def _strip_json_fence(body: str) -> str:
    body = body.strip()
    body = re.sub(r"^```(?:json)?", "", body).strip()
    body = re.sub(r"```$", "", body).strip()
    # Grab the first {...} block if the model added prose around it.
    m = re.search(r"\{[\s\S]*\}", body)
    return m.group(0) if m else body


def _regex_fallback(text: str) -> Dict[str, Any]:
    """Best-effort local parser. Handles the common demo phrases."""
    t = text.lower()
    deltas: Dict[str, Any] = {}
    action = "reoptimize"
    recover = None

    # kill an aircraft
    m = re.search(r"kill\s+([abc]\d)|([abc]\d)\s+goes\s+technical|lose\s+([abc]\d)", t)
    if m:
        tail = next(g for g in m.groups() if g)
        return {"action": "recover", "param_deltas": {}, "recover": {"failed_tail": tail.upper()}}

    # fuel
    m = re.search(r"fuel\s+(?:jumps?|rises?|up|spikes?)\s+(\d+)\s*%", t)
    if m:
        deltas["fuel_mult"] = 1 + int(m.group(1)) / 100.0
    m = re.search(r"fuel\s+(?:drops?|falls?|down)\s+(\d+)\s*%", t)
    if m:
        deltas["fuel_mult"] = 1 - int(m.group(1)) / 100.0

    # route demand change (relative)
    for m in re.finditer(
        r"r(?P<r>[1-6])\s+demand\s+(?P<dir>drops?|falls?|down|jumps?|rises?|up)\s+(?P<pct>\d+)\s*%",
        t,
    ):
        r = "R" + m.group("r")
        pct = int(m.group("pct")) / 100.0
        sign = -1 if m.group("dir").startswith(("drop", "fall", "down")) else 1
        deltas[f"routes.{r}.demand_pct"] = 1 + sign * pct

    # global demand shift
    m = re.search(r"demand\s+(?:overall|globally|across the board)\s+(down|up)\s+(\d+)\s*%", t)
    if m:
        sign = -1 if m.group(1) == "down" else 1
        deltas["global_demand_mult"] = 1 + sign * int(m.group(2)) / 100.0

    # availability
    m = re.search(r"avail(?:ability)?\s+(?:to|=)?\s*(\d+)\s*%", t)
    if m:
        deltas["avail_p"] = int(m.group(1)) / 100.0
        action = "resimulate"

    # strategy
    if "service" in t and "strategy" in t:
        deltas["strategy"] = "service"
    elif "resilient" in t and "strategy" in t:
        deltas["strategy"] = "resilient"
    elif "profit" in t and "strategy" in t:
        deltas["strategy"] = "profit"

    # reserve
    m = re.search(r"reserve\s+(?:to\s+)?(a|b|c)\b", t)
    if m:
        deltas["reserve_type"] = m.group(1).upper()
    if "no reserve" in t or "reserve off" in t or "drop reserve" in t:
        deltas["reserve_type"] = None

    if not deltas and not recover:
        action = "explain"

    return {"action": action, "param_deltas": deltas, "recover": recover}


# Extra instruction appended to PARSE_SYSTEM to keep Nemotron's output strict.
_JSON_ONLY = (
    "\n\nReturn ONLY the JSON object. No prose. No markdown fences. No trailing "
    "commentary. Start with { and end with }."
)


def parse_request(text: str) -> Dict[str, Any]:
    """Return {'action': str, 'param_deltas': dict, 'recover': dict|None}."""
    client = _nvidia_client()
    if client is None:
        return _regex_fallback(text)
    try:
        resp = client.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": PARSE_SYSTEM + _JSON_ONLY},
                {"role": "user", "content": text},
            ],
            temperature=0.0,          # deterministic JSON
            top_p=1.0,
            max_tokens=800,
            # thinking OFF for parse — we want the raw JSON, not the CoT
            extra_body={"chat_template_kwargs": {"enable_thinking": False}},
        )
        body = resp.choices[0].message.content or ""
        return json.loads(_strip_json_fence(body))
    except Exception:
        return _regex_fallback(text)


def apply_deltas(params: dict, parsed: Dict[str, Any]) -> dict:
    """Return an updated params dict from parser output."""
    from copy import deepcopy
    p = deepcopy(params)
    deltas = parsed.get("param_deltas") or {}
    for key, val in deltas.items():
        if key == "fuel_mult":
            p["fuel_mult"] = float(val)
        elif key == "LF":
            p["LF"] = float(val)
        elif key == "avail_p":
            p["avail_p"] = float(val)
        elif key == "strategy":
            p["strategy"] = str(val)
        elif key == "reserve_type":
            p["reserve_type"] = val if val in ("A", "B", "C") else None
        elif key == "global_demand_mult":
            m = float(val)
            for r in p["routes"]:
                p["routes"][r]["demand"] *= m
        elif key.startswith("routes."):
            parts = key.split(".")
            _, r, field = parts
            if field.endswith("_pct"):
                base_field = field.replace("_pct", "")
                p["routes"][r][base_field] *= float(val)
            else:
                p["routes"][r][field] = float(val)
        elif key.startswith("min_service_override."):
            r = key.split(".", 1)[1]
            p["min_service_override"][r] = int(val)
    return p
