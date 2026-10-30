"use client";

import { toggleHabit } from "@/lib/db";
import type { DateKey, Habit } from "@/lib/types";
import { Card } from "../ui/Card";
import { IconCheck } from "../ui/icons";

export function HabitsToday({ habits, date }: { habits: Habit[]; date: DateKey }) {
  const list = habits.filter((h) => !h.archived);
  const doneCount = list.filter((h) => h.doneDates.includes(date)).length;

  return (
    <Card
      title="عادات اليوم"
      action={
        <span className="text-sm tabular-nums text-muted">
          {doneCount} / {list.length}
        </span>
      }
    >
      <ul className="space-y-2">
        {list.map((h) => {
          const done = h.doneDates.includes(date);
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => toggleHabit(h.id, date)}
                aria-pressed={done}
                className="flex min-h-14 w-full items-center gap-4 rounded-2xl px-2 text-start text-lg transition hover:bg-surface-2"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full border-2 transition ${
                    done ? "border-ok bg-ok text-bg" : "border-line"
                  }`}
                >
                  {done && <IconCheck />}
                </span>
                <span className={done ? "text-muted" : ""}>{h.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
