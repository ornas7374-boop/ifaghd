import type { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/token";
import { listSubscribers } from "@/lib/db";
import AdminLoginForm from "@/components/AdminLoginForm";

const COOKIE_NAME = "admin_session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authed = verifyAdminSession(cookieStore.get(COOKIE_NAME)?.value);

  if (!authed) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5 py-12">
        <AdminLoginForm />
      </main>
    );
  }

  const subscribers = listSubscribers();
  const opened = subscribers.filter((s) => s.gift_accessed).length;
  const totalOpens = subscribers.reduce((sum, s) => sum + s.access_count, 0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-2xl font-black text-slate-900">
        الإيميلات المسجلة ({subscribers.length})
      </h1>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center">
          <div className="text-2xl font-black text-slate-900">{subscribers.length}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">إيميلات مسجّلة</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
          <div className="text-2xl font-black text-emerald-700">{opened}</div>
          <div className="mt-1 text-xs font-medium text-emerald-600">دخلوا رابط الهدية</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
          <div className="text-2xl font-black text-amber-700">{totalOpens}</div>
          <div className="mt-1 text-xs font-medium text-amber-600">إجمالي مرات الفتح</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start font-bold">الإيميل</th>
              <th className="px-4 py-3 text-start font-bold">تاريخ التسجيل</th>
              <th className="px-4 py-3 text-start font-bold">فتح الهدية</th>
              <th className="px-4 py-3 text-start font-bold">عدد المرات</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3" dir="ltr">
                  {s.email}
                </td>
                <td className="px-4 py-3">{s.created_at}</td>
                <td className="px-4 py-3">{s.gift_accessed ? "نعم" : "لا"}</td>
                <td className="px-4 py-3">{s.access_count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {subscribers.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-400">ما فيه إيميلات مسجلة بعد.</p>
        )}
      </div>
    </main>
  );
}
