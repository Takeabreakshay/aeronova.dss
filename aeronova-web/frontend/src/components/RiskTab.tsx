import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChartHistogramIcon,
  Alert02Icon,
  PlayIcon,
  Loading03Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api, type Params, type Solution, type RiskResult } from "@/lib/api";
import { formatRs } from "@/lib/utils";

function KPI({ label, value, delay = 0, tone }: { label: string; value: string; delay?: number; tone?: string }) {
  const color = tone === "mint" ? "text-mint" : tone === "coral" ? "text-coral" : "text-foreground";
  return (
    <Card
      className="p-3.5 group relative overflow-hidden animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-xl font-medium tabular-nums ${color}`}>{value}</div>
    </Card>
  );
}

export function RiskTab({ params, solution }: { params: Params; solution: Solution | null }) {
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [trials, setTrials] = useState(2000);

  async function run() {
    if (!solution) return;
    setBusy(true);
    try {
      const r = await api.simulate(params, solution.x, trials);
      setRisk(r);
    } finally { setBusy(false); }
  }

  const bins = risk?.profit_distribution ? binData(risk.profit_distribution, 40) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2.5 animate-rise">
        <span className="text-[hsl(0_68%_33%)]">
          <HugeiconsIcon icon={ChartHistogramIcon} size={20} strokeWidth={1.6} />
        </span>
        <span className="text-lg font-semibold tracking-tight">Risk envelope</span>
        <span className="text-[13px] text-muted-foreground">Monte Carlo over demand, fuel, and availability</span>
      </div>

      {/* Run controls */}
      <div className="flex items-center gap-2 animate-rise" style={{ animationDelay: "40ms" }}>
        <Button onClick={run} disabled={busy}>
          {busy
            ? <><HugeiconsIcon icon={Loading03Icon} size={14} strokeWidth={1.6} className="animate-spin" />Running {trials.toLocaleString()} trials…</>
            : <><HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={1.6} />Run {trials.toLocaleString()} trials</>}
        </Button>
        <div className="flex gap-1">
          {[2000, 10000].map((n) => (
            <button
              key={n}
              onClick={() => setTrials(n)}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-[transform,border-color,color,background-color] duration-150 ease-out-expo active:scale-[0.97]
                ${trials === n ? "border-primary bg-accent/[0.15] text-ground" : "border-border text-muted-foreground hover:border-primary hover:-translate-y-px hover:text-[hsl(0_68%_33%)]"}`}
            >
              {n.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {risk && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3">
            <KPI label="Mean"           value={`Rs ${formatRs(risk.mean_profit)}`}   delay={0}   tone={risk.mean_profit >= 0 ? "mint" : "coral"} />
            <KPI label="P5"             value={`Rs ${formatRs(risk.p5)}`}            delay={40}  tone="coral" />
            <KPI label="P10"            value={`Rs ${formatRs(risk.p10)}`}           delay={80}  tone="coral" />
            <KPI label="CVaR₅"          value={`Rs ${formatRs(risk.cvar5)}`}         delay={120} tone="coral" />
            <KPI label="Disruption loss" value={`Rs ${formatRs(risk.disruption_loss)}`} delay={160} />
          </div>

          {/* Histogram */}
          <Card className="p-4 animate-spring">
            <div className="mb-2 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              <span>Profit distribution — {bins.length} bins · {risk.facts.trials.toLocaleString()} trials</span>
              <span>seed 42</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bins} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 68% 33%)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(0 68% 33%)" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="x"
                  tickFormatter={(v) => formatRs(v)}
                  stroke="hsl(30 8% 45%)"
                  style={{ fontSize: 10, fontFamily: "Geist Mono" }}
                />
                <YAxis stroke="hsl(30 8% 45%)" style={{ fontSize: 10, fontFamily: "Geist Mono" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(42 60% 98%)",
                    border: "1px solid hsl(40 20% 78%)",
                    borderRadius: 10,
                    fontFamily: "Geist Mono",
                    fontSize: 12,
                    padding: "8px 12px",
                    boxShadow: "0 8px 24px hsl(240 20% 2% / 0.5)",
                  }}
                  formatter={(v: any) => [`${v} trials`, "count"]}
                  labelFormatter={(v: any) => `Rs ${formatRs(v)}`}
                  cursor={{ fill: "hsl(258 90% 66% / 0.1)" }}
                />
                <ReferenceLine
                  x={risk.p5}
                  stroke="hsl(0 68% 33%)"
                  strokeDasharray="4 4"
                  label={{ value: "P5", fill: "hsl(0 68% 33%)", fontSize: 10, position: "top" }}
                />
                <ReferenceLine
                  x={risk.mean_profit}
                  stroke="hsl(36 84% 42%)"
                  strokeDasharray="4 4"
                  label={{ value: "Mean", fill: "hsl(36 84% 42%)", fontSize: 10, position: "top" }}
                />
                <Bar
                  dataKey="count"
                  fill="url(#barGrad)"
                  radius={[3, 3, 0, 0]}
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Route vulnerability */}
          <div>
            <div className="mb-3 flex items-center gap-2.5 animate-rise">
              <span className="text-[hsl(0_68%_33%)]">
                <HugeiconsIcon icon={Alert02Icon} size={20} strokeWidth={1.6} />
              </span>
              <span className="text-lg font-semibold tracking-tight">Route vulnerability</span>
              <span className="text-[13px] text-muted-foreground">
                Which routes cancel or spill most under stress
              </span>
            </div>
            <div className="mb-3 rounded-md border border-accent/[0.25] bg-accent/[0.06] px-3 py-2 font-mono text-[11px] text-muted-foreground">
              ◆ Ranking uses correlated demand shocks (system factor + per-route noise) so the tail isn't understated.
            </div>
            <div className="space-y-1.5">
              {Object.entries(risk.facts.route_vulnerability || {})
                .sort(([, a]: any, [, b]: any) => b.spill_rate - a.spill_rate)
                .map(([r, v]: any, i) => {
                  const spill = v.spill_rate * 100;
                  const col = spill > 15 ? "hsl(0 68% 33%)" : spill > 5 ? "hsl(36 84% 42%)" : "hsl(122 20% 32%)";
                  return (
                    <div
                      key={r}
                      className="flex items-center gap-3.5 rounded-lg border border-border bg-ink/[0.02] px-3.5 py-2.5 hover:border-border-hi transition-colors duration-150 ease-out-expo animate-rise"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex min-w-[52px] items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold">{r}</span>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: col, boxShadow: `0 0 6px ${col}` }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex justify-between font-mono text-[10.5px] text-muted-foreground">
                          <span>avg spill {v.avg_spill_pax.toFixed(0)} pax</span>
                          <span style={{ color: col }}>
                            {spill.toFixed(1)}% spill · {(v.cancel_rate * 100).toFixed(1)}% cancel
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-ink/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                            style={{ width: `${Math.min(100, spill * 2)}%`, background: col }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function binData(vals: number[], n: number) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const w = (max - min) / n;
  const bins = Array.from({ length: n }, (_, i) => ({ x: min + w * i + w / 2, count: 0 }));
  for (const v of vals) {
    const i = Math.min(n - 1, Math.max(0, Math.floor((v - min) / w)));
    bins[i].count++;
  }
  return bins;
}
