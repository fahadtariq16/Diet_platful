import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const COOKIE = 'plateful_token';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Reads the JWT cookie. Sets req.user = { id } or responds 401. */
export function requireAuth(secret) {
  return (req, _res, next) => {
    const token = req.cookies?.[COOKIE];
    if (!token) return next(new HttpError(401, 'Please log in first.'));
    try {
      const payload = jwt.verify(token, secret);
      req.user = { id: Number(payload.sub) };
      next();
    } catch {
      next(new HttpError(401, 'Your session has expired. Please log in again.'));
    }
  };
}

/** Like requireAuth but never fails: req.user is null for guests. */
export function optionalAuth(secret) {
  return (req, _res, next) => {
    const token = req.cookies?.[COOKIE];
    req.user = null;
    if (token) {
      try {
        req.user = { id: Number(jwt.verify(token, secret).sub) };
      } catch {
        /* treat as guest */
      }
    }
    next();
  };
}

/** Validate req[where] with a zod schema and replace it with the parsed value. */
export function validate(schema, where = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[where]);
    if (!result.success) {
      const first = result.error.issues[0];
      const field = first.path.join('.');
      return next(new HttpError(400, field ? `${field}: ${first.message}` : first.message, result.error.flatten()));
    }
    req[where === 'query' ? 'q' : where] = result.data;
    next();
  };
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.' });
}

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date like 2026-11-20');
