import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardCircleIcon,
  ChartHistogramIcon,
  AirplaneModeOffIcon,
  Analytics01Icon,
  Message01Icon,
} from "@hugeicons/core-free-icons";
import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { DeployTab } from "@/components/DeployTab";
import { RiskTab } from "@/components/RiskTab";
import { RecoverTab } from "@/components/RecoverTab";
import { AnalysisTab } from "@/components/AnalysisTab";
import { AskTab } from "@/components/AskTab";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Params, type Solution } from "@/lib/api";

export default function App() {
  const [params, setParams] = useState<Params | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [guardrail, setGuardrail] = useState("");

  useEffect(() => {
    (async () => {
      const [p, h] = await Promise.all([api.defaults(), api.health()]);
      setParams(p);
      setGuardrail(h.guardrail);
    })();
  }, []);

  useEffect(() => {
    if (!params) return;
    const id = setTimeout(() => api.optimize(params).then(setSolution).catch(console.error), 180);
    return () => clearTimeout(id);
  }, [params]);

  if (!params) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-[240px_1fr] gap-4">
          <Skeleton className="h-96" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-96" />
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] p-4">
        <TopNav
          strategy={params.strategy}
          reserve={params.reserve_type ?? "OFF"}
          coverage={solution?.kpis.coverage ?? 0}
          profit={solution?.profit ?? 0}
        />

        <div className="mb-4 flex items-center justify-between rounded-md border border-primary/25 bg-primary/[0.06] px-3 py-2 font-mono text-[11px] text-muted-foreground animate-rise stagger-2">
          <span>
            ◆ <span className="text-[hsl(258_92%_76%)] font-semibold">Guardrail:</span> {guardrail}
          </span>
          <span className="text-muted-foreground/60">seed 42 · reproducible</span>
        </div>

        {solution && solution.status !== "Optimal" && (
          <div className="mb-4 rounded-lg border border-coral/40 bg-gradient-to-r from-coral/10 to-amber/[0.05] px-5 py-4 animate-spring">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-coral">
              ◇ No feasible plan under current settings
            </div>
            <div className="text-sm text-foreground">
              {solution.facts.infeasible_reason?.binding ?? "Try relaxing a control."}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              → {solution.facts.infeasible_reason?.hint}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[240px_1fr] gap-4">
          <Sidebar params={params} setParams={setParams} />

          <Tabs defaultValue="deploy" className="w-full">
            <TabsList className="animate-rise stagger-3">
              <TabsTrigger value="deploy">
                <HugeiconsIcon icon={DashboardCircleIcon} size={15} strokeWidth={1.6} />
                Deploy
              </TabsTrigger>
              <TabsTrigger value="risk">
                <HugeiconsIcon icon={ChartHistogramIcon} size={15} strokeWidth={1.6} />
                Risk
              </TabsTrigger>
              <TabsTrigger value="recover">
                <HugeiconsIcon icon={AirplaneModeOffIcon} size={15} strokeWidth={1.6} />
                Recover
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <HugeiconsIcon icon={Analytics01Icon} size={15} strokeWidth={1.6} />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="ask">
                <HugeiconsIcon icon={Message01Icon} size={15} strokeWidth={1.6} />
                Ask AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deploy"><DeployTab params={params} solution={solution} /></TabsContent>
            <TabsContent value="risk"><RiskTab params={params} solution={solution} /></TabsContent>
            <TabsContent value="recover"><RecoverTab params={params} solution={solution} /></TabsContent>
            <TabsContent value="analysis"><AnalysisTab params={params} /></TabsContent>
            <TabsContent value="ask"><AskTab params={params} setParams={setParams} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
