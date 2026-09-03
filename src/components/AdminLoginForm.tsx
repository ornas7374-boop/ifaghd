"use client";

import { useState, type FormEvent } from "react";

export default function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "صار خطأ، جرّب مرة ثانية.");
        setLoading(false);
        return;
      }

      window.location.reload();
    } catch {
      setError("صار خطأ، جرّب مرة ثانية.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xs text-center" noValidate>
      <h1 className="text-xl font-black text-slate-900">لوحة الإدارة</h1>

      <label htmlFor="password" className="sr-only">
        كلمة المرور
      </label>
      <input
        id="password"
        type="password"
        required
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        dir="ltr"
        className="mt-6 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-base outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />

      <button
        type="submit"
        disabled={loading}
        className="mt-3 w-full rounded-2xl bg-amber-500 px-5 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "لحظة…" : "دخول"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}
