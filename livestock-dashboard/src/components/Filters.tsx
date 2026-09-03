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
  const sortedYears = [...years].sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-hairline bg-surface p-1">
        <YearPill label="الكل" active={year === null} onClick={() => onYearChange(null)} />
        {sortedYears.map((y) => (
          <YearPill key={y} label={String(y)} active={year === y} onClick={() => onYearChange(y)} />
        ))}
      </div>

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

function YearPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors ${
        active ? "bg-[var(--series-1)] text-white" : "text-ink-secondary hover:bg-surface-2"
      }`}
    >
      {label}
    </button>
  );
}
