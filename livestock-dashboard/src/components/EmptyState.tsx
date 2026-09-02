import { Inbox, type LucideIcon } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  title = "لا توجد بيانات مدخلة حتى الآن",
  description,
  icon: Icon = Inbox,
  actionHref,
  actionLabel,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline bg-surface px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
        <Icon size={26} />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-secondary">{description}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 rounded-xl bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
