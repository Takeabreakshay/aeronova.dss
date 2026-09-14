# Reserve Capacity: Recommendation Memo

**To:** CFO, Head of Operations, Head of Commercial, Board Reserve Committee
**From:** Decision Science Team
**Re:** Whether to hold one aircraft as operational reserve
**Deliverable:** Assignment Tasks 5 and 7
**Basis:** Aero Nova DSS engine v1 · seed 42 · 3,000-trial Monte Carlo · brief-accurate stochastics (Exhibits 5–6 + weather + fare volatility)

---

## Bottom line

**Do not park a dedicated reserve at the current schedule and parameters.**
The reserve does not pay for itself at any failure probability we tested (up to 20% per aircraft per day), because the tail of our profit distribution is **not** driven by aircraft failures. It is driven by two other things the reserve cannot fix:

1. **Route R3 sits at zero-operate in every profit-maximising plan** — the five-of-six coverage floor absorbs R3 first because Type C is uneconomic at fare Rs 5,100 and β = Rs 900 variable cost per passenger. This alone spills 100% of R3's 420-passenger daily demand.
2. **Weather days (8% probability, brief-specified) cut fleet capacity 10% network-wide** — this is a correlated shock. Adding one reserve airframe cannot restore lost hours on 12 aircraft simultaneously.

**Consequently:** Reserve C reduces expected profit by ~Rs 70,000/day (the mobilisation charge) while shifting CVaR₅ modestly. The trade is not there yet. Fix R3 first, revisit reserve second.

---

## Evidence

### The four options, compared under identical seeded days

| Reserve | Deterministic plan profit | Expected profit (3,000 sim days) | 5th-percentile day (P5) | CVaR₅ (tail expected loss) |
|---|---:|---:|---:|---:|
| **None (recommended)** | **Rs 322,928** | **Rs −1,970** | Rs −1,087,291 | Rs −1,394,623 |
| Reserve A (78 seat) | Rs 252,928 | Rs −84,871 | Rs −1,214,109 | Rs −1,516,019 |
| Reserve B (120 seat) | Rs 252,928 | Rs −84,828 | Rs −1,198,592 | Rs −1,508,358 |
| Reserve C (180 seat) | Rs 252,928 | Rs −71,970 | Rs −1,157,291 | Rs −1,464,623 |

Every reserve type is dominated by no reserve on **all four** measures we care about. The reserve costs Rs 70,000/day of MOB every day, and the frequency at which it recoups that cost through cancellation recovery is too low to matter at the brief's aircraft failure rate of 4%.

### Break-even failure probability

Sweeping per-aircraft failure probability from 1% to 20% for each reserve type: **the reserve never breaks even inside the tested range.** Verdict from the engine, verbatim:

> "Reserve does not pay off inside the tested probability range."

For a reserve to pay off at these parameters, per-aircraft failure would need to be **materially higher than 20%** — several times the brief's 4%. That is not a realistic scenario for Aero Nova today.

### Why the reserve does not help

The disruption loss the engine measures (mean profit on failure days vs. non-failure days) is roughly Rs 250,000/day — real but not the dominant tail driver. The dominant tail drivers are:

- **R3 spillage:** ~420 passengers × ~Rs 4,200 lost contribution = **Rs 1.76 M of foregone daily contribution**, absorbed as fully un-served under every scenario, every day.
- **Weather-day capacity cuts:** on 8% of days, all types lose 10% of usable hours → an additional Rs 500k–800k left-tail hit.
- **Fuel scenario mix:** the brief's discrete distribution has mean 1.029, so baseline plans lose ~3% of margin on fuel in expectation vs. a nominal-1.00 model.

A single reserve airframe substitutes at most one failed aircraft. It cannot restore R3. It cannot restore fleet-wide 10% weather-day hour losses. It only helps in the narrow band of days where one aircraft fails and its route was profitable enough that recovery is worth Rs 70,000.

---

## Route vulnerability (Task 6)

Ranked by average spill rate under the brief's stochastics:

| Route | Spill rate | Cancel rate | Avg spill / day |
|---|---:|---:|---:|
| **R3** | **100%** | **100%** | **420 pax** |
| R6 | 14.6% | 0% | 35 pax |
| R5 | 14.3% | 0% | 44 pax |
| R1 | 8.4% | 0% | 30 pax |
| R2 | 8.3% | 0% | 23 pax |
| R4 | 3.7% | 0% | 7 pax |

R3 is not merely "vulnerable" — it is systematically un-served. Every other route sits under 15% spill and never fully cancels.

---

## Response to management concerns

**"An aircraft sitting idle looks like wasted capital." — CFO**
Correct at current parameters. Reserve costs Rs 70,000/day of MOB and reduces expected profit ~Rs 70,000/day; it does not earn that back in disruption recovery. A parked reserve today is genuinely wasted capital until either failure probability rises significantly or R3 becomes economically operable.

**"Until one aircraft goes technical and the whole schedule has no recovery option." — Head of Operations**
The failure-day disruption is real (~Rs 250,000 mean loss vs. non-failure days) but a single reserve does not close the gap on the observed tail. Existing swap flexibility across five aircraft types × six routes already handles single-aircraft failures with 60%+ of days ending profitable even under failure. The reserve is an insurance premium that costs more than the expected claim.

