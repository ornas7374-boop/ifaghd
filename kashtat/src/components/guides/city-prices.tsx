import Link from "next/link";
import { PLACE_KIND_LABEL, searchPlaces } from "@/lib/db/places";
import { formatSar } from "@/lib/money";

const cell = (v: number | null) => (v == null ? "—" : formatSar(v));

/** جدول أسعار حي لأماكن مدينة: يتحدث مع قاعدة البيانات بدل أرقام مكتوبة في النص */
export async function CityPrices({ city }: { city: string }) {
  const places = await searchPlaces({ city }).catch((err) => {
    console.error(err);
    return null;
  });
  if (!places?.length) {
    return <p className="text-ink-muted">الأسعار غير متاحة الآن. تقدر تشوفها في صفحة المدينة.</p>;
  }
  const rows = [...places].sort((a, b) => a.kind.localeCompare(b.kind));
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] text-start text-body-sm">
        <caption className="sr-only">أسعار الأماكن</caption>
        <thead className="bg-surface text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 text-start font-semibold">
              المكان
            </th>
            <th scope="col" className="px-4 py-3 text-start font-semibold">
              النوع
            </th>
            <th scope="col" className="px-4 py-3 text-start font-semibold">
              الساعة
            </th>
            <th scope="col" className="px-4 py-3 text-start font-semibold">
              اليوم
            </th>
            <th scope="col" className="px-4 py-3 text-start font-semibold">
              الليلة
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.slug} className="border-t border-border">
              <th scope="row" className="px-4 py-3 text-start font-semibold">
                <Link href={`/places/${p.slug}`} className="text-brand hover:text-brand-hover">
                  {p.title}
                </Link>
              </th>
              <td className="px-4 py-3">{PLACE_KIND_LABEL[p.kind]}</td>
              <td className="px-4 py-3">{cell(p.rates.hour)}</td>
              <td className="px-4 py-3">{cell(p.rates.day)}</td>
              <td className="px-4 py-3">{cell(p.rates.night)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
