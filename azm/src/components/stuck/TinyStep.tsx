"use client";

import { Button } from "../ui/Button";
import { Chip, TextInput } from "../ui/fields";
import { StepFrame } from "./StepFrame";

const EXAMPLES = ["أفتح الملف بس", "أكتب جملة وحدة", "أرسل رسالة وحدة", "أكتب عنوان المهمة"];

export function TinyStep({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: () => void }) {
  return (
    <StepFrame
      step={3}
      title="صغّر الخطوة"
      subtitle="وش أصغر خطوة سخيفة تقدر تسويها في دقيقتين؟"
      footer={
        <Button block onClick={onNext} disabled={!value.trim()}>
          التالي
        </Button>
      }
    >
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="كل ما صغرت، كان أحسن" />
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <Chip key={ex} active={value === ex} onClick={() => onChange(ex)}>
            {ex}
          </Chip>
        ))}
      </div>
      <p className="mt-6 text-base leading-relaxed text-muted">
        إذا حسّيت إنها سهلة لدرجة تضحّك، هذا بالضبط المطلوب. البداية هي أصعب جزء.
      </p>
    </StepFrame>
  );
}
