import { getDb } from "./db";
import type { AnimalType, ProductionRecordWithType, RecordInput } from "./types";

const RECORD_SELECT = `
  SELECT r.id, r.year, r.animal_type_id, r.births, r.deaths, r.feed_quantity,
         r.created_at, r.updated_at,
         a.key AS animal_type_key, a.name_ar AS animal_type_name
  FROM production_records r
  JOIN animal_types a ON a.id = r.animal_type_id
`;

export function listAnimalTypes(): AnimalType[] {
  return getDb()
    .prepare(`SELECT id, key, name_ar, sort_order FROM animal_types ORDER BY sort_order ASC, id ASC`)
    .all() as AnimalType[];
}

function slugify(nameAr: string): string {
  const base = nameAr
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
  return `${base || "type"}-${Date.now().toString(36)}`;
}

export function createAnimalType(nameAr: string): AnimalType {
  const db = getDb();
  const trimmed = nameAr.trim();
  const existing = db
    .prepare(`SELECT id, key, name_ar, sort_order FROM animal_types WHERE name_ar = ?`)
    .get(trimmed) as AnimalType | undefined;
  if (existing) return existing;

  const maxOrder = (
    db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM animal_types`).get() as { m: number }
  ).m;
  const info = db
    .prepare(`INSERT INTO animal_types (key, name_ar, sort_order) VALUES (?, ?, ?)`)
    .run(slugify(trimmed), trimmed, maxOrder + 1);
  return db
    .prepare(`SELECT id, key, name_ar, sort_order FROM animal_types WHERE id = ?`)
    .get(info.lastInsertRowid) as AnimalType;
}

export function listRecords(
  filters: { year?: number; animalTypeId?: number } = {}
): ProductionRecordWithType[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters.year) {
    clauses.push("r.year = @year");
    params.year = filters.year;
  }
  if (filters.animalTypeId) {
    clauses.push("r.animal_type_id = @animalTypeId");
    params.animalTypeId = filters.animalTypeId;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`${RECORD_SELECT} ${where} ORDER BY r.year DESC, a.sort_order ASC`)
    .all(params) as ProductionRecordWithType[];
}

export function getRecordById(id: number): ProductionRecordWithType | undefined {
  return getDb().prepare(`${RECORD_SELECT} WHERE r.id = ?`).get(id) as
    | ProductionRecordWithType
    | undefined;
}

export function findRecord(year: number, animalTypeId: number): ProductionRecordWithType | undefined {
  return getDb()
    .prepare(`${RECORD_SELECT} WHERE r.year = ? AND r.animal_type_id = ?`)
    .get(year, animalTypeId) as ProductionRecordWithType | undefined;
}

export function upsertRecord(input: RecordInput): { id: number; created: boolean } {
  const db = getDb();
  const existing = findRecord(input.year, input.animalTypeId);
  if (existing) {
    db.prepare(
      `UPDATE production_records SET births = ?, deaths = ?, feed_quantity = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(input.births, input.deaths, input.feedQuantity, existing.id);
    return { id: existing.id, created: false };
  }
  const info = db
    .prepare(
      `INSERT INTO production_records (year, animal_type_id, births, deaths, feed_quantity) VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.year, input.animalTypeId, input.births, input.deaths, input.feedQuantity);
  return { id: info.lastInsertRowid as number, created: true };
}

export function updateRecordById(
  id: number,
  input: { births: number; deaths: number; feedQuantity: number }
): void {
  getDb()
    .prepare(
      `UPDATE production_records SET births = ?, deaths = ?, feed_quantity = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(input.births, input.deaths, input.feedQuantity, id);
}

export function deleteRecordById(id: number): void {
  getDb().prepare(`DELETE FROM production_records WHERE id = ?`).run(id);
}

export function listYears(): number[] {
  const rows = getDb()
    .prepare(`SELECT DISTINCT year FROM production_records ORDER BY year DESC`)
    .all() as { year: number }[];
  return rows.map((r) => r.year);
}
