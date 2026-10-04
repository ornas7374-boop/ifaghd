"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/field";
import { addDays, startOfDay } from "@/lib/dates";
import { blockDays, type BlockState } from "./actions";

export function BlockForm({ places }: { places: Array<{ id: string; title: string }> }) {
  const [state, action, pending] = useActionState<BlockState, FormData>(blockDays, {});
  const [date, setDate] = useState<Date | null>(null);
  const today = startOfDay(new Date());

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] items-start gap-3">
        <Select
          label="المكان"
          name="placeId"
          defaultValue={places[0]?.id}
          options={places.map((p) => ({ value: p.id, label: p.title }))}
        />
        <DatePicker
          label="من تاريخ"
          name="date"
          value={date}
          onChange={setDate}
          minDate={today}
          maxDate={addDays(today, 365)}
        />
        <Select
          label="عدد الأيام"
          name="days"
          defaultValue="1"
          options={Array.from({ length: 14 }, (_, i) => ({
            value: String(i + 1),
            label: String(i + 1),
          }))}
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-md bg-danger-subtle px-4 py-3 text-body-sm text-danger">
          {state.error}
        </p>
      )}
      {state.done && (
        <p
          role="status"
          className="rounded-md bg-success-subtle px-4 py-3 text-body-sm text-success"
        >
          {state.done}
        </p>
      )}
      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        احظر الفترة
      </Button>
    </form>
  );
}
