"use client";

import { useState } from "react";
import { getActiveTimer, getDay, getSessions, getSettings } from "@/lib/db";
import { toDateKey } from "@/lib/date";
import { useQueryFlag } from "@/lib/hooks/useCountdown";
import { useStored } from "@/lib/hooks/useStored";
import { WINDOW_STREAK_FOR_SUGGESTION, lockedTracksToday, windowStreak } from "@/lib/stats";
import type { ActiveTimer } from "@/lib/types";
import { PageHeader } from "../ui/PageHeader";
import { RunningTimer } from "./RunningTimer";
import { SessionStats } from "./SessionStats";
import { TimerFinished } from "./TimerFinished";
import { TimerSetup } from "./TimerSetup";
import { WindowSuggestion } from "./WindowSuggestion";

async function load() {
  const today = toDateKey();
  const [settings, sessions, active, day] = await Promise.all([getSettings(), getSessions(), getActiveTimer(), getDay(today)]);
  return { today, settings, sessions, active, frog: day.frog };
}

export function TimerView() {
  const data = useStored(load);
  const preferFrog = useQueryFlag("frog");
  const [finished, setFinished] = useState<ActiveTimer | null>(null);
  const [stoppedMin, setStoppedMin] = useState<number | null>(null);

  if (!data) return null;
  const { today, settings, sessions, active, frog } = data;

  if (finished) return <TimerFinished timer={finished} tracks={settings.tracks} onClose={() => setFinished(null)} />;

  if (active) {
    return (
      <RunningTimer
        key={active.startedAt}
        timer={active}
        tracks={settings.tracks}
        onFinished={setFinished}
        onStopped={(m) => setStoppedMin(m)}
      />
    );
  }

  const streak = windowStreak(sessions, today, settings.windowChangedAt);

  return (
    <div className="space-y-4">
      <PageHeader title="المؤقت" subtitle="وقت محدد لمهمة وحدة. البداية أهم من المدة." />

      {stoppedMin !== null && stoppedMin > 0 && (
        <p className="rounded-2xl bg-surface-2 p-4 text-base">وقفت بعد {stoppedMin} دقيقة. محسوبة لك، وكل دقيقة تفرق.</p>
      )}

      {streak >= WINDOW_STREAK_FOR_SUGGESTION && <WindowSuggestion current={settings.windowMinutes} today={today} />}

      <TimerSetup
        key={settings.windowMinutes}
        tracks={settings.tracks}
        locked={lockedTracksToday(sessions, today)}
        frog={frog}
        preferFrog={preferFrog}
        windowMinutes={settings.windowMinutes}
      />

      <SessionStats sessions={sessions} tracks={settings.tracks} today={today} />
    </div>
  );
}
