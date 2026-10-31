"use client";

import { useState } from "react";
import { HABIT_TARGET_DAYS, PROGRAM_DAYS } from "@/lib/content/defaults";
import { AFTER_PROGRAM, PROGRAM, WEEK_NAMES, type ProgramDay } from "@/lib/content/program";
import { addDays, daysBetween, toDateKey } from "@/lib/date";
import { getProgramDone, getSettings, toggleProgramDay } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { IconCheck } from "../ui/icons";

async function load() {
  const today = toDateKey();
  const [settings, done] = await Promise.all([getSettings(), getProgramDone()]);
  return { today, start: settings.startDate, done };
}

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "short", day: "numeric", month: "short" });

export function ProgramView() {
  const data = useStored(load);
  if (!data) return null;
  const { today, start, done } = data;
  const current = Math.max(1, daysBetween(start, today) + 1);
  const weeks = [1, 2, 3, 4] as const;

  return (
    <div className="space-y-4">
      <PageHeader title="برنامج الـ30 يوم" subtitle="كل يوم ينفتح في تاريخه. اللي فات تقدر ترجع له بدون حساب." />

      <Card>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">أنت في</p>
            <p className="text-3xl font-bold tabular-nums">اليوم {Math.min(current, HABIT_TARGET_DAYS)}</p>
          </div>
          <p className="text-sm tabular-nums text-muted">
            خلصت {done.length} من {PROGRAM_DAYS}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(done.length / PROGRAM_DAYS) * 100}%` }} />
        </div>
      </Card>

      {current > PROGRAM_DAYS && (
        <Card title="بعد البرنامج" className="border-ok/40">
          <p className="text-xl font-bold">
            {current > HABIT_TARGET_DAYS ? "وصلت 66 يوم 🎉" : `اليوم ${current} من ${HABIT_TARGET_DAYS}`}
          </p>
          <p className="mt-2 text-lg leading-relaxed">{AFTER_PROGRAM.task}</p>
          <p className="mt-2 text-sm text-muted">{AFTER_PROGRAM.why}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-ok" style={{ width: `${Math.min(1, current / HABIT_TARGET_DAYS) * 100}%` }} />
          </div>
        </Card>
      )}

      {weeks.map((w) => (
        <Card key={w} title={`الأسبوع ${w} · ${WEEK_NAMES[w]}`}>
          <ul className="space-y-2">
            {PROGRAM.filter((d) => d.week === w).map((d) => (
              <DayRow key={d.day} day={d} date={addDays(start, d.day - 1)} today={today} isDone={done.includes(d.day)} />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function DayRow({ day, date, today, isDone }: { day: ProgramDay; date: string; today: string; isDone: boolean }) {
  const isToday = date === today;
  const locked = date > today;
  const [open, setOpen] = useState(isToday);
  const label = dateFmt.format(new Date(`${date}T12:00:00`));

  if (locked) {
    const wait = daysBetween(today, date);
    return (
      <li className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2/50 px-4 text-muted" aria-label={`اليوم ${day.day} مقفول`}>
        <span aria-hidden>🔒</span>
        <span className="flex-1">اليوم {day.day}</span>
        <span className="text-sm">{wait === 1 ? "ينفتح بكرة" : `ينفتح بعد ${wait} أيام`}</span>
      </li>
    );
  }

  return (
    <li className={`rounded-2xl ${isToday ? "border border-accent/50 bg-accent/10" : "bg-surface-2"}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => toggleProgramDay(day.day)}
          aria-pressed={isDone}
          aria-label={`سويت مهمة اليوم ${day.day}`}
          className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition ${isDone ? "border-ok bg-ok text-bg" : "border-line"}`}
        >
          {isDone && <IconCheck />}
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 flex-1 items-center justify-between gap-2 text-start">
          <span>
            <span className="block text-xs text-muted">
              اليوم {day.day} · {isToday ? "اليوم" : label}
            </span>
            <span className={`block text-lg font-semibold ${isDone ? "text-muted" : ""}`}>{day.title}</span>
          </span>
          <span className={`text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden>
            ▾
          </span>
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-lg leading-relaxed">{day.task}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">ليش؟ {day.why}</p>
        </div>
      )}
    </li>
  );
}
