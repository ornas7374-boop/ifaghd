"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "error";

export default function EmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "صار خطأ بسيط، جرّب مرة ثانية.");
        setStatus("error");
        return;
      }

      router.push("/course");
    } catch {
      setError("صار خطأ بسيط، جرّب مرة ثانية.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <label htmlFor="email" className="sr-only">
        اكتب إيميلك
      </label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="اكتب إيميلك"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        dir="ltr"
        className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-end text-base text-slate-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "لحظة…" : "استلم الكورس مجانًا"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm font-medium text-rose-600">
          {error}
        </p>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <span aria-hidden>🔒</span>
        الكورس مجاني ١٠٠٪ — ما نحتاج منك إلا إيميلك للوصول له.
      </p>
    </form>
  );
}
