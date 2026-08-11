"use client";

import { useState } from "react";

export default function ImportCsvPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <h1>Import Leads from CSV</h1>
      <div className="card">
        <p className="muted">
          CSV header row should use these column names (all optional except <code>company_name</code>):
        </p>
        <p className="small muted">
          company_name, contact_name, phone, email, website, instagram, business_type, source, notes
        </p>
        <div className="form-field">
          <label>Choose CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
        </div>
        {busy && <p>Importing…</p>}
        {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
        {result && (
          <div>
            <p>
              Imported {result.imported} of {result.total} rows.
            </p>
            {result.errors.length > 0 && (
              <ul className="small" style={{ color: "var(--bad)" }}>
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            <a href="/leads">View leads →</a>
          </div>
        )}
      </div>
    </div>
  );
}
