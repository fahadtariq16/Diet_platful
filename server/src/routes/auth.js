import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { COOKIE, HttpError, optionalAuth, validate } from '../middleware/index.js';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'is required').max(40),
  email: z.string().trim().toLowerCase().email('must be a valid email').max(120),
  password: z.string().min(8, 'must be at least 8 characters').max(200)
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('must be a valid email'),
  password: z.string().min(1, 'is required')
});

export default function authRoutes({ db, secret, isProd, isTest }) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: isTest ? 1000 : 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });

  const setCookie = (res, userId) => {
    const token = jwt.sign({ sub: String(userId) }, secret, { expiresIn: '30d' });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 30 * 24 * 3600 * 1000, path: '/' });
  };
  const publicUser = (id) => {
    const u = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id);
    if (!u) return null;
    const hasProfile = !!db.prepare('SELECT 1 FROM profiles WHERE user_id = ?').get(id);
    return { ...u, hasProfile };
  };

  r.post('/register', limiter, validate(registerSchema), async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
        throw new HttpError(409, 'An account with this email already exists. Try logging in.');
      }
      const hash = await bcrypt.hash(password, 11);
      const { lastInsertRowid } = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
      setCookie(res, lastInsertRowid);
      res.status(201).json({ user: publicUser(lastInsertRowid) });
    } catch (e) {
      next(e);
    }
  });

  r.post('/login', limiter, validate(loginSchema), async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const u = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email);
      const ok = u && (await bcrypt.compare(password, u.password_hash));
      if (!ok) throw new HttpError(401, 'Email or password is wrong.');
      setCookie(res, u.id);
      res.json({ user: publicUser(u.id) });
    } catch (e) {
      next(e);
    }
  });

  r.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  // Guests get { user: null } with 200, so the app can check the session without a console error.
  r.get('/me', optionalAuth(secret), (req, res) => {
    res.json({ user: req.user ? publicUser(req.user.id) : null });
  });

  return r;
}
