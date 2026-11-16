"use client";

import Link from "next/link";
import { useState } from "react";
import { addTasks, getControlItems, saveControlItems } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { newId } from "@/lib/id";
import type { ControlItem } from "@/lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { TextInput } from "../ui/fields";
import { IconX } from "../ui/icons";
import { PageHeader } from "../ui/PageHeader";

export function ControlView() {
  const items = useStored(getControlItems);
  const [text, setText] = useState("");
  if (!items) return null;

  const add = (side: ControlItem["side"]) => {
    if (!text.trim()) return;
    saveControlItems([...items, { id: newId(), text: text.trim(), side, createdAt: new Date().toISOString() }]);
    setText("");
  };
  const update = (id: string, patch: Partial<ControlItem>) => saveControlItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = (id: string) => saveControlItems(items.filter((i) => i.id !== id));
  const toTask = async (item: ControlItem) => {
    const [task] = await addTasks([{ text: item.text, trackId: null, source: "control" }]);
    await update(item.id, { taskId: task.id });
  };

  const mine = items.filter((i) => i.side === "mine");
  const notMine = items.filter((i) => i.side === "not");

  return (
    <div className="space-y-4">
      <PageHeader title="في يدي / ليس في يدي" subtitle="«من الأشياء ما هو في قدرتنا ومنها ما ليس في قدرتنا» — إبكتيتوس" />

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add("mine");
          }}
        >
          <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder="وش اللي يقلقك؟" aria-label="اللي يقلقني" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button type="submit" disabled={!text.trim()}>
              في يدي
            </Button>
            <Button variant="secondary" disabled={!text.trim()} onClick={() => add("not")}>
              ليس في يدي
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Column title="في يدي" tone="accent" hint="حوّله لمهمة وتحرّك.">
          {mine.map((i) => (
            <Item key={i.id} item={i} onMove={() => update(i.id, { side: "not" })} onRemove={() => remove(i.id)}>
              {i.taskId ? (
                <Link href="/tasks" className="text-sm font-semibold text-ok">
                  ✓ صارت مهمة
                </Link>
              ) : (
                <button type="button" onClick={() => toTask(i)} className="min-h-10 text-sm font-semibold text-accent underline underline-offset-4">
                  حوّلها لمهمة
                </button>
              )}
            </Item>
          ))}
        </Column>
        <Column title="ليس في يدي" tone="muted" hint="اتركه. طاقتك أثمن من إنها تروح هنا.">
          {notMine.map((i) => (
            <Item key={i.id} item={i} onMove={() => update(i.id, { side: "mine" })} onRemove={() => remove(i.id)} />
          ))}
        </Column>
      </div>
    </div>
  );
}

function Column({ title, tone, hint, children }: { title: string; tone: "accent" | "muted"; hint: string; children: React.ReactNode }) {
  return (
    <section className={`min-h-48 rounded-3xl border p-3 ${tone === "accent" ? "border-accent/40 bg-accent/5" : "border-line bg-surface"}`}>
      <h2 className={`text-lg font-bold ${tone === "accent" ? "text-accent" : "text-muted"}`}>{title}</h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Item({ item, onMove, onRemove, children }: { item: ControlItem; onMove: () => void; onRemove: () => void; children?: React.ReactNode }) {
  return (
    <li className="rounded-2xl bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-1">
        <p className="text-base leading-relaxed">{item.text}</p>
        <button type="button" onClick={onRemove} aria-label={`احذف ${item.text}`} className="grid size-8 shrink-0 place-items-center text-muted">
          <IconX className="size-4" />
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        {children}
        <button type="button" onClick={onMove} className="min-h-10 text-xs text-muted">
          انقله ⇄
        </button>
      </div>
    </li>
  );
}
