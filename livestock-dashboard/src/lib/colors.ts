const SERIES_VARS = [
  "--series-1",
  "--series-2",
  "--series-3",
  "--series-4",
  "--series-5",
  "--series-6",
  "--series-7",
  "--series-8",
];

export function seriesColorVar(index: number): string {
  return `var(${SERIES_VARS[index % SERIES_VARS.length]})`;
}

export type AccentKey = "series-1" | "series-2" | "series-3" | "series-4" | "good" | "critical" | "warning";

const ACCENT_VARS: Record<AccentKey, string> = {
  "series-1": "--series-1",
  "series-2": "--series-2",
  "series-3": "--series-3",
  "series-4": "--series-4",
  good: "--status-good",
  critical: "--status-critical",
  warning: "--status-warning",
};

export function accentColorVar(accent: AccentKey): string {
  return `var(${ACCENT_VARS[accent]})`;
}
