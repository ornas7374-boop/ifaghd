import { cn } from "@/lib/format";

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[10px] border border-border bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-11 items-center gap-3 border-b border-border px-4 py-2", className)}>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[13.5px] font-medium text-fg">{title}</h2>
        {description && <p className="truncate text-[12px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}
