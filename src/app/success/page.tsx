// صفحة نجاح — تظهر بعد ما يسجّل الشخص إيميله بنجاح.
export default function SuccessPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-3xl">
          ✅
        </div>

        <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
          تم تسجيلك بنجاح!
        </h1>

        <p className="mx-auto mt-4 max-w-xs text-base leading-relaxed text-slate-600">
          إيميلك محفوظ، وراح تستلم الهدية قريبًا.
        </p>
      </div>
    </main>
  );
}
