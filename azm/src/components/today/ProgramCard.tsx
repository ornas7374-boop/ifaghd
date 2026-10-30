import { AFTER_PROGRAM, PROGRAM, WEEK_NAMES } from "@/lib/content/program";
import { HABIT_TARGET_DAYS, PROGRAM_DAYS } from "@/lib/content/defaults";
import { daysBetween } from "@/lib/date";
import type { DateKey } from "@/lib/types";
import { Card } from "../ui/Card";

export function ProgramCard({ startDate, today }: { startDate: DateKey; today: DateKey }) {
  const dayNumber = Math.max(1, daysBetween(startDate, today) + 1);
  const programDay = dayNumber <= PROGRAM_DAYS ? PROGRAM[dayNumber - 1] : null;
  const content = programDay ?? AFTER_PROGRAM;
  const finished = dayNumber > HABIT_TARGET_DAYS;
  const progress = Math.min(1, dayNumber / HABIT_TARGET_DAYS);

  return (
    <Card
      title={programDay ? `الأسبوع ${programDay.week} · ${WEEK_NAMES[programDay.week]}` : "بعد البرنامج"}
      action={
        <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent tabular-nums">
          اليوم {Math.min(dayNumber, HABIT_TARGET_DAYS)} / {dayNumber <= PROGRAM_DAYS ? PROGRAM_DAYS : HABIT_TARGET_DAYS}
        </span>
      }
    >
      {finished ? (
        <p className="text-xl font-semibold">وصلت 66 يوم. العادة صارت جزء منك، كمّل بنفس الهدوء.</p>
      ) : (
        <>
          <h3 className="text-xl font-bold">{content.title}</h3>
          <p className="mt-2 text-lg leading-relaxed">{content.task}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">ليش؟ {content.why}</p>
        </>
      )}
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">التقدّم نحو 66 يوم (متوسط بناء العادة)</p>
      </div>
    </Card>
  );
}
