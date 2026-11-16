"use client";

import { useState } from "react";
import { deletePlan, updatePlan } from "@/lib/db";
import type { IfThenPlan, Track } from "@/lib/types";
import { ConfirmButton } from "../ui/ConfirmButton";
import { IconPencil, IconTrash } from "../ui/icons";
import { IfThenForm } from "./IfThenForm";

export function PlanItem({ plan, tracks }: { plan: IfThenPlan; tracks: Track[] }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-2xl border border-accent/40 bg-surface p-4">
        <IfThenForm
          tracks={tracks}
          initial={plan}
          submitLabel="حفظ التعديل"
          onCancel={() => setEditing(false)}
          onSubmit={async (draft) => {
            await updatePlan(plan.id, draft);
            setEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className={`rounded-2xl bg-surface-2 p-4 transition ${plan.active ? "" : "opacity-55"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg leading-relaxed">
          <span className="font-bold text-accent">إذا</span> {plan.trigger} <span className="font-bold text-accent">←</span> {plan.action}
        </p>
        {plan.time && (
          <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-sm tabular-nums text-muted" dir="ltr">
            {plan.time}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="size-5 accent-[var(--accent)]"
            checked={plan.active}
            onChange={() => updatePlan(plan.id, { active: !plan.active })}
          />
          {plan.active ? "مفعّلة كل يوم" : "موقوفة"}
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setEditing(true)} aria-label="عدّل الخطة" className="grid size-10 place-items-center rounded-full text-muted hover:text-fg">
            <IconPencil />
          </button>
          <ConfirmButton label="احذف الخطة" onConfirm={() => deletePlan(plan.id)}>
            <IconTrash />
          </ConfirmButton>
        </div>
      </div>
    </li>
  );
}
