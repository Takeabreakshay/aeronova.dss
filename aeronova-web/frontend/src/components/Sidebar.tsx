import { HugeiconsIcon } from "@hugeicons/react";
import {
  Target02Icon,
  UserGroupIcon,
  FuelStationIcon,
  Shield01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { Slider } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type Params } from "@/lib/api";

interface Props { params: Params; setParams: (p: Params) => void; }

const ROUTES = ["R1", "R2", "R3", "R4", "R5", "R6"];
const BASE_DEMAND: Record<string, number> = { R1: 360, R2: 280, R3: 420, R4: 190, R5: 310, R6: 240 };

function Section({
  title, icon, delay, children,
}: { title: string; icon: any; delay: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2 animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(258_92%_76%)]">
        <HugeiconsIcon icon={icon} size={12} strokeWidth={1.6} />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function Sidebar({ params, setParams }: Props) {
  const update = (patch: Partial<Params>) => setParams({ ...params, ...patch });
  const updateRoute = (r: string, field: string, val: number) =>
    setParams({ ...params, routes: { ...params.routes, [r]: { ...params.routes[r], [field]: val } } });

  async function reset() {
    try { setParams(await api.defaults()); } catch (e) { console.error(e); }
  }

  function applyGlobalShift(pctInt: number) {
    // Apply a proportional shift on top of the CURRENT baseline demands.
    const next = { ...params, routes: { ...params.routes } };
    for (const r of ROUTES) {
      next.routes[r] = { ...next.routes[r], demand: Math.round(BASE_DEMAND[r] * (1 + pctInt / 100)) };
    }
    setParams(next);
  }

  const currentGlobalShift = Math.round(
    ((params.routes.R1.demand / BASE_DEMAND.R1) - 1) * 100
  );
  const fuelPreset =
    Math.abs(params.fuel_mult - 0.85) < 0.001 ? "low"
    : Math.abs(params.fuel_mult - 1.00) < 0.001 ? "base"
    : Math.abs(params.fuel_mult - 1.20) < 0.001 ? "high"
    : "custom";

  return (
    <Card className="h-fit p-4 space-y-5 sticky top-4 animate-rise">
      {/* Reset row */}
      <div className="flex items-center justify-between animate-rise">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Controls
        </div>
        <Button variant="secondary" size="sm" onClick={reset} className="h-7 px-2">
          <HugeiconsIcon icon={Refresh01Icon} size={12} strokeWidth={1.6} />
          Reset
        </Button>
      </div>

      <Section title="Strategy" icon={Target02Icon} delay={0}>
        <div className="flex gap-1.5 flex-wrap">
          {(["profit", "service", "resilient"] as const).map((s) => (
            <button
              key={s}
              onClick={() => update({ strategy: s })}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-[transform,border-color,color,background-color] duration-150 ease-out-expo active:scale-[0.97]
                ${params.strategy === s
                  ? "border-primary bg-gradient-to-br from-primary/25 to-cyan/15 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-primary hover:-translate-y-px hover:text-[hsl(258_92%_76%)]"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Demand" icon={UserGroupIcon} delay={60}>
        {/* Global shift chips */}
        <div className="flex gap-1 mb-1">
          {[-20, -10, 0, 10, 20].map((n) => (
            <button
              key={n}
              onClick={() => applyGlobalShift(n)}
              className={`flex-1 rounded-md border px-1.5 py-1 font-mono text-[10px] transition-[transform,border-color,color] duration-150 ease-out-expo active:scale-[0.95]
                ${currentGlobalShift === n
                  ? "border-primary bg-primary/15 text-white"
                  : "border-border text-muted-foreground hover:border-primary hover:text-[hsl(258_92%_76%)]"}`}
            >
              {n > 0 ? `+${n}%` : n === 0 ? "0" : `${n}%`}
            </button>
          ))}
        </div>
        {ROUTES.map((r) => (
          <Slider
            key={r}
            label={`${r} pax`}
            min={Math.round(BASE_DEMAND[r] * 0.5)}
            max={Math.round(BASE_DEMAND[r] * 1.5)}
            step={5}
            value={params.routes[r].demand}
            onChange={(e) => updateRoute(r, "demand", parseInt(e.target.value))}
          />
        ))}
      </Section>

      <Section title="Fuel & load" icon={FuelStationIcon} delay={120}>
        {/* Fuel scenario presets */}
        <div className="flex gap-1">
          {[
            { key: "low", val: 0.85, label: "Low" },
            { key: "base", val: 1.00, label: "Base" },
            { key: "high", val: 1.20, label: "High" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => update({ fuel_mult: s.val })}
              className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-[transform,border-color,color] duration-150 ease-out-expo active:scale-[0.95]
                ${fuelPreset === s.key
                  ? "border-primary bg-primary/15 text-white"
                  : "border-border text-muted-foreground hover:border-primary hover:text-[hsl(258_92%_76%)]"}`}
            >
              {s.label} {s.val.toFixed(2)}×
            </button>
          ))}
        </div>
        <Slider label="Fuel mult" min={0.7} max={1.8} step={0.01} suffix="x"
          value={params.fuel_mult}
          onChange={(e) => update({ fuel_mult: parseFloat(e.target.value) })}
        />
        <Slider label="Load factor" min={0.7} max={0.98} step={0.01}
          value={params.LF}
          onChange={(e) => update({ LF: parseFloat(e.target.value) })}
        />
        <Slider label="Availability" min={0.9} max={0.99} step={0.005}
          value={params.avail_p ?? 0.97}
          onChange={(e) => update({ avail_p: parseFloat(e.target.value) })}
        />
      </Section>

      <Section title="Reserve" icon={Shield01Icon} delay={180}>
        <div className="flex gap-1.5">
          {[null, "A", "B", "C"].map((r) => (
            <button
              key={r ?? "off"}
              onClick={() => update({ reserve_type: r })}
              className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] transition-[transform,border-color,color,background-color] duration-150 ease-out-expo active:scale-[0.97]
                ${(params.reserve_type ?? null) === r
                  ? "border-primary bg-primary/15 text-white"
                  : "border-border text-muted-foreground hover:border-primary hover:text-[hsl(258_92%_76%)]"}`}
            >
              {r ?? "OFF"}
            </button>
          ))}
        </div>
      </Section>
    </Card>
  );
}
