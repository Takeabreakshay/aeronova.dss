import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AnalyticsUpIcon,
  Shield01Icon,
  SparklesIcon,
  PlayIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type Params } from "@/lib/api";
import { formatRs } from "@/lib/utils";

export function AnalysisTab({ params }: { params: Params }) {
  const [strat, setStrat] = useState<any>(null);
  const [be, setBe] = useState<any>(null);
  const [betaS, setBetaS] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Auto-clear all three sweep results when params change so charts and
  // tables never show stale numbers relative to the current controls.
  useEffect(() => {
    setStrat(null);
    setBe(null);
    setBetaS(null);
  }, [params]);

  const run = async (key: string, fn: () => Promise<any>, setter: (v: any) => void) => {
    setBusy(key);
    try { setter(await fn()); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <AnalysisSection
        title="Strategy comparison"
        desc="Common random numbers — same simulated days across all three strategies"
        icon={AnalyticsUpIcon}
        delay={0}
        info="Each strategy sees identical demand/fuel/availability draws — differences are structural, not sampling noise."
        busy={busy === "s"}
        onRun={() => run("s", () => api.strategyCompare(params), setStrat)}
        label="Run strategy comparison"
      >
        {strat && (
          <Card className="mt-3 p-0 overflow-hidden animate-spring">
            <ResultTable
              headers={["Strategy", "Profit (opt)", "Mean (sim)", "P5", "CVaR₅", "Coverage", "Spill %"]}
              rows={strat.results.map((r: any) =>
                r.status !== "Optimal"
                  ? [r.strategy, "Infeasible", "—", "—", "—", "—", "—"]
                  : [
                      r.strategy,
                      `Rs ${formatRs(r.profit_opt)}`,
                      `Rs ${formatRs(r.mean_profit)}`,
                      `Rs ${formatRs(r.p5)}`,
                      `Rs ${formatRs(r.cvar5)}`,
                      `${r.coverage}/6`,
                      `${r.spill_pct.toFixed(1)}%`,
                    ]
              )}
            />
          </Card>
        )}
      </AnalysisSection>

      <AnalysisSection
        title="Reserve break-even"
        desc="Failure probability at which parking a reserve pays off"
        icon={Shield01Icon}
        delay={80}
        busy={busy === "be"}
        onRun={() => run("be", () => api.breakeven(params), setBe)}
        label="Run break-even sweep"
      >
        {be && (
          <div className="mt-3 space-y-3">
            <VerdictCard text={be.verdict} />
            <Card className="p-4 overflow-hidden animate-rise">
              <BreakEvenChart sweep={be.sweep} breakevenP={be.breakeven_p} />
            </Card>
            <Card className="p-0 overflow-hidden animate-rise">
              <ResultTable
                headers={["p_fail", "no reserve", "with reserve", "Δ"]}
                rows={be.sweep.map((r: any) =>
                  r.mean_no_reserve === null
                    ? [`${(r.p_fail * 100).toFixed(1)}%`, "—", "—", "—"]
                    : [
                        `${(r.p_fail * 100).toFixed(1)}%`,
                        `Rs ${formatRs(r.mean_no_reserve)}`,
                        `Rs ${formatRs(r.mean_with_reserve)}`,
                        <span className={r.delta >= 0 ? "text-mint" : "text-coral"}>Rs {formatRs(r.delta)}</span>,
                      ]
                )}
              />
            </Card>
          </div>
        )}
      </AnalysisSection>

      <AnalysisSection
        title="β sensitivity"
        desc="Does the reserve verdict flip inside the plausible β range?"
        icon={SparklesIcon}
        delay={160}
        busy={busy === "b"}
        onRun={() => run("b", () => api.betaSweep(params), setBetaS)}
        label="Run β sweep"
      >
        {betaS && (
          <div className="mt-3 space-y-3">
            <VerdictCard text={betaS.verdict} />
            <Card className="p-4 overflow-hidden animate-rise">
              <BetaSweepChart sweep={betaS.sweep} flipBeta={betaS.flip_beta} />
            </Card>
            <Card className="p-0 overflow-hidden animate-rise">
              <ResultTable
                headers={["β", "no reserve", "with reserve", "favors reserve?"]}
                rows={betaS.sweep.map((r: any) =>
                  r.mean_no === null
                    ? [r.beta, "—", "—", "—"]
                    : [
                        r.beta,
                        `Rs ${formatRs(r.mean_no)}`,
                        `Rs ${formatRs(r.mean_yes)}`,
                        r.favor_reserve
                          ? <span className="inline-flex items-center gap-1 text-mint"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={1.6} />yes</span>
                          : <span className="text-coral">no</span>,
                      ]
                )}
              />
            </Card>
          </div>
        )}
      </AnalysisSection>
    </div>
  );
}

function AnalysisSection({
  title, desc, icon, delay, info, busy, onRun, label, children,
}: {
  title: string;
  desc: string;
  icon: any;
  delay: number;
  info?: string;
  busy: boolean;
  onRun: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-[hsl(0_68%_33%)]">
          <HugeiconsIcon icon={icon} size={20} strokeWidth={1.6} />
        </span>
        <span className="text-lg font-semibold tracking-tight">{title}</span>
        <span className="text-[13px] text-muted-foreground">{desc}</span>
      </div>
      {info && (
        <div className="mb-3 rounded-md border border-accent/[0.25] bg-accent/[0.06] px-3 py-2 font-mono text-[11px] text-muted-foreground">
          ◆ {info}
        </div>
      )}
      <Button onClick={onRun} disabled={busy}>
        {busy
          ? <><HugeiconsIcon icon={Loading03Icon} size={14} strokeWidth={1.6} className="animate-spin" />Running…</>
          : <><HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={1.6} />{label}</>}
      </Button>
      {children}
    </section>
  );
}

function VerdictCard({ text }: { text: string }) {
  return (
    <Card variant="luminous" className="p-5 animate-spring">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "hsl(0 68% 33%)" }}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={1.8} />
        Verdict
      </div>
      <div className="mt-2 text-[15px] font-medium leading-relaxed">{text}</div>
    </Card>
  );
}

