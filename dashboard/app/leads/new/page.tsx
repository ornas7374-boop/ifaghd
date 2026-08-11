"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const FIELDS: { name: string; label: string; required?: boolean }[] = [
  { name: "company_name", label: "Company Name", required: true },
  { name: "contact_name", label: "Contact Name" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "website", label: "Website" },
  { name: "instagram", label: "Instagram" },
  { name: "business_type", label: "Business Type" },
  { name: "notes", label: "Notes" },
];

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create lead");
      router.push(`/leads/${data.lead_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>New Lead</h1>
      <form className="card" onSubmit={onSubmit}>
        {FIELDS.map((f) => (
          <div className="form-field" key={f.name}>
            <label>
              {f.label} {f.required && "*"}
            </label>
            {f.name === "notes" ? (
              <textarea
                rows={3}
                value={form[f.name] || ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              />
            ) : (
              <input
                type="text"
                required={f.required}
                value={form[f.name] || ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              />
            )}
          </div>
        ))}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add Lead"}
        </button>
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
      </form>
    </div>
  );
}