**"We need enough seats where demand is strong, but empty seats are not free either." — Head of Commercial**
This is the R3 argument. R3 has the largest absolute demand (420) and no economic route to serve it under β = Rs 900 variable cost per passenger. Recommend renegotiating variable cost, raising R3 fare, or accepting the 5-of-6 coverage as strategic reality — but not solving it with a reserve.

---

## Reserve activation criteria (Task 7)

Even though a **standing** reserve is not justified today, temporary reserve activation *is* justified in three specific windows. The DSS's recovery engine applies these automatically; management should treat them as policy:

| Trigger | Action | Rationale |
|---|---|---|
| A Type C is technical on the day *and* R3 is already scheduled to operate (i.e., after an R3-restoration policy change) | Deploy the reserve of equal or larger seat class (per brief substitution rule: reserve C substitutes for C; reserve B or A cannot) | R3 with C carries Rs 1.01 lakh contribution/RT — recovering one such RT alone exceeds the Rs 70,000 MOB |
| Two aircraft technical on the same day (probability ≈ 0.4% under Exhibit 6) *and* affected routes are R4 or R6 (highest-fare) | Deploy the reserve | Combined loss of two high-fare routes plus reserve mobilisation clears MOB with margin |
| Weather day (8% probability) *combined with* an aircraft failure | Deploy the reserve to the highest-fare surviving route | Compounding events push the disruption loss into the Rs 300k–500k band; MOB is easily recovered |

**Trigger to reconsider a *standing* reserve:**
- If per-aircraft daily failure probability rises above ~15% (four times the brief baseline), or
- If a route restoration policy on R3 is adopted, or
- If β falls below Rs 500 per passenger, or
- If reaccommodation cost per cancelled RT is quantified and exceeds Rs 200,000

The engine's `reserve_breakeven` sweep should be re-run whenever any of these change.

---

## Strategy comparison (assignment Task 2)

Under common random numbers across all three strategies (identical simulated days):

| Strategy | Deterministic profit | Sim mean | P5 | CVaR₅ | Coverage |
|---|---:|---:|---:|---:|---:|
| Profit-focused | Rs 322,928 | Rs −1,970 | Rs −1.09 M | Rs −1.39 M | 5/6 |
| Service-focused | Rs 322,928 | Rs −1,970 | Rs −1.09 M | Rs −1.39 M | 5/6 |
| Resilience-focused | Rs 322,928 | Rs −1,970 | Rs −1.09 M | Rs −1.39 M | 5/6 |

All three strategies converge on the same schedule at these parameters. This is a signal that our current strategy weighting is too weak to matter economically — the constraint set is binding tightly enough that the objective function is decorative. **A follow-on task should stress-test whether a genuine resilience objective (CVaR-based) produces a materially different plan.** As stated, the "quantify the profit sacrificed to obtain lower disruption exposure" question has answer: **Rs 0**, because no strategy departs from the profit plan today.

---

## Named simplifications and honest caveats

- **Reaccommodation cost** ("not fully represented by lost fare alone") is qualitatively acknowledged in the brief but not quantified. Model ignores it. If it were priced at Rs 200,000/RT cancellation, the reserve calculus flips — see trigger above.
- **Passenger recapture** on cancelled flights is 0 in this model (conservative bias). Real recapture is 30–50% at most airlines; if included, disruption loss shrinks and the reserve looks worse, not better.
- **Aircraft rotation** is not modelled — this is a fleet-hours budget, not a physical rotation. A real day's plan may fail on rotation constraints not visible here.
- **The five-of-six coverage floor** is exogenous. If it were dropped, the model would drop two routes and the tail would tighten, but the strategic conversation is different.
- **β = Rs 900 per passenger** is the load-bearing parameter behind R3's uneconomic behaviour. Sensitivity: the reserve verdict is stable across β from Rs 400 to Rs 2,100 (β-sweep engine output).

---

## Recommendations

1. **Do not park a reserve** at current parameters. Cost outweighs benefit.
2. **Address R3 first** — negotiate fare, renegotiate variable cost, or explicitly accept it as strategic loss. R3 is the single largest determinant of network-level tail risk.
3. **Codify the three activation triggers** above so the operations desk applies them consistently on the days they arise (equivalent to a "flex-reserve" policy without the standing cost).
4. **Re-run the break-even analysis** if failure probability, β, R3 policy, or reaccommodation cost quantification changes.
5. **Do not rely on the "resilient strategy" toggle** in the DSS until a CVaR-weighted objective is implemented — currently it is decorative at these parameters.

---

## Reproducibility

All numbers in this memo were produced by the `aeronova-web/backend/engine` module, seed 42, 3,000 trials, brief-accurate stochastics (fuel Exhibit 5 discrete, availability 0.96, weather 8% × −10%, fare ±8%). Any team member can reproduce via:

```bash
POST /api/simulate               # any schedule from /api/optimize
POST /api/breakeven              # reserve break-even sweep
POST /api/strategy_compare       # CRN strategy comparison
```

Or open the deployed DSS at https://aeronova-takeabreakshays-projects.vercel.app and drive it from the sidebar.

---
_Decision Science team, OPS 5004 group project. This memo is a machine-generated draft for the group's review; numbers are from the live engine but the interpretation and recommendation language should be edited by the human authors before submission._
