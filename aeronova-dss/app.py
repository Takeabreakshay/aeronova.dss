"""Aero Nova DSS — Streamlit entry point (product-shaped)."""
from __future__ import annotations
import hashlib
import json
from copy import deepcopy

import pandas as pd
import plotly.express as px
import streamlit as st

from engine import DEFAULT_PARAMS, optimize, simulate, recover, load_params
from engine import reserve_breakeven, beta_sweep, strategy_compare
from ai import parse_request, narrate_solution, narrate_risk, narrate_recovery
from ai.parse import apply_deltas
from ai.prompts import NARRATE_GUARDRAIL
from styles.theme import THEME_CSS, render_topbar, section_title, info_banner


st.set_page_config(page_title="Aero Nova", layout="wide", initial_sidebar_state="expanded")
(st.html if hasattr(st, "html") else lambda x: st.markdown(x, unsafe_allow_html=True))(THEME_CSS)


# ---------- session state
def _init():
    st.session_state.setdefault("params", load_params())
    st.session_state.setdefault("last_solution", None)
    st.session_state.setdefault("last_risk", None)
    st.session_state.setdefault("last_recovery", None)
    st.session_state.setdefault("saved_scenarios", {})
    st.session_state.setdefault("chat_history", [])


_init()


def _h(p: dict) -> str:
    return hashlib.md5(json.dumps(p, sort_keys=True, default=str).encode()).hexdigest()


@st.cache_data(show_spinner=False)
def cached_opt(hkey: str, pjson: str):
    return optimize(json.loads(pjson))


def run_opt(p: dict):
    return cached_opt(_h(p), json.dumps(p, default=str))


# =================== Sidebar (controls) ===================
with st.sidebar:
    st.markdown("### Strategy")
    p = st.session_state.params
    p["strategy"] = st.radio(
        "s", ["profit", "service", "resilient"],
        index=["profit", "service", "resilient"].index(p["strategy"]),
        horizontal=True, label_visibility="collapsed",
    )

    st.markdown("### Scenario")
    scenario_name = st.text_input("name", value="baseline", label_visibility="collapsed")
    sc1, sc2 = st.columns(2)
    with sc1:
        if st.button("Save", use_container_width=True):
            st.session_state.saved_scenarios[scenario_name] = {
                "params": deepcopy(p),
                "solution": st.session_state.last_solution,
                "risk": st.session_state.last_risk,
            }
    with sc2:
        if st.button("Reset", use_container_width=True):
            st.session_state.params = load_params()
            st.rerun()

    st.markdown("### Demand")
    shift = st.slider("Global shift %", -30, 30, 0, step=5)
    for r_id in ["R1", "R2", "R3", "R4", "R5", "R6"]:
        base = DEFAULT_PARAMS["routes"][r_id]["demand"]
        p["routes"][r_id]["demand"] = st.slider(
            f"{r_id} pax", int(base * 0.5), int(base * 1.5),
            int(base * (1 + shift / 100)), step=5, key=f"d_{r_id}",
        )

    st.markdown("### Fuel & load")
    fuel_choice = st.selectbox("Fuel", ["Low (0.85x)", "Base (1.00x)", "High (1.20x)", "Custom"])
    fmap = {"Low": 0.85, "Base": 1.00, "High": 1.20}
    key = fuel_choice.split()[0]
    p["fuel_mult"] = fmap[key] if key in fmap else st.slider("Fuel mult", 0.7, 1.8, 1.0, 0.01)
    p["LF"] = st.slider("Load factor cap", 0.70, 0.98, float(p["LF"]), 0.01)
    p["avail_p"] = st.slider("Aircraft availability", 0.90, 0.99, 0.97, 0.005)

    st.markdown("### Reserve")
    reserve = st.selectbox("Parked", ["None", "A", "B", "C"],
                            index=["None", "A", "B", "C"].index(p.get("reserve_type") or "None"))
    p["reserve_type"] = None if reserve == "None" else reserve

    st.markdown("### Simulation")
    trials = st.radio("t", [2000, 10000], index=0, horizontal=True, label_visibility="collapsed")

    st.markdown("---")
    st.caption(f"◆ {NARRATE_GUARDRAIL[:120]}…")


# =================== Optimize now ===================
solution = run_opt(st.session_state.params)
st.session_state.last_solution = solution
profit = solution["profit"]
reserve_str = st.session_state.params.get("reserve_type") or "OFF"
is_feasible = solution["status"] == "Optimal"


