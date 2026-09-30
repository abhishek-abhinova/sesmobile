import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/auth';

/* -------------------------------------------------------------------------- */
/*  Uniform API envelope                                                      */
/* -------------------------------------------------------------------------- */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
} as const;

export function jsonOk<T>(data: T, meta?: Record<string, unknown>, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true as const, data, ...(meta ? { meta } : {}) }, { status, headers: JSON_HEADERS });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  extra?: { fieldErrors?: Record<string, string[]>; details?: unknown },
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      ok: false as const,
      error: { code, message, ...(extra?.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}), ...(extra?.details ? { details: extra.details } : {}) },
    },
    { status, headers: JSON_HEADERS },
  );
}

export const ErrorCodes = {
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR',
  CSRF: 'CSRF_FAILED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  DB: 'DATABASE_ERROR',
} as const;

/* -------------------------------------------------------------------------- */
/*  Handlers                                                                  */
/* -------------------------------------------------------------------------- */

export interface HandlerContext {
  params?: Record<string, string | undefined>;
}

/**
 * Wraps a route handler with error normalisation and security headers.
 *
 * The returned function deliberately declares only the `Request` parameter:
 * Next 15 passes a framework-owned context object as the second argument,
 * and exposing it here would force our own context type onto the generated
 * route-type check, which then rejects every handler.
 */
export function withApi(handler: (req: Request, ctx: HandlerContext) => Promise<NextResponse>) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const res = await handler(req, {});
      res.headers.set('X-Content-Type-Options', 'nosniff');
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return jsonError(ErrorCodes.VALIDATION, 'Some of the submitted details are invalid.', 422, { fieldErrors });
  }

  if (error instanceof AuthError) {
    const code = error.status === 401 ? ErrorCodes.UNAUTHORIZED : ErrorCodes.FORBIDDEN;
    return jsonError(code, error.message, error.status);
  }

  if (error instanceof ApiError) {
    return jsonError(error.code, error.message, error.status, {
      fieldErrors: error.fieldErrors,
      details: error.details,
    });
  }

  // Prisma known errors
  if (isPrismaError(error)) {
    const mapped = mapPrismaError(error as { code: string; meta?: Record<string, unknown> });
    if (mapped) return mapped;
  }

  if (error instanceof Error) {
    if (error.message.includes('PrismaClientKnownRequestError')) {
      const mapped = mapPrismaError(error as unknown as { code: string });
      if (mapped) return mapped;
    }
    if (process.env.NODE_ENV !== 'production') {
      // Surface the real message in dev so failures are debuggable.
      return jsonError(ErrorCodes.INTERNAL, error.message, 500, {
        details: { stack: error.stack?.split('\n').slice(0, 5) },
      });
    }
  }

  return jsonError(ErrorCodes.INTERNAL, 'Something went wrong. Please try again.', 500);
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly fieldErrors?: Record<string, string[]>,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const notFound = (what = 'Resource') => new ApiError(ErrorCodes.NOT_FOUND, `${what} not found.`, 404);
export const forbidden = (msg = 'You do not have permission to do that.') => new ApiError(ErrorCodes.FORBIDDEN, msg, 403);
export const unauthorized = (msg = 'Authentication required.') => new ApiError(ErrorCodes.UNAUTHORIZED, msg, 401);
export const conflict = (msg: string) => new ApiError(ErrorCodes.CONFLICT, msg, 409);

function isPrismaError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: unknown }).code === 'string';
}

function mapPrismaError(error: { code: string; meta?: Record<string, unknown> }): NextResponse | null {
  switch (error.code) {
    case 'P2002': {
      const target = Array.isArray(error.meta?.target) ? (error.meta?.target as string[]).join(', ') : 'value';
      return jsonError(ErrorCodes.CONFLICT, `That ${target} is already in use.`, 409);
    }
    case 'P2003':
      return jsonError(ErrorCodes.VALIDATION, 'Related record not found or still in use.', 409);
    case 'P2025':
      return jsonError(ErrorCodes.NOT_FOUND, 'Record not found.', 404);
    case 'P1001':
    case 'P1002':
      return jsonError(ErrorCodes.DB, 'The database is temporarily unreachable. Please try again shortly.', 503);
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Pagination                                                                */
/* -------------------------------------------------------------------------- */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/* -------------------------------------------------------------------------- */
/*  CSRF (double-submit cookie for state-changing cookie-authenticated calls) */
/* -------------------------------------------------------------------------- */

export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return; // Same-origin fetch may omit Origin; Sec-Fetch-* covers it.
  const host = req.headers.get('host');
  if (!host) return;
  try {
    if (new URL(origin).host !== host) {
      throw new ApiError(ErrorCodes.CSRF, 'Cross-origin request blocked.', 403);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(ErrorCodes.CSRF, 'Invalid origin header.', 403);
  }
}
