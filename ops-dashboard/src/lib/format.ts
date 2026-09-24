const nf = new Intl.NumberFormat("en-US");
const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const CURRENCY = "SAR";

export function formatCurrency(v: number, opts: { compact?: boolean; decimals?: boolean } = {}) {
  if (opts.compact && Math.abs(v) >= 10_000) return `${CURRENCY} ${compact.format(v)}`;
  const f = opts.decimals
    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : nf;
  return `${CURRENCY} ${f.format(opts.decimals ? v : Math.round(v))}`;
}

export function formatNumber(v: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(v) >= 10_000) return compact.format(v);
  return nf.format(Math.round(v));
}

export function formatPercent(v: number, digits = 2) {
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatValue(v: number, format: "currency" | "number" | "percent") {
  if (format === "currency") return formatCurrency(v);
  if (format === "percent") return formatPercent(v);
  return formatNumber(v);
}

/** % change; returns null when there is no meaningful baseline. */
export function pctChange(cur: number, prev: number) {
  if (!prev) return null;
  return (cur - prev) / prev;
}

export function formatDelta(d: number) {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  return `${sign}${nf1.format(Math.abs(d * 100))}%`;
}

export function timeAgo(t: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(t: number) {
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function initials(name: string) {
  const parts = name.replace(/Al-/g, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
