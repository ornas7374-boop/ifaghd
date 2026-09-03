import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DB_PATH || "./data/app.db";

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// A single shared connection. better-sqlite3 is synchronous, so this is
// safe to reuse across requests within one Node process.
const globalForDb = globalThis as unknown as { __giftDb?: Database.Database };

export const db = globalForDb.__giftDb ?? new Database(DB_PATH);
globalForDb.__giftDb = db;

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    gift_accessed INTEGER NOT NULL DEFAULT 0,
    access_count INTEGER NOT NULL DEFAULT 0
  );
`);

export interface Subscriber {
  id: number;
  email: string;
  created_at: string;
  gift_accessed: number;
  access_count: number;
}

const insertStmt = db.prepare(
  `INSERT OR IGNORE INTO subscribers (email) VALUES (?)`
);
const selectStmt = db.prepare(
  `SELECT * FROM subscribers WHERE email = ?`
);
const markAccessedStmt = db.prepare(
  `UPDATE subscribers
   SET gift_accessed = 1, access_count = access_count + 1
   WHERE email = ?`
);

/** Insert the email if it's new, otherwise leave the existing row untouched. Never creates a duplicate. */
export function upsertSubscriber(email: string): { subscriber: Subscriber; isNew: boolean } {
  const result = insertStmt.run(email);
  const subscriber = selectStmt.get(email) as Subscriber;
  return { subscriber, isNew: result.changes > 0 };
}

export function getSubscriber(email: string): Subscriber | undefined {
  return selectStmt.get(email) as Subscriber | undefined;
}

/** Record one visit to the gift page for this email. */
export function recordGiftAccess(email: string): void {
  markAccessedStmt.run(email);
}

export function listSubscribers(): Subscriber[] {
  return db
    .prepare(`SELECT * FROM subscribers ORDER BY created_at DESC`)
    .all() as Subscriber[];
}