// ============================================================================
//  Hand-drawn SVG charts — trustbank aesthetic
//  No chart library — just paths, ticks, and labels in editorial style.
// ============================================================================

function fmtRs(v: number) {
  const abs = Math.abs(v);
  if (abs >= 100000) return `${v < 0 ? "-" : ""}${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${v < 0 ? "-" : ""}${(abs / 1000).toFixed(0)}k`;
  return `${Math.round(v)}`;
}

function BreakEvenChart({ sweep, breakevenP }: { sweep: any[]; breakevenP: number | null }) {
  const data = sweep.filter((r) => r.mean_no_reserve !== null && r.mean_with_reserve !== null);
  if (data.length < 2) {
    return <div className="font-mono text-xs text-ink-mute py-6 text-center">Not enough data points to plot.</div>;
  }

  const W = 640, H = 260;
  const M = { l: 60, r: 20, t: 24, b: 44 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;

  const xMin = Math.min(...data.map((d) => d.p_fail));
  const xMax = Math.max(...data.map((d) => d.p_fail));
  const yVals = data.flatMap((d) => [d.mean_no_reserve, d.mean_with_reserve]);
  const rawMin = Math.min(...yVals);
  const rawMax = Math.max(...yVals);
  const pad = (rawMax - rawMin) * 0.15 || 1;
  const yMin = rawMin - pad, yMax = rawMax + pad;

  const x = (v: number) => M.l + ((v - xMin) / (xMax - xMin)) * iw;
  const y = (v: number) => M.t + ih - ((v - yMin) / (yMax - yMin)) * ih;

  const path = (key: string) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.p_fail).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");

  const xt = data.map((d) => d.p_fail);
  const yTickCount = 5;
  const yt: number[] = [];
  for (let i = 0; i <= yTickCount; i++) yt.push(yMin + (i * (yMax - yMin)) / yTickCount);
  const beX = breakevenP != null ? x(breakevenP) : null;
  const beY = breakevenP != null
    ? y(data.find((d) => Math.abs(d.p_fail - breakevenP) < 1e-6)?.mean_with_reserve ?? rawMin)
    : null;

  return (
    <div>
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
        Profit ~ per-aircraft failure probability
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ color: "var(--ink)" }}>
        {/* gridlines */}
        {yt.map((v, i) => (
          <line key={i}
            x1={M.l} y1={y(v)} x2={M.l + iw} y2={y(v)}
            stroke="currentColor" strokeOpacity="0.06" />
        ))}
        {/* axes */}
        <line x1={M.l} y1={M.t + ih} x2={M.l + iw} y2={M.t + ih} stroke="currentColor" strokeOpacity="0.5" />
        <line x1={M.l} y1={M.t} x2={M.l} y2={M.t + ih} stroke="currentColor" strokeOpacity="0.5" />
        {/* y ticks + labels */}
        {yt.map((v, i) => (
          <g key={i}>
            <line x1={M.l - 4} y1={y(v)} x2={M.l} y2={y(v)} stroke="currentColor" strokeOpacity="0.4" />
            <text x={M.l - 8} y={y(v) + 3} textAnchor="end"
              fontFamily="Geist Mono" fontSize="10" fill="currentColor" fillOpacity="0.6">
              {fmtRs(v)}
            </text>
          </g>
        ))}
        {/* x ticks + labels */}
        {xt.map((v, i) => (
          <g key={i}>
            <line x1={x(v)} y1={M.t + ih} x2={x(v)} y2={M.t + ih + 4} stroke="currentColor" strokeOpacity="0.4" />
            <text x={x(v)} y={M.t + ih + 18} textAnchor="middle"
              fontFamily="Geist Mono" fontSize="10" fill="currentColor" fillOpacity="0.6">
              {(v * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        {/* no-reserve (dashed, ink) */}
        <path d={path("mean_no_reserve")} stroke="var(--ink)" strokeWidth="2" fill="none" strokeDasharray="4 3" />
        {/* with-reserve (solid, accent) */}
        <path d={path("mean_with_reserve")} stroke="var(--accent)" strokeWidth="2.5" fill="none" />

        {/* break-even marker */}
        {beX != null && beY != null && (
          <>
            <line x1={beX} y1={M.t} x2={beX} y2={M.t + ih}
              stroke="var(--warn)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={beX} cy={beY} r="5" fill="var(--warn)" stroke="var(--surface)" strokeWidth="2" />
            <text x={beX + 10} y={beY - 10} fontFamily="Geist Mono" fontSize="10" fill="var(--warn)">
              BREAK-EVEN · {(breakevenP! * 100).toFixed(1)}%
            </text>
          </>
        )}

        {/* Legend */}
        <g transform={`translate(${M.l + 16}, ${M.t + 10})`}>
          <line x1="0" y1="6" x2="24" y2="6" stroke="var(--accent)" strokeWidth="2.5" />
          <text x="30" y="10" fontFamily="Geist Mono" fontSize="10" fill="var(--accent)">WITH RESERVE</text>
          <line x1="0" y1="26" x2="24" y2="26" stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 3" />
          <text x="30" y="30" fontFamily="Geist Mono" fontSize="10" fill="var(--ink)">NO RESERVE</text>
        </g>

        {/* axis labels */}
        <text x={M.l + iw / 2} y={H - 6} textAnchor="middle"
          fontFamily="Geist Mono" fontSize="9" fill="currentColor" fillOpacity="0.6" letterSpacing="1">
          PER-AIRCRAFT FAILURE PROBABILITY
        </text>
        <text x="14" y={M.t + ih / 2} transform={`rotate(-90 14 ${M.t + ih / 2})`} textAnchor="middle"
          fontFamily="Geist Mono" fontSize="9" fill="currentColor" fillOpacity="0.6" letterSpacing="1">
          MEAN PROFIT (Rs / DAY)
        </text>
      </svg>
    </div>
  );
}

function BetaSweepChart({ sweep, flipBeta }: { sweep: any[]; flipBeta: number | null }) {
  const data = sweep.filter((r) => r.mean_no !== null && r.mean_yes !== null);
  if (data.length < 2) {
    return <div className="font-mono text-xs text-ink-mute py-6 text-center">Not enough data points to plot.</div>;
  }

  const W = 640, H = 260;
  const M = { l: 60, r: 20, t: 24, b: 44 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;

  const xMin = Math.min(...data.map((d) => d.beta));
  const xMax = Math.max(...data.map((d) => d.beta));
  const yVals = data.flatMap((d) => [d.mean_no, d.mean_yes]);
  const rawMin = Math.min(...yVals);
  const rawMax = Math.max(...yVals);
  const pad = (rawMax - rawMin) * 0.15 || 1;
  const yMin = rawMin - pad, yMax = rawMax + pad;

  const x = (v: number) => M.l + ((v - xMin) / (xMax - xMin)) * iw;
  const y = (v: number) => M.t + ih - ((v - yMin) / (yMax - yMin)) * ih;

  const path = (key: string) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.beta).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");

  const xTickIdx = data.map((_, i) => i).filter((i) => i % Math.ceil(data.length / 6) === 0);
  const yTickCount = 5;
  const yt: number[] = [];
  for (let i = 0; i <= yTickCount; i++) yt.push(yMin + (i * (yMax - yMin)) / yTickCount);

  const flipX = flipBeta != null ? x(flipBeta) : null;

  return (
    <div>
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
        Profit ~ per-passenger variable cost β
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ color: "var(--ink)" }}>
        {yt.map((v, i) => (
          <line key={i}
            x1={M.l} y1={y(v)} x2={M.l + iw} y2={y(v)}
            stroke="currentColor" strokeOpacity="0.06" />
        ))}
        <line x1={M.l} y1={M.t + ih} x2={M.l + iw} y2={M.t + ih} stroke="currentColor" strokeOpacity="0.5" />
        <line x1={M.l} y1={M.t} x2={M.l} y2={M.t + ih} stroke="currentColor" strokeOpacity="0.5" />

        {yt.map((v, i) => (
          <g key={i}>
            <line x1={M.l - 4} y1={y(v)} x2={M.l} y2={y(v)} stroke="currentColor" strokeOpacity="0.4" />
            <text x={M.l - 8} y={y(v) + 3} textAnchor="end"
              fontFamily="Geist Mono" fontSize="10" fill="currentColor" fillOpacity="0.6">
              {fmtRs(v)}
            </text>
          </g>
        ))}
        {xTickIdx.map((i) => {
          const v = data[i].beta;
          return (
            <g key={i}>
              <line x1={x(v)} y1={M.t + ih} x2={x(v)} y2={M.t + ih + 4} stroke="currentColor" strokeOpacity="0.4" />
              <text x={x(v)} y={M.t + ih + 18} textAnchor="middle"
                fontFamily="Geist Mono" fontSize="10" fill="currentColor" fillOpacity="0.6">
                {v}
              </text>
            </g>
          );
        })}

        <path d={path("mean_no")} stroke="var(--ink)" strokeWidth="2" fill="none" strokeDasharray="4 3" />
        <path d={path("mean_yes")} stroke="var(--accent)" strokeWidth="2.5" fill="none" />

        {/* flip marker (if any) */}
        {flipX != null && (
          <>
            <line x1={flipX} y1={M.t} x2={flipX} y2={M.t + ih}
              stroke="var(--warn)" strokeWidth="1" strokeDasharray="2 3" />
            <text x={flipX + 8} y={M.t + 14} fontFamily="Geist Mono" fontSize="10" fill="var(--warn)">
              VERDICT FLIPS · β ≈ {flipBeta}
            </text>
          </>
        )}

        <g transform={`translate(${M.l + 16}, ${M.t + 10})`}>
          <line x1="0" y1="6" x2="24" y2="6" stroke="var(--accent)" strokeWidth="2.5" />
          <text x="30" y="10" fontFamily="Geist Mono" fontSize="10" fill="var(--accent)">WITH RESERVE</text>
          <line x1="0" y1="26" x2="24" y2="26" stroke="var(--ink)" strokeWidth="2" strokeDasharray="4 3" />
          <text x="30" y="30" fontFamily="Geist Mono" fontSize="10" fill="var(--ink)">NO RESERVE</text>
        </g>

        <text x={M.l + iw / 2} y={H - 6} textAnchor="middle"
          fontFamily="Geist Mono" fontSize="9" fill="currentColor" fillOpacity="0.6" letterSpacing="1">
          β · VARIABLE COST PER PASSENGER (Rs)
        </text>
        <text x="14" y={M.t + ih / 2} transform={`rotate(-90 14 ${M.t + ih / 2})`} textAnchor="middle"
          fontFamily="Geist Mono" fontSize="9" fill="currentColor" fillOpacity="0.6" letterSpacing="1">
          MEAN PROFIT (Rs / DAY)
        </text>
      </svg>
    </div>
  );
}

function ResultTable({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <table className="w-full font-mono text-[12.5px]">
      <thead>
        <tr className="border-b border-border bg-sunken/50">
          {headers.map((h) => (
            <th key={h} className="px-3 py-2 text-left text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b border-border/60 last:border-0 hover:bg-ink/[0.02] transition-colors duration-150 animate-rise"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {row.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
