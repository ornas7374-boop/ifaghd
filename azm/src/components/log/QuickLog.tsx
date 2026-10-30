"use client";

import { useState } from "react";
import { INSTEAD_OPTIONS } from "@/lib/content/advice";
import { FEELINGS } from "@/lib/content/feelings";
import { addProcrastination } from "@/lib/db";
import type { FeelingId, Track } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip, TextInput } from "../ui/fields";

// إدخال سريع (أقل من 15 ثانية): مهمة + شعور، والباقي اختياري.
export function QuickLog({ tracks, recentTasks }: { tracks: Track[]; recentTasks: string[] }) {
  const [task, setTask] = useState("");
  const [feeling, setFeeling] = useState<FeelingId | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [instead, setInstead] = useState("");
  const [saved, setSaved] = useState(false);

  const ready = task.trim() && feeling;

  const save = async () => {
    if (!ready) return;
    await addProcrastination({ task: task.trim(), feeling, trackId, instead: instead.trim() });
    setTask("");
    setFeeling(null);
    setTrackId(null);
    setInstead("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card title="سجّل تأجيل" className="border-accent/30">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <TextInput value={task} onChange={(e) => setTask(e.target.value)} placeholder="وش المهمة اللي أجلتها؟" aria-label="المهمة" />
          {recentTasks.length > 0 && !task && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recentTasks.map((t) => (
                <Chip key={t} onClick={() => setTask(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">الشعور</p>
          <div className="flex flex-wrap gap-2">
            {FEELINGS.map((f) => (
              <Chip key={f.id} active={feeling === f.id} onClick={() => setFeeling(f.id)}>
                {f.emoji} {f.label}
              </Chip>
            ))}
          </div>
        </div>

        {tracks.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-muted">المسار</p>
            <div className="flex flex-wrap gap-2">
              {tracks.map((t) => (
                <Chip key={t.id} active={trackId === t.id} onClick={() => setTrackId(trackId === t.id ? null : t.id)}>
                  {t.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm text-muted">وش سويت بدالها؟</p>
          <div className="flex flex-wrap gap-2">
            {INSTEAD_OPTIONS.map((o) => (
              <Chip key={o} active={instead === o} onClick={() => setInstead(instead === o ? "" : o)}>
                {o}
              </Chip>
            ))}
          </div>
        </div>

        <Button type="submit" block disabled={!ready}>
          سجّل
        </Button>
        <p role="status" className={`text-center text-base text-ok transition ${saved ? "opacity-100" : "opacity-0"}`}>
          سجّلناه. إنك تلاحظ، هذا نص العلاج.
        </p>
      </form>
    </Card>
  );
}
