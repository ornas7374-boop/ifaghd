"use client";

import type { AnimalType } from "@/lib/types";

export function Filters({
  years,
  animalTypes,
  year,
  animalTypeId,
  onYearChange,
  onAnimalTypeChange,
}: {
  years: number[];
  animalTypes: AnimalType[];
  year: number | null;
  animalTypeId: number | null;
  onYearChange: (year: number | null) => void;
  onAnimalTypeChange: (id: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-secondary">السنة</span>
        <select
          value={year ?? "all"}
          onChange={(e) => onYearChange(e.target.value === "all" ? null : Number(e.target.value))}
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
        >
          <option value="all">كل السنوات</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-secondary">نوع الحيوان</span>
        <select
          value={animalTypeId ?? "all"}
          onChange={(e) =>
            onAnimalTypeChange(e.target.value === "all" ? null : Number(e.target.value))
          }
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
        >
          <option value="all">كل الأنواع</option>
          {animalTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name_ar}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
