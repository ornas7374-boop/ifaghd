"use client";

import { getDay, getHabits, getPlans, getSessions, getSettings } from "@/lib/db";
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
  const frogSessions = sessions.filter((s) => s.frog && dateOf(s.startedAt) === date).length;
  return { now, date, settings, day, habits, plans, frogSessions };
}

export function TodayView() {
  const data = useStored(loadToday);

  if (!data) return <TodaySkeleton />;

  const { now, date, settings, day, habits, plans, frogSessions } = data;
  return (
    <div className="space-y-4">
      <TodayHeader now={now} />
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
