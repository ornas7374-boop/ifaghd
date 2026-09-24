import { cn } from "@/lib/format";

/** Keycap hint. Pass several keys for a sequence: <Kbd keys={["G", "O"]} /> */
export function Kbd({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-border-strong bg-surface-2 px-1 font-sans text-[10.5px] font-medium leading-none text-muted"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
