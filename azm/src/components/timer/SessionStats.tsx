import { addDays } from "@/lib/date";
import { dateOf, minutesOn, minutesSince } from "@/lib/stats";
import type { DateKey, Session, Track } from "@/lib/types";
import { Card } from "../ui/Card";

export function SessionStats({ sessions, tracks, today }: { sessions: Session[]; tracks: Track[]; today: DateKey }) {
  const weekStart = addDays(today, -6);
  const week = sessions.filter((s) => dateOf(s.startedAt) >= weekStart);
  const byTrack = tracks
    .map((t) => ({ name: t.name, min: week.filter((s) => s.trackId === t.id).reduce((a, s) => a + s.actualMin, 0) }))
    .filter((t) => t.min > 0);
  const max = Math.max(1, ...byTrack.map((t) => t.min));

  return (
    <Card title="إحصائياتك">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={minutesOn(sessions, today)} label="دقيقة اليوم" />
        <Stat value={minutesSince(sessions, weekStart)} label="دقيقة آخر 7 أيام" />
        <Stat value={week.length} label="جلسة آخر 7 أيام" />
      </div>

      {byTrack.length > 0 && (
        <ul className="mt-5 space-y-3">
          {byTrack.map((t) => (
            <li key={t.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{t.name}</span>
                <span className="tabular-nums text-muted">{t.min} د</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(t.min / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {sessions.length > 0 && (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {sessions
            .slice(-5)
            .reverse()
            .map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="truncate">
                  {s.mode === "window" ? "🪟" : "🍅"} {s.task}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {s.actualMin} د{s.completed ? "" : " (وقفت بدري)"}
                </span>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
