import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  max = 100,
  tone = "primary",
  className,
}: {
  value?: number;
  max?: number;
  tone?: "primary" | "mint" | "amber" | "coral";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const grad = {
    primary: "linear-gradient(90deg, hsl(258 90% 66%), hsl(188 89% 55%))",
    mint:    "linear-gradient(90deg, hsl(142 71% 60%), hsl(142 71% 45%))",
    amber:   "linear-gradient(90deg, hsl(48 96% 62%), hsl(38 96% 55%))",
    coral:   "linear-gradient(90deg, hsl(0 89% 71%), hsl(0 89% 55%))",
  }[tone];

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ width: `${pct}%`, background: grad }}
      />
    </div>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-t border-border my-4", className)} />;
}
