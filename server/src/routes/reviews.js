import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { HttpError, optionalAuth, requireAuth, validate } from '../middleware/index.js';

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, 'must be at least 10 characters').max(800)
});

export default function reviewRoutes({ db, secret, isTest }) {
  const r = Router();
  const writeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: isTest ? 1000 : 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'You are changing your review too often. Try again later.' } });

  // Public: anyone can read reviews.
  r.get('/', optionalAuth(secret), (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rows = db
      .prepare(
        `SELECT r.id, r.user_id, r.rating, r.body, r.created_at, r.updated_at, u.name
         FROM reviews r JOIN users u ON u.id = r.user_id
         ORDER BY r.updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset);
    const stats = db.prepare('SELECT COUNT(*) AS count, ROUND(AVG(rating), 2) AS average FROM reviews').get();
    const dist = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, 0]));
    for (const d of db.prepare('SELECT rating, COUNT(*) AS n FROM reviews GROUP BY rating').all()) dist[d.rating] = d.n;
    res.json({
      stats: { count: stats.count, average: stats.average ?? 0, distribution: dist },
      reviews: rows.map((row) => ({
        id: row.id,
        // only show a first name publicly
        author: String(row.name).split(/\s+/)[0],
        rating: row.rating,
        body: row.body,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        mine: req.user?.id === row.user_id
      }))
    });
  });

  r.get('/me', requireAuth(secret), (req, res) => {
    const row = db.prepare('SELECT rating, body, updated_at AS updatedAt FROM reviews WHERE user_id = ?').get(req.user.id);
    res.json({ review: row || null });
  });

  // One review per user: create or update.
  r.put('/me', requireAuth(secret), writeLimiter, validate(reviewSchema), (req, res) => {
    const { rating, body } = req.body;
    db.prepare(
      `INSERT INTO reviews (user_id, rating, body) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET rating = excluded.rating, body = excluded.body, updated_at = datetime('now')`
    ).run(req.user.id, rating, body);
    res.json({ review: db.prepare('SELECT rating, body, updated_at AS updatedAt FROM reviews WHERE user_id = ?').get(req.user.id) });
  });

  r.delete('/me', requireAuth(secret), (req, res, next) => {
    const info = db.prepare('DELETE FROM reviews WHERE user_id = ?').run(req.user.id);
    if (!info.changes) return next(new HttpError(404, 'You have no review to delete.'));
    res.json({ ok: true });
  });

  return r;
}
