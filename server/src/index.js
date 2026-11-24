import { createApp } from './app.js';
import { openDb } from './db.js';

const isProd = process.env.NODE_ENV === 'production';
let secret = process.env.JWT_SECRET;
if (!secret || secret === 'change-me-to-a-long-random-string') {
  if (isProd) {
    console.error('JWT_SECRET must be set to a long random string in production.');
    process.exit(1);
  }
  secret = 'dev-only-secret-do-not-use-in-production';
  console.warn('Warning: using a development JWT secret. Set JWT_SECRET in server/.env.');
}

const db = openDb(process.env.DB_PATH || './data/plateful.db');
const app = createApp({ db, secret, clientOrigin: process.env.CLIENT_ORIGIN, isProd });
const port = Number(process.env.PORT) || 4000;

app.listen(port, () => console.log(`Plateful API running on http://localhost:${port}`));
