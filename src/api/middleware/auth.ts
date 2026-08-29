import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AuthError } from '../../utils/errors.js';

/**
 * Shared-secret auth for the internal API that n8n and the staff console call.
 * Constant-time compare so the key cannot be recovered by timing.
 */
export function requireInternalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('x-api-key') ?? bearer(req.header('authorization'));
  const expected = env().INTERNAL_API_KEY;

  if (!header || !safeEqual(header, expected)) {
    next(new AuthError('invalid or missing API key'));
    return;
  }
  next();
}

function bearer(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [scheme, token] = value.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
