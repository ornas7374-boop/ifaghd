"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import {
  WEEKDAYS_SHORT,
  addDays,
  addMonths,
  formatDateLong,
  formatMonth,
  isSameDay,
  monthGrid,
  startOfDay,
  toDateKey,
} from "@/lib/dates";
import { controlClasses } from "./field";
import { CalendarIcon, ChevronEndIcon, ChevronStartIcon } from "./icons";

type CalendarProps = {
  value: Date | null;
  onChange: (d: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  isDisabled?: (d: Date) => boolean;
  /** يُستدعى بعد اختيار يوم، لإغلاق النافذة المنبثقة */
  onPicked?: () => void;
  autoFocus?: boolean;
};

export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  isDisabled,
  onPicked,
  autoFocus,
}: CalendarProps) {
  const [focused, setFocused] = useState<Date>(() => startOfDay(value ?? minDate ?? new Date()));
  const [month, setMonth] = useState<Date>(
    () => new Date(focused.getFullYear(), focused.getMonth(), 1),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(Boolean(autoFocus));
  const labelId = useId();
  const today = startOfDay(new Date());

  const disabled = (d: Date) =>
    (minDate && d < startOfDay(minDate)) ||
    (maxDate && d > startOfDay(maxDate)) ||
    Boolean(isDisabled?.(d));

  useEffect(() => {
    if (!shouldFocus.current) return;
    const btn = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-day="${toDateKey(focused)}"]`,
    );
    btn?.focus();
  }, [focused, month]);

  const moveFocus = (d: Date) => {
    shouldFocus.current = true;
    setFocused(d);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // في RTL: السهم الأيسر = اليوم التالي بصريًا
    const steps: Record<string, number> = {
      ArrowLeft: 1,
      ArrowRight: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    if (e.key in steps) {
      e.preventDefault();
      moveFocus(addDays(focused, steps[e.key]));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      moveFocus(addMonths(focused, 1));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      moveFocus(addMonths(focused, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(addDays(focused, -focused.getDay()));
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(addDays(focused, 6 - focused.getDay()));
    }
  };

  const pick = (d: Date) => {
    if (disabled(d)) return;
    onChange(d);
    onPicked?.();
  };

  const days = monthGrid(month);

  return (
    <div className="flex w-[296px] max-w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="الشهر السابق"
          className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-surface-overlay"
        >
          <ChevronStartIcon />
        </button>
        <p id={labelId} aria-live="polite" className="text-label-lg font-semibold">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="الشهر التالي"
          className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-surface-overlay"
        >
          <ChevronEndIcon />
        </button>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-0.5"
      >
        <div role="row" className="contents">
          {WEEKDAYS_SHORT.map((w) => (
            <div
              key={w}
              role="columnheader"
              className="flex h-8 items-center justify-center text-caption text-ink-muted"
            >
              {w}
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div key={week} role="row" className="contents">
            {days.slice(week * 7, week * 7 + 7).map(({ date, inMonth }) => {
              const isSelected = value ? isSameDay(date, value) : false;
              const isToday = isSameDay(date, today);
              const isOff = disabled(date);
              const isFocusTarget = isSameDay(date, focused);
              return (
                <div key={toDateKey(date)} role="gridcell" aria-selected={isSelected}>
                  <button
                    type="button"
                    data-day={toDateKey(date)}
                    tabIndex={isFocusTarget ? 0 : -1}
                    disabled={isOff}
                    aria-label={formatDateLong(date)}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => pick(date)}
                    onFocus={() => setFocused(date)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-md text-body-sm transition-colors",
                      !inMonth && "text-ink-muted/60",
                      inMonth && !isSelected && "text-ink",
                      !isSelected && !isOff && "hover:bg-surface-overlay",
                      isToday && !isSelected && "font-bold ring-1 ring-inset ring-border-strong",
                      isSelected && "bg-brand font-semibold text-on-brand",
                      isOff && "cursor-not-allowed line-through opacity-40",
                    )}
                  >
                    {date.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type DatePickerProps = {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  name?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  isDisabled?: (d: Date) => boolean;
  /** اتجاه فتح التقويم: للأسفل افتراضيًا، وللأعلى داخل حاويات مقصوصة */
  placement?: "bottom" | "top";
  className?: string;
};

export function DatePicker({
  label,
  value,
  onChange,
  name,
  placeholder = "اختر التاريخ",
  hint,
  error,
  minDate,
  maxDate,
  isDisabled,
  placement = "bottom",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const popId = `${id}-pop`;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className={cn("relative flex min-w-0 flex-col gap-2", className)}>
      <label id={`${id}-label`} htmlFor={id} className="text-label font-semibold">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          controlClasses,
          "flex items-center justify-between gap-2 text-start",
          error && "border-danger",
        )}
      >
        <span className={cn("truncate", !value && "text-ink-muted")}>
          {value ? formatDateLong(value) : placeholder}
        </span>
        <CalendarIcon className="shrink-0 text-ink-muted" />
      </button>
      {name && <input type="hidden" name={name} value={value ? toDateKey(value) : ""} />}
      {hintId && (
        <p id={hintId} className="text-body-sm text-ink-muted">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}

      {open && (
        <div
          id={popId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${id}-label`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
          className={cn(
            "absolute start-0 z-30 rounded-lg border border-border bg-surface-raised p-3 shadow-md",
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <Calendar
            value={value}
            onChange={onChange}
            minDate={minDate}
            maxDate={maxDate}
            isDisabled={isDisabled}
            onPicked={close}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
