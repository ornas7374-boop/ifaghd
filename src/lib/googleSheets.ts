// Optional, free "Google Sheets as a database" sync. If GOOGLE_SHEETS_WEBHOOK_URL
// isn't set, this is a no-op — the app works fine with just SQLite. Set it once
// you've deployed google-apps-script/subscribers-sync.gs as a Web App (see README).
export async function syncToGoogleSheet(email: string): Promise<void> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!url) return;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, created_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    throw new Error(`google sheets webhook responded with ${res.status}`);
  }
}
