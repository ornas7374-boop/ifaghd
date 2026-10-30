"use client";

import { useEffect, useState } from "react";
import { useSpeed } from "@/lib/hooks/useCountdown";
import { Button } from "../ui/Button";
import { StepFrame } from "./StepFrame";

const PHASES = [
  { label: "شهيق", scale: 1 },
  { label: "احبس", scale: 1 },
  { label: "زفير", scale: 0.55 },
  { label: "احبس", scale: 0.55 },
];

// تنفس الصندوق 4-4-4-4: أربع دورات ≈ دقيقة.
export function BreathingStep({ onNext }: { onNext: () => void }) {
  const speed = useSpeed();
  const phaseMs = speed > 1 ? 1000 : 4000;
  const cycles = speed > 1 ? 1 : 4;
  const totalMs = phaseMs * 4 * cycles;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => setElapsed(Math.min(totalMs, Date.now() - startedAt)), 100);
    return () => window.clearInterval(id);
  }, [totalMs]);

  const done = elapsed >= totalMs;
  const phaseIndex = done ? 3 : Math.floor(elapsed / phaseMs) % 4;
  const phase = PHASES[phaseIndex];
  const secondsLeft = Math.ceil((phaseMs - (elapsed % phaseMs)) / (phaseMs / 4));
  // نبدأ صغير، وأول شهيق يكبّر الدائرة.
  const scale = elapsed === 0 ? 0.55 : phase.scale;

  return (
    <StepFrame
      step={2}
      title="تنفّس معي"
      subtitle="دقيقة وحدة. جسمك يهدى، وعقلك يرجع لك."
      footer={
        done ? (
          <Button block onClick={onNext}>
            التالي
          </Button>
        ) : (
          <Button block variant="ghost" onClick={onNext}>
            تخطّ
          </Button>
        )
      }
    >
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative grid size-72 place-items-center">
          <div className="absolute inset-0 rounded-full border border-line" />
          <div
            className="absolute inset-0 rounded-full bg-calm/25 ring-2 ring-calm/60"
            style={{
              transform: `scale(${scale})`,
              transition: `transform ${phaseMs}ms linear`,
            }}
          />
          <div className="relative text-center" aria-live="polite">
            <div className="text-4xl font-bold text-calm">{done ? "أحسنت" : phase.label}</div>
            {!done && <div className="mt-1 text-2xl tabular-nums text-muted">{secondsLeft}</div>}
          </div>
        </div>
        <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-calm" style={{ width: `${(elapsed / totalMs) * 100}%` }} />
        </div>
      </div>
    </StepFrame>
  );
}
