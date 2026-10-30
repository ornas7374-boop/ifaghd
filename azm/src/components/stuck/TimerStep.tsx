"use client";

import { useEffect } from "react";
import { formatClock } from "@/lib/date";
import { chime, useCountdown, useSpeed, useWakeLock } from "@/lib/hooks/useCountdown";
import { Button } from "../ui/Button";
import { Ring } from "../ui/Ring";
import { StepFrame } from "./StepFrame";

const MINUTES = 10;

export function TimerStep({ tinyStep, onDone, onGiveUp }: { tinyStep: string; onDone: () => void; onGiveUp: () => void }) {
  const speed = useSpeed();
  const timer = useCountdown((MINUTES * 60_000) / speed, () => {
    chime();
    onDone();
  });
  const { start } = timer;
  useWakeLock(timer.running);

  // يبدأ تلقائيًا: لا قرار إضافي، ابدأ وبس.
  useEffect(() => {
    start();
  }, [start]);

  return (
    <StepFrame
      step={5}
      title="10 دقائق بس"
      subtitle="بعد 10 دقائق أنت حر. توقف أو كمّل، القرار لك."
      footer={
        <Button block variant="ghost" onClick={onGiveUp}>
          ما قدرت أبدأ
        </Button>
      }
    >
      <div className="rounded-2xl bg-surface-2 p-4 text-center">
        <div className="text-sm text-muted">خطوتك الحين</div>
        <div className="mt-1 text-xl font-semibold">{tinyStep}</div>
      </div>

      <div className="mt-8">
        <Ring progress={timer.progress}>
          <div className="text-6xl font-bold tabular-nums" dir="ltr" role="timer" aria-live="off">
            {formatClock(timer.remaining)}
          </div>
        </Ring>
      </div>
    </StepFrame>
  );
}
