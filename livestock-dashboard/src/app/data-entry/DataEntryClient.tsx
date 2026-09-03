"use client";

import { useMemo, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { useToast } from "@/components/toast";
import { RecordsTable } from "@/components/RecordsTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { AnimalType, ProductionRecordWithType } from "@/lib/types";

export function DataEntryClient({
  initialAnimalTypes,
  initialRecords,
  years,
}: {
  initialAnimalTypes: AnimalType[];
  initialRecords: ProductionRecordWithType[];
  years: number[];
}) {
  const { show } = useToast();
  const [animalTypes, setAnimalTypes] = useState(initialAnimalTypes);
  const [records, setRecords] = useState(initialRecords);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(years.includes(currentYear) ? currentYear : years[0] ?? currentYear);
  const [customYear, setCustomYear] = useState("");
  const [useCustomYear, setUseCustomYear] = useState(false);
  const [animalTypeId, setAnimalTypeId] = useState<number | null>(initialAnimalTypes[0]?.id ?? null);

  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [addingTypeBusy, setAddingTypeBusy] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<ProductionRecordWithType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const effectiveYear = useCustomYear ? Number(customYear) : year;

  const existingRecord = useMemo(() => {
    if (!effectiveYear || !animalTypeId) return undefined;
    return records.find((r) => r.year === effectiveYear && r.animal_type_id === animalTypeId);
  }, [records, effectiveYear, animalTypeId]);

  async function handleSave(values: { births: number; deaths: number; feedQuantity: number }): Promise<boolean> {
    if (!animalTypeId) {
      show("error", "الرجاء اختيار نوع الحيوان أولًا");
      return false;
    }
    if (!effectiveYear || Number.isNaN(effectiveYear)) {
      show("error", "الرجاء إدخال سنة صحيحة");
      return false;
    }

    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: effectiveYear, animalTypeId, ...values }),
      });
      const json = await res.json();
      if (!res.ok) {
        show("error", json.error ?? "تعذر حفظ البيانات");
        return false;
      }

      const wasCreate = res.status === 201;
      const savedRecord: ProductionRecordWithType = {
        id: json.data.id,
        year: effectiveYear,
        animal_type_id: animalTypeId,
        births: values.births,
        deaths: values.deaths,
        feed_quantity: values.feedQuantity,
        created_at: existingRecord?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        animal_type_key: animalTypes.find((t) => t.id === animalTypeId)?.key ?? "",
        animal_type_name: animalTypes.find((t) => t.id === animalTypeId)?.name_ar ?? "",
      };

      setRecords((prev) => [savedRecord, ...prev.filter((r) => r.id !== savedRecord.id)]);
      show("success", wasCreate ? "تم حفظ البيانات بنجاح" : "تم تحديث البيانات بنجاح");
      return true;
    } catch {
      show("error", "تعذر الاتصال بالخادم");
      return false;
    }
  }

  function loadRecordIntoForm(record: ProductionRecordWithType) {
    setUseCustomYear(!years.includes(record.year));
    if (years.includes(record.year)) {
      setYear(record.year);
    } else {
      setCustomYear(String(record.year));
    }
    setAnimalTypeId(record.animal_type_id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

  async function handleAddType(e: React.FormEvent) {
    e.preventDefault();
    const name = newTypeName.trim();
    if (name.length < 2) {
      show("error", "الرجاء إدخال اسم صالح لنوع الحيوان");
      return;
    }
    setAddingTypeBusy(true);
    try {
      const res = await fetch("/api/animal-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameAr: name }),
      });
      const json = await res.json();
      if (!res.ok) {
        show("error", json.error ?? "تعذر إضافة نوع الحيوان");
        return;
      }
      setAnimalTypes((prev) => [...prev, json.data]);
      setAnimalTypeId(json.data.id);
      setNewTypeName("");
      setAddingType(false);
      show("success", `تمت إضافة "${name}" إلى أنواع الحيوانات`);
    } catch {
      show("error", "تعذر الاتصال بالخادم");
    } finally {
      setAddingTypeBusy(false);
    }
  }

  const recentRecords = useMemo(() => [...records].sort((a, b) => b.year - a.year), [records]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-ink sm:text-2xl">إدخال البيانات</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          اختر السنة ونوع الحيوان، ثم أدخل عدد المواليد وحالات النفوق وكمية الأعلاف
        </p>
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-secondary">السنة</label>
            {!useCustomYear ? (
              <select
                value={year}
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setUseCustomYear(true);
                  } else {
                    setYear(Number(e.target.value));
                  }
                }}
                className="rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="custom">سنة أخرى…</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={customYear}
                  onChange={(e) => setCustomYear(e.target.value)}
                  placeholder="مثال: 2027"
                  className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomYear(false);
                    setCustomYear("");
                  }}
                  className="shrink-0 rounded-xl border border-hairline px-3 text-sm text-ink-secondary hover:bg-surface-2"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-secondary">نوع الحيوان</label>
            {!addingType ? (
              <div className="flex gap-2">
                <select
                  value={animalTypeId ?? ""}
                  onChange={(e) => setAnimalTypeId(Number(e.target.value))}
                  className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
                >
                  {animalTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name_ar}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingType(true)}
                  className="shrink-0 rounded-xl border border-hairline px-3 text-ink-secondary hover:bg-surface-2"
                  aria-label="إضافة نوع حيوان جديد"
                  title="إضافة نوع حيوان جديد"
                >
                  <Plus size={18} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddType} className="flex gap-2">
                <input
                  autoFocus
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="اسم نوع الحيوان الجديد"
                  className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
                />
                <button
                  type="submit"
                  disabled={addingTypeBusy}
                  className="shrink-0 rounded-xl bg-[var(--series-1)] px-3 text-white disabled:opacity-60"
                  aria-label="حفظ نوع الحيوان"
                >
                  <Save size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingType(false);
                    setNewTypeName("");
                  }}
                  className="shrink-0 rounded-xl border border-hairline px-3 text-ink-secondary hover:bg-surface-2"
                  aria-label="إلغاء"
                >
                  <X size={18} />
                </button>
              </form>
            )}
          </div>
        </div>

        <EntryFields
          key={`${effectiveYear}:${animalTypeId}`}
          existingRecord={existingRecord}
          onSave={handleSave}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-ink">آخر البيانات المدخلة</h3>
        <RecordsTable
          records={recentRecords}
          onEdit={loadRecordIntoForm}
          onDelete={setPendingDelete}
          emptyDescription="أدخل أول سجل باستخدام النموذج أعلاه."
        />
      </div>

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

