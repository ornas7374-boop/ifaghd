// Prints every registered email straight from the SQLite database.
// Usage: npm run subscribers
import Database from "better-sqlite3";
import fs from "node:fs";

const DB_PATH = process.env.DB_PATH || "./data/app.db";

if (!fs.existsSync(DB_PATH)) {
  console.log(`ما فيه قاعدة بيانات بعد على ${DB_PATH} — شغّل التطبيق واستقبل أول إيميل أولاً.`);
  process.exit(0);
}

const db = new Database(DB_PATH, { readonly: true });
const rows = db.prepare(`SELECT * FROM subscribers ORDER BY created_at DESC`).all();

if (rows.length === 0) {
  console.log("ما فيه إيميلات مسجلة بعد.");
} else {
  console.log(`إجمالي المسجلين: ${rows.length}\n`);
  console.table(
    rows.map((r) => ({
      email: r.email,
      created_at: r.created_at,
      gift_accessed: r.gift_accessed ? "نعم" : "لا",
      access_count: r.access_count,
    }))
  );
}
