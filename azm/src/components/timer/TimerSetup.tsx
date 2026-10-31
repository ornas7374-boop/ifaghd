"use client";

import { useState } from "react";
import { useSpeed } from "@/lib/hooks/useCountdown";
import { POMODORO, WINDOW_CHOICES, startTimer } from "@/lib/timer";
import type { Frog, TimerMode, Track } from "@/lib/types";
import { Button } from "../ui/Button";
import { Chip, TextInput } from "../ui/fields";
import { IconPlay } from "../ui/icons";

interface Props {
  tracks: Track[];
  locked: Set<string>;
  frog?: Frog;
  preferFrog: boolean;
  windowMinutes: number;
}

const MODES: { id: TimerMode; label: string; hint: string }[] = [
  { id: "pomodoro", label: "بومودورو", hint: `${POMODORO.work} دقيقة شغل، ثم ${POMODORO.break} راحة.` },
  { id: "window", label: "نافذة مونستر", hint: "وقت محدود لمشروع واحد. لما يخلص، ممنوع ترجع له اليوم." },
];

export function TimerSetup({ tracks, locked, frog, preferFrog, windowMinutes }: Props) {
  const speed = useSpeed();
  const useFrog = preferFrog && frog && !frog.done;
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [task, setTask] = useState(useFrog ? frog.text : "");
  const [trackId, setTrackId] = useState<string | null>(useFrog ? frog.trackId : null);
  const [minutes, setMinutes] = useState(windowMinutes);

  const choices = [...new Set([...WINDOW_CHOICES, windowMinutes])].sort((a, b) => a - b);
  const trackLocked = trackId !== null && locked.has(trackId);
  const ready = task.trim() && !trackLocked && (mode === "pomodoro" || trackId);

  const start = () =>
    startTimer(
      {
        mode,
        phase: "work",
        task: task.trim(),
        trackId,
        frog: !!frog && task.trim() === frog.text,
        minutes: mode === "pomodoro" ? POMODORO.work : minutes,
      },
      speed,
    );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1.5" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`min-h-12 rounded-xl text-base font-semibold transition ${mode === m.id ? "bg-accent text-accent-fg" : "text-muted"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-base leading-relaxed text-muted">{MODES.find((m) => m.id === mode)!.hint}</p>

      <div>
        <label htmlFor="timer-task" className="mb-2 block text-sm text-muted">
          على وش بتشتغل؟
        </label>
        <TextInput id="timer-task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="مهمة وحدة محددة" />
        {frog && !frog.done && task !== frog.text && (
          <Chip
            className="mt-2"
            onClick={() => {
              setTask(frog.text);
              setTrackId(frog.trackId);
            }}
          >
            🐸 {frog.text}
          </Chip>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm text-muted">المسار {mode === "window" && "(لازم للنافذة)"}</p>
        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => {
            const isLocked = locked.has(t.id);
            return (
              <Chip
                key={t.id}
                active={trackId === t.id}
                disabled={isLocked}
                className={isLocked ? "opacity-50" : ""}
                onClick={() => setTrackId(trackId === t.id ? null : t.id)}
              >
                {isLocked && "🔒 "}
                {t.name}
              </Chip>
            );
          })}
        </div>
        {locked.size > 0 && <p className="mt-2 text-sm text-muted">🔒 = خلصت نافذته اليوم. يرجع لك بكرة.</p>}
      </div>

      {mode === "window" && (
        <div>
          <p className="mb-2 text-sm text-muted">طول النافذة (دقيقة)</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((m) => (
              <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                {m}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <Button block onClick={start} disabled={!ready}>
        <IconPlay />
        {mode === "pomodoro" ? `ابدأ ${POMODORO.work} دقيقة` : `افتح النافذة (${minutes} د)`}
      </Button>
    </div>
  );
}
