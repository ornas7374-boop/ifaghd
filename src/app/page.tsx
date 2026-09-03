import EmailForm from "@/components/EmailForm";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-3xl">
          🎁
        </div>

        <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
          هديتك المجانية جاهزة 🎁
        </h1>

        <p className="mx-auto mt-4 max-w-xs text-base leading-relaxed text-slate-600">
          أدخل إيميلك وخذ الهدية مباشرة — بدون تسجيل ولا خطوات معقدة.
        </p>

        <div className="mt-8 flex justify-center">
          <EmailForm />
        </div>
      </div>
    </main>
  );
}
