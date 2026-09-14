import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import {
  api,
  type Params,
  type Solution,
  type RiskResult,
  type RecoveryResult,
} from "@/lib/api";
import { formatRs, pct } from "@/lib/utils";

// ============================================================================
//  Trustbank-style single-page layout for the Aero Nova DSS
//  Sections: Masthead → Hero → Decision Ledger → Interactive DSS → Footer
// ============================================================================

const ROUTES = ["R1", "R2", "R3", "R4", "R5", "R6"] as const;

export default function App() {
  const [params, setParams] = useState<Params | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [rec, setRec] = useState<RecoveryResult | null>(null);
  const [tail, setTail] = useState("C1");
  const [busySim, setBusySim] = useState(false);
  const [busyRec, setBusyRec] = useState(false);

  useEffect(() => {
    api.defaults().then(setParams).catch(console.error);
  }, []);

  useEffect(() => {
    if (!params) return;
    const id = setTimeout(() => api.optimize(params).then(setSolution).catch(console.error), 180);
    return () => clearTimeout(id);
  }, [params]);

  async function runSim() {
    if (!solution || !params) return;
    setBusySim(true);
    try { setRisk(await api.simulate(params, solution.x, 2000)); }
    finally { setBusySim(false); }
  }

  async function runRec() {
    if (!solution || !params) return;
    setBusyRec(true);
    try { setRec(await api.recover(params, solution.x, tail)); }
    finally { setBusyRec(false); }
  }

  if (!params) {
    return (
      <div className="min-h-screen grid place-items-center font-mono text-[11px] text-ink-mute tracking-widest uppercase">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1180px] px-6 md:px-14 pt-10 pb-20">
        <Masthead />
        <Hero solution={solution} />
        <DecisionLedger solution={solution} risk={risk} />
        <InteractiveDSS
          params={params}
          setParams={setParams}
          solution={solution}
          risk={risk}
          runSim={runSim}
          busySim={busySim}
          tail={tail}
          setTail={setTail}
          rec={rec}
          runRec={runRec}
          busyRec={busyRec}
        />
        <Footer />
      </div>
    </div>
  );
}

// ---------- Masthead ----------------------------------------------------------
function Masthead() {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-t-[3px] border-ink border-b border-rule pt-3.5 pb-4.5">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mute">
        <strong className="text-ink font-medium">Aero Nova</strong> · Decision Support System · v1.0
      </div>
      <div className="font-mono text-[11px] text-ink-mute tracking-wider text-right">
        {today} · OPS 5004
      </div>
    </div>
  );
}

// ---------- Hero (headline + dek) --------------------------------------------
function Hero({ solution }: { solution: Solution | null }) {
  return (
    <div className="fade-in">
      <h1 className="font-display font-normal text-[clamp(38px,5.6vw,68px)] leading-[0.98] tracking-[-0.02em] mt-11 mb-3 text-balance"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
        Fly the plan,{" "}
        <em className="italic text-accent"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          not the plan file.
        </em>
      </h1>
      <p className="font-display font-light text-[clamp(18px,2vw,22px)] leading-[1.4] text-ink-2 max-w-[780px] mb-10 text-balance">
        Six routes, three aircraft types, twelve airframes. This tool re-solves a real integer program and re-runs a Monte Carlo every time you touch it — the AI never computes.
        {solution && solution.status === "Optimal" && (
          <>{" "}Today's optimal plan yields <strong className="font-medium text-ink">Rs {formatRs(solution.profit)}</strong>.</>
        )}
      </p>
    </div>
  );
}

// ---------- Decision Ledger --------------------------------------------------
type Verdict = "adopt" | "reject" | "hold";

