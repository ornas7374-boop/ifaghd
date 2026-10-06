import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge, BookingId, StatusBadge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { formatBookingRange } from "@/lib/booking-format";
import {
  getAdminReport,
  listAdminBookings,
  listAdminPlaces,
  listAdminReviews,
  listAdminUsers,
} from "@/lib/db/admin";
import { getRole } from "@/lib/db/owner";
import { LISTING_STATUS_META, type ListingStatus } from "@/lib/listing-status";
import { formatSar } from "@/lib/money";
import { cn } from "@/lib/cn";
import { setPlaceStatus, setReviewHidden, setUserRole } from "./actions";

export const metadata: Metadata = { title: "لوحة الإدارة", robots: { index: false } };

const TABS = [
  { id: "overview", label: "نظرة عامة" },
  { id: "places", label: "الأماكن" },
  { id: "users", label: "المستخدمون" },
  { id: "bookings", label: "الحجوزات" },
  { id: "reviews", label: "التقييمات" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const ROLE_LABEL = { customer: "عميل", host: "مالك", admin: "مدير" } as const;
const MONTH = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  month: "long",
  year: "numeric",
});
const DAY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  dateStyle: "medium",
  timeZone: "Asia/Riyadh",
});

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5 sm:p-6">
      <h2 className="text-[20px] leading-8 font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-4",
        hi ? "border-brand bg-brand-subtle" : "border-border bg-surface",
      )}
    >
      <dt className={cn("text-body-sm", hi ? "text-brand" : "text-ink-muted")}>{label}</dt>
      <dd className={cn("text-[22px] font-bold", hi && "text-brand")}>{value}</dd>
    </div>
  );
}

function ActionButton({
  action,
  fields,
  label,
  tone = "secondary",
}: {
  action: (form: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  tone?: "primary" | "secondary" | "danger";
}) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className={cn(
          "inline-flex h-9 cursor-pointer items-center rounded-md px-3 text-label font-semibold transition-colors",
          tone === "primary" && "bg-brand text-on-brand hover:bg-brand-hover",
          tone === "secondary" &&
            "border border-border-strong bg-surface-raised hover:bg-surface-overlay",
          tone === "danger" &&
            "border border-danger bg-danger-subtle text-danger hover:bg-surface-overlay",
        )}
      >
        {label}
      </button>
    </form>
  );
}

