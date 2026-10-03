import { Button, ButtonLink } from "@/components/ui/button";
import { controlClasses } from "@/components/ui/control-classes";
import { GetForm } from "@/components/ui/get-form";
import { ChevronDownIcon } from "@/components/ui/icons";
import {
  PLACE_KINDS,
  PLACE_KIND_LABEL,
  RATE_UNIT_LABEL,
  RATE_UNITS,
  type Option,
} from "@/lib/db/places";
import type { SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/cn";

const labelCls = "text-label font-semibold";

function SelectBox({
  id,
  name,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        className={cn(controlClasses, "appearance-none pe-10")}
      >
        {children}
      </select>
      <ChevronDownIcon
        size={18}
        className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}

/** نموذج GET عادي: يعمل بدون JavaScript، والرابط قابل للمشاركة */
export function SearchFilters({
  params,
  cities,
  amenities,
  idPrefix,
}: {
  /** يميّز معرّفات الحقول عند عرض النموذج مرتين (جوال وسطح مكتب) */
  idPrefix: string;
  params: SearchParams;
  cities: Option[];
  amenities: Option[];
}) {
  return (
    <GetForm action="/places" className="flex flex-col gap-5" aria-label="فلترة الأماكن">
      {/* معاملات الحجز تبقى كما هي عند تغيير الفلاتر */}
      {params.date && <input type="hidden" name="date" value={params.date} />}
      {params.from && <input type="hidden" name="from" value={params.from} />}
      {params.duration && <input type="hidden" name="duration" value={params.duration} />}
      {params.sort && <input type="hidden" name="sort" value={params.sort} />}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-q`} className={labelCls}>
          ابحث بالاسم أو المدينة
        </label>
        <input
          id={`${idPrefix}-q`}
          name="q"
          defaultValue={params.q}
          placeholder="مثال: الثمامة"
          className={controlClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-city`} className={labelCls}>
          المدينة
        </label>
        <SelectBox id={`${idPrefix}-city`} name="city" defaultValue={params.city}>
          <option value="">كل المدن</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </SelectBox>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(labelCls, "mb-2")}>نوع المكان</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "", l: "الكل" },
            ...PLACE_KINDS.map((k) => ({ v: k, l: PLACE_KIND_LABEL[k] })),
          ].map((o) => (
            <label key={o.v || "all"} className="cursor-pointer">
              <input
                type="radio"
                name="kind"
                value={o.v}
                defaultChecked={(params.kind ?? "") === o.v}
                className="peer sr-only"
              />
              <span className="inline-flex h-11 items-center rounded-pill border border-border-strong px-4 text-label text-ink-muted peer-checked:border-brand peer-checked:bg-brand-subtle peer-checked:font-semibold peer-checked:text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                {o.l}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-type`} className={labelCls}>
          نوع الحجز
        </label>
        <SelectBox id={`${idPrefix}-type`} name="type" defaultValue={params.type}>
          <option value="">أي نوع</option>
          {RATE_UNITS.map((u) => (
            <option key={u} value={u}>
              بـ{RATE_UNIT_LABEL[u]}
            </option>
          ))}
        </SelectBox>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${idPrefix}-guests`} className={labelCls}>
            عدد الأشخاص
          </label>
          <input
            id={`${idPrefix}-guests`}
            name="guests"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={params.guests}
            className={controlClasses}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${idPrefix}-max`} className={labelCls}>
            أعلى سعر (ر.س)
          </label>
          <input
            id={`${idPrefix}-max`}
            name="maxPrice"
            type="number"
            inputMode="numeric"
            min={1}
            step={50}
            defaultValue={params.maxPrice}
            className={controlClasses}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(labelCls, "mb-2")}>المرافق</legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {amenities.map((a) => (
            <label
              key={a.slug}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 text-body-sm"
            >
              <input
                type="checkbox"
                name="amenity"
                value={a.slug}
                defaultChecked={params.amenities.includes(a.slug)}
                className="size-[18px] accent-[var(--brand)]"
              />
              {a.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" className="grow">
          طبّق الفلاتر
        </Button>
        <ButtonLink href="/places" variant="ghost">
          مسح
        </ButtonLink>
      </div>
    </GetForm>
  );
}
