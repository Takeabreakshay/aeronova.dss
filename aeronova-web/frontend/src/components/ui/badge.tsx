import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] transition-transform duration-150 hover:-translate-y-px",
  {
    variants: {
      variant: {
        default: "border-border bg-white/[0.03] text-muted-foreground",
        primary: "border-primary/45 bg-primary/10 text-[hsl(258_92%_76%)]",
        amber: "border-amber/45 bg-amber/10 text-amber",
        mint: "border-mint/45 bg-mint/10 text-mint",
        coral: "border-coral/45 bg-coral/10 text-coral",
        cyan: "border-cyan/45 bg-cyan/10 text-cyan",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
