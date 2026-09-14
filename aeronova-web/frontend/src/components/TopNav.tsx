import { HugeiconsIcon } from "@hugeicons/react";
import {
  Rocket01Icon,
  ChartHistogramIcon,
  Shield01Icon,
  RoadIcon,
  ArrowUp03Icon,
  ArrowDown03Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { formatRs } from "@/lib/utils";

interface Props { strategy: string; reserve: string; coverage: number; profit: number; }

export function TopNav({ strategy, reserve, coverage, profit }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-card/70 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 shadow-md animate-rise">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-accent text-ground font-bold shadow-[0_0_24px_rgba(139,26,26,0.5)] transition-transform duration-200 ease-out-spring hover:scale-105 hover:-rotate-3">
          A
        </div>
        <div className="text-sm font-bold tracking-tight leading-tight">
          Aero Nova
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
            Decision Support
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Badge>
          <span className="inline-block h-2 w-2 rounded-full bg-mint animate-pulse-dot" />
          Engine live
        </Badge>
        <Badge variant="primary">
          <HugeiconsIcon icon={Rocket01Icon} size={13} strokeWidth={1.6} />
          strategy · {strategy}
        </Badge>
        <Badge variant={reserve !== "OFF" ? "amber" : "default"}>
          <HugeiconsIcon icon={Shield01Icon} size={13} strokeWidth={1.6} />
          reserve · {reserve}
        </Badge>
        <Badge variant="mint">
          <HugeiconsIcon icon={RoadIcon} size={13} strokeWidth={1.6} />
          coverage · {coverage}/6
        </Badge>
        <Badge variant={profit >= 0 ? "mint" : "coral"}>
          <HugeiconsIcon icon={profit >= 0 ? ArrowUp03Icon : ArrowDown03Icon} size={13} strokeWidth={1.6} />
          Rs {formatRs(profit)}
        </Badge>
      </div>
    </div>
  );
}
