import type { NextFunction, Request, Response } from 'express';
import { AppError, toErrorInfo } from '../../utils/errors.js';
import { logger } from '../../observability/logger.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
}

/**
 * Terminal error handler. Deliberate AppErrors keep their message; anything
 * else is reported as a generic 500 so internal details never reach a caller.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const info = toErrorInfo(err);
  const status = err instanceof AppError ? err.status : 500;

  const log = logger();
  if (status >= 500) log.error({ err: info, path: req.path, method: req.method }, 'request failed');
  else log.warn({ err: info, path: req.path, method: req.method }, 'request rejected');

  if (res.headersSent) return;

  res.status(status).json({
    error: {
      code: info.code,
      message: status >= 500 ? 'Internal server error' : info.message,
      ...(status < 500 && Object.keys(info.details).length ? { details: info.details } : {}),
    },
  });
}

/** Wrap an async handler so rejections reach errorHandler. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
}
