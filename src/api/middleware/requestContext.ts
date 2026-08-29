import type { NextFunction, Request, Response } from 'express';
import { newTraceId } from '../../utils/ids.js';
import { logger } from '../../observability/logger.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      traceId: string;
      startedAt: number;
    }
  }
}

/** Attach a trace id (honouring an upstream one from n8n) and log timings. */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  req.traceId = req.header('x-trace-id') ?? newTraceId();
  req.startedAt = Date.now();
  res.setHeader('x-trace-id', req.traceId);

  res.on('finish', () => {
    const durationMs = Date.now() - req.startedAt;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger()[level](
      { traceId: req.traceId, method: req.method, path: req.path, status: res.statusCode, durationMs },
      'request',
    );
  });

  next();
}
