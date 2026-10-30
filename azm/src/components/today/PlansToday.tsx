import Link from "next/link";
import type { IfThenPlan, Track } from "@/lib/types";
import { Card } from "../ui/Card";

export function PlansToday({ plans, tracks }: { plans: IfThenPlan[]; tracks: Track[] }) {
  const active = plans
    .filter((p) => p.active)
    .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));

  return (
    <Card
      title="خططك إذا–فإن لليوم"
      action={
        <Link href="/plans" className="text-sm font-semibold text-accent">
          {active.length ? "إدارة" : "أضف خطة"}
        </Link>
      }
    >
      {active.length === 0 ? (
        <p className="text-base leading-relaxed text-muted">
          ما عندك خطط للحين. اكتب خطة وحدة مربوطة بصلاة، وبتظهر هنا كل يوم.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map((p) => (
            <li key={p.id} className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg leading-relaxed">
                  <span className="font-bold text-accent">إذا</span> {p.trigger}{" "}
                  <span className="font-bold text-accent">←</span> {p.action}
                </p>
                {p.time && (
                  <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-sm tabular-nums text-muted" dir="ltr">
                    {p.time}
                  </span>
                )}
              </div>
              {p.trackId && <p className="mt-1 text-sm text-muted">{tracks.find((t) => t.id === p.trackId)?.name}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
