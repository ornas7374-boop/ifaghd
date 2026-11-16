"use client";

import { useState } from "react";
import { addPlan, getPlans, getSettings } from "@/lib/db";
import { useStored } from "@/lib/hooks/useStored";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { IconPlus } from "../ui/icons";
import { IfThenForm } from "./IfThenForm";
import { PlanItem } from "./PlanItem";
import { TracksEditor } from "./TracksEditor";

async function load() {
  const [settings, plans] = await Promise.all([getSettings(), getPlans()]);
  return { tracks: settings.tracks, plans };
}

export function PlansView() {
  const data = useStored(load);
  const [adding, setAdding] = useState(false);
  if (!data) return null;
  const { tracks, plans } = data;

  // نجمع حسب المسار، والخطط بدون مسار (أو مسار محذوف) في الأخير.
  const groups = [
    ...tracks.map((t) => ({ id: t.id, name: t.name, items: plans.filter((p) => p.trackId === t.id) })),
    { id: "none", name: "بدون مسار", items: plans.filter((p) => !tracks.some((t) => t.id === p.trackId)) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <PageHeader title="خطط إذا–فإن" subtitle="القرار ينأخذ الحين، عشان وقتها ما تفاوض نفسك." />

      {adding ? (
        <Card title="خطة جديدة" className="border-accent/40">
          <IfThenForm
            tracks={tracks}
            onCancel={() => setAdding(false)}
            onSubmit={async (draft) => {
              await addPlan(draft);
              setAdding(false);
            }}
          />
        </Card>
      ) : (
        <Button block onClick={() => setAdding(true)}>
          <IconPlus /> خطة جديدة
        </Button>
      )}

      {groups.length === 0 && !adding && (
        <Card>
          <p className="text-lg leading-relaxed">ابدأ بخطة وحدة مربوطة بصلاة. مثال:</p>
          <p className="mt-2 rounded-2xl bg-surface-2 p-4 text-lg">
            <span className="font-bold text-accent">إذا</span> بعد العصر <span className="font-bold text-accent">←</span> أفتح ملف المتجر وأكتب وصف منتج واحد
          </p>
        </Card>
      )}

      {groups.map((g) => (
        <Card key={g.id} title={g.name}>
          <ul className="space-y-3">
            {g.items
              .slice()
              .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"))
              .map((p) => (
                <PlanItem key={p.id} plan={p} tracks={tracks} />
              ))}
          </ul>
        </Card>
      ))}

      <TracksEditor key={tracks.map((t) => t.id + t.name).join()} tracks={tracks} />
    </div>
  );
}
