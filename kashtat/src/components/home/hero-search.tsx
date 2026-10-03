"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Select } from "@/components/ui/field";
import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { addDays, startOfDay } from "@/lib/dates";

type BookingType = "hour" | "day" | "night";

const TYPES: Array<{ id: BookingType; label: string }> = [
  { id: "hour", label: "بالساعة" },
  { id: "day", label: "باليوم" },
  { id: "night", label: "بالليلة" },
];

// أوقات البداية للحجز بالساعة: من 8 صباحًا حتى 11 مساءً
const START_TIMES = Array.from({ length: 16 }, (_, i) => {
  const h = i + 8;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { value: `${String(h).padStart(2, "0")}:00`, label: `${h12}:00 ${h < 12 ? "ص" : "م"}` };
});

export function HeroSearch() {
  const [type, setType] = useState<BookingType>("hour");
  const [date, setDate] = useState<Date | null>(null);
  const today = startOfDay(new Date());

  return (
    <form
      role="search"
      aria-label="ابحث عن مكان"
      action="/places"
      method="get"
      className="pointer-events-auto flex flex-col gap-3.5 rounded-lg border border-border bg-surface-raised p-4 shadow-md"
    >
      <input type="hidden" name="type" value={type} />
      <div role="group" aria-label="نوع الحجز" className="flex flex-wrap gap-2">
        {TYPES.map((t) => {
          const on = t.id === type;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => setType(t.id)}
              className={cn(
                "h-11 cursor-pointer rounded-pill border px-4 text-label transition-colors sm:h-9",
                on
                  ? "border-brand bg-brand-subtle font-semibold text-brand"
                  : "border-border-strong bg-transparent font-medium text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-end gap-3">
        <Input
          label="المدينة أو الموقع"
          name="q"
          placeholder="مثال: العلا، الرياض، الثمامة"
          autoComplete="off"
        />
        <DatePicker
          label="التاريخ"
          name="date"
          value={date}
          onChange={setDate}
          minDate={today}
          maxDate={addDays(today, 365)}
          placement="top"
        />
        {type === "hour" ? (
          <Select
            key="hour"
            label="الوقت"
            name="from"
            defaultValue="16:00"
            options={START_TIMES.map((t) => ({ value: t.value, label: `من ${t.label}` }))}
          />
        ) : (
          <Input
            key={type}
            label={type === "day" ? "عدد الأيام" : "عدد الليالي"}
            name="duration"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            defaultValue={1}
          />
        )}
        <Input
          label="عدد الأشخاص"
          name="guests"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="6"
        />
        <Button type="submit" size="lg">
          <SearchIcon />
          ابحث
        </Button>
      </div>
    </form>
  );
}
