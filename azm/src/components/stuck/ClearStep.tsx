"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { IconCheck } from "../ui/icons";
import { StepFrame } from "./StepFrame";

const ITEMS = [
  "الجوال في غرفة ثانية، أو على وضع التركيز",
  "سكّرت كل التبويبات إلا تبويب المهمة",
  "الإشعارات على الجهاز مطفية",
];

export function ClearStep({ onNext }: { onNext: () => void }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <StepFrame
      step={4}
      title="أزل المشتت"
      subtitle="لا تقاوم الإغراء، أبعده عن طريقك."
      footer={
        <Button block onClick={onNext}>
          {checked.size === ITEMS.length ? "جاهز، شغّل المؤقت" : "التالي"}
        </Button>
      }
    >
      <ul className="space-y-3">
        {ITEMS.map((item, i) => {
          const on = checked.has(i);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={on}
                className={`flex min-h-16 w-full items-center gap-4 rounded-2xl border p-4 text-start text-lg transition ${
                  on ? "border-ok/60 bg-ok/10" : "border-line bg-surface"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg border-2 ${
                    on ? "border-ok bg-ok text-bg" : "border-line"
                  }`}
                >
                  {on && <IconCheck />}
                </span>
                {item}
              </button>
            </li>
          );
        })}
      </ul>
    </StepFrame>
  );
}
