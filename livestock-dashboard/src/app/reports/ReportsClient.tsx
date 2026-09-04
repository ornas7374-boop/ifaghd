"use client";

import { useMemo, useState } from "react";
import { Baby, BarChart3, CalendarDays, CalendarRange, Download, HeartCrack, PawPrint, Wheat } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { InstitutionInfo } from "@/components/InstitutionInfo";
import { DeltaBadge } from "@/components/DeltaBadge";
import { BarByYear } from "@/components/charts/BarByYear";
import { GroupedByAnimalType } from "@/components/charts/GroupedByAnimalType";
import { accentColorVar, seriesColorVar } from "@/lib/colors";
import { formatNumber, percentChange } from "@/lib/format";
import { MONTH_OPTIONS, YEARLY_TOTAL_MONTH, monthLabel } from "@/lib/months";
import { METRICS, pickMetricValue, type MetricKey } from "@/lib/metrics";
import type { AnimalType, ProductionRecordWithType } from "@/lib/types";

const METRIC_ICONS: Record<MetricKey, typeof Baby> = {
  births: Baby,
  deaths: HeartCrack,
  feedQuantity: Wheat,
};

type Tab = "annual" | "monthly" | "years" | "animals";

const TABS: { key: Tab; label: string; icon: typeof Baby }[] = [
  { key: "annual", label: "التقرير السنوي", icon: CalendarRange },
  { key: "monthly", label: "التقرير الشهري", icon: CalendarDays },
  { key: "years", label: "مقارنة السنوات", icon: BarChart3 },
  { key: "animals", label: "مقارنة أنواع الحيوانات", icon: PawPrint },
];

export function ReportsClient({
  animalTypes,
  records,
  years,
}: {
  animalTypes: AnimalType[];
  records: ProductionRecordWithType[];
  years: number[];
}) {
  const [tab, setTab] = useState<Tab>("annual");
  const [metric, setMetric] = useState<MetricKey>("births");

  const yearsWithData = useMemo(
    () => Array.from(new Set(records.map((r) => r.year))).sort((a, b) => b - a),
    [records]
  );

  if (records.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading />
        <InstitutionInfo />
        <EmptyState
          description="التقارير تُبنى تلقائيًا من البيانات المدخلة. أدخل بيانات أولًا لعرض التقارير هنا."
          actionHref="/data-entry"
          actionLabel="الذهاب إلى إدخال البيانات"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading />
      <InstitutionInfo />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-surface p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "bg-[var(--series-1)] text-white" : "text-ink-secondary hover:bg-surface-2"
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <MetricTabs metric={metric} onChange={setMetric} />

      {tab === "annual" && (
        <AnnualReport animalTypes={animalTypes} records={records} yearsWithData={yearsWithData} metric={metric} />
      )}
      {tab === "monthly" && (
        <MonthlyReport animalTypes={animalTypes} records={records} metric={metric} />
      )}
      {tab === "years" && <YearsComparison records={records} metric={metric} />}
      {tab === "animals" && (
        <AnimalsComparison animalTypes={animalTypes} records={records} years={years} metric={metric} />
      )}
    </div>
  );
}

function PageHeading() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-ink sm:text-2xl">التقارير</h2>
        <p className="mt-1 text-sm text-ink-secondary">تقارير محسوبة تلقائيًا من بيانات الإنتاج الحيواني</p>
      </div>
      <button
        disabled
        title="سيتم إضافة تصدير Excel وPDF لاحقًا"
        className="flex items-center gap-2 rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium text-ink-muted opacity-70"
      >
        <Download size={16} />
        تصدير Excel / PDF — قريبًا
      </button>
    </div>
  );
}

