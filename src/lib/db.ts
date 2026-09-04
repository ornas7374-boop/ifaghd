import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export interface Subscriber {
  id: number;
  email: string;
  created_at: string;
  gift_accessed: number;
  access_count: number;
}

// Opened lazily (not at module load) so `next build` never touches the
// database file. Build collects route data across several parallel
// workers, and each one importing this module would otherwise open the
// same SQLite file and race to run the same DDL — that's exactly what
// produced an intermittent SQLITE_BUSY build failure.
const globalForDb = globalThis as unknown as {
  __giftDb?: Database.Database;
  __giftDbStmts?: ReturnType<typeof prepareStatements>;
};

function openDb(): Database.Database {
  const dbPath = process.env.DB_PATH || "./data/app.db";
  fs.mkdirSync(
    path.dirname(/* turbopackIgnore: true */ dbPath),
    { recursive: true }
  );
  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      gift_accessed INTEGER NOT NULL DEFAULT 0,
      access_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  return database;
}

function prepareStatements(database: Database.Database) {
  return {
    insert: database.prepare(`INSERT OR IGNORE INTO subscribers (email) VALUES (?)`),
    select: database.prepare(`SELECT * FROM subscribers WHERE email = ?`),
    markAccessed: database.prepare(
      `UPDATE subscribers
       SET gift_accessed = 1, access_count = access_count + 1
       WHERE email = ?`
    ),
    listAll: database.prepare(`SELECT * FROM subscribers ORDER BY created_at DESC`),
  };
}

function stmts() {
  if (!globalForDb.__giftDb) {
    globalForDb.__giftDb = openDb();
  }
  if (!globalForDb.__giftDbStmts) {
    globalForDb.__giftDbStmts = prepareStatements(globalForDb.__giftDb);
  }
  return globalForDb.__giftDbStmts;
}

/** Insert the email if it's new, otherwise leave the existing row untouched. Never creates a duplicate. */
export function upsertSubscriber(email: string): { subscriber: Subscriber; isNew: boolean } {
  const s = stmts();
  const result = s.insert.run(email);
  const subscriber = s.select.get(email) as Subscriber;
  return { subscriber, isNew: result.changes > 0 };
}

export function getSubscriber(email: string): Subscriber | undefined {
  return stmts().select.get(email) as Subscriber | undefined;
}

/** Record one visit to the gift page for this email. */
export function recordGiftAccess(email: string): void {
  stmts().markAccessed.run(email);
}

export function listSubscribers(): Subscriber[] {
  return stmts().listAll.all() as Subscriber[];
}
