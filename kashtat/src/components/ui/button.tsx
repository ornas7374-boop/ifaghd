import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-hover",
  secondary: "border border-border-strong bg-surface-raised text-ink hover:bg-surface-overlay",
  ghost: "text-ink hover:bg-surface-overlay",
  danger: "border border-danger bg-danger-subtle text-danger hover:bg-surface-overlay",
};

// كل الأحجام ≥ 36px، والافتراضي 44px لأهداف اللمس
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-label",
  md: "h-11 px-[18px] text-[15px]",
  lg: "h-12 px-7 text-label-lg",
};

type StyleProps = { variant?: Variant; size?: Size; fullWidth?: boolean };

export function buttonClasses({ variant = "primary", size = "md", fullWidth }: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full");
}

type ButtonProps = ComponentProps<"button"> & StyleProps & { loading?: boolean };

export function Button({
  variant,
  size,
  fullWidth,
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleProps;

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses({ variant, size, fullWidth }), className)} {...props} />;
}