# =================== Top nav bar ===================
st.markdown(
    render_topbar(
        strategy=st.session_state.params["strategy"],
        reserve=reserve_str,
        coverage=solution["kpis"]["coverage"],
        profit=profit,
    ),
    unsafe_allow_html=True,
)

# Guardrail visible badge (Tier-3 deliverable)
st.markdown(
    f"""<div style='display:flex; justify-content:space-between; align-items:center;
                    padding:8px 14px; margin:-12px 0 18px;
                    background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.25);
                    border-radius:10px; font-family:Geist Mono; font-size:11px; color:#a0a5bd;'>
        <span>◆ <b style='color:#a78bfa;'>Guardrail:</b> {NARRATE_GUARDRAIL}</span>
        <span style='color:#6b7089;'>seed 42 · reproducible</span>
    </div>""",
    unsafe_allow_html=True,
)

# ---- Infeasibility banner (Tier-1 showstopper fix) ----
if not is_feasible:
    reason = solution["facts"].get("infeasible_reason", {})
    st.markdown(
        f"""<div style='padding:18px 22px; margin-bottom:20px;
                       background:linear-gradient(90deg, rgba(248,113,113,0.10), rgba(250,204,21,0.05));
                       border:1px solid rgba(248,113,113,0.4); border-radius:14px;'>
          <div style='font-family:Geist Mono; font-size:11px; letter-spacing:0.14em;
                     color:#f87171; text-transform:uppercase; margin-bottom:8px;'>◇ No feasible plan under current settings</div>
          <div style='font-size:14px; color:#e8eaf3; margin-bottom:6px;'>{reason.get("binding", "The current settings have no feasible schedule.")}</div>
          <div style='font-size:12px; color:#a0a5bd;'>→ {reason.get("hint", "Relax a control on the sidebar and try again.")}</div>
        </div>""",
        unsafe_allow_html=True,
    )


# =================== Tabs ===================
tab_deploy, tab_risk, tab_recover, tab_analysis, tab_ask = st.tabs(
    ["◆  Deploy", "▲  Risk", "✕  Recover", "≡  Analysis", "◈  Ask AI"]
)


