import { forwardRef } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-accent-solid text-on-accent hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
  secondary: "bg-surface-2 text-fg border border-border hover:bg-hover hover:border-border-strong",
  ghost: "text-muted hover:text-fg hover:bg-hover",
  danger: "bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20",
};
const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 gap-1.5 text-[12px]",
  md: "h-8 px-3 gap-2 text-[13px]",
  icon: "h-8 w-8 justify-center",
  "icon-sm": "h-7 w-7 justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center rounded-[6px] font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
