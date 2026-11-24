import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import reviewRoutes from './routes/reviews.js';
import { errorHandler } from './middleware/index.js';
import { GUIDE } from './lib/nutrition.js';
import { mapFood } from './db.js';

export function createApp({ db, secret, clientOrigin, isProd = false, isTest = false }) {
  const app = express();
  const deps = { db, secret, isProd, isTest };

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false }));
  if (clientOrigin) app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Public: the balance guide numbers and the shared food library.
  app.get('/api/guide', (_req, res) => res.json({ guide: GUIDE }));
  app.get('/api/foods/library', (_req, res) => {
    res.json({ foods: db.prepare('SELECT * FROM foods WHERE user_id IS NULL ORDER BY name').all().map(mapFood) });
  });

  app.use('/api/auth', authRoutes(deps));
  app.use('/api/reviews', reviewRoutes(deps));
  app.use('/api/me', meRoutes(deps));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // In production, serve the built React app from the same server.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (isProd && fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
