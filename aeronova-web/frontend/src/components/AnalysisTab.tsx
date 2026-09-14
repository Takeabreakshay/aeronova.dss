import { useState } from "react";
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
        <span className="text-[hsl(258_92%_76%)]">
          <HugeiconsIcon icon={icon} size={20} strokeWidth={1.6} />
        </span>
        <span className="text-lg font-semibold tracking-tight">{title}</span>
        <span className="text-[13px] text-muted-foreground">{desc}</span>
      </div>
      {info && (
        <div className="mb-3 rounded-md border border-primary/25 bg-primary/[0.06] px-3 py-2 font-mono text-[11px] text-muted-foreground">
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
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "hsl(258 80% 45%)" }}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={1.8} />
        Verdict
      </div>
      <div className="mt-2 text-[15px] font-medium leading-relaxed">{text}</div>
    </Card>
  );
}

function ResultTable({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <table className="w-full font-mono text-[12.5px]">
      <thead>
        <tr className="border-b border-border bg-secondary/50">
          {headers.map((h) => (
            <th key={h} className="px-3 py-2 text-left text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b border-border/60 last:border-0 hover:bg-white/[0.02] transition-colors duration-150 animate-rise"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {row.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
