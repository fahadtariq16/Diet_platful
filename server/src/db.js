import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { FOODS } from './seed/foods.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex        TEXT NOT NULL CHECK (sex IN ('female','male')),
  age        INTEGER NOT NULL,
  height_cm  REAL NOT NULL,
  weight_kg  REAL NOT NULL,
  goal_kg    REAL NOT NULL,
  activity   REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS foods (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = shared library food
  name     TEXT NOT NULL,
  unit     TEXT NOT NULL,
  kcal     REAL NOT NULL,
  protein  REAL NOT NULL,
  carbs    REAL NOT NULL,
  fat      REAL NOT NULL,
  fiber    REAL NOT NULL DEFAULT 0,
  tags     TEXT NOT NULL DEFAULT 'bms',
  servings TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_foods_user ON foods(user_id);

CREATE TABLE IF NOT EXISTS log_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,           -- YYYY-MM-DD in the user's local time
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner','snack')),
  food_id    INTEGER REFERENCES foods(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  qty        REAL NOT NULL,
  -- values are copied at log time so editing a food never rewrites history
  kcal       REAL NOT NULL,
  protein    REAL NOT NULL,
  carbs      REAL NOT NULL,
  fat        REAL NOT NULL,
  fiber      REAL NOT NULL DEFAULT 0,
  servings   TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_log_user_date ON log_entries(user_id, date);

CREATE TABLE IF NOT EXISTS weigh_ins (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS plan_slots (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = Monday
  meal    TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner','snack')),
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, weekday, meal)
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seedFoods(db);
  return db;
}

function seedFoods(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM foods WHERE user_id IS NULL').get();
  if (n > 0) return;
  const insert = db.prepare(
    `INSERT INTO foods (user_id, name, unit, kcal, protein, carbs, fat, fiber, tags, servings)
     VALUES (NULL, @name, @unit, @kcal, @p, @c, @f, @fiber, @tags, @servings)`
  );
  const tx = db.transaction((rows) => {
    for (const r of rows) insert.run({ ...r, servings: JSON.stringify(r.sv || {}) });
  });
  tx(FOODS);
}

// Row mappers keep snake_case out of the API.
export const mapFood = (r) => ({
  id: r.id,
  name: r.name,
  unit: r.unit,
  kcal: r.kcal,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  fiber: r.fiber,
  tags: r.tags,
  servings: JSON.parse(r.servings || '{}'),
  custom: r.user_id != null
});

export const mapEntry = (r) => ({
  id: r.id,
  date: r.date,
  meal: r.meal,
  foodId: r.food_id,
  name: r.name,
  qty: r.qty,
  kcal: r.kcal,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  fiber: r.fiber,
  servings: JSON.parse(r.servings || '{}')
});

export const mapProfile = (r) =>
  r && {
    sex: r.sex,
    age: r.age,
    heightCm: r.height_cm,
    weightKg: r.weight_kg,
    goalKg: r.goal_kg,
    activity: r.activity
  };