function MetricTabs({ metric, onChange }: { metric: MetricKey; onChange: (m: MetricKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {METRICS.map((m) => {
        const Icon = METRIC_ICONS[m.key];
        const active = metric === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "border-transparent text-white"
                : "border-hairline text-ink-secondary hover:bg-surface-2"
            }`}
            style={active ? { backgroundColor: accentColorVar(m.accent) } : undefined}
          >
            <Icon size={13} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <p className="mb-3 text-xs text-ink-muted">{subtitle ?? " "}</p>
      {children}
    </div>
  );
}

function AnnualReport({
  animalTypes,
  records,
  yearsWithData,
  metric,
}: {
  animalTypes: AnimalType[];
  records: ProductionRecordWithType[];
  yearsWithData: number[];
  metric: MetricKey;
}) {
  const [year, setYear] = useState<number>(yearsWithData[0]);
  const activeMetric = METRICS.find((m) => m.key === metric)!;

  const rows = useMemo(
    () =>
      animalTypes.map((type) => {
        const matching = records.filter((r) => r.year === year && r.animal_type_id === type.id);
        return {
          type,
          births: matching.reduce((s, r) => s + r.births, 0),
          deaths: matching.reduce((s, r) => s + r.deaths, 0),
          feedQuantity: matching.reduce((s, r) => s + r.feed_quantity, 0),
        };
      }),
    [animalTypes, records, year]
  );

  const totals = rows.reduce(
    (acc, r) => ({
      births: acc.births + r.births,
      deaths: acc.deaths + r.deaths,
      feedQuantity: acc.feedQuantity + r.feedQuantity,
    }),
    { births: 0, deaths: 0, feedQuantity: 0 }
  );

  const chartData = rows.map((r, i) => ({
    name: r.type.name_ar,
    value: pickMetricValue(r, metric),
    color: seriesColorVar(i),
  }));

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-fit items-center gap-2 text-sm">
        <span className="text-ink-secondary">السنة</span>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
        >
          {yearsWithData.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`تقرير سنة ${year}`}>
          <div className="overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs text-ink-muted">
                  <th className="px-3 py-2 text-start font-semibold">نوع الحيوان</th>
                  <th className="px-3 py-2 text-start font-semibold">المواليد</th>
                  <th className="px-3 py-2 text-start font-semibold">النفوق</th>
                  <th className="px-3 py-2 text-start font-semibold">الأعلاف (كجم)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.type.id} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-2 font-medium text-ink">{r.type.name_ar}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(r.births)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(r.deaths)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(r.feedQuantity)}</td>
                  </tr>
                ))}
                <tr className="bg-surface-2/60 font-bold text-ink">
                  <td className="px-3 py-2">الإجمالي</td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(totals.births)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(totals.deaths)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(totals.feedQuantity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={`${activeMetric.label} حسب النوع — سنة ${year}`}>
          <GroupedByAnimalType data={chartData} unit={activeMetric.unit} />
        </Card>
      </div>
    </div>
  );
}

function MonthlyReport({
  animalTypes,
  records,
  metric,
}: {
  animalTypes: AnimalType[];
  records: ProductionRecordWithType[];
  metric: MetricKey;
}) {
  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const now = new Date();

  const monthlyRecords = useMemo(() => records.filter((r) => r.month !== YEARLY_TOTAL_MONTH), [records]);
  const yearsWithMonthlyData = useMemo(
    () => Array.from(new Set(monthlyRecords.map((r) => r.year))).sort((a, b) => b - a),
    [monthlyRecords]
  );

  const [year, setYear] = useState<number>(yearsWithMonthlyData[0] ?? now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  if (monthlyRecords.length === 0) {
    return (
      <EmptyState
        title="لا توجد بيانات شهرية مدخلة بعد"
        description='اختر شهرًا محددًا (غير "الإجمالي السنوي") عند إدخال البيانات لتظهر التقارير الشهرية هنا.'
        actionHref="/data-entry"
        actionLabel="الذهاب إلى إدخال البيانات"
      />
    );
  }

  const rows = animalTypes.map((type) => {
    const record = monthlyRecords.find(
      (r) => r.year === year && r.month === month && r.animal_type_id === type.id
    );
    return {
      type,
      births: record?.births ?? 0,
      deaths: record?.deaths ?? 0,
      feedQuantity: record?.feed_quantity ?? 0,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      births: acc.births + r.births,
      deaths: acc.deaths + r.deaths,
      feedQuantity: acc.feedQuantity + r.feedQuantity,
    }),
    { births: 0, deaths: 0, feedQuantity: 0 }
  );

  const chartData = rows.map((r, i) => ({
    name: r.type.name_ar,
    value: pickMetricValue(r, metric),
    color: seriesColorVar(i),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-secondary">السنة</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
          >
            {yearsWithMonthlyData.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-secondary">الشهر</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
          >
            {MONTH_OPTIONS.filter((m) => m.value !== YEARLY_TOTAL_MONTH).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={`تقرير ${monthLabel(month)} ${year}`}>
          <div className="overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs text-ink-muted">
                  <th className="px-3 py-2 text-start font-semibold">نوع الحيوان</th>
                  <th className="px-3 py-2 text-start font-semibold">المواليد</th>
                  <th className="px-3 py-2 text-start font-semibold">النفوق</th>
                  <th className="px-3 py-2 text-start font-semibold">الأعلاف (كجم)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.type.id} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-2 font-medium text-ink">{r.type.name_ar}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(r.births)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(r.deaths)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(r.feedQuantity)}</td>
                  </tr>
                ))}
                <tr className="bg-surface-2/60 font-bold text-ink">
                  <td className="px-3 py-2">الإجمالي</td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(totals.births)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(totals.deaths)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatNumber(totals.feedQuantity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={`${activeMetric.label} حسب النوع — ${monthLabel(month)} ${year}`}>
          <GroupedByAnimalType data={chartData} unit={activeMetric.unit} />
        </Card>
      </div>
    </div>
  );
}

function YearsComparison({ records, metric }: { records: ProductionRecordWithType[]; metric: MetricKey }) {
  const activeMetric = METRICS.find((m) => m.key === metric)!;

  const yearly = useMemo(() => {
    const byYear = new Map<number, { births: number; deaths: number; feedQuantity: number }>();
    for (const r of records) {
      const acc = byYear.get(r.year) ?? { births: 0, deaths: 0, feedQuantity: 0 };
      acc.births += r.births;
      acc.deaths += r.deaths;
      acc.feedQuantity += r.feed_quantity;
      byYear.set(r.year, acc);
    }
    return Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, totals], index, arr) => ({
        year,
        ...totals,
        prev: index > 0 ? arr[index - 1][1] : null,
      }));
  }, [records]);

  const chartData = yearly.map((y) => ({
    year: y.year,
    value: pickMetricValue(y, metric),
  }));

  return (
    <div className="flex flex-col gap-4">
      <Card title={`مقارنة السنوات — ${activeMetric.label}`} subtitle="2023 مقابل 2024 مقابل 2025 مقابل 2026 وما بعدها">
        <BarByYear data={chartData} color={accentColorVar(activeMetric.accent)} unit={activeMetric.unit} />
      </Card>

      <Card title="جدول المقارنة السنوية التفصيلي">
        <div className="overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-muted">
                <th className="px-3 py-2 text-start font-semibold">السنة</th>
                <th className="px-3 py-2 text-start font-semibold">المواليد</th>
                <th className="px-3 py-2 text-start font-semibold">النفوق</th>
                <th className="px-3 py-2 text-start font-semibold">الأعلاف (كجم)</th>
                <th className="px-3 py-2 text-start font-semibold">التغير ({activeMetric.label})</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((y) => {
                const currentValue = pickMetricValue(y, metric);
                const prevValue = y.prev ? pickMetricValue(y.prev, metric) : null;
                return (
                  <tr key={y.year} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-2 font-bold tabular-nums text-ink">{y.year}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(y.births)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(y.deaths)}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(y.feedQuantity)}</td>
                    <td className="px-3 py-2">
                      <DeltaBadge
                        percent={prevValue !== null ? percentChange(prevValue, currentValue) : null}
                        goodWhenUp={activeMetric.goodWhenUp}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AnimalsComparison({
  animalTypes,
  records,
  years,
  metric,
}: {
  animalTypes: AnimalType[];
  records: ProductionRecordWithType[];
  years: number[];
  metric: MetricKey;
}) {
  const [year, setYear] = useState<number | "all">("all");
  const activeMetric = METRICS.find((m) => m.key === metric)!;

  const scoped = useMemo(
    () => records.filter((r) => year === "all" || r.year === year),
    [records, year]
  );

  const totals = useMemo(
    () =>
      animalTypes.map((type) => {
        const typeRecords = scoped.filter((r) => r.animal_type_id === type.id);
        return {
          type,
          births: typeRecords.reduce((s, r) => s + r.births, 0),
          deaths: typeRecords.reduce((s, r) => s + r.deaths, 0),
          feedQuantity: typeRecords.reduce((s, r) => s + r.feed_quantity, 0),
        };
      }),
    [animalTypes, scoped]
  );

  const topBirths = maxBy(totals, (t) => t.births);
  const topDeaths = maxBy(totals, (t) => t.deaths);
  const topFeed = maxBy(totals, (t) => t.feedQuantity);

  const chartData = totals.map((t, i) => ({
    name: t.type.name_ar,
    value: pickMetricValue(t, metric),
    color: seriesColorVar(i),
  }));

  return (
    <div className="flex flex-col gap-4">
      <label className="flex w-fit items-center gap-2 text-sm">
        <span className="text-ink-secondary">السنة</span>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
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

      {totals.some((t) => t.births || t.deaths || t.feedQuantity) ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InsightCard label="الأعلى في المواليد" name={topBirths?.type.name_ar} value={topBirths?.births} icon={Baby} accent="good" />
            <InsightCard label="الأعلى في النفوق" name={topDeaths?.type.name_ar} value={topDeaths?.deaths} icon={HeartCrack} accent="critical" />
            <InsightCard label="الأعلى استهلاكًا للأعلاف" name={topFeed?.type.name_ar} value={topFeed?.feedQuantity} icon={Wheat} accent="warning" unit="كجم" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title={`مقارنة الأنواع — ${activeMetric.label}`}>
              <GroupedByAnimalType data={chartData} unit={activeMetric.unit} />
            </Card>

            <Card title="جدول مقارنة الأنواع">
              <div className="overflow-x-auto rounded-xl border border-hairline">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-xs text-ink-muted">
                      <th className="px-3 py-2 text-start font-semibold">نوع الحيوان</th>
                      <th className="px-3 py-2 text-start font-semibold">المواليد</th>
                      <th className="px-3 py-2 text-start font-semibold">النفوق</th>
                      <th className="px-3 py-2 text-start font-semibold">الأعلاف (كجم)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.map((t) => (
                      <tr key={t.type.id} className="border-b border-hairline last:border-0">
                        <td className="px-3 py-2 font-medium text-ink">{t.type.name_ar}</td>
                        <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(t.births)}</td>
                        <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(t.deaths)}</td>
                        <td className="px-3 py-2 tabular-nums text-ink-secondary">{formatNumber(t.feedQuantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState title="لا توجد بيانات لهذه السنة" />
      )}
    </div>
  );
}

function InsightCard({
  label,
  name,
  value,
  icon: Icon,
  accent,
  unit,
}: {
  label: string;
  name?: string;
  value?: number;
  icon: typeof Baby;
  accent: "good" | "critical" | "warning";
  unit?: string;
}) {
  const color = accentColorVar(accent);
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
        >
          <Icon size={16} />
        </div>
        <p className="text-xs text-ink-secondary">{label}</p>
      </div>
      <p className="font-bold text-ink">{name ?? "—"}</p>
      {value !== undefined && (
        <p className="text-sm tabular-nums text-ink-muted">
          {formatNumber(value)} {unit}
        </p>
      )}
    </div>
  );
}

function maxBy<T>(items: T[], selector: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined;
  return items.reduce((max, item) => (selector(item) > selector(max) ? item : max), items[0]);
}
