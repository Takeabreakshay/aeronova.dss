import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardCircleIcon,
  RoadIcon,
  Coins01Icon,
  AirplaneTakeOff01Icon,
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/card";
import { formatRs, pct } from "@/lib/utils";
import type { Params, Solution } from "@/lib/api";

// Hex colors so the `${color}22`/`${color}55` alpha-suffix trick works.
// Three distinct warm tones so A/B/C read differently on cream.
const TYPE_META: Record<string, { color: string; label: string }> = {
  A: { color: "#7C6C57", label: "78-seat"  },   // warm tan
  B: { color: "#8B1A1A", label: "120-seat" },   // oxblood accent
  C: { color: "#1C1815", label: "180-seat" },   // ink
};

function KPI({ label, value, delta, delay = 0, tone, variant }: {
  label: string; value: string; delta?: string; delay?: number;
  tone?: "mint" | "coral"; variant?: "elevated" | "luminous";
}) {
  const isLuminous = variant === "luminous";
  const color = isLuminous
    ? (tone === "mint" ? "text-[hsl(142_60%_28%)]" : tone === "coral" ? "text-[hsl(0_70%_38%)]" : "")
    : (tone === "mint" ? "text-mint" : tone === "coral" ? "text-coral" : "text-foreground");
  return (
    <Card
      variant={variant ?? "elevated"}
      className="p-4 group relative overflow-hidden animate-spring"
      style={{ animationDelay: `${delay}ms` }}
    >
      {!isLuminous && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      )}
      <div className={`font-mono text-[10px] font-medium uppercase tracking-[0.14em] ${isLuminous ? "text-[hsl(240_15%_35%)]" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-medium tracking-tight tabular-nums ${color}`}>{value}</div>
      {delta && (
        <div className={`mt-1 font-mono text-[11px] ${isLuminous ? "text-[hsl(240_10%_35%)]" : "text-muted-foreground"}`}>
          {delta}
        </div>
      )}
    </Card>
  );
}

function SectionTitle({ title, desc, icon, color }: { title: string; desc: string; icon: any; color?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 animate-rise">
      <span style={{ color: color ?? "hsl(0 68% 33%)" }}>
        <HugeiconsIcon icon={icon} size={20} strokeWidth={1.6} />
      </span>
      <span className="text-lg font-semibold tracking-tight">{title}</span>
      <span className="text-[13px] text-muted-foreground">{desc}</span>
    </div>
  );
}

function RouteCard({ id, params, solution, delay = 0 }: { id: string; params: Params; solution: Solution; delay?: number }) {
  const route = params.routes[id];
  const served = solution.carried[id] ?? 0;
  const demand = route.demand;
  const fill = Math.min(1, demand ? served / demand : 0);
  const barColor = fill >= 0.9 ? "hsl(122 20% 32%)" : fill >= 0.7 ? "hsl(36 84% 42%)" : "hsl(0 68% 33%)";
  const operating = solution.operate[id];

  const types = (["A", "B", "C"] as const)
    .map((t) => ({ t, n: solution.x[`${t},${id}`] ?? 0 }))
    .filter(({ n }) => n > 0);

  return (
    <Card
      className="p-4 animate-rise transition-[border-color,transform] duration-200 ease-out-expo hover:border-border-hi hover:-translate-y-px"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-baseline justify-between mb-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-lg font-semibold">{id}</span>
          <span
            className="font-mono text-[10px] tracking-[0.14em] inline-flex items-center gap-1"
            style={{ color: operating ? "hsl(122 20% 32%)" : "hsl(0 68% 33%)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: operating ? "hsl(122 20% 32%)" : "hsl(0 68% 33%)",
                boxShadow: `0 0 6px ${operating ? "hsl(122 20% 32%)" : "hsl(0 68% 33%)"}`,
              }}
            />
            {operating ? "OPERATING" : "OFFLINE"}
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          Rs {route.fare.toLocaleString()}/pax · {route.rth}h RT
        </span>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {types.length > 0 ? (
          types.map(({ t, n }) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold transition-transform duration-150 ease-out-expo hover:-translate-y-px"
              style={{
                color: TYPE_META[t].color,
                borderColor: `${TYPE_META[t].color}55`,
                background: `${TYPE_META[t].color}22`,
              }}
            >
              <HugeiconsIcon icon={AirplaneTakeOff01Icon} size={11} strokeWidth={1.6} />
              Type {t} × {n}
            </span>
          ))
        ) : (
          <span className="text-xs italic text-muted-foreground/70">not operating</span>
        )}
      </div>

      <div className="mb-1 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>
          {served.toFixed(0)} / {demand.toFixed(0)} pax
        </span>
        <span style={{ color: barColor }}>{(fill * 100).toFixed(0)}% filled</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ width: `${fill * 100}%`, background: barColor }}
        />
      </div>
    </Card>
  );
}

