import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentProps<"div"> & {
  /** surface: لوحات عادية · raised: بطاقات فوق الخلفية */
  level?: "surface" | "raised";
  padded?: boolean;
};

export function Card({ level = "raised", padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border",
        level === "raised" ? "bg-surface-raised" : "bg-surface",
        padded && "p-4 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("text-label-lg font-semibold text-ink", className)} {...props} />;
}

export function CardMeta({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-body-sm text-ink-muted", className)} {...props} />;
}
