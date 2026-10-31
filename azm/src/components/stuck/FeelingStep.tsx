"use client";

import { useEffect, useState } from "react";
import { FEELINGS, feelingById } from "@/lib/content/feelings";
import type { FeelingId } from "@/lib/types";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/fields";
import { StepFrame } from "./StepFrame";

interface Props {
  task: string;
  onTask: (v: string) => void;
  feeling: FeelingId | null;
  onFeeling: (f: FeelingId) => void;
  note: string;
  onNote: (v: string) => void;
  onNext: () => void;
}

export function FeelingStep({ task, onTask, feeling, onFeeling, note, onNote, onNext }: Props) {
  // 30 ثانية تقريبية — مؤشر هادي، مو ضغط.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((e) => Math.min(30, e + 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ready = feeling !== null && (feeling !== "other" || note.trim().length > 0);

  return (
    <StepFrame
      step={1}
      title="وش الشعور اللي تهرب منه؟"
      subtitle="خذ نفس، وسمّه بصدق. تسمية الشعور تخفّف حدّته."
      footer={
        <Button block onClick={onNext} disabled={!ready}>
          التالي
        </Button>
      }
    >
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full bg-calm transition-[width] duration-1000 ease-linear" style={{ width: `${(elapsed / 30) * 100}%` }} />
      </div>

      <label className="mb-2 block text-sm text-muted" htmlFor="stuck-task">
        المهمة اللي واقف عندها
      </label>
      <TextInput id="stuck-task" value={task} onChange={(e) => onTask(e.target.value)} placeholder="مثال: وصف منتج للمتجر" />

      <div className="mt-6 grid grid-cols-2 gap-3">
        {FEELINGS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFeeling(f.id)}
            aria-pressed={feeling === f.id}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center text-base font-medium transition active:scale-[0.97] ${
              feeling === f.id ? "border-accent bg-accent/15 text-accent" : "border-line bg-surface hover:border-muted"
            } ${f.id === "lost" ? "col-span-2" : ""}`}
          >
            <span className="text-2xl" aria-hidden>
              {f.emoji}
            </span>
            {f.label}
          </button>
        ))}
      </div>

      {feeling === "other" && (
        <TextInput className="mt-4" autoFocus value={note} onChange={(e) => onNote(e.target.value)} placeholder="اكتبه بكلمة أو كلمتين" />
      )}

      {feeling && <p className="mt-5 rounded-2xl bg-surface-2 p-4 text-lg leading-relaxed">{feelingById(feeling).hint}</p>}
    </StepFrame>
  );
}
