"use client";

import Link from "next/link";
import { useState } from "react";
import { setFrog, updateFrog } from "@/lib/db";
import type { DateKey, Frog, Track } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip, TextInput } from "../ui/fields";
import { IconCheck, IconPencil, IconPlay } from "../ui/icons";

export function FrogCard({
  date,
  frog,
  tracks,
  sessions,
}: {
  date: DateKey;
  frog?: Frog;
  tracks: Track[];
  sessions: number; // جلسات اليوم على هالمهمة
}) {
  const [editing, setEditing] = useState(false);

  if (!frog || editing) {
    return <FrogEditor date={date} frog={frog} tracks={tracks} onDone={() => setEditing(false)} />;
  }

  const track = tracks.find((t) => t.id === frog.trackId);

  return (
    <Card
      className="border-accent/40 bg-gradient-to-b from-accent/10 to-surface"
      title="🐸 المهمة الوحدة لليوم"
      action={
        !frog.done && (
          <button type="button" onClick={() => setEditing(true)} className="grid size-10 place-items-center rounded-full text-muted hover:text-fg" aria-label="عدّل المهمة">
            <IconPencil />
          </button>
        )
      }
    >
      <p className={`text-2xl font-bold leading-snug ${frog.done ? "text-muted line-through decoration-ok decoration-2" : ""}`}>{frog.text}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
        {track && <span className="rounded-full bg-surface-2 px-3 py-1">{track.name}</span>}
        {sessions > 0 && <span className="rounded-full bg-surface-2 px-3 py-1 tabular-nums">جلسات: {sessions}</span>}
      </div>

      {frog.done ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-ok/10 p-4">
          <p className="text-lg font-semibold text-ok">خلصت الضفدع. باقي اليوم مكافأة.</p>
          <button type="button" className="shrink-0 text-sm text-muted underline" onClick={() => updateFrog(date, { done: false, doneAt: undefined })}>
            تراجع
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
          <Link
            href="/timer?frog=1"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-lg font-semibold text-accent-fg transition active:scale-[0.98]"
          >
            <IconPlay /> ابدأ جلسة
          </Link>
          <Button variant="secondary" onClick={() => updateFrog(date, { done: true, doneAt: new Date().toISOString() })} aria-label="خلصتها">
            <IconCheck /> خلصتها
          </Button>
        </div>
      )}
    </Card>
  );
}

function FrogEditor({ date, frog, tracks, onDone }: { date: DateKey; frog?: Frog; tracks: Track[]; onDone: () => void }) {
  const [text, setText] = useState(frog?.text ?? "");
  const [trackId, setTrackId] = useState<string | null>(frog?.trackId ?? null);

  const save = async () => {
    if (!text.trim()) return;
    await setFrog(date, { text: text.trim(), trackId, done: false });
    onDone();
  };

  return (
    <Card className="border-accent/40" title="🐸 المهمة الوحدة لليوم">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <p className="mb-3 text-lg leading-relaxed">وش المهمة الوحدة اللي لو خلصتها اليوم، يكفيك؟</p>
        <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder="الأصعب أولًا — ساعة الضفدع" aria-label="المهمة الوحدة" />
        <div className="mt-3 flex flex-wrap gap-2">
          {tracks.map((t) => (
            <Chip key={t.id} active={trackId === t.id} onClick={() => setTrackId(trackId === t.id ? null : t.id)}>
              {t.name}
            </Chip>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Button type="submit" block disabled={!text.trim()}>
            ثبّتها
          </Button>
          {frog && (
            <Button variant="ghost" onClick={onDone}>
              إلغاء
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
