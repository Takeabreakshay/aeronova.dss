import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "elevated" | "luminous" | "flat";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "elevated", ...props }, ref) => {
    const base =
      "rounded-lg border text-card-foreground animate-enter transition-[transform,border-color,box-shadow] duration-200 ease-out";
    const variantClass =
      variant === "luminous"
        ? "an-luminous"
        : variant === "flat"
          ? "bg-card border-border"
          : "an-elevated an-rim";
    return <div ref={ref} className={cn(base, variantClass, className)} {...props} />;
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1 p-4", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";
