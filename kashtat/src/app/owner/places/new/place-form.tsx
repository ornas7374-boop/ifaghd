"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { controlClasses } from "@/components/ui/control-classes";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { createPlace, type PlaceFormState } from "../../actions";

type Option = { slug: string; name: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 sm:p-6">
      <legend className="float-start mb-1 w-full text-[18px] font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function TextArea({
  id,
  label,
  name,
  defaultValue,
  rows = 4,
  hint,
  required,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(controlClasses, "h-auto py-3 leading-[26px]")}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-body-sm text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

const KINDS = [
  { value: "kashta", label: "كشتة" },
  { value: "camp", label: "مخيم" },
  { value: "wild", label: "موقع بري" },
];

export function PlaceForm({ cities, amenities }: { cities: Option[]; amenities: Option[] }) {
  const [state, action, pending] = useActionState<PlaceFormState, FormData>(createPlace, {});
  const v = (k: string) => {
    const x = state.values?.[k];
    return typeof x === "string" ? x : undefined;
  };
  const picked = (state.values?.amenities as string[] | undefined) ?? [];

  return (
    <form key={state.nonce ?? 0} action={action} className="flex flex-col gap-5">
      <Section title="المعلومات الأساسية">
        <Input label="اسم المكان" name="title" required maxLength={80} defaultValue={v("title")} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Select label="النوع" name="kind" defaultValue={v("kind") ?? "kashta"} options={KINDS} />
          <Select
            label="المدينة"
            name="city"
            defaultValue={v("city") ?? ""}
            placeholder="اختر المدينة"
            options={cities.map((c) => ({ value: c.slug, label: c.name }))}
          />
        </div>
        <Input
          label="العنوان"
          name="address"
          required
          placeholder="مثال: طريق الثمامة، شمال الرياض"
          defaultValue={v("address")}
        />
        <TextArea
          id="description"
          label="الوصف"
          name="description"
          required
          defaultValue={v("description")}
          hint="وش يميز المكان؟ الجلسات، الإطلالة، الخدمات، طريقة الوصول."
        />
      </Section>

      <Section title="السعة والأوقات">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Input
            label="أقل عدد أشخاص"
            name="capacityMin"
            type="number"
            min={1}
            defaultValue={v("capacityMin") ?? "2"}
          />
          <Input
            label="أكثر عدد أشخاص"
            name="capacityMax"
            type="number"
            min={1}
            defaultValue={v("capacityMax") ?? "20"}
          />
          <Input
            label="التجهيز بين الحجوزات (دقيقة)"
            name="turnaround"
            type="number"
            min={0}
            step={15}
            defaultValue={v("turnaround") ?? "60"}
          />
          <Input
            label="وقت الدخول"
            name="checkIn"
            type="time"
            defaultValue={v("checkIn") ?? "16:00"}
          />
          <Input
            label="وقت الخروج"
            name="checkOut"
            type="time"
            defaultValue={v("checkOut") ?? "12:00"}
          />
        </div>
      </Section>

      <Section title="الأسعار (ر.س)">
        <p className="-mt-2 text-body-sm text-ink-muted">
          اترك الخانة فاضية إذا ما تقدم هذا النوع من الحجز.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          <Input
            label="بالساعة"
            name="priceHour"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={v("priceHour")}
          />
          <Input
            label="باليوم"
            name="priceDay"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={v("priceDay")}
          />
          <Input
            label="بالليلة"
            name="priceNight"
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={v("priceNight")}
          />
        </div>
      </Section>

      <Section title="المرافق">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.slug} className="flex min-h-11 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                name="amenity"
                value={a.slug}
                defaultChecked={picked.includes(a.slug)}
                className="size-[18px] accent-[var(--brand)]"
              />
              {a.name}
            </label>
          ))}
        </div>
      </Section>

      <Section title="الشروط">
        <TextArea
          id="cancellation"
          label="سياسة الإلغاء"
          name="cancellation"
          rows={2}
          required
          defaultValue={v("cancellation") ?? "إلغاء مجاني حتى 48 ساعة قبل الموعد. بعدها يُخصم 50%."}
        />
        <TextArea
          id="rules"
          label="قواعد المكان (اختياري)"
          name="rules"
          rows={2}
          defaultValue={v("rules")}
        />
      </Section>

      <p className="rounded-md bg-info-subtle px-4 py-3 text-body-sm text-info">
        نسخة تدريبية: الصور تُضاف تلقائيًا من مجموعة صور جاهزة.
      </p>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-subtle px-4 py-3 text-danger">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="submit" value="pending" size="lg" loading={pending}>
          أرسل للمراجعة
        </Button>
        <Button
          type="submit"
          name="submit"
          value="draft"
          size="lg"
          variant="secondary"
          disabled={pending}
        >
          احفظ كمسودة
        </Button>
      </div>
    </form>
  );
}
