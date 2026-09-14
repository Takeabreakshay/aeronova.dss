import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AirplaneModeOffIcon,
  PlayIcon,
  Loading03Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type Params, type Solution, type RecoveryResult } from "@/lib/api";
import { formatRs } from "@/lib/utils";

const TAILS = ["A1","A2","A3","A4","A5","B1","B2","B3","B4","C1","C2","C3"];

export function RecoverTab({ params, solution }: { params: Params; solution: Solution | null }) {
  const [tail, setTail] = useState("C1");
  const [rec, setRec] = useState<RecoveryResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!solution) return;
    setBusy(true);
    try { setRec(await api.recover(params, solution.x, tail)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="mb-3 flex items-center gap-2.5 animate-rise">
        <span className="text-coral">
          <HugeiconsIcon icon={AirplaneModeOffIcon} size={20} strokeWidth={1.6} />
        </span>
        <span className="text-lg font-semibold tracking-tight">Signature demo</span>
        <span className="text-[13px] text-muted-foreground">Kill an aircraft, recover live, see the reserve pay off</span>
      </div>

      <Card className="p-5 animate-rise" style={{ animationDelay: "40ms" }}>
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Aircraft goes technical
            </div>
            <div className="flex gap-1 flex-wrap">
              {TAILS.map((t, i) => {
                const type = t[0];
                const color = type === "A" ? "hsl(30 15% 24%)" : type === "B" ? "hsl(0 68% 33%)" : "hsl(0 68% 33%)";
                const isSelected = tail === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTail(t)}
                    className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-[transform,border-color,color,background-color,box-shadow] duration-150 ease-out-expo active:scale-[0.97] animate-rise
                      ${isSelected
                        ? "text-ground shadow-[0_0_16px_hsl(var(--primary)_/_0.35)]"
                        : "border-border text-muted-foreground hover:border-primary hover:-translate-y-px"}`}
                    style={{
                      animationDelay: `${i * 20}ms`,
                      borderColor: isSelected ? color : undefined,
                      background: isSelected ? `linear-gradient(135deg, ${color}33, ${color}18)` : undefined,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <Button onClick={run} disabled={busy}>
            {busy
              ? <><HugeiconsIcon icon={Loading03Icon} size={14} strokeWidth={1.6} className="animate-spin" />Recovering…</>
              : <><HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={1.6} />Recover</>}
          </Button>
        </div>

        {rec ? (
          <>
            <div className="flex gap-1.5 flex-wrap mb-4">
              <Badge variant="coral" className="animate-spring" style={{ animationDelay: "0ms" }}>
                <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.6} />
                Cancelled · {rec.cancelled.map((c: any) => `${c[0]}→${c[1]}`).join(", ") || "none"}
              </Badge>
              <Badge variant="mint" className="animate-spring" style={{ animationDelay: "80ms" }}>
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={1.6} />
                Protected · {rec.protected_routes.join(", ")}
              </Badge>
              <Badge
                variant={rec.reserve_deployed ? "amber" : "default"}
                className="animate-spring"
                style={{ animationDelay: "160ms" }}
              >
                <HugeiconsIcon icon={Shield01Icon} size={12} strokeWidth={1.6} />
                Reserve · {rec.reserve_deployed ? `DEPLOYED (${rec.reserve_type})` : "off"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KPI label="Loss w/o reserve" value={`Rs ${formatRs(rec.loss_without_reserve)}`} delay={0} />
              <KPI label="Loss w/ reserve" value={`Rs ${formatRs(rec.loss_with_reserve)}`} delay={60} />
              <KPI
                label="Net benefit"
                value={`Rs ${formatRs(rec.net_benefit)}`}
                delay={120}
                tone={rec.net_benefit > 0 ? "mint" : "coral"}
                subtitle={rec.net_benefit > 0 ? "reserve worth it" : "reserve not worth it"}
              />
            </div>
          </>
        ) : (
          <div className="rounded-md border border-accent/[0.25] bg-accent/[0.06] px-3.5 py-3 font-mono text-xs text-muted-foreground">
            ◆ Pick a tail. The engine will re-plan, decide on the reserve, and show the rupee impact.
          </div>
        )}
      </Card>
    </div>
  );
}

function KPI({
  label, value, delay = 0, tone, subtitle,
}: { label: string; value: string; delay?: number; tone?: "mint" | "coral"; subtitle?: string }) {
  const color = tone === "mint" ? "text-mint" : tone === "coral" ? "text-coral" : "text-foreground";
  return (
    <Card
      className="p-3.5 group relative overflow-hidden animate-spring"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-xl font-medium tabular-nums ${color}`}>{value}</div>
      {subtitle && <div className={`mt-0.5 font-mono text-[10.5px] ${color} opacity-70`}>{subtitle}</div>}
    </Card>
  );
}
