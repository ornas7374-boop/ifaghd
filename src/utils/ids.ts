import { randomUUID, randomBytes } from 'node:crypto';

export function newTraceId(): string {
  return `trc_${randomBytes(10).toString('hex')}`;
}

export function newUuid(): string {
  return randomUUID();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
