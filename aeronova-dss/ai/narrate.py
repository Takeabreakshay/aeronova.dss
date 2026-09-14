"""Engine facts -> plain English.

Uses NVIDIA NIM (Nemotron) if a key is configured, otherwise falls back to a
local template narrator so the DSS still speaks to the manager offline.

Guardrail is enforced by CODE, not by hoping the LLM obeys the system prompt:
after the model returns, we extract every numeric token from its output and
verify each appears in the facts object. Anything that fails the check either
gets flagged in a warning line or, if too many fail, forces the safe template
fallback. This is the five-line guard that keeps the "AI never computes"
claim intact even when the LLM breaks the rule.
"""
from __future__ import annotations
import json
import os
import re
from typing import Any, Dict, Iterable

from .prompts import NARRATE_SYSTEM


NVIDIA_MODEL = "nvidia/nemotron-3-ultra-550b-a55b"
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"


def _nvidia_client():
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


_NUMBER_RE = re.compile(r"-?\d[\d,]*\.?\d*")
# integers/percentages we allow the model to state without matching a fact
_UNIVERSAL_OK = {"0", "1", "2", "3", "4", "5", "6", "100", "50", "10"}


def _flatten_numeric(obj: Any) -> Iterable[str]:
    """Yield every numeric literal reachable from `facts` as a normalized string."""
    if isinstance(obj, (int, float)):
        yield f"{float(obj):.10g}"  # normalize
        if float(obj).is_integer():
            yield str(int(obj))
        yield f"{obj:,.0f}"
        yield f"{obj:,.2f}"
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from _flatten_numeric(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            yield from _flatten_numeric(v)


def _fact_number_set(facts: Dict[str, Any]) -> set[str]:
    """Every numeric token the AI is allowed to reference."""
    seen = set(_UNIVERSAL_OK)
    for tok in _flatten_numeric(facts):
        seen.add(tok.replace(",", ""))
    return seen


def _guard_numbers(text: str, facts: Dict[str, Any]) -> tuple[str, list[str]]:
    """Verify every number in `text` appears in `facts`.

    Returns (clean_text, unverified_tokens). If more than 2 tokens fail,
    the caller should fall back to the template narrator.
    """
    allowed = _fact_number_set(facts)
    unverified: list[str] = []
    for m in _NUMBER_RE.finditer(text):
        tok = m.group(0).replace(",", "")
        if tok in allowed:
            continue
        # accept close matches within 1% (LLM rounding)
        try:
            val = float(tok)
            if any(abs(val - float(a)) / max(abs(float(a)), 1) < 0.01
                   for a in allowed if _looks_numeric(a)):
                continue
        except ValueError:
            pass
        unverified.append(tok)
    return text, unverified


def _looks_numeric(s: str) -> bool:
    try:
        float(s)
        return True
    except ValueError:
        return False


def _ai(facts: Dict[str, Any], user_prompt: str) -> str:
    c = _nvidia_client()
    if c is None:
        return _fallback(facts, user_prompt)
    try:
        resp = c.chat.completions.create(
            model=NVIDIA_MODEL,
            messages=[
                {"role": "system", "content": NARRATE_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"{user_prompt}\n\nfacts:\n" + json.dumps(facts, indent=2)
                    ),
                },
            ],
            temperature=0.4,
            top_p=0.95,
            max_tokens=600,
            extra_body={"chat_template_kwargs": {"enable_thinking": False}},
        )
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            return _fallback(facts, user_prompt)

        # ---- Post-check: every number in the reply must be in facts ----
        text, unverified = _guard_numbers(text, facts)
        if len(unverified) > 2:
            # Too many invented numbers — refuse to display AI output
            return _fallback(facts, user_prompt) + \
                   "\n\n_Guardrail: LLM cited unverifiable numbers; template used._"
        if unverified:
            text += f"\n\n_Note: {len(unverified)} figure(s) not verified against engine facts._"
        return text
    except Exception:
        return _fallback(facts, user_prompt)


def _rs(x: float) -> str:
    return f"Rs {x:,.0f}"


def _fallback(facts: Dict[str, Any], user_prompt: str) -> str:
    """Template narrator using only fields from facts."""
    if "revised_deployment" in facts:  # recovery
        f = facts
        s = (
            f"Aircraft {f['failed_tail']} out. Freed {f['hours_freed']} block hours "
            f"of type {f['failed_type']}. Cancelled: "
            f"{', '.join(f['cancelled']) if f['cancelled'] else 'none'}. "
            f"Protected routes: {', '.join(f['protected_routes'])}. "
        )
        if f["reserve_deployed"]:
            s += (
                f"Reserve type {f['reserve_type']} deployed — recovers "
                f"{_rs(f['reserve_recovered_value'])} of contribution against a "
                f"{_rs(f['mob_cost'])} mobilization cost, net benefit "
                f"{_rs(f['net_benefit'])}. "
            )
        else:
            s += (
                f"Reserve not deployed (economic loss {_rs(f['loss_without_reserve'])} "
                f"vs {_rs(f['mob_cost'])} mob cost). "
            )
        return s
    if "profit_distribution" in facts or "cvar5" in facts:  # risk
        f = facts
        return (
            f"Expected profit {_rs(f['mean_profit'])} across {f['trials']} sampled days. "
            f"5th percentile {_rs(f['p5'])}, worst {_rs(f['worst'])}, CVaR5 {_rs(f['cvar5'])}. "
            f"Cancel rate {f['cancel_rate']*100:.1f}%, avg spill {f['avg_spill_pct']}%, "
            f"load factor {f['avg_load_factor']*100:.1f}%, coverage {f['avg_coverage']}/6. "
            f"Disruption loss {_rs(f['disruption_loss'])}."
        )
    # solution
    f = facts
    dep = ", ".join(f"{k}={v}" for k, v in list(f["deployment"].items())[:6])
    return (
        f"Optimal profit today {_rs(f['profit'])} under {f['strategy']} strategy. "
        f"Deployment: {dep}. "
        f"Coverage {f['kpis']['coverage']}/6, load factor {f['kpis']['load_factor']*100:.1f}%, "
        f"utilization {f['kpis']['utilization']*100:.1f}%, spill {f['kpis']['spill_pct']}%. "
        f"Revenue {_rs(f['revenue'])}, fuel {_rs(f['fuel_cost'])}, variable {_rs(f['variable_cost'])}."
    )


def narrate_solution(facts: Dict[str, Any], user_prompt: str = "Summarize the plan.") -> str:
    return _ai(facts, user_prompt)


def narrate_risk(facts: Dict[str, Any], user_prompt: str = "Summarize downside risk.") -> str:
    return _ai(facts, user_prompt)


def narrate_recovery(facts: Dict[str, Any], user_prompt: str = "Explain the recovery decision.") -> str:
    return _ai(facts, user_prompt)
