"use client";

import { useState } from "react";
import { TRIGGER_PRESETS } from "@/lib/content/triggers";
import type { IfThenPlan, Track, TriggerKind } from "@/lib/types";
import { Button } from "../ui/Button";
import { Chip, Select, TextInput } from "../ui/fields";

export type PlanDraft = Omit<IfThenPlan, "id" | "createdAt" | "active">;

interface Props {
  tracks: Track[];
  initial?: Partial<PlanDraft>;
  submitLabel?: string;
  onSubmit: (plan: PlanDraft) => void;
  onCancel?: () => void;
}

// النموذج: إذا [وقت/مكان/حدث] ← فسأفعل [فعل محدد وصغير].
export function IfThenForm({ tracks, initial = {}, submitLabel = "احفظ الخطة", onSubmit, onCancel }: Props) {
  const [trigger, setTrigger] = useState(initial.trigger ?? "");
  const [kind, setKind] = useState<TriggerKind>(initial.triggerKind ?? "event");
  const [time, setTime] = useState(initial.time ?? "");
  const [action, setAction] = useState(initial.action ?? "");
  const [trackId, setTrackId] = useState<string>(initial.trackId ?? tracks[0]?.id ?? "");

  const pickPreset = (label: string) => {
    const p = TRIGGER_PRESETS.find((t) => t.label === label)!;
    setTrigger(p.label);
    setKind(p.kind);
    setTime(p.defaultTime);
  };

  const ready = trigger.trim() && action.trim();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onSubmit({ trigger: trigger.trim(), triggerKind: kind, time: time || null, action: action.trim(), trackId: trackId || null });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-lg font-bold text-accent">إذا…</legend>
        <div className="mb-3 flex flex-wrap gap-2">
          {TRIGGER_PRESETS.map((p) => (
            <Chip key={p.label} active={trigger === p.label} onClick={() => pickPreset(p.label)}>
              {p.label}
            </Chip>
          ))}
        </div>
        <TextInput
          value={trigger}
          onChange={(e) => {
            setTrigger(e.target.value);
            setKind("event");
          }}
          placeholder="أو اكتب وقت/مكان/حدث"
          aria-label="المحفّز"
        />
        <label className="mt-3 flex items-center gap-3">
          <span className="shrink-0 text-base text-muted">الساعة</span>
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" className="text-center" aria-label="وقت الخطة" />
        </label>
        <p className="mt-1 text-sm text-muted">الوقت يخلّي الخطة تنضاف لتقويمك لاحقًا.</p>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-lg font-bold text-accent">فسأفعل…</legend>
        <TextInput value={action} onChange={(e) => setAction(e.target.value)} placeholder="فعل محدد وصغير" aria-label="الفعل" />
      </fieldset>

      {tracks.length > 0 && (
        <label className="block">
          <span className="mb-2 block text-sm text-muted">المسار</span>
          <Select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </label>
      )}

      <div className="flex gap-3">
        <Button type="submit" block disabled={!ready}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}