async function Overview({ db }: { db: Awaited<ReturnType<typeof requireUser>>["supabase"] }) {
  const r = await getAdminReport(db);
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="الحجوزات (غير الملغاة)" value={String(r.totals.count)} />
        <Stat label="قيمة الحجوزات" value={formatSar(r.totals.gross)} />
        <Stat label="عمولة المنصة" value={formatSar(r.totals.commission)} hi />
        <Stat label="حجوزات ملغاة" value={String(r.cancelled)} />
      </dl>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="آخر 6 أشهر">
          {r.months.length === 0 ? (
            <p className="text-ink-muted">ما فيه حجوزات في آخر 6 أشهر.</p>
          ) : (
            <table className="w-full text-body-sm">
              <thead className="text-ink-muted">
                <tr>
                  <th scope="col" className="py-2 text-start font-medium">
                    الشهر
                  </th>
                  <th scope="col" className="py-2 text-start font-medium">
                    حجوزات
                  </th>
                  <th scope="col" className="py-2 text-start font-medium">
                    القيمة
                  </th>
                  <th scope="col" className="py-2 text-start font-medium">
                    العمولة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.months.map((m) => (
                  <tr key={m.month}>
                    <td className="py-2">{MONTH.format(new Date(`${m.month}-15T12:00:00Z`))}</td>
                    <td className="py-2">{m.count}</td>
                    <td className="py-2">{formatSar(m.gross)}</td>
                    <td className="py-2">{formatSar(m.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="المدن الأعلى قيمة">
          {r.cities.length === 0 ? (
            <p className="text-ink-muted">ما فيه بيانات.</p>
          ) : (
            <table className="w-full text-body-sm">
              <thead className="text-ink-muted">
                <tr>
                  <th scope="col" className="py-2 text-start font-medium">
                    المدينة
                  </th>
                  <th scope="col" className="py-2 text-start font-medium">
                    حجوزات
                  </th>
                  <th scope="col" className="py-2 text-start font-medium">
                    القيمة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.cities.map((c) => (
                  <tr key={c.city}>
                    <td className="py-2">{c.city}</td>
                    <td className="py-2">{c.count}</td>
                    <td className="py-2">{formatSar(c.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="الأماكن حسب الحالة">
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(LISTING_STATUS_META) as ListingStatus[]).map((s) => (
              <li key={s}>
                <Link href={`/admin?tab=places&status=${s}`}>
                  <Badge tone={LISTING_STATUS_META[s].tone} dot>
                    {LISTING_STATUS_META[s].label}: {r.places[s] ?? 0}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="المستخدمون">
          <ul className="flex flex-wrap gap-2">
            {(["customer", "host", "admin"] as const).map((k) => (
              <li key={k}>
                <Badge>
                  {ROLE_LABEL[k]}: {r.users[k] ?? 0}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

async function Places({
  db,
  status,
}: {
  db: Awaited<ReturnType<typeof requireUser>>["supabase"];
  status?: ListingStatus;
}) {
  const places = await listAdminPlaces(db, status);
  return (
    <Panel title={status ? `الأماكن: ${LISTING_STATUS_META[status].label}` : "كل الأماكن"}>
      <nav aria-label="فلترة الحالة" className="flex flex-wrap gap-2">
        <Link href="/admin?tab=places" className="text-body-sm font-semibold text-brand">
          الكل
        </Link>
        {(Object.keys(LISTING_STATUS_META) as ListingStatus[]).map((s) => (
          <Link
            key={s}
            href={`/admin?tab=places&status=${s}`}
            aria-current={status === s ? "true" : undefined}
            className={cn(
              "text-body-sm",
              status === s ? "font-bold text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {LISTING_STATUS_META[s].label}
          </Link>
        ))}
      </nav>
      {places.length === 0 ? (
        <p className="text-ink-muted">ما فيه أماكن بهذي الحالة.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
          {places.map((p) => {
            const meta = LISTING_STATUS_META[p.status];
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.title}</span>
                    <Badge tone={meta.tone} dot>
                      {meta.label}
                    </Badge>
                  </div>
                  <span className="text-body-sm text-ink-muted">
                    {p.city} · {p.host} · {DAY.format(new Date(p.createdAt))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status !== "published" && (
                    <ActionButton
                      action={setPlaceStatus}
                      fields={{ id: p.id, status: "published" }}
                      label="اعتماد ونشر"
                      tone="primary"
                    />
                  )}
                  {p.status === "pending" && (
                    <ActionButton
                      action={setPlaceStatus}
                      fields={{ id: p.id, status: "rejected" }}
                      label="رفض"
                      tone="danger"
                    />
                  )}
                  {p.status === "published" && (
                    <>
                      <Link
                        href={`/places/${p.slug}`}
                        className="inline-flex h-9 items-center px-2 text-label font-semibold text-brand"
                      >
                        عرض
                      </Link>
                      <ActionButton
                        action={setPlaceStatus}
                        fields={{ id: p.id, status: "suspended" }}
                        label="إيقاف"
                        tone="danger"
                      />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

async function Users({
  db,
  me,
}: {
  db: Awaited<ReturnType<typeof requireUser>>["supabase"];
  me: string;
}) {
  const users = await listAdminUsers(db);
  return (
    <Panel title={`المستخدمون (${users.length})`}>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{u.name}</span>
                <Badge tone={u.role === "admin" ? "sand" : u.role === "host" ? "info" : "neutral"}>
                  {ROLE_LABEL[u.role]}
                </Badge>
                {u.id === me && <span className="text-caption text-ink-muted">(أنت)</span>}
              </div>
              <span dir="ltr" className="text-start text-body-sm text-ink-muted">
                {u.email ?? "—"}
                {u.phone ? ` · ${u.phone}` : ""}
              </span>
            </div>
            {u.id !== me && (
              <div className="flex flex-wrap gap-2">
                {(["customer", "host", "admin"] as const)
                  .filter((r) => r !== u.role)
                  .map((r) => (
                    <ActionButton
                      key={r}
                      action={setUserRole}
                      fields={{ id: u.id, role: r }}
                      label={`اجعله ${ROLE_LABEL[r]}`}
                    />
                  ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

async function Bookings({ db }: { db: Awaited<ReturnType<typeof requireUser>>["supabase"] }) {
  const bookings = await listAdminBookings(db);
  return (
    <Panel title={`آخر الحجوزات (${bookings.length})`}>
      {bookings.length === 0 ? (
        <p className="text-ink-muted">ما فيه حجوزات.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
          {bookings.map((b) => (
            <li
              key={b.reference}
              className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <BookingId>{b.reference}</BookingId>
                  {b.source === "customer" ? <StatusBadge status={b.status} /> : <Badge>حظر</Badge>}
                </div>
                <span className="text-body-sm font-semibold">{b.place}</span>
                <span className="text-body-sm text-ink-muted">
                  {formatBookingRange(b.start, b.end)}
                </span>
              </div>
              {b.source === "customer" && (
                <div className="flex flex-col items-end gap-0.5 text-body-sm">
                  <span>{b.customer ?? "—"}</span>
                  <span className="font-semibold">{formatSar(b.total)}</span>
                  <span className="text-ink-muted">عمولة {formatSar(b.commission)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

async function Reviews({ db }: { db: Awaited<ReturnType<typeof requireUser>>["supabase"] }) {
  const reviews = await listAdminReviews(db);
  return (
    <Panel title={`التقييمات (${reviews.length})`}>
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className={cn(
              "flex flex-col gap-2 rounded-md border border-border bg-surface p-4",
              r.hidden && "opacity-60",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body-sm">
                <span className="font-semibold">{r.place ?? "خدمة"}</span>
                <span className="text-ink-muted">
                  {" "}
                  · {r.author ?? "—"} · {r.rating} من 5
                </span>
              </span>
              {r.hidden && <Badge tone="danger">مخفي</Badge>}
            </div>
            <p className="text-body-sm">{r.body}</p>
            <div className="self-end">
              <ActionButton
                action={setReviewHidden}
                fields={{ id: r.id, hidden: r.hidden ? "false" : "true" }}
                label={r.hidden ? "إظهار" : "إخفاء"}
                tone={r.hidden ? "secondary" : "danger"}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default async function AdminPage(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const { supabase, user } = await requireUser("/admin");
  const profile = await getRole(supabase, user.id);
  // غير المدير لا يعرف أن الصفحة موجودة
  if (profile?.role !== "admin") notFound();

  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "overview";
  const status =
    typeof sp.status === "string" && sp.status in LISTING_STATUS_META
      ? (sp.status as ListingStatus)
      : undefined;

  // أخطاء التحميل تلتقطها error.tsx
  const body =
    tab === "places" ? (
      <Places db={supabase} status={status} />
    ) : tab === "users" ? (
      <Users db={supabase} me={user.id} />
    ) : tab === "bookings" ? (
      <Bookings db={supabase} />
    ) : tab === "reviews" ? (
      <Reviews db={supabase} />
    ) : (
      <Overview db={supabase} />
    );

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="mb-6 text-[clamp(28px,5vw,36px)] leading-[1.4] font-bold">لوحة الإدارة</h1>
        <nav
          aria-label="أقسام الإدارة"
          className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3"
        >
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === "overview" ? "/admin" : `/admin?tab=${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-pill px-4 text-label transition-colors",
                tab === t.id
                  ? "bg-brand-subtle font-semibold text-brand"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {body}
      </main>
      <SiteFooter />
    </>
  );
}
