import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const base =
  "w-full min-h-14 rounded-2xl border border-line bg-surface-2 px-4 text-lg text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none";

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${base} ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${base} ${className}`} {...rest} />;
}

export function Chip({
  active,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-11 rounded-full border px-4 text-base transition active:scale-95 ${
        active ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface-2 text-fg hover:border-muted"
      } ${className}`}
      {...rest}
    />
  );
}
