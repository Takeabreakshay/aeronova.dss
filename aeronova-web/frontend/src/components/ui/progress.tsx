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
    primary: "linear-gradient(90deg, hsl(0 68% 33%), hsl(0 68% 45%))",
    mint:    "linear-gradient(90deg, hsl(122 20% 32%), hsl(122 20% 40%))",
    amber:   "linear-gradient(90deg, hsl(36 84% 42%), hsl(36 84% 50%))",
    coral:   "linear-gradient(90deg, hsl(0 68% 33%), hsl(0 68% 45%))",
  }[tone];

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden", className)}>
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