export function DeployTab({ params, solution }: { params: Params; solution: Solution | null }) {
  if (!solution) return <div className="text-sm text-muted-foreground">Solving…</div>;

  const feasible = solution.status === "Optimal";
  const dash = "—";

  const served = Object.values(solution.carried).reduce((a, b) => a + b, 0);
  const totalDemand = Object.values(params.routes).reduce((a: number, r: any) => a + r.demand, 0);
  const spill = totalDemand - served;
  const f = solution.facts;
  const rev = Math.max(f.revenue, 1);
  const fuelPct = feasible ? (f.fuel_cost / rev) * 100 : 0;
  const varPct = feasible ? (f.variable_cost / rev) * 100 : 0;
  const profitPct = feasible ? Math.max(0, 100 - fuelPct - varPct) : 0;

  return (
    <div className="space-y-5">
      {/* Today's plan KPIs */}
      <div>
        <SectionTitle
          title="Today's plan"
          desc={feasible ? "Deterministic optimal — solved in real time" : "Infeasible — see banner above"}
          icon={DashboardCircleIcon}
        />
        <div className="grid grid-cols-6 gap-3">
          <KPI
            label="Profit"
            value={feasible ? `Rs ${formatRs(solution.profit)}` : dash}
            tone={feasible ? (solution.profit >= 0 ? "mint" : "coral") : undefined}
            delay={0}
            variant="luminous"
          />
          <KPI
            label="Served"
            value={feasible ? formatRs(served) : dash}
            delta={feasible ? `spill ${formatRs(spill)}` : undefined}
            delay={40}
          />
          <KPI label="Utilization"  value={feasible ? pct(solution.kpis.utilization) : dash} delay={80} />
          <KPI label="Coverage"     value={feasible ? `${solution.kpis.coverage} / 6` : `0 / 6`} delay={120} tone={feasible ? undefined : "coral"} />
          <KPI label="Load factor"  value={feasible ? pct(solution.kpis.load_factor) : dash} delay={160} />
          <KPI label="Reserve"      value={params.reserve_type ? "Deployed" : "Off"} delta={params.reserve_type ?? "-"} delay={200} />
        </div>
      </div>

      {/* Route cards */}
      <div>
        <SectionTitle
          title="Routes today"
          desc="Which planes fly where, and how full they land"
          icon={RoadIcon}
        />
        <div className="grid grid-cols-2 gap-3">
          {["R1", "R2", "R3", "R4", "R5", "R6"].map((r, i) => (
            <RouteCard key={r} id={r} params={params} solution={solution} delay={i * 50} />
          ))}
        </div>
      </div>

      {/* Cost breakdown */}
      <div>
        <SectionTitle
          title="Where the money goes"
          desc="Revenue split into fuel, variable cost, and profit"
          icon={Coins01Icon}
          color="hsl(36 84% 42%)"
        />
        <Card className="p-5 animate-spring">
          <div className="mb-2.5 flex justify-between font-mono text-xs text-muted-foreground">
            <span>Revenue <b className="text-foreground">Rs {formatRs(f.revenue)}</b></span>
            <span>Profit <b className={f.profit >= 0 ? "text-mint" : "text-coral"}>Rs {formatRs(f.profit)}</b></span>
          </div>
          <div className="flex h-8 rounded-lg overflow-hidden bg-ink/[0.04] border border-border">
            <div
              style={{ width: `${fuelPct}%`, background: "linear-gradient(90deg, hsl(0 68% 33%), hsl(36 84% 42%))" }}
              className="flex items-center justify-center font-mono text-[11px] font-semibold text-ground transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            >
              {fuelPct >= 15 ? `Fuel ${fuelPct.toFixed(0)}%` : ""}
            </div>
            <div
              style={{ width: `${varPct}%`, background: "linear-gradient(90deg, hsl(30 18% 48%), hsl(20 12% 22%))" }}
              className="flex items-center justify-center font-mono text-[11px] font-semibold text-ground transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            >
              {varPct >= 10 ? `Variable ${varPct.toFixed(0)}%` : ""}
            </div>
            <div
              style={{ width: `${profitPct}%`, background: "linear-gradient(90deg, hsl(122 25% 38%), hsl(122 30% 26%))" }}
              className="flex items-center justify-center font-mono text-[11px] font-semibold text-ground transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            >
              {profitPct >= 8 ? `Profit ${profitPct.toFixed(0)}%` : ""}
            </div>
          </div>
          <div className="mt-2.5 flex justify-between font-mono text-[10px] tracking-[0.1em] text-muted-foreground/70">
            <span>■ Fuel Rs {formatRs(f.fuel_cost)}</span>
            <span>■ Variable Rs {formatRs(f.variable_cost)}</span>
            <span>■ Strategy: {f.strategy}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
