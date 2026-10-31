"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toDateKey } from "@/lib/date";
import { addTasks, deleteTask, getSettings, getTasks, setFrog, updateTask } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import type { Task, Track } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmButton } from "../ui/ConfirmButton";
import { TextInput } from "../ui/fields";
import { IconCheck, IconPlus, IconTrash } from "../ui/icons";
import { PageHeader } from "../ui/PageHeader";

async function load() {
  const [settings, tasks] = await Promise.all([getSettings(), getTasks()]);
  return { tracks: settings.tracks, tasks };
}

const SOURCE = { control: "من «في يدي»", review: "من المحاسبة", manual: "" };

export function TasksView() {
  const data = useStored(load);
  const [text, setText] = useState("");
  if (!data) return null;
  const { tracks, tasks } = data;
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const groups = [
    ...tracks.map((t) => ({ id: t.id, name: t.name, items: open.filter((x) => x.trackId === t.id) })),
    { id: "none", name: "عامة", items: open.filter((x) => !tracks.some((t) => t.id === x.trackId)) },
  ].filter((g) => g.items.length);

  return (
    <div className="space-y-4">
      <PageHeader title="المهام" subtitle="اختر وحدة وخلّها مهمة اليوم. الباقي ينتظر." />

      <Card>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            addTasks([{ text: text.trim(), trackId: null, source: "manual" }]);
            setText("");
          }}
        >
          <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder="مهمة جديدة" aria-label="مهمة جديدة" />
          <Button type="submit" disabled={!text.trim()} aria-label="أضف المهمة">
            <IconPlus />
          </Button>
        </form>
      </Card>

      {open.length === 0 && <p className="px-2 text-center text-muted">ما عندك مهام مفتوحة. المحاسبة وتمرين «في يدي» يضيفون هنا.</p>}

      {groups.map((g) => (
        <Card key={g.id} title={g.name}>
          <ul className="space-y-2">
            {g.items.map((t) => (
              <TaskRow key={t.id} task={t} tracks={tracks} />
            ))}
          </ul>
        </Card>
      ))}

      {done.length > 0 && (
        <details className="rounded-3xl border border-line bg-surface p-5">
          <summary className="cursor-pointer text-sm font-semibold text-muted">خلصت ({done.length})</summary>
          <ul className="mt-3 space-y-2">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} tracks={tracks} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TaskRow({ task, tracks }: { task: Task; tracks: Track[] }) {
  const router = useRouter();
  const makeFrog = async () => {
    await setFrog(toDateKey(), { text: task.text, trackId: task.trackId, done: false });
    router.push("/");
  };

  return (
    <li className="rounded-2xl bg-surface-2 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => updateTask(task.id, { done: !task.done })}
          aria-pressed={task.done}
          aria-label={`خلصت ${task.text}`}
          className={`grid size-9 shrink-0 place-items-center rounded-full border-2 ${task.done ? "border-ok bg-ok text-bg" : "border-line"}`}
        >
          {task.done && <IconCheck />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-lg ${task.done ? "text-muted line-through" : ""}`}>{task.text}</p>
          {SOURCE[task.source] && <p className="text-xs text-muted">{SOURCE[task.source]}</p>}
        </div>
        <ConfirmButton label={`احذف ${task.text}`} onConfirm={() => deleteTask(task.id)}>
          <IconTrash />
        </ConfirmButton>
      </div>
      {!task.done && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={makeFrog} className="min-h-10 rounded-full bg-accent/15 px-3 text-sm font-semibold text-accent">
            🐸 خلّها مهمة اليوم
          </button>
          <select
            value={task.trackId ?? ""}
            onChange={(e) => updateTask(task.id, { trackId: e.target.value || null })}
            aria-label="مسار المهمة"
            className="min-h-10 rounded-full border border-line bg-bg px-3 text-sm text-muted"
          >
            <option value="">بدون مسار</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
}
