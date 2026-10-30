"use client";

import { useState } from "react";
import { formatClock } from "@/lib/date";
import { chime, useCountdown, useSpeed, useWakeLock } from "@/lib/hooks/useCountdown";
import { Button } from "../ui/Button";

// جلسة تركيز بسيطة 25 دقيقة للمهمة الوحدة. (المؤقت الكامل يجي مع صفحة الجلسات.)
export function FocusTimer({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const speed = useSpeed();
  const [finished, setFinished] = useState(false);
  const timer = useCountdown((25 * 60_000) / speed, () => {
    chime();
    setFinished(true);
    onComplete();
  });
  useWakeLock(timer.running);

  if (finished) {
    return (
      <div className="rounded-2xl bg-ok/10 p-4 text-center">
        <p className="text-lg font-semibold">جلسة كاملة. خذ 5 دقائق راحة بعيد عن الجوال.</p>
        <Button variant="secondary" className="mt-3" onClick={onClose}>
          تمام
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-2 p-4 text-center">
      <div className="text-5xl font-bold tabular-nums" dir="ltr" role="timer">
        {formatClock(timer.remaining)}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${timer.progress * 100}%` }} />
      </div>
      <div className="mt-4 flex gap-3">
        {timer.running ? (
          <Button
            block
            variant="secondary"
            onClick={() => {
              timer.reset();
              onClose();
            }}
          >
            إيقاف
          </Button>
        ) : (
          <>
            <Button block onClick={timer.start}>
              ابدأ 25 دقيقة
            </Button>
            <Button variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
