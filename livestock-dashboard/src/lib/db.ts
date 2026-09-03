import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "livestock.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

declare global {
  var __livestockDb: Database.Database | undefined;
}

const DEFAULT_ANIMAL_TYPES = [
  { key: "cattle", name_ar: "الأبقار", sort_order: 1 },
  { key: "sheep", name_ar: "الأغنام", sort_order: 2 },
  { key: "camel", name_ar: "الإبل", sort_order: 3 },
  { key: "horse", name_ar: "الخيل", sort_order: 4 },
];

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS animal_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS production_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      animal_type_id INTEGER NOT NULL REFERENCES animal_types(id) ON DELETE CASCADE,
      births INTEGER NOT NULL DEFAULT 0,
      deaths INTEGER NOT NULL DEFAULT 0,
      feed_quantity REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(year, animal_type_id)
    );

    CREATE INDEX IF NOT EXISTS idx_records_year ON production_records(year);
    CREATE INDEX IF NOT EXISTS idx_records_animal_type ON production_records(animal_type_id);
  `);

  const insert = db.prepare(
    `INSERT OR IGNORE INTO animal_types (key, name_ar, sort_order) VALUES (@key, @name_ar, @sort_order)`
  );
  const insertMany = db.transaction((rows: typeof DEFAULT_ANIMAL_TYPES) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(DEFAULT_ANIMAL_TYPES);
}

function createConnection() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__livestockDb) {
    global.__livestockDb = createConnection();
  }
  return global.__livestockDb;
}
