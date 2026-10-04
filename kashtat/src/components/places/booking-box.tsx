"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { controlClasses } from "@/components/ui/control-classes";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { addDays, formatTime12, fromDateKey, startOfDay } from "@/lib/dates";
import { describeWindow, UNIT_COUNT } from "@/lib/booking-window";
import { formatSar } from "@/lib/money";
import {
  PRICING_MODE_LABEL,
  quote,
  type AddonPrice,
  type Rates,
  type RateUnit,
} from "@/lib/pricing";

const UNIT_TAB: Record<RateUnit, string> = { hour: "بالساعة", day: "باليوم", night: "بالليلة" };
const UNIT_NOUN: Record<RateUnit, string> = { hour: "الساعة", day: "اليوم", night: "الليلة" };
const DURATION_LABEL: Record<RateUnit, string> = {
  hour: "عدد الساعات",
  day: "عدد الأيام",
  night: "عدد الليالي",
};
const MAX_DURATION: Record<RateUnit, number> = { hour: 12, day: 14, night: 14 };
const START_TIMES = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

export type BookingInitial = {
  type?: RateUnit;
  date?: string;
  from?: string;
  duration?: number;
  guests?: number;
};

type Props = {
  slug: string;
  rates: Rates;
  capacityMin: number;
  capacityMax: number;
  checkIn: string;
  checkOut: string;
  addons: AddonPrice[];
  initial: BookingInitial;
};

function SelectField({
  id,
  label,
  value,
  onChange,
  name,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-label font-semibold">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(controlClasses, "appearance-none pe-10")}
        >
          {children}
        </select>
        <ChevronDownIcon
          size={18}
          className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </div>
  );
}

export function BookingBox({
  slug,
  rates,
  capacityMin,
  capacityMax,
  checkIn,
  checkOut,
  addons,
  initial,
}: Props) {
  const units = (["hour", "day", "night"] as const).filter((u) => rates[u] != null);
  const [unit, setUnit] = useState<RateUnit>(
    initial.type && rates[initial.type] != null ? initial.type : units[0],
  );
  const today = startOfDay(new Date());
  const initialDate = initial.date ? fromDateKey(initial.date) : null;
  const [date, setDate] = useState<Date | null>(
    initialDate && initialDate >= today ? initialDate : null,
  );
  const [from, setFrom] = useState(initial.from ?? "16:00");
  const [duration, setDuration] = useState(
    Math.min(initial.duration ?? (unit === "hour" ? 4 : 1), MAX_DURATION[unit]),
  );
  const [guests, setGuests] = useState(
    Math.min(Math.max(initial.guests ?? capacityMin, capacityMin), capacityMax),
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [dateError, setDateError] = useState<string>();

  const q = quote({
    rates,
    unit,
    duration,
    guests,
    addons: addons.filter((a) => picked.includes(a.id)),
  });

  const changeUnit = (u: RateUnit) => {
    setUnit(u);
    setDuration(u === "hour" ? 4 : 1);
  };

  // نافذة الحجز كما تحسبها قاعدة البيانات
  const windowText = date ? describeWindow({ unit, date, duration, from, checkIn, checkOut }) : "";

  return (
    <form
      action={`/places/${slug}/book`}
      method="get"
      onSubmit={(e) => {
        if (!date) {
          e.preventDefault();
          setDateError("اختر تاريخ الحجز");
        }
      }}
      aria-label="احجز هذا المكان"
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4 shadow-md sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[22px] font-bold">
          {formatSar(rates[unit]!)}{" "}
          <span className="text-body-sm font-normal text-ink-muted">/ {UNIT_NOUN[unit]}</span>
        </p>
      </div>

      <input type="hidden" name="type" value={unit} />
      {units.length > 1 && (
        <div role="group" aria-label="نوع الحجز" className="flex flex-wrap gap-2">
          {units.map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={u === unit}
              onClick={() => changeUnit(u)}
              className={cn(
                "h-11 cursor-pointer rounded-pill border px-4 text-label transition-colors sm:h-9",
                u === unit
                  ? "border-brand bg-brand-subtle font-semibold text-brand"
                  : "border-border-strong font-medium text-ink-muted hover:text-ink",
              )}
            >
              {UNIT_TAB[u]}
            </button>
          ))}
        </div>
      )}

      <DatePicker
        label="التاريخ"
        name="date"
        value={date}
        onChange={(d) => {
          setDate(d);
          setDateError(undefined);
        }}
        minDate={today}
        maxDate={addDays(today, 365)}
        error={dateError}
      />

      <div className="grid grid-cols-2 gap-3">
        {unit === "hour" && (
          <SelectField id="bk-from" label="وقت البداية" name="from" value={from} onChange={setFrom}>
            {START_TIMES.map((t) => (
              <option key={t} value={t}>
                {formatTime12(t)}
              </option>
            ))}
          </SelectField>
        )}
        <SelectField
          id="bk-duration"
          label={DURATION_LABEL[unit]}
          name="duration"
          value={String(duration)}
          onChange={(v) => setDuration(Number(v))}
        >
          {Array.from({ length: MAX_DURATION[unit] }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="bk-guests" className="text-label font-semibold">
            عدد الأشخاص
          </label>
          <input
            id="bk-guests"
            name="guests"
            type="number"
            inputMode="numeric"
            min={capacityMin}
            max={capacityMax}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value) || capacityMin)}
            aria-describedby="bk-guests-hint"
            className={controlClasses}
          />
          <p id="bk-guests-hint" className="text-caption text-ink-muted">
            من {capacityMin} إلى {capacityMax}
          </p>
        </div>
      </div>

      {addons.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-label font-semibold">إضافات</legend>
          {addons.map((a) => (
            <label
              key={a.id}
              className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-1 hover:bg-surface-overlay"
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  name="addon"
                  value={a.id}
                  checked={picked.includes(a.id)}
                  onChange={(e) =>
                    setPicked((p) =>
                      e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id),
                    )
                  }
                  className="size-[18px] accent-[var(--brand)]"
                />
                <span className="text-body-sm">{a.name}</span>
              </span>
              <span className="text-body-sm whitespace-nowrap text-ink-muted">
                {formatSar(a.price)} {PRICING_MODE_LABEL[a.mode]}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {q && (
        <dl
          className="flex flex-col gap-2 border-t border-border pt-4 text-body-sm"
          aria-live="polite"
        >
          {windowText && (
            <div className="rounded-md bg-surface-overlay px-3 py-2 text-ink-muted">
              {windowText}
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-ink-muted">
              {formatSar(q.rate)} × {duration} {UNIT_COUNT[unit]}
            </dt>
            <dd>{formatSar(q.base)}</dd>
          </div>
          {q.addons.map((a) => (
            <div key={a.id} className="flex justify-between gap-2">
              <dt className="text-ink-muted">{a.name}</dt>
              <dd>{formatSar(a.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-2 border-t border-border pt-2 text-label-lg font-bold">
            <dt>الإجمالي</dt>
            <dd>{formatSar(q.total)}</dd>
          </div>
        </dl>
      )}

      <Button type="submit" size="lg" fullWidth>
        متابعة الحجز
      </Button>
      <p className="text-center text-caption text-ink-muted">ما راح يُخصم شي الحين</p>
    </form>
  );
}
