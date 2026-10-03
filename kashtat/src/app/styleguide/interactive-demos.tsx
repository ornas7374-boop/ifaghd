"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { addDays, startOfDay } from "@/lib/dates";

export function FormDemo() {
  const [date, setDate] = useState<Date | null>(null);
  const today = startOfDay(new Date());

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-start gap-4">
      <Input label="المدينة أو الموقع" placeholder="مثال: العلا، الرياض، الثمامة" />
      <Input
        label="عدد الأشخاص"
        type="number"
        min={1}
        inputMode="numeric"
        placeholder="6"
        hint="الحد الأقصى يختلف حسب المكان"
      />
      <Select
        label="نوع المكان"
        defaultValue=""
        placeholder="اختر النوع"
        options={[
          { value: "camp", label: "مخيم" },
          { value: "rest-house", label: "استراحة" },
          { value: "chalet", label: "شاليه" },
          { value: "wild", label: "موقع بري" },
        ]}
      />
      <DatePicker
        label="التاريخ"
        value={date}
        onChange={setDate}
        name="date"
        minDate={today}
        maxDate={addDays(today, 180)}
        hint="لا يمكن اختيار تاريخ مضى"
      />
      <Input
        label="رقم الجوال"
        type="tel"
        dir="ltr"
        defaultValue="05"
        error="رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05"
      />
      <Input label="حقل معطّل" disabled placeholder="غير متاح" />
    </div>
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        افتح نافذة تأكيد
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إلغاء الحجز؟"
        description="سياسة الإلغاء تختلف حسب المكان، والمبلغ المسترد يظهر قبل التأكيد."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              تراجع
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              تأكيد الإلغاء
            </Button>
          </>
        }
      >
        <p className="text-body text-ink-muted">المبلغ المسترد: [يُحسب من سياسة المكان]</p>
      </Modal>
    </>
  );
}

export function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: "success",
            title: "تم تأكيد الحجز",
            description: "أرسلنا التفاصيل لبريدك.",
          })
        }
      >
        نجاح
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: "warning",
            title: "بانتظار الدفع",
            description: "الوقت محجوز لك 10 دقائق.",
          })
        }
      >
        تنبيه
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: "error",
            title: "تعذّر الدفع",
            description: "جرّب بطاقة أخرى أو Apple Pay.",
          })
        }
      >
        خطأ
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ tone: "info", title: "تم حفظ التغييرات" })}
      >
        معلومة
      </Button>
    </div>
  );
}

export function LoadingButtonDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      loading={loading}
      onClick={() => {
        setLoading(true);
        setTimeout(() => setLoading(false), 1500);
      }}
    >
      {loading ? "جارٍ الحجز…" : "أكمل الحجز"}
    </Button>
  );
}
