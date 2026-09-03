"use client";

import { useMemo, useState } from "react";
import { Baby, HeartCrack, Wheat } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Filters } from "@/components/Filters";
import { EmptyState } from "@/components/EmptyState";
import { DeltaBadge } from "@/components/DeltaBadge";
import { BarByYear } from "@/components/charts/BarByYear";
import { GroupedByAnimalType } from "@/components/charts/GroupedByAnimalType";
import { DonutChart } from "@/components/charts/DonutChart";
import { MultiLineByYear } from "@/components/charts/MultiLineByYear";
import { accentColorVar, seriesColorVar } from "@/lib/colors";
import { percentChange } from "@/lib/format";
import { METRICS, getMetricValue, type MetricKey } from "@/lib/metrics";
import type { AnimalType, ProductionRecordWithType } from "@/lib/types";

const METRIC_ICONS: Record<MetricKey, typeof Baby> = {
  births: Baby,
  deaths: HeartCrack,
  feedQuantity: Wheat,
};

export function DashboardClient({
  animalTypes,
  records,
  years,
}: {
  animalTypes: AnimalType[];
  records: ProductionRecordWithType[];
  years: number[];
}) {
  const [year, setYear] = useState<number | null>(null);
  const [animalTypeId, setAnimalTypeId] = useState<number | null>(null);
  const [metric, setMetric] = useState<MetricKey>("births");

  const hasAnyData = records.length > 0;

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (r) => (year === null || r.year === year) && (animalTypeId === null || r.animal_type_id === animalTypeId)
      ),
    [records, year, animalTypeId]
  );

  const totals = useMemo(() => {
    const acc = { births: 0, deaths: 0, feedQuantity: 0 };
    for (const r of filteredRecords) {
      acc.births += r.births;
      acc.deaths += r.deaths;
      acc.feedQuantity += r.feed_quantity;
    }
    const typeCount = new Set(filteredRecords.map((r) => r.animal_type_id)).size;
    return { ...acc, typeCount };
  }, [filteredRecords]);

  const typeAwareRecords = useMemo(
    () => records.filter((r) => animalTypeId === null || r.animal_type_id === animalTypeId),
    [records, animalTypeId]
  );

  const yearlyTrend = useMemo(() => {
    const byYear = new Map<number, number>();
    for (const r of typeAwareRecords) {
      byYear.set(r.year, (byYear.get(r.year) ?? 0) + getMetricValue(r, metric));
    }
    return Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([y, value]) => ({ year: y, value }));
  }, [typeAwareRecords, metric]);

  const yearOverYearDelta = useMemo(() => {
    if (yearlyTrend.length < 2) return null;
    const prev = yearlyTrend[yearlyTrend.length - 2];
    const curr = yearlyTrend[yearlyTrend.length - 1];
    return { fromYear: prev.year, toYear: curr.year, percent: percentChange(prev.value, curr.value) };
  }, [yearlyTrend]);

  const animalComparison = useMemo(() => {
    const scoped = records.filter((r) => year === null || r.year === year);
    return animalTypes.map((type, index) => {
      const total = scoped
        .filter((r) => r.animal_type_id === type.id)
        .reduce((sum, r) => sum + getMetricValue(r, metric), 0);
      return { name: type.name_ar, value: total, color: seriesColorVar(index) };
    });
  }, [records, animalTypes, year, metric]);

  const multiLineData = useMemo(() => {
    const yearsPresent = Array.from(new Set(records.map((r) => r.year))).sort((a, b) => a - b);
    return yearsPresent.map((y) => {
      const row: Record<string, number | string> = { year: y };
      for (const type of animalTypes) {
        row[type.key] = records
          .filter((r) => r.year === y && r.animal_type_id === type.id)
          .reduce((sum, r) => sum + getMetricValue(r, metric), 0);
      }
      return row;
    });
  }, [records, animalTypes, metric]);

  const activeMetric = METRICS.find((m) => m.key === metric)!;

  if (!hasAnyData) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading />
        <EmptyState
          description="ابدأ بإدخال بيانات المواليد والنفوق والأعلاف من صفحة إدخال البيانات لتظهر هنا الإحصائيات والرسوم البيانية."
          actionHref="/data-entry"
          actionLabel="الذهاب إلى إدخال البيانات"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-4">
        <Filters
          years={years}
          animalTypes={animalTypes}
          year={year}
          animalTypeId={animalTypeId}
          onYearChange={setYear}
          onAnimalTypeChange={setAnimalTypeId}
        />
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState
          title="لا توجد بيانات مطابقة لهذه الفلاتر"
          description="جرّب تغيير السنة أو نوع الحيوان المحدد."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="إجمالي المواليد" value={totals.births} accent="good" />
          <StatCard label="إجمالي النفوق" value={totals.deaths} accent="critical" />
          <StatCard label="إجمالي كمية الأعلاف" value={totals.feedQuantity} accent="warning" unit="كجم" />
          <StatCard label="عدد أنواع الحيوانات" value={totals.typeCount} accent="series-1" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-surface p-1.5">
        {METRICS.map((m) => {
          const Icon = METRIC_ICONS[m.key];
          return (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                metric === m.key ? "bg-[var(--series-1)] text-white" : "text-ink-secondary hover:bg-surface-2"
              }`}
            >
              <Icon size={15} />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={`مقارنة سنوية — ${activeMetric.label}`}
          subtitle="عبر كل السنوات المتوفرة"
          badge={
            yearOverYearDelta && (
              <DeltaBadge percent={yearOverYearDelta.percent} goodWhenUp={activeMetric.goodWhenUp} />
            )
          }
        >
          {yearlyTrend.length > 0 ? (
            <BarByYear data={yearlyTrend} color={accentColorVar(activeMetric.accent)} unit={activeMetric.unit} />
          ) : (
            <ChartEmptyNote />
          )}
        </ChartCard>

        <ChartCard title={`مقارنة الأنواع — ${activeMetric.label}`} subtitle={year ? `لسنة ${year}` : "لكل السنوات مجتمعة"}>
          {animalComparison.some((d) => d.value > 0) ? (
            <GroupedByAnimalType data={animalComparison} unit={activeMetric.unit} />
          ) : (
            <ChartEmptyNote />
          )}
        </ChartCard>

        <ChartCard title={`توزيع ${activeMetric.label} حسب النوع`} subtitle={year ? `لسنة ${year}` : "لكل السنوات مجتمعة"}>
          {animalComparison.some((d) => d.value > 0) ? (
            <DonutChart data={animalComparison} unit={activeMetric.unit} />
          ) : (
            <ChartEmptyNote />
          )}
        </ChartCard>
      </div>

      {animalTypeId === null && (
        <ChartCard
          title={`مقارنة كل نوع بين السنوات — ${activeMetric.label}`}
          subtitle="خط زمني منفصل لكل نوع حيوان"
        >
          {multiLineData.length > 0 ? (
            <MultiLineByYear
              data={multiLineData}
              series={animalTypes.map((t, i) => ({ key: t.key, label: t.name_ar, color: seriesColorVar(i) }))}
              unit={activeMetric.unit}
            />
          ) : (
            <ChartEmptyNote />
          )}
        </ChartCard>
      )}
    </div>
  );
}

function PageHeading() {
  return (
    <div className="rounded-2xl border border-hairline bg-surface px-5 py-4">
      <h2 className="text-xl font-extrabold text-[var(--series-1)] sm:text-2xl">
        لوحة قسم الإنتاج الحيواني
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">
        نظرة عامة على بيانات الإنتاج الحيواني في محطة الأبحاث والتجارب
      </p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function ChartEmptyNote() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-ink-muted">
      لا توجد بيانات كافية لعرض هذا الرسم
    </div>
  );
}
