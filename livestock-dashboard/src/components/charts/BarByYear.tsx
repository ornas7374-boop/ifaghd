"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export function BarByYear({
  data,
  color,
  unit,
}: {
  data: { year: number; value: number }[];
  color: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--baseline)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--color-ink-muted)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "var(--color-surface-2)" }}
          content={<ChartTooltip unit={unit} />}
        />
        <Bar
          dataKey="value"
          name="القيمة"
          fill={color}
          radius={[6, 6, 0, 0]}
          maxBarSize={56}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
