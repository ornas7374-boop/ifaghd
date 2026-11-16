"use client";

import { POMODORO, startTimer } from "@/lib/timer";
import { useSpeed } from "@/lib/hooks/useCountdown";
import type { ActiveTimer, Track } from "@/lib/types";
import { Button } from "../ui/Button";

export function TimerFinished({ timer, tracks, onClose }: { timer: ActiveTimer; tracks: Track[]; onClose: () => void }) {
  const speed = useSpeed();
  const next = (phase: ActiveTimer["phase"]) => {
    onClose();
    startTimer(
      { mode: "pomodoro", phase, task: timer.task, trackId: timer.trackId, frog: timer.frog, minutes: phase === "work" ? POMODORO.work : POMODORO.break },
      speed,
    );
  };

  if (timer.mode === "window") {
    const track = tracks.find((t) => t.id === timer.trackId);
    return (
      <Screen emoji="🔒" title="انتهت النافذة، ممنوع تشتغل على هذا المشروع اليوم">
        <p>{track ? `«${track.name}» مقفول لين بكرة.` : ""} تبي تكمل؟ ممتاز. خلّ هالحماس لنافذة بكرة.</p>
        <Button block onClick={onClose}>
          تمام
        </Button>
      </Screen>
    );
  }

  if (timer.phase === "work") {
    return (
      <Screen emoji="🔥" title={`خلصت ${timer.plannedMin} دقيقة تركيز`}>
        <p>محسوبة لك. خذ استراحة قصيرة بعيد عن الجوال.</p>
        <Button block variant="calm" onClick={() => next("break")}>
          ابدأ استراحة {POMODORO.break} دقائق
        </Button>
        <Button block variant="ghost" onClick={onClose}>
          خلاص، يكفي
        </Button>
      </Screen>
    );
  }

  return (
    <Screen emoji="☕" title="خلصت الاستراحة">
      <p>جلسة ثانية على نفس المهمة؟</p>
      <Button block onClick={() => next("work")}>
        ابدأ {POMODORO.work} دقيقة
      </Button>
      <Button block variant="ghost" onClick={onClose}>
        لا، خلاص
      </Button>
    </Screen>
  );
}

function Screen({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 pt-10 text-center">
      <div className="text-7xl" aria-hidden>
        {emoji}
      </div>
      <h1 className="text-2xl font-bold leading-snug">{title}</h1>
      <div className="space-y-3 text-lg leading-relaxed text-muted">{children}</div>
    </div>
  );
}