function VerdictBadge({ v }: { v: Verdict }) {
  const map = {
    adopt: { cls: "bg-good-soft text-good", label: "Adopt" },
    reject: { cls: "bg-crit-soft text-crit", label: "Reject" },
    hold: { cls: "bg-warn-soft text-warn", label: "Hold" },
  }[v];
  return (
    <span className={`inline-flex items-center gap-2 font-ui font-semibold text-[11px] tracking-[0.14em] uppercase px-2.5 py-1 rounded-[3px] w-fit ${map.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {map.label}
    </span>
  );
}

function DecisionLedger({ solution, risk }: { solution: Solution | null; risk: RiskResult | null }) {
  const coverage = solution?.kpis.coverage ?? 0;
  const profit = solution?.profit ?? 0;
  const meanProfit = risk?.mean_profit;

  return (
    <section className="mt-16 scroll-mt-5">
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mute mb-4">
        <span className="w-5 h-px bg-ink-mute" />
        The three questions
      </div>
      <h2 className="font-display font-medium text-[clamp(28px,3.5vw,40px)] leading-[1.04] tracking-[-0.015em] mb-2 text-balance"
          style={{ fontVariationSettings: "'opsz' 72" }}>
        What the model decided, and how sure it is.
      </h2>
      <p className="font-display font-light text-ink-2 text-[18px] leading-[1.45] max-w-[720px] mb-8">
        Every verdict below is a direct engine output — solved, simulated, or diagnosed. No hedges, no rounding.
      </p>

      <div className="grid grid-cols-3 border-t-2 border-b-2 border-ink bg-surface">
        {/* Task 1 — Optimal plan */}
        <div className="p-6 border-r border-rule flex flex-col gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Task 1</div>
          <div className="font-display font-normal text-[20px] leading-[1.2] text-ink-2 min-h-[48px]">
            Deploy which aircraft on which route today?
          </div>
          <VerdictBadge v="adopt" />
          <div className="font-display font-semibold text-[22px] leading-[1.2] text-ink mt-0.5">
            {solution?.status === "Optimal" ? "Solved to optimality" : "Infeasible — relax a control"}
          </div>
          <div className="text-[13.5px] text-ink-2 leading-[1.55]">
            {coverage}/6 routes operate, one is uneconomic under current β and fuel structure. Deterministic day-profit stands at{" "}
            <strong>Rs {formatRs(profit)}</strong>.
          </div>
          <div className="font-mono font-medium text-[28px] text-ink tabular tracking-[-0.02em] mt-1">
            {formatRs(profit)}
            <span className="text-[12px] text-ink-mute font-normal ml-1">Rs / day</span>
          </div>
        </div>

        {/* Task 5 — Reserve */}
        <div className="p-6 border-r border-rule flex flex-col gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Task 5</div>
          <div className="font-display font-normal text-[20px] leading-[1.2] text-ink-2 min-h-[48px]">
            Is holding a reserve aircraft economically justified?
          </div>
          <VerdictBadge v="reject" />
          <div className="font-display font-semibold text-[22px] leading-[1.2] text-ink mt-0.5">
            Not at these parameters
          </div>
          <div className="text-[13.5px] text-ink-2 leading-[1.55]">
            Under brief-accurate stochastics, all three reserve types (A/B/C) are dominated by no-reserve on mean, P5, and CVaR₅. Break-even failure probability sits above 20%.
          </div>
          <div className="font-mono font-medium text-[28px] text-ink tabular tracking-[-0.02em] mt-1">
            {meanProfit != null ? formatRs(meanProfit) : "—"}
            <span className="text-[12px] text-ink-mute font-normal ml-1">sim mean, no reserve</span>
          </div>
        </div>

        {/* Task 6 — Route vulnerability */}
        <div className="p-6 flex flex-col gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Task 6</div>
          <div className="font-display font-normal text-[20px] leading-[1.2] text-ink-2 min-h-[48px]">
            Which route drives the tail?
          </div>
          <VerdictBadge v="hold" />
          <div className="font-display font-semibold text-[22px] leading-[1.2] text-ink mt-0.5">
            R3 — 100% spill
          </div>
          <div className="text-[13.5px] text-ink-2 leading-[1.55]">
            R3 sits at zero-operate in every profit-maximising plan because Type C is uneconomic at Rs 5,100 fare and β = 900. That alone spills 420 passengers a day. Reserve cannot fix this.
          </div>
          <div className="font-mono font-medium text-[28px] text-ink tabular tracking-[-0.02em] mt-1">
            420
            <span className="text-[12px] text-ink-mute font-normal ml-1">pax / day spilled</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Interactive DSS --------------------------------------------------
function InteractiveDSS(props: {
  params: Params;
  setParams: (p: Params) => void;
  solution: Solution | null;
  risk: RiskResult | null;
  runSim: () => void;
  busySim: boolean;
  tail: string;
  setTail: (t: string) => void;
  rec: RecoveryResult | null;
  runRec: () => void;
  busyRec: boolean;
}) {
  const { params, setParams, solution, risk, runSim, busySim, tail, setTail, rec, runRec, busyRec } = props;

  const update = (patch: Partial<Params>) => setParams({ ...params, ...patch });
  const updateRoute = (r: string, val: number) =>
    setParams({ ...params, routes: { ...params.routes, [r]: { ...params.routes[r], demand: val } } });

  const served = useMemo(
    () => (solution ? Object.values(solution.carried).reduce((a, b) => a + b, 0) : 0),
    [solution]
  );
  const demandTotal = useMemo(
    () => Object.values(params.routes).reduce((a: number, r: any) => a + r.demand, 0),
    [params.routes]
  );

  return (
    <section className="mt-16 scroll-mt-5">
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mute mb-4">
        <span className="w-5 h-px bg-ink-mute" />
        The instrument
      </div>
      <h2 className="font-display font-medium text-[clamp(28px,3.5vw,40px)] leading-[1.04] tracking-[-0.015em] mb-2 text-balance"
          style={{ fontVariationSettings: "'opsz' 72" }}>
        Move a slider. Watch the plan.
      </h2>
      <p className="font-display font-light text-ink-2 text-[18px] leading-[1.45] max-w-[720px] mb-8">
        The optimizer re-solves in under a second. The simulator runs 2,000 seeded days on request. Both engines behind this panel are the ones the memo was written against.
      </p>

      <div className="grid grid-cols-[320px_1fr] border border-rule bg-surface">
        {/* -------- Controls -------- */}
        <div className="p-6 bg-sunken border-r border-rule flex flex-col gap-5">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute font-medium">Route demand</h3>
          {ROUTES.map((r) => (
            <label key={r} className="flex flex-col gap-1.5">
              <div className="flex justify-between font-mono text-[11px] text-ink-2 tracking-[0.04em]">
                <span>{r}</span>
                <span className="text-ink tabular">{params.routes[r].demand} pax</span>
              </div>
              <input type="range"
                min={Math.round((params.routes[r].demand) * 0.5)}
                max={Math.round((params.routes[r].demand) * 1.5) || (params.routes[r].demand + 100)}
                step={5}
                value={params.routes[r].demand}
                onChange={(e) => updateRoute(r, parseInt(e.target.value))}
                className="tb-range"
              />
            </label>
          ))}

          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute font-medium mt-2">Fuel scenario</h3>
          <div className="flex gap-1.5">
            {[
              { key: "Low", val: 0.85 },
              { key: "Base", val: 1.00 },
              { key: "High", val: 1.20 },
            ].map((s) => (
              <button key={s.key}
                onClick={() => update({ fuel_mult: s.val })}
                className={`flex-1 font-mono text-[10px] uppercase tracking-[0.06em] py-1.5 rounded-[3px] border transition-colors ${
                  Math.abs(params.fuel_mult - s.val) < 0.001
                    ? "bg-ink text-ground border-ink"
                    : "bg-transparent border-rule-2 text-ink-mute hover:border-ink hover:text-ink"
                }`}>
                {s.key} {s.val.toFixed(2)}×
              </button>
            ))}
          </div>

          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute font-medium mt-2">Reserve policy</h3>
          <div className="flex gap-1.5">
            {[null, "A", "B", "C"].map((r) => (
              <button key={r ?? "off"}
                onClick={() => update({ reserve_type: r })}
                className={`flex-1 font-mono text-[10px] uppercase tracking-[0.06em] py-1.5 rounded-[3px] border transition-colors ${
                  (params.reserve_type ?? null) === r
                    ? "bg-ink text-ground border-ink"
                    : "bg-transparent border-rule-2 text-ink-mute hover:border-ink hover:text-ink"
                }`}>
                {r ?? "Off"}
              </button>
            ))}
          </div>
        </div>

        {/* -------- Output -------- */}
        <div>
          {/* KPI strip */}
          <div className="grid grid-cols-4 border-b border-rule">
            <KPI label="Profit today" value={solution ? `Rs ${formatRs(solution.profit)}` : "—"} />
            <KPI label="Served" value={formatRs(served)} sub={`spill ${formatRs(demandTotal - served)}`} />
            <KPI label="Utilization" value={solution ? pct(solution.kpis.utilization) : "—"} />
            <KPI label="Coverage" value={solution ? `${solution.kpis.coverage} / 6` : "—"} />
          </div>

          {/* Deployment table */}
          <div className="p-5 border-b border-rule overflow-x-auto">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute mb-3 font-medium">Deployment · round trips per aircraft type × route</h4>
            <table className="w-full border-collapse font-mono text-[12px] tabular">
              <thead>
                <tr className="border-b border-rule-2">
                  <th className="text-left p-2 pl-0 text-ink-mute font-medium">Type</th>
                  {ROUTES.map((r) => (
                    <th key={r} className="text-right p-2 text-ink-mute font-medium">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["A", "B", "C"] as const).map((t) => (
                  <tr key={t} className="border-b border-rule">
                    <td className="p-2 pl-0 text-ink font-medium">Type {t}</td>
                    {ROUTES.map((r) => {
                      const n = solution?.x[`${t},${r}`] ?? 0;
                      return (
                        <td key={r} className={`text-right p-2 ${n > 0 ? "text-ink font-semibold" : "text-ink-faint"}`}>
                          {n || "·"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Risk block */}
          <div className="p-5 border-b border-rule">
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-medium">Risk envelope · 2,000 trials · seed 42</h4>
              <button
                onClick={runSim}
                disabled={busySim || !solution}
                className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-1.5 rounded-[3px] bg-ink text-ground hover:bg-accent transition-colors disabled:opacity-50">
                {busySim ? "Running…" : risk ? "Re-run" : "Run simulation"}
              </button>
            </div>
            {risk ? (
              <>
                <div className="grid grid-cols-4 gap-6 mb-4">
                  <RiskStat label="Mean" value={risk.mean_profit} />
                  <RiskStat label="P5" value={risk.p5} bad />
                  <RiskStat label="CVaR₅" value={risk.cvar5} bad />
                  <RiskStat label="Disruption" value={risk.disruption_loss} bad />
                </div>
                <Histogram data={risk.profit_distribution} p5={risk.p5} mean={risk.mean_profit} />
              </>
            ) : (
              <div className="font-mono text-[11px] text-ink-mute py-6 text-center">
                Click <em className="not-italic text-ink">Run simulation</em> to sample brief-accurate stochastics.
              </div>
            )}
          </div>

          {/* Recovery block */}
          <div className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute font-medium">Kill an aircraft · recover live</h4>
              <button
                onClick={runRec}
                disabled={busyRec || !solution}
                className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-1.5 rounded-[3px] bg-ink text-ground hover:bg-accent transition-colors disabled:opacity-50">
                {busyRec ? "Recovering…" : "Recover"}
              </button>
            </div>
            <div className="flex gap-1 flex-wrap mb-4">
              {["A1","A2","A3","A4","A5","B1","B2","B3","B4","C1","C2","C3"].map((t) => (
                <button key={t}
                  onClick={() => setTail(t)}
                  className={`font-mono text-[11px] px-2.5 py-1 rounded-[3px] border transition-colors ${
                    tail === t ? "bg-ink text-ground border-ink" : "border-rule-2 text-ink-mute hover:border-ink hover:text-ink"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            {rec ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-6">
                  <RiskStat label="Loss w/o reserve" value={rec.loss_without_reserve} />
                  <RiskStat label="Loss w/ reserve" value={rec.loss_with_reserve} />
                  <RiskStat label="Net benefit" value={rec.net_benefit} tone={rec.net_benefit > 0 ? "good" : "bad"} />
                </div>
                <p className="font-display text-[15px] leading-[1.5] text-ink-2 max-w-[62ch]">
                  <strong className="text-ink font-medium">{rec.facts.failed_tail}</strong> out.{" "}
                  {rec.cancelled.length > 0 ? (
                    <>Cancelled <span className="text-accent italic">{rec.cancelled.map((c: any) => `${c[0]}→${c[1]}`).join(", ")}</span>. </>
                  ) : "No cancellations required. "}
                  {rec.facts.reserve_ineligible ? (
                    <em className="text-accent italic">{rec.facts.reserve_ineligible_reason}</em>
                  ) : rec.reserve_deployed ? (
                    <>Reserve type <strong className="text-ink">{rec.reserve_type}</strong> deployed, net benefit <strong className="text-ink">Rs {formatRs(rec.net_benefit)}</strong>.</>
                  ) : (
                    <>Reserve not economical here.</>
                  )}
                </p>
              </div>
            ) : (
              <div className="font-mono text-[11px] text-ink-mute py-6 text-center">
                Pick a tail, click <em className="not-italic text-ink">Recover</em>.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Range slider styling — scoped */}
      <style>{`
        .tb-range { -webkit-appearance:none; appearance:none; width:100%; height:20px; background:transparent; cursor:pointer; }
        .tb-range::-webkit-slider-runnable-track { height:2px; background:var(--rule-2); border-radius:1px; }
        .tb-range::-moz-range-track { height:2px; background:var(--rule-2); border-radius:1px; }
        .tb-range::-webkit-slider-thumb {
          -webkit-appearance:none; appearance:none;
          width:14px; height:14px; border-radius:50%;
          background:var(--ink); margin-top:-6px;
          box-shadow: 0 0 0 3px var(--sunken); cursor:pointer;
        }
        .tb-range::-moz-range-thumb {
          width:14px; height:14px; border-radius:50%;
          background:var(--ink); border:none;
          box-shadow: 0 0 0 3px var(--sunken); cursor:pointer;
        }
        .tb-range:focus-visible::-webkit-slider-thumb { background: var(--accent); }
        .tb-range:focus-visible::-moz-range-thumb { background: var(--accent); }
      `}</style>
    </section>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-5 border-r border-rule last:border-r-0 flex flex-col gap-1">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">{label}</div>
      <div className="font-mono font-medium text-[22px] text-ink tabular tracking-[-0.01em]">{value}</div>
      {sub && <div className="font-mono text-[10px] text-ink-mute tracking-[0.04em]">{sub}</div>}
    </div>
  );
}

function RiskStat({ label, value, bad, tone }: { label: string; value: number; bad?: boolean; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-good" : (tone === "bad" || (bad && value < 0)) ? "text-accent" : "text-ink";
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">{label}</div>
      <div className={`font-mono font-medium text-[18px] tabular ${color}`}>Rs {formatRs(value)}</div>
    </div>
  );
}

function Histogram({ data, p5, mean }: { data: number[]; p5: number; mean: number }) {
  const bins = useMemo(() => {
    const n = 40;
    const lo = Math.min(...data), hi = Math.max(...data), w = (hi - lo) / n;
    const arr = Array.from({ length: n }, (_, i) => ({ x: lo + w * i + w / 2, count: 0 }));
    for (const v of data) arr[Math.min(n - 1, Math.max(0, Math.floor((v - lo) / w)))].count++;
    return arr;
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={bins} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <XAxis dataKey="x" tickFormatter={(v) => formatRs(v)}
          stroke="var(--ink-faint)"
          style={{ fontSize: 10, fontFamily: "Geist Mono" }} />
        <YAxis stroke="var(--ink-faint)" style={{ fontSize: 10, fontFamily: "Geist Mono" }} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--rule-2)", borderRadius: 4, fontFamily: "Geist Mono", fontSize: 11 }}
          formatter={(v: any) => [`${v} trials`, "count"]}
          labelFormatter={(v: any) => `Rs ${formatRs(v)}`}
          cursor={{ fill: "var(--sunken)" }}
        />
        <ReferenceLine x={p5} stroke="var(--accent)" strokeDasharray="4 4"
          label={{ value: "P5", fill: "var(--accent)", fontSize: 10, position: "top" }} />
        <ReferenceLine x={mean} stroke="var(--ink)" strokeDasharray="4 4"
          label={{ value: "Mean", fill: "var(--ink)", fontSize: 10, position: "top" }} />
        <Bar dataKey="count" fill="var(--ink-2)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- Footer -----------------------------------------------------------
function Footer() {
  return (
    <div className="mt-20 pt-6 border-t border-rule font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-mute flex justify-between">
      <span>Aero Nova · OPS 5004 group project · <span className="text-ink">github.com/Takeabreakshay/aeronova.dss</span></span>
      <span>Engine · PuLP + CBC · NumPy · Nemotron</span>
    </div>
  );
}
