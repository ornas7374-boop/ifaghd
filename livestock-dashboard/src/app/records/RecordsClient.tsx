"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Filters } from "@/components/Filters";
import { RecordsTable } from "@/components/RecordsTable";
import { RecordFormModal } from "@/components/RecordFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast";
import type { AnimalType, ProductionRecordWithType } from "@/lib/types";

export function RecordsClient({
  initialAnimalTypes,
  initialRecords,
  years,
}: {
  initialAnimalTypes: AnimalType[];
  initialRecords: ProductionRecordWithType[];
  years: number[];
}) {
  const { show } = useToast();
  const [animalTypes] = useState<AnimalType[]>(initialAnimalTypes);
  const [records, setRecords] = useState<ProductionRecordWithType[]>(initialRecords);

  const [year, setYear] = useState<number | null>(null);
  const [animalTypeId, setAnimalTypeId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [editingRecord, setEditingRecord] = useState<ProductionRecordWithType | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductionRecordWithType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records
      .filter((r) => year === null || r.year === year)
      .filter((r) => animalTypeId === null || r.animal_type_id === animalTypeId)
      .filter((r) => !term || r.animal_type_name.toLowerCase().includes(term) || String(r.year).includes(term))
      .sort((a, b) => b.year - a.year || a.animal_type_name.localeCompare(b.animal_type_name, "ar"));
  }, [records, year, animalTypeId, search]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/records/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        show("error", json.error ?? "تعذر حذف السجل");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      show("success", "تم حذف السجل");
    } catch {
      show("error", "تعذر الاتصال بالخادم");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-ink sm:text-2xl">البيانات</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          كل بيانات الإنتاج الحيواني المسجلة — قابلة للبحث والتصفية والتعديل
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <Filters
          years={years}
          animalTypes={animalTypes}
          year={year}
          animalTypeId={animalTypeId}
          onYearChange={setYear}
          onAnimalTypeChange={setAnimalTypeId}
        />
        <div className="relative w-full sm:w-64">
          <Search size={16} className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالسنة أو نوع الحيوان…"
            className="w-full rounded-xl border border-hairline bg-surface py-2 ps-9 pe-3 text-sm text-ink outline-none focus:border-[var(--series-1)]"
          />
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        {filtered.length > 0 ? `عرض ${filtered.length} من أصل ${records.length} سجل` : null}
      </p>

      <RecordsTable
        records={filtered}
        onEdit={setEditingRecord}
        onDelete={setPendingDelete}
        emptyTitle={records.length === 0 ? "لا توجد بيانات مدخلة حتى الآن" : "لا توجد نتائج مطابقة"}
        emptyDescription={
          records.length === 0
            ? "استخدم صفحة إدخال البيانات لإضافة أول سجل."
            : "جرّب تعديل كلمة البحث أو الفلاتر."
        }
      />

      <RecordFormModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSaved={(updated) => {
          setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setEditingRecord(null);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="حذف السجل"
        description={
          pendingDelete
            ? `سيتم حذف بيانات ${pendingDelete.animal_type_name} لسنة ${pendingDelete.year} نهائيًا.`
            : undefined
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
}
