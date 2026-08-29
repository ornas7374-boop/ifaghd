/** Base class for errors we raise deliberately (as opposed to bugs). */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;
  /** true when a retry could plausibly succeed (network blips, 5xx, 429). */
  readonly retryable: boolean;

  constructor(
    message: string,
    opts: { code?: string; status?: number; details?: Record<string, unknown>; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = new.target.name;
    this.code = opts.code ?? 'internal_error';
    this.status = opts.status ?? 500;
    this.details = opts.details ?? {};
    this.retryable = opts.retryable ?? false;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message, { code: 'validation_error', status: 400, details });
  }
}

export class AuthError extends AppError {
  constructor(message = 'unauthorized') {
    super(message, { code: 'unauthorized', status: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'forbidden', details: Record<string, unknown> = {}) {
    super(message, { code: 'forbidden', status: 403, details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'not found', details: Record<string, unknown> = {}) {
    super(message, { code: 'not_found', status: 404, details });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'rate limit exceeded', details: Record<string, unknown> = {}) {
    super(message, { code: 'rate_limited', status: 429, details, retryable: true });
  }
}

export class UpstreamError extends AppError {
  constructor(message: string, opts: { code?: string; details?: Record<string, unknown>; retryable?: boolean; cause?: unknown } = {}) {
    super(message, {
      code: opts.code ?? 'upstream_error',
      status: 502,
      details: opts.details ?? {},
      retryable: opts.retryable ?? true,
      cause: opts.cause,
    });
  }
}

export function toErrorInfo(err: unknown): { message: string; code: string; retryable: boolean; details: Record<string, unknown> } {
  if (err instanceof AppError) {
    return { message: err.message, code: err.code, retryable: err.retryable, details: err.details };
  }
  if (err instanceof Error) {
    return { message: err.message, code: 'internal_error', retryable: false, details: {} };
  }
  return { message: String(err), code: 'unknown_error', retryable: false, details: {} };
}