function EntryFields({
  existingRecord,
  onSave,
}: {
  existingRecord?: ProductionRecordWithType;
  onSave: (values: { births: number; deaths: number; feedQuantity: number }) => Promise<boolean>;
}) {
  const { show } = useToast();
  const isEditing = existingRecord !== undefined;
  const [births, setBirths] = useState(existingRecord ? String(existingRecord.births) : "");
  const [deaths, setDeaths] = useState(existingRecord ? String(existingRecord.deaths) : "");
  const [feedQuantity, setFeedQuantity] = useState(existingRecord ? String(existingRecord.feed_quantity) : "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (births === "" || deaths === "" || feedQuantity === "") {
      show("error", "الرجاء تعبئة جميع الحقول");
      return;
    }
    setSaving(true);
    await onSave({ births: Number(births), deaths: Number(deaths), feedQuantity: Number(feedQuantity) });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-secondary">عدد المواليد</label>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={births}
          onChange={(e) => setBirths(e.target.value)}
          placeholder="0"
          className="rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-secondary">عدد حالات النفوق</label>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={deaths}
          onChange={(e) => setDeaths(e.target.value)}
          placeholder="0"
          className="rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-ink-secondary">كمية الأعلاف (كجم)</label>
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={feedQuantity}
          onChange={(e) => setFeedQuantity(e.target.value)}
          placeholder="0"
          className="rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-[var(--series-1)]"
        />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--series-1)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          <Save size={16} />
          {saving ? "جارٍ الحفظ…" : isEditing ? "تحديث البيانات" : "حفظ البيانات"}
        </button>
      </div>

      {isEditing && (
        <p className="sm:col-span-2 -mt-2 text-xs text-ink-muted">
          يوجد سجل محفوظ مسبقًا لهذه السنة ولهذا النوع — سيتم تحديثه بدلًا من إنشاء سجل مكرر.
        </p>
      )}
    </form>
  );
}
