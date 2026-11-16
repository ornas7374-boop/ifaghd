import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "calm" | "sos";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  secondary: "bg-surface-2 text-fg border border-line hover:border-muted",
  ghost: "text-muted hover:text-fg",
  calm: "bg-calm text-bg hover:brightness-110",
  sos: "bg-sos text-sos-fg hover:brightness-110",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
}

export function Button({ variant = "primary", block, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
}
