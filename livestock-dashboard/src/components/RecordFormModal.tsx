"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProductionRecordWithType } from "@/lib/types";
import { useToast } from "./toast";

export function RecordFormModal({
  record,
  onClose,
  onSaved,
}: {
  record: ProductionRecordWithType | null;
  onClose: () => void;
  onSaved: (record: ProductionRecordWithType) => void;
}) {
  if (!record) return null;
  return <RecordFormModalContent key={record.id} record={record} onClose={onClose} onSaved={onSaved} />;
}

function RecordFormModalContent({
  record,
  onClose,
  onSaved,
}: {
  record: ProductionRecordWithType;
  onClose: () => void;
  onSaved: (record: ProductionRecordWithType) => void;
}) {
  const { show } = useToast();
  const [births, setBirths] = useState(String(record.births));
  const [deaths, setDeaths] = useState(String(record.deaths));
  const [feedQuantity, setFeedQuantity] = useState(String(record.feed_quantity));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (births === "" || deaths === "" || feedQuantity === "") {
      show("error", "الرجاء تعبئة جميع الحقول");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          births: Number(births),
          deaths: Number(deaths),
          feedQuantity: Number(feedQuantity),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        show("error", json.error ?? "تعذر تحديث السجل");
        return;
      }
      show("success", "تم تحديث البيانات بنجاح");
      onSaved(json.data);
    } catch {
      show("error", "تعذر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal className="relative w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-ink">تعديل البيانات</h2>
            <p className="text-xs text-ink-muted">
              {record.animal_type_name} — سنة {record.year}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-secondary hover:bg-surface-2" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-secondary">عدد المواليد</label>
            <input
              type="number"
              min={0}
              value={births}
              onChange={(e) => setBirths(e.target.value)}
              className="rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-secondary">عدد حالات النفوق</label>
            <input
              type="number"
              min={0}
              value={deaths}
              onChange={(e) => setDeaths(e.target.value)}
              className="rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-secondary">كمية الأعلاف (كجم)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={feedQuantity}
              onChange={(e) => setFeedQuantity(e.target.value)}
              className="rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
            />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-2"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--series-1)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ…" : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
