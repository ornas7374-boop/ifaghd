"use client";

import Link from "next/link";
import { getDay, getHabits, getPlans, getReviews, getSessions, getSettings } from "@/lib/db";
import { dateOf } from "@/lib/stats";
import { toDateKey } from "@/lib/date";
import { useStored } from "@/lib/hooks/useStored";
import { FrogCard } from "./FrogCard";
import { HabitsToday } from "./HabitsToday";
import { PlansToday } from "./PlansToday";
import { ProgramCard } from "./ProgramCard";
import { QuoteCard } from "./QuoteCard";
import { TodayHeader } from "./TodayHeader";

async function loadToday() {
  const now = new Date();
  const date = toDateKey(now);
  const [settings, day, habits, plans, sessions] = await Promise.all([
    getSettings(),
    getDay(date),
    getHabits(),
    getPlans(),
    getSessions(),
  ]);
  // مساء الخميس: تذكير بالمحاسبة إذا ما انكتبت اليوم.
  const reviewDue = now.getDay() === 4 && now.getHours() >= 17 && !(await getReviews()).some((r) => r.date === date);
  const frogSessions = sessions.filter((s) => s.frog && dateOf(s.startedAt) === date).length;
  return { now, date, settings, day, habits, plans, frogSessions, reviewDue };
}

export function TodayView() {
  const data = useStored(loadToday);

  if (!data) return <TodaySkeleton />;

  const { now, date, settings, day, habits, plans, frogSessions, reviewDue } = data;
  return (
    <div className="space-y-4">
      <TodayHeader now={now} />
      {reviewDue && (
        <Link href="/review" className="flex min-h-16 items-center justify-between gap-3 rounded-3xl border border-calm/40 bg-calm/10 p-5 text-lg font-semibold">
          📝 الليلة محاسبة الأسبوع
          <span className="text-calm">ابدأ ‹</span>
        </Link>
      )}
      <FrogCard key={date} date={date} frog={day.frog} tracks={settings.tracks} sessions={frogSessions} />
      <ProgramCard startDate={settings.startDate} today={date} />
      <PlansToday plans={plans} tracks={settings.tracks} />
      <HabitsToday habits={habits} date={date} />
      <QuoteCard date={date} />
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-4 pt-2" aria-busy>
      <div className="h-24 animate-pulse rounded-3xl bg-surface" />
      <div className="h-48 animate-pulse rounded-3xl bg-surface" />
      <div className="h-40 animate-pulse rounded-3xl bg-surface" />
    </div>
  );
}