# ---------- Deploy tab ----------
with tab_deploy:
    st.markdown(section_title("Today's plan", "Deterministic optimal — solved in real time", "deploy"), unsafe_allow_html=True)

    k1, k2, k3, k4, k5, k6 = st.columns(6)
    served = sum(solution["carried"].values())
    demand = sum(st.session_state.params["routes"][r]["demand"] for r in solution["carried"])
    k1.metric("Profit", f"Rs {profit:,.0f}")
    k2.metric("Served", f"{served:,.0f}", f"spill {demand - served:,.0f}")
    k3.metric("Utilization", f"{solution['kpis']['utilization']*100:.1f}%")
    k4.metric("Coverage", f"{solution['kpis']['coverage']} / 6")
    k5.metric("Load factor", f"{solution['kpis']['load_factor']*100:.1f}%")
    k6.metric("Reserve", "Deployed" if reserve_str != "OFF" else "Off", reserve_str)

    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(section_title("Routes today", "Which planes fly where, and how full they land", "route"), unsafe_allow_html=True)
    schedule = solution["x"]

    # Aircraft-type colour + short label
    type_meta = {
        "A": ("#22d3ee", "78-seat"),
        "B": ("#8b5cf6", "120-seat"),
        "C": ("#f472b6", "180-seat"),
    }

    # Two columns of route cards
    col_l, col_r = st.columns(2, gap="medium")
    for i, r_id in enumerate(("R1", "R2", "R3", "R4", "R5", "R6")):
        route = st.session_state.params["routes"][r_id]
        demand = route["demand"]
        served = solution["carried"].get(r_id, 0)
        fill = min(1.0, served / demand) if demand else 0
        operating = solution["operate"].get(r_id, 0)

        # aircraft chips assigned to this route
        chips = "".join(
            f'<span style="display:inline-flex; align-items:center; gap:6px; '
            f'padding:4px 10px; border-radius:999px; margin-right:6px; '
            f'background:{type_meta[t][0]}22; color:{type_meta[t][0]}; '
            f'border:1px solid {type_meta[t][0]}55; font-family:Geist Mono; font-size:11px; font-weight:600;">'
            f'Type {t} × {schedule[(t, r_id)]}</span>'
            for t in ("A", "B", "C") if (t, r_id) in schedule
        ) or '<span style="color:#6b7089; font-size:12px; font-style:italic;">not operating</span>'

        # colour the progress bar by fill
        bar_col = "#4ade80" if fill >= 0.9 else "#facc15" if fill >= 0.7 else "#f87171"
        status = "OPERATING" if operating else "OFFLINE"
        status_col = "#4ade80" if operating else "#f87171"

        card_html = f"""
        <div class="an-card" style="margin-bottom:12px; padding:16px 18px;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px;">
            <div style="display:flex; align-items:baseline; gap:10px;">
              <span style="font-family:Geist Mono; font-size:18px; font-weight:600; color:#e8eaf3;">{r_id}</span>
              <span style="font-family:Geist Mono; font-size:10.5px; letter-spacing:0.14em; color:{status_col};">● {status}</span>
            </div>
            <span style="font-family:Geist Mono; font-size:11px; color:#8b90a5;">Rs {route['fare']:,}/pax · {route['rth']}h RT</span>
          </div>
          <div style="margin: 8px 0 10px;">{chips}</div>
          <div style="display:flex; justify-content:space-between; font-family:Geist Mono; font-size:11px; color:#a0a5bd; margin-bottom:4px;">
            <span>{served:,.0f} / {demand:,.0f} pax</span>
            <span style="color:{bar_col};">{fill*100:.0f}% filled</span>
          </div>
          <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:99px; overflow:hidden;">
            <div style="width:{fill*100:.1f}%; height:100%; background:linear-gradient(90deg, {bar_col}, {bar_col}aa); border-radius:99px; transition:width .5s ease;"></div>
          </div>
        </div>
        """
        (col_l if i % 2 == 0 else col_r).markdown(card_html, unsafe_allow_html=True)

    # Visual cost waterfall
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(section_title("Where the money goes", "Revenue split into fuel, variable cost, and profit", "trend-up"), unsafe_allow_html=True)
    facts = solution["facts"]
    rev = max(facts["revenue"], 1)
    fuel_pct = facts["fuel_cost"] / rev * 100
    var_pct  = facts["variable_cost"] / rev * 100
    profit_pct = max(0, 100 - fuel_pct - var_pct)

    st.markdown(
        f"""
        <div class="an-card" style="padding:20px;">
          <div style="display:flex; justify-content:space-between; font-family:Geist Mono; font-size:12px; color:#a0a5bd; margin-bottom:10px;">
            <span>Revenue <b style="color:#e8eaf3;">Rs {facts['revenue']:,.0f}</b></span>
            <span>Profit <b style="color:{'#4ade80' if facts['profit']>=0 else '#f87171'};">Rs {facts['profit']:,.0f}</b></span>
          </div>
          <div style="display:flex; height:32px; border-radius:10px; overflow:hidden; background:rgba(255,255,255,0.04); border:1px solid #262a3d;">
            <div style="width:{fuel_pct:.1f}%; background:linear-gradient(90deg, #f87171, #facc15);
                        display:flex; align-items:center; justify-content:center; font-family:Geist Mono; font-size:11px; font-weight:600; color:white;"
                 title="Fuel">
              {'Fuel ' + f'{fuel_pct:.0f}%' if fuel_pct >= 15 else ''}
            </div>
            <div style="width:{var_pct:.1f}%; background:linear-gradient(90deg, #f472b6, #8b5cf6);
                        display:flex; align-items:center; justify-content:center; font-family:Geist Mono; font-size:11px; font-weight:600; color:white;">
              {'Variable ' + f'{var_pct:.0f}%' if var_pct >= 10 else ''}
            </div>
            <div style="width:{profit_pct:.1f}%; background:linear-gradient(90deg, #22d3ee, #4ade80);
                        display:flex; align-items:center; justify-content:center; font-family:Geist Mono; font-size:11px; font-weight:600; color:#0a0b14;">
              {'Profit ' + f'{profit_pct:.0f}%' if profit_pct >= 8 else ''}
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; font-family:Geist Mono; font-size:10.5px; color:#6b7089; margin-top:10px; letter-spacing:0.1em;">
            <span>■ Fuel Rs {facts['fuel_cost']:,.0f}</span>
            <span>■ Variable Rs {facts['variable_cost']:,.0f}</span>
            <span>■ Strategy: {facts['strategy']}</span>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ---------- Risk tab ----------
with tab_risk:
    st.markdown(section_title("Risk envelope", "Monte Carlo over demand, fuel, and availability", "risk"), unsafe_allow_html=True)

    lc, rc = st.columns([1, 4])
    with lc:
        run = st.button(f"Run {trials:,} trials", type="primary", use_container_width=True)
    if run or st.session_state.last_risk is None:
        st.session_state.last_risk = simulate(schedule, st.session_state.params, trials=trials)
    risk = st.session_state.last_risk

    r1, r2, r3, r4, r5 = st.columns(5)
    r1.metric("Mean", f"Rs {risk['mean_profit']:,.0f}")
    r2.metric("P5", f"Rs {risk['p5']:,.0f}")
    r3.metric("P10", f"Rs {risk['p10']:,.0f}")
    r4.metric("CVaR₅", f"Rs {risk['cvar5']:,.0f}")
    r5.metric("Disruption loss", f"Rs {risk['disruption_loss']:,.0f}")

    fig = px.histogram(x=risk["profit_distribution"], nbins=60)
    fig.update_traces(
        marker=dict(
            color=risk["profit_distribution"],
            colorscale=[[0, "#f87171"], [0.5, "#8b5cf6"], [1, "#22d3ee"]],
            line_width=0,
        ),
        opacity=0.9,
    )
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Geist Mono, monospace", color="#e8eaf3", size=11),
        margin=dict(l=8, r=8, t=8, b=8),
        xaxis=dict(gridcolor="rgba(255,255,255,0.06)", zerolinecolor="rgba(255,255,255,0.15)",
                   title="Profit (Rs / day)"),
        yaxis=dict(gridcolor="rgba(255,255,255,0.06)", zerolinecolor="rgba(255,255,255,0.15)",
                   title=""),
        showlegend=False, height=340,
    )
    fig.add_vline(x=risk["p5"], line_dash="dash", line_color="#f87171",
                  annotation_text="P5", annotation_font_color="#f87171")
    fig.add_vline(x=risk["mean_profit"], line_dash="dash", line_color="#facc15",
                  annotation_text="Mean", annotation_font_color="#facc15")
    st.plotly_chart(fig, use_container_width=True)

    d1, d2, d3 = st.columns(3)
    d1.metric("P5 vs Mean", f"Rs {risk['p5'] - risk['mean_profit']:,.0f}")
    d2.metric("P10 vs Mean", f"Rs {risk['p10'] - risk['mean_profit']:,.0f}")
    d3.metric("Cancel rate", f"{risk['cancel_rate']*100:.1f}%")

    # ---- Route vulnerability (Tier-3 Task 6 deliverable) ----
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(section_title("Route vulnerability", "Which routes cancel or spill most under stress", "warn"), unsafe_allow_html=True)

    vuln = risk["facts"].get("route_vulnerability", {})
    # Rank by spill_rate desc; render as row of colored bars
    ranked = sorted(vuln.items(), key=lambda kv: kv[1]["spill_rate"], reverse=True)
    for r_id, v in ranked:
        spill = v["spill_rate"] * 100
        cancel = v["cancel_rate"] * 100
        col = "#f87171" if spill > 15 else "#facc15" if spill > 5 else "#4ade80"
        st.markdown(
            f"""<div style='display:flex; align-items:center; gap:14px; padding:10px 14px;
                            background:rgba(255,255,255,0.02); border:1px solid #262a3d;
                            border-radius:10px; margin-bottom:6px;'>
              <span style='font-family:Geist Mono; font-size:13px; font-weight:600; color:#e8eaf3; min-width:36px;'>{r_id}</span>
              <div style='flex:1;'>
                <div style='display:flex; justify-content:space-between; font-family:Geist Mono; font-size:10.5px; color:#8b90a5; margin-bottom:4px;'>
                  <span>avg spill {v['avg_spill_pax']:.0f} pax</span>
                  <span style='color:{col};'>{spill:.1f}% spill · {cancel:.1f}% cancel rate</span>
                </div>
                <div style='height:5px; background:rgba(255,255,255,0.06); border-radius:99px; overflow:hidden;'>
                  <div style='width:{min(100, spill*2):.1f}%; height:100%; background:{col};'></div>
                </div>
              </div>
            </div>""",
            unsafe_allow_html=True,
        )
    st.markdown(
        info_banner("Ranking uses correlated demand shocks (common market factor + per-route noise) so the tail isn't understated by the independence assumption."),
        unsafe_allow_html=True,
    )


# ---------- Recover tab ----------
with tab_recover:
    st.markdown(section_title("Signature demo", "Kill an aircraft, recover live, see the reserve pay off", "recover"), unsafe_allow_html=True)

    kc1, kc2, kc3 = st.columns([1, 1, 2])
    with kc1:
        tail = st.selectbox(
            "Aircraft goes technical",
            ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "C1", "C2", "C3"],
            index=9,
        )
    with kc2:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Recover", type="primary", use_container_width=True):
            st.session_state.last_recovery = recover(schedule, tail, st.session_state.params)

    rec = st.session_state.last_recovery
    if rec:
        cancelled = ", ".join(f"{t}→{r}" for t, r in rec["cancelled"]) or "none"
        protected = ", ".join(rec["protected_routes"])
        deployed = rec["reserve_deployed"]
        reserve_txt = f"DEPLOYED ({rec['reserve_type']})" if deployed else "off"

        st.markdown(
            f"""<div style='display:flex; gap:10px; margin: 12px 0 18px; flex-wrap:wrap;'>
            <span class='an-pill coral'>Cancelled · {cancelled}</span>
            <span class='an-pill mint'>Protected · {protected}</span>
            <span class='an-pill {'amber' if deployed else ''}'>Reserve · {reserve_txt}</span>
            </div>""",
            unsafe_allow_html=True,
        )

        m1, m2, m3 = st.columns(3)
        m1.metric("Loss w/o reserve", f"Rs {rec['loss_without_reserve']:,.0f}")
        m2.metric("Loss w/ reserve",  f"Rs {rec['loss_with_reserve']:,.0f}")
        m3.metric("Net benefit",      f"Rs {rec['net_benefit']:,.0f}",
                  "reserve worth it" if rec["net_benefit"] > 0 else "reserve not worth it")
    else:
        st.markdown(
            info_banner("Pick a tail. The engine will re-plan, decide on the reserve, and show the rupee impact."),
            unsafe_allow_html=True,
        )


# ---------- Ask AI tab ----------
with tab_ask:
    st.markdown(section_title("Ask the DSS", "Natural language in, engine numbers out. AI never computes.", "ask"), unsafe_allow_html=True)

    with st.container(border=False):
        for entry in st.session_state.chat_history[-8:]:
            with st.chat_message(entry["role"]):
                st.write(entry["content"])

    user_q = st.chat_input("Try: what if fuel jumps 18% and R3 demand drops 10%")
    if user_q:
        st.session_state.chat_history.append({"role": "user", "content": user_q})
        parsed = parse_request(user_q)
        action = parsed.get("action", "explain")

        if action == "recover":
            tail = parsed.get("recover", {}).get("failed_tail", "C1")
            rec = recover(solution["x"], tail, st.session_state.params)
            st.session_state.last_recovery = rec
            reply = narrate_recovery(rec["facts"], user_q)
        elif action == "resimulate":
            new_p = apply_deltas(st.session_state.params, parsed)
            st.session_state.params = new_p
            new_sol = run_opt(new_p)
            st.session_state.last_solution = new_sol
            risk = simulate(new_sol["x"], new_p, trials=trials)
            st.session_state.last_risk = risk
            reply = narrate_risk(risk["facts"], user_q)
        elif action == "reoptimize":
            new_p = apply_deltas(st.session_state.params, parsed)
            st.session_state.params = new_p
            new_sol = run_opt(new_p)
            st.session_state.last_solution = new_sol
            reply = narrate_solution(new_sol["facts"], user_q)
        else:
            reply = narrate_solution(solution["facts"], user_q)

        st.session_state.chat_history.append({"role": "assistant", "content": reply})
        st.rerun()


# ---------- Analysis tab (Tier-2 credibility + Tier-3 deliverables) ----------
with tab_analysis:
    st.markdown(section_title("Strategy comparison", "All three strategies on the same simulated days (common random numbers)", "analysis"), unsafe_allow_html=True)
    st.markdown(
        info_banner("Common Random Numbers: each strategy sees identical demand/fuel/availability draws — differences are structural, not sampling noise."),
        unsafe_allow_html=True,
    )
    if st.button("Run strategy comparison", type="primary", key="run_strat"):
        with st.spinner("Solving 3 strategies × simulating 3,000 shared days…"):
            st.session_state["strat_compare"] = strategy_compare(
                st.session_state.params, trials=3000, seed=42
            )
    sc = st.session_state.get("strat_compare")
    if sc:
        rows = []
        for r in sc["results"]:
            if r.get("status") != "Optimal":
                rows.append({"Strategy": r["strategy"], "Status": "Infeasible"})
                continue
            rows.append({
                "Strategy":    r["strategy"],
                "Profit (opt)": f"Rs {r['profit_opt']:,.0f}",
                "Mean (sim)":   f"Rs {r['mean_profit']:,.0f}",
                "P5":           f"Rs {r['p5']:,.0f}",
                "CVaR₅":        f"Rs {r['cvar5']:,.0f}",
                "Coverage":     f"{r['coverage']}/6",
                "Spill %":      f"{r['spill_pct']:.1f}%",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # ---- Reserve break-even (Tier-3 closing scored line) ----
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(section_title("Reserve break-even", "Failure probability at which parking a reserve pays off", "shield"), unsafe_allow_html=True)
    if st.button("Run break-even sweep", type="primary", key="run_be"):
        with st.spinner("Solving/simulating across failure-probability sweep…"):
            st.session_state["breakeven"] = reserve_breakeven(
                st.session_state.params, reserve_type="C", trials=1500
            )
    be = st.session_state.get("breakeven")
    if be:
        st.markdown(
            f"<div class='an-card' style='padding:16px 18px;'>"
            f"<div style='font-family:Geist Mono; font-size:11px; color:#a78bfa; letter-spacing:0.14em;'>◆ VERDICT</div>"
            f"<div style='font-size:16px; color:#e8eaf3; margin:6px 0;'>{be['verdict']}</div>"
            f"</div>",
            unsafe_allow_html=True,
        )
        rows = []
        for row in be["sweep"]:
            if row.get("mean_no_reserve") is None:
                rows.append({"p_fail": f"{row['p_fail']*100:.1f}%", "no reserve": "—", "with reserve": "—", "Δ": "—"})
                continue
            rows.append({
                "p_fail":       f"{row['p_fail']*100:.1f}%",
                "no reserve":   f"Rs {row['mean_no_reserve']:,.0f}",
                "with reserve": f"Rs {row['mean_with_reserve']:,.0f}",
                "Δ":            f"Rs {row['delta']:,.0f}",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # ---- β sensitivity sweep ----
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(section_title("β sensitivity", "Does the reserve verdict flip inside the plausible β range?", "spark"), unsafe_allow_html=True)
    if st.button("Run β sweep", type="primary", key="run_beta"):
        with st.spinner("Sweeping β and re-simulating…"):
            st.session_state["beta_sweep"] = beta_sweep(st.session_state.params, trials=1500)
    bs = st.session_state.get("beta_sweep")
    if bs:
        st.markdown(
            f"<div class='an-card' style='padding:16px 18px;'>"
            f"<div style='font-family:Geist Mono; font-size:11px; color:#a78bfa; letter-spacing:0.14em;'>◆ VERDICT</div>"
            f"<div style='font-size:16px; color:#e8eaf3; margin:6px 0;'>{bs['verdict']}</div>"
            f"</div>",
            unsafe_allow_html=True,
        )
        rows = []
        for row in bs["sweep"]:
            if row.get("mean_no") is None:
                rows.append({"β": row["beta"], "no reserve": "—", "with reserve": "—", "favors reserve?": "—"})
                continue
            rows.append({
                "β":              row["beta"],
                "no reserve":     f"Rs {row['mean_no']:,.0f}",
                "with reserve":   f"Rs {row['mean_yes']:,.0f}",
                "favors reserve?": "yes" if row["favor_reserve"] else "no",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    # ---- Saved scenarios ----
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(section_title("Saved scenarios", "Snapshots from the sidebar", "check"), unsafe_allow_html=True)
    if st.session_state.saved_scenarios:
        rows = []
        for name, s in st.session_state.saved_scenarios.items():
            sol = s["solution"] or {}
            rk = s["risk"] or {}
            rows.append({
                "Scenario": name, "Strategy": s["params"]["strategy"],
                "Profit (opt)": f"Rs {sol.get('profit', 0):,.0f}",
                "Mean (sim)":   f"Rs {rk.get('mean_profit', 0):,.0f}",
                "P5":           f"Rs {rk.get('p5', 0):,.0f}",
                "Coverage":     f"{sol.get('kpis', {}).get('coverage', 0)}/6",
                "Reserve":      s["params"].get("reserve_type") or "None",
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    else:
        st.markdown(info_banner("Name a scenario in the sidebar and click Save to snapshot it here."), unsafe_allow_html=True)
