"use client";

import { addDays } from "@/lib/date";
import { updateSettings } from "@/lib/db";
import { WINDOW_STEP_MIN, WINDOW_STREAK_FOR_SUGGESTION } from "@/lib/stats";
import type { DateKey } from "@/lib/types";
import { Button } from "../ui/Button";

export function WindowSuggestion({ current, today }: { current: number; today: DateKey }) {
  const tomorrow = addDays(today, 1);
  return (
    <div className="rounded-3xl border border-ok/40 bg-ok/10 p-5">
      <p className="text-lg font-bold">التزمت بالنافذة {WINDOW_STREAK_FOR_SUGGESTION} أيام متتالية 👏</p>
      <p className="mt-1 text-base text-muted">
        تبي تزيدها {WINDOW_STEP_MIN} دقيقة؟ ({current} ← {current + WINDOW_STEP_MIN})
      </p>
      <div className="mt-4 flex gap-3">
        <Button block onClick={() => updateSettings({ windowMinutes: current + WINDOW_STEP_MIN, windowChangedAt: tomorrow })}>
          زدها
        </Button>
        <Button block variant="secondary" onClick={() => updateSettings({ windowChangedAt: tomorrow })}>
          مو الحين
        </Button>
      </div>
    </div>
  );
}
