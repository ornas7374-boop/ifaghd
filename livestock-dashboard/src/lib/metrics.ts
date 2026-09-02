import type { AccentKey } from "./colors";
import type { ProductionRecordWithType } from "./types";

export type MetricKey = "births" | "deaths" | "feedQuantity";

export interface MetricConfig {
  key: MetricKey;
  label: string;
  unit?: string;
  goodWhenUp: boolean;
  accent: AccentKey;
}

export const METRICS: MetricConfig[] = [
  { key: "births", label: "المواليد", goodWhenUp: true, accent: "good" },
  { key: "deaths", label: "النفوق", goodWhenUp: false, accent: "critical" },
  { key: "feedQuantity", label: "الأعلاف", unit: "كجم", goodWhenUp: true, accent: "warning" },
];

export function getMetricValue(record: ProductionRecordWithType, key: MetricKey): number {
  return key === "births" ? record.births : key === "deaths" ? record.deaths : record.feed_quantity;
}

export function pickMetricValue(
  totals: { births: number; deaths: number; feedQuantity: number },
  key: MetricKey
): number {
  return key === "births" ? totals.births : key === "deaths" ? totals.deaths : totals.feedQuantity;
}
