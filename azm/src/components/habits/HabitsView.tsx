"use client";

import { useState } from "react";
import { HABIT_TARGET_DAYS } from "@/lib/content/defaults";
import { addDays, toDateKey } from "@/lib/date";
import { addHabit, getHabits, toggleHabit, updateHabit } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { habitNudge, habitStats } from "@/lib/stats";
import type { DateKey, Habit } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmButton } from "../ui/ConfirmButton";
import { TextInput } from "../ui/fields";
import { IconCheck, IconPlus } from "../ui/icons";
import { PageHeader } from "../ui/PageHeader";

async function load() {
  return { today: toDateKey(), habits: await getHabits() };
}

export function HabitsView() {
  const data = useStored(load);
  const [name, setName] = useState("");
  if (!data) return null;
  const { today, habits } = data;
  const active = habits.filter((h) => !h.archived);

  return (
    <div className="space-y-4">
      <PageHeader title="العادات" subtitle="ما في سلسلة تنكسر. العادة تحتاج تقريبًا 66 يوم، ويوم فايت ما يهدمها." />

      {active.map((h) => (
        <HabitCard key={h.id} habit={h} today={today} />
      ))}

      <Card title="عادة جديدة">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addHabit(name.trim());
            setName("");
          }}
        >
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="صغيرة وواضحة: «أقرأ صفحتين»" aria-label="عادة جديدة" />
          <Button type="submit" disabled={!name.trim()} aria-label="أضف العادة">
            <IconPlus />
          </Button>
        </form>
      </Card>
    </div>
  );
}

function HabitCard({ habit, today }: { habit: Habit; today: DateKey }) {
  const s = habitStats(habit, today);
  const nudge = habitNudge(s);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  return (
    <Card>
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => toggleHabit(habit.id, today)}
          aria-pressed={s.doneToday}
          aria-label={`سويت «${habit.name}» اليوم`}
          className={`grid size-12 shrink-0 place-items-center rounded-full border-2 transition active:scale-95 ${s.doneToday ? "border-ok bg-ok text-bg" : "border-line"}`}
        >
          {s.doneToday && <IconCheck className="size-6" />}
        </button>
        <div className="min-w-0 flex-1">
          <TextInput
            defaultValue={habit.name}
            aria-label={`اسم العادة ${habit.name}`}
            className="min-h-11 border-transparent bg-transparent px-0 text-lg font-semibold focus:border-line focus:px-3"
            onBlur={(e) => e.target.value.trim() && e.target.value !== habit.name && updateHabit(habit.id, { name: e.target.value.trim() })}
          />
          <p className="text-sm tabular-nums text-muted">
            التزام {Math.round(s.rate * 100)}% · {s.doneCount} من {s.trackedDays} يوم
          </p>
        </div>
        <ConfirmButton label={`أرشف ${habit.name}`} onConfirm={() => updateHabit(habit.id, { archived: true })}>
          <span className="text-sm">أرشفة</span>
        </ConfirmButton>
      </div>

      {nudge && <p className="mt-3 rounded-2xl bg-calm/10 p-3 text-base text-calm">{nudge}</p>}

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted">نحو {HABIT_TARGET_DAYS} يوم</span>
          <span className="tabular-nums">
            {s.toTarget} / {HABIT_TARGET_DAYS}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ok" style={{ width: `${(s.toTarget / HABIT_TARGET_DAYS) * 100}%` }} />
        </div>
      </div>

      <div className="mt-4 flex justify-between gap-1" aria-label="آخر 14 يوم">
        {days.map((d) => {
          const before = d < habit.createdAt;
          const done = habit.doneDates.includes(d);
          return (
            <span
              key={d}
              title={d}
              className={`h-6 flex-1 rounded-md ${before ? "bg-transparent" : done ? "bg-ok" : "bg-line/60"} ${d === today ? "ring-2 ring-accent/60" : ""}`}
            />
          );
        })}
      </div>
    </Card>
  );
}
