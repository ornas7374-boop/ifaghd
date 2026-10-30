"use client";

import { formatClock } from "@/lib/date";
import { chime, useRemaining, useWakeLock } from "@/lib/hooks/useCountdown";
import { finishTimer, stopTimer } from "@/lib/timer";
import type { ActiveTimer, Track } from "@/lib/types";
import { Button } from "../ui/Button";
import { Ring } from "../ui/Ring";

const LABELS = {
  pomodoro: { work: "جلسة تركيز", break: "استراحة" },
  window: { work: "نافذة العمل", break: "" },
};

export function RunningTimer({
  timer,
  tracks,
  onFinished,
  onStopped,
}: {
  timer: ActiveTimer;
  tracks: Track[];
  onFinished: (t: ActiveTimer) => void;
  onStopped: (minutes: number) => void;
}) {
  const total = timer.endAt - timer.startedAt;
  const remaining = useRemaining(timer.endAt, total, async () => {
    if (await finishTimer(timer)) {
      chime();
      onFinished(timer);
    }
  });
  useWakeLock(true);

  const isBreak = timer.phase === "break";
  const track = tracks.find((t) => t.id === timer.trackId);

  return (
    <div className="space-y-6 pt-4">
      <div className="text-center">
        <p className={`text-sm font-semibold ${isBreak ? "text-calm" : "text-accent"}`}>{LABELS[timer.mode][timer.phase]}</p>
        <h1 className="mt-1 text-2xl font-bold leading-snug">{isBreak ? "ابعد عن الشاشة شوي" : timer.task}</h1>
        {track && !isBreak && <p className="mt-1 text-muted">{track.name}</p>}
      </div>

      <Ring progress={1 - remaining / total} color={isBreak ? "var(--calm)" : "var(--accent)"}>
        <div className="text-6xl font-bold tabular-nums" dir="ltr" role="timer">
          {formatClock(remaining)}
        </div>
        <div className="mt-1 text-sm text-muted">من {timer.plannedMin} دقيقة</div>
      </Ring>

      {timer.mode === "window" && (
        <p className="text-center text-base leading-relaxed text-muted">لما تخلص النافذة توقف، حتى لو متحمس. الحماس هذا وقود بكرة.</p>
      )}

      <Button block variant="secondary" onClick={async () => onStopped(await stopTimer(timer))}>
        {isBreak ? "إنهاء الاستراحة" : "إيقاف"}
      </Button>
    </div>
  );
}
