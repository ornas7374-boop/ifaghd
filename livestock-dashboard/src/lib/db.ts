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

const PRODUCTION_RECORDS_SCHEMA = `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL DEFAULT 0,
  animal_type_id INTEGER NOT NULL REFERENCES animal_types(id) ON DELETE CASCADE,
  births INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  feed_quantity REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(year, month, animal_type_id)
`;

function migrateProductionRecordsTable(db: Database.Database) {
  const columns = db.prepare(`PRAGMA table_info(production_records)`).all() as { name: string }[];

  if (columns.length === 0) {
    db.exec(`CREATE TABLE production_records (${PRODUCTION_RECORDS_SCHEMA})`);
    return;
  }

  const hasMonthColumn = columns.some((c) => c.name === "month");
  if (hasMonthColumn) return;

  const migrateLegacyTable = db.transaction(() => {
    db.exec(`ALTER TABLE production_records RENAME TO production_records_legacy`);
    db.exec(`CREATE TABLE production_records (${PRODUCTION_RECORDS_SCHEMA})`);
    db.exec(`
      INSERT INTO production_records (id, year, month, animal_type_id, births, deaths, feed_quantity, created_at, updated_at)
      SELECT id, year, 0, animal_type_id, births, deaths, feed_quantity, created_at, updated_at
      FROM production_records_legacy
    `);
    db.exec(`DROP TABLE production_records_legacy`);
  });
  migrateLegacyTable();
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS animal_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  migrateProductionRecordsTable(db);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_year ON production_records(year);
    CREATE INDEX IF NOT EXISTS idx_records_year_month ON production_records(year, month);
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
