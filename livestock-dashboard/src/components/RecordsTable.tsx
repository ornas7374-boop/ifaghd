"use client";

import { Pencil, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { monthLabel } from "@/lib/months";
import type { ProductionRecordWithType } from "@/lib/types";
import { EmptyState } from "./EmptyState";

export function RecordsTable({
  records,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDescription,
}: {
  records: ProductionRecordWithType[];
  onEdit: (record: ProductionRecordWithType) => void;
  onDelete: (record: ProductionRecordWithType) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (records.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-hairline text-start text-xs text-ink-muted">
            <th className="px-4 py-3 font-semibold">السنة</th>
            <th className="px-4 py-3 font-semibold">الشهر</th>
            <th className="px-4 py-3 font-semibold">نوع الحيوان</th>
            <th className="px-4 py-3 font-semibold">المواليد</th>
            <th className="px-4 py-3 font-semibold">النفوق</th>
            <th className="px-4 py-3 font-semibold">الأعلاف (كجم)</th>
            <th className="px-4 py-3 font-semibold">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-surface-2/60">
              <td className="px-4 py-3 font-semibold tabular-nums text-ink">{r.year}</td>
              <td className="px-4 py-3 text-ink-secondary">{monthLabel(r.month)}</td>
              <td className="px-4 py-3 text-ink-secondary">{r.animal_type_name}</td>
              <td className="px-4 py-3 tabular-nums text-ink">{formatNumber(r.births)}</td>
              <td className="px-4 py-3 tabular-nums text-ink">{formatNumber(r.deaths)}</td>
              <td className="px-4 py-3 tabular-nums text-ink">{formatNumber(r.feed_quantity)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(r)}
                    className="rounded-lg p-2 text-ink-secondary transition-colors hover:bg-[var(--series-1)]/10 hover:text-[var(--series-1)]"
                    aria-label={`تعديل سجل ${r.animal_type_name} ${r.year}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="rounded-lg p-2 text-ink-secondary transition-colors hover:bg-critical/10 hover:text-critical"
                    aria-label={`حذف سجل ${r.animal_type_name} ${r.year}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
