import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-sunken px-3 py-1 text-sm",
        "transition-[border-color,box-shadow] duration-150 ease-out",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Slider = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; value?: number; suffix?: string }
>(({ className, label, value, suffix, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-foreground">
          {value}
          {suffix}
        </span>
      </div>
    )}
    <input
      type="range"
      ref={ref}
      className={cn(
        "w-full h-1.5 bg-sunken rounded-full appearance-none cursor-pointer",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5",
        "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
        "[&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(30, 64, 175,0.6)]",
        "[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125",
        className
      )}
      {...props}
    />
  </div>
));
Slider.displayName = "Slider";
