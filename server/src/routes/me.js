// Everything that belongs to the logged-in user: profile, foods, log, weigh-ins, plan, insights.
import { Router } from 'express';
import { z } from 'zod';
import { HttpError, dateStr, requireAuth, validate } from '../middleware/index.js';
import { mapEntry, mapFood, mapProfile } from '../db.js';
import { ACTIVITY_LEVELS, analyzeBalance, calcTargets } from '../lib/nutrition.js';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const round1 = (n) => Math.round(n * 10) / 10;

const profileSchema = z.object({
  sex: z.enum(['female', 'male']),
  age: z.coerce.number().int().min(18, 'must be 18 or older').max(100),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(35).max(300),
  goalKg: z.coerce.number().min(35).max(300),
  activity: z.coerce.number().refine((v) => ACTIVITY_LEVELS.includes(v), 'is not a known activity level')
});
const customFoodSchema = z.object({
  name: z.string().trim().min(1).max(60),
  unit: z.string().trim().min(1).max(30).default('1 portion'),
  kcal: z.coerce.number().min(0).max(5000),
  protein: z.coerce.number().min(0).max(500).default(0),
  carbs: z.coerce.number().min(0).max(800).default(0),
  fat: z.coerce.number().min(0).max(400).default(0),
  fiber: z.coerce.number().min(0).max(150).default(0),
  servings: z
    .object({ veg: z.number().min(0).max(10), fruit: z.number().min(0).max(10), grains: z.number().min(0).max(10), protein: z.number().min(0).max(10), dairy: z.number().min(0).max(10) })
    .partial()
    .default({})
});
const entrySchema = z
  .object({
    date: dateStr,
    meal: z.enum(MEALS),
    qty: z.coerce.number().min(0.25).max(10).default(1),
    foodId: z.coerce.number().int().positive().optional(),
    custom: customFoodSchema.optional()
  })
  .refine((v) => !!v.foodId !== !!v.custom, 'send either foodId or custom, not both');
const rangeSchema = z
  .object({ from: dateStr, to: dateStr })
  .refine((v) => v.from <= v.to, 'from must be before to')
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 366, 'range can be at most a year');
const weighInSchema = z.object({ date: dateStr, weightKg: z.coerce.number().min(35).max(300) });
const slotSchema = z.object({ foodId: z.coerce.number().int().positive().nullable() });

export default function meRoutes({ db, secret }) {
  const r = Router();
  r.use(requireAuth(secret));

  const getProfile = (uid) => mapProfile(db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(uid));
  const needProfile = (uid) => {
    const p = getProfile(uid);
    if (!p) throw new HttpError(409, 'Set up your profile first so we can work out your targets.');
    return p;
  };
  const visibleFood = (uid, id) => {
    const row = db.prepare('SELECT * FROM foods WHERE id = ? AND (user_id IS NULL OR user_id = ?)').get(id, uid);
    if (!row) throw new HttpError(404, 'That food was not found.');
    return mapFood(row);
  };
  const scaled = (food, qty) => {
    const sv = {};
    for (const [k, v] of Object.entries(food.servings || {})) sv[k] = round1(v * qty);
    return { kcal: Math.round(food.kcal * qty), protein: round1(food.protein * qty), carbs: round1(food.carbs * qty), fat: round1(food.fat * qty), fiber: round1(food.fiber * qty), servings: sv };
  };
  const insertEntry = db.prepare(
    `INSERT INTO log_entries (user_id, date, meal, food_id, name, qty, kcal, protein, carbs, fat, fiber, servings)
     VALUES (@userId, @date, @meal, @foodId, @name, @qty, @kcal, @protein, @carbs, @fat, @fiber, @servings)`
  );
  const addEntry = (uid, date, meal, food, qty) => {
    const v = scaled(food, qty);
    const { lastInsertRowid } = insertEntry.run({ userId: uid, date, meal, foodId: food.id, name: food.name, qty, ...v, servings: JSON.stringify(v.servings) });
    return mapEntry(db.prepare('SELECT * FROM log_entries WHERE id = ?').get(lastInsertRowid));
  };

  /* ---- profile ---- */
  r.get('/profile', (req, res) => {
    const profile = getProfile(req.user.id);
    res.json({ profile, targets: profile ? calcTargets(profile) : null });
  });

  r.put('/profile', validate(profileSchema), (req, res) => {
    const p = req.body;
    db.prepare(
      `INSERT INTO profiles (user_id, sex, age, height_cm, weight_kg, goal_kg, activity, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET sex=excluded.sex, age=excluded.age, height_cm=excluded.height_cm,
         weight_kg=excluded.weight_kg, goal_kg=excluded.goal_kg, activity=excluded.activity, updated_at=excluded.updated_at`
    ).run(req.user.id, p.sex, p.age, p.heightCm, p.weightKg, p.goalKg, p.activity);
    const profile = getProfile(req.user.id);
    res.json({ profile, targets: calcTargets(profile) });
  });

  /* ---- weigh-ins (for the pathway) ---- */
  r.get('/weigh-ins', (req, res) => {
    const rows = db.prepare('SELECT date, weight_kg AS weightKg FROM weigh_ins WHERE user_id = ? ORDER BY date').all(req.user.id);
    res.json({ weighIns: rows });
  });

  r.post('/weigh-ins', validate(weighInSchema), (req, res) => {
    const { date, weightKg } = req.body;
    db.prepare('INSERT INTO weigh_ins (user_id, date, weight_kg) VALUES (?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET weight_kg = excluded.weight_kg').run(req.user.id, date, weightKg);
    // keep the profile on the most recent weight so targets stay current
    const latest = db.prepare('SELECT weight_kg FROM weigh_ins WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(req.user.id);
    db.prepare("UPDATE profiles SET weight_kg = ?, updated_at = datetime('now') WHERE user_id = ?").run(latest.weight_kg, req.user.id);
    const profile = getProfile(req.user.id);
    res.status(201).json({ ok: true, profile, targets: profile ? calcTargets(profile) : null });
  });

  /* ---- foods ---- */
  r.get('/foods', (req, res) => {
    const rows = db.prepare('SELECT * FROM foods WHERE user_id IS NULL OR user_id = ? ORDER BY user_id IS NULL, name').all(req.user.id);
    res.json({ foods: rows.map(mapFood) });
  });

  r.post('/foods', validate(customFoodSchema), (req, res) => {
    const f = req.body;
    const { lastInsertRowid } = db
      .prepare('INSERT INTO foods (user_id, name, unit, kcal, protein, carbs, fat, fiber, tags, servings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(req.user.id, f.name, f.unit, f.kcal, f.protein, f.carbs, f.fat, f.fiber, 'bms', JSON.stringify(f.servings));
    res.status(201).json({ food: mapFood(db.prepare('SELECT * FROM foods WHERE id = ?').get(lastInsertRowid)) });
  });

  r.delete('/foods/:id', (req, res, next) => {
    const info = db.prepare('DELETE FROM foods WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
    if (!info.changes) return next(new HttpError(404, 'You can only delete foods you added.'));
    res.json({ ok: true });
  });

  /* ---- log ---- */
  r.get('/logs', validate(rangeSchema, 'query'), (req, res) => {
    const rows = db.prepare('SELECT * FROM log_entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date, id').all(req.user.id, req.q.from, req.q.to);
    res.json({ entries: rows.map(mapEntry) });
  });

  r.post('/logs', validate(entrySchema), (req, res, next) => {
    try {
      const { date, meal, qty, foodId, custom } = req.body;
      let food;
      if (foodId) food = visibleFood(req.user.id, foodId);
      else {
        // a one-off custom food is saved to the user's own list so it can be picked again
        const { lastInsertRowid } = db
          .prepare('INSERT INTO foods (user_id, name, unit, kcal, protein, carbs, fat, fiber, tags, servings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(req.user.id, custom.name, custom.unit, custom.kcal, custom.protein, custom.carbs, custom.fat, custom.fiber, 'bms', JSON.stringify(custom.servings));
        food = mapFood(db.prepare('SELECT * FROM foods WHERE id = ?').get(lastInsertRowid));
      }
      res.status(201).json({ entry: addEntry(req.user.id, date, meal, food, qty) });
    } catch (e) {
      next(e);
    }
  });

  r.delete('/logs/:id', (req, res, next) => {
    const info = db.prepare('DELETE FROM log_entries WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
    if (!info.changes) return next(new HttpError(404, 'That entry was not found.'));
    res.json({ ok: true });
  });

  /* ---- daily totals for charts ---- */
  r.get('/summary', validate(rangeSchema, 'query'), (req, res) => {
    const days = db
      .prepare(
        `SELECT date, ROUND(SUM(kcal)) AS kcal, ROUND(SUM(protein),1) AS protein, ROUND(SUM(carbs),1) AS carbs,
                ROUND(SUM(fat),1) AS fat, ROUND(SUM(fiber),1) AS fiber, COUNT(*) AS items
         FROM log_entries WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date ORDER BY date`
      )
      .all(req.user.id, req.q.from, req.q.to);
    res.json({ days });
  });

  /* ---- balance analysis ---- */
  r.get('/insights/balance', validate(rangeSchema, 'query'), (req, res, next) => {
    try {
      const profile = needProfile(req.user.id);
      const targets = calcTargets(profile);
      const entries = db.prepare('SELECT * FROM log_entries WHERE user_id = ? AND date BETWEEN ? AND ?').all(req.user.id, req.q.from, req.q.to).map(mapEntry);
      const foods = db.prepare('SELECT * FROM foods WHERE user_id IS NULL').all().map(mapFood);
      res.json({ targets, ...analyzeBalance(entries, targets, foods) });
    } catch (e) {
      next(e);
    }
  });

  /* ---- weekly plan ---- */
  const readPlan = (uid) => {
    const rows = db.prepare('SELECT p.weekday, p.meal, f.* FROM plan_slots p JOIN foods f ON f.id = p.food_id WHERE p.user_id = ?').all(uid);
    const plan = Array.from({ length: 7 }, () => ({ breakfast: null, lunch: null, dinner: null, snack: null }));
    for (const row of rows) plan[row.weekday][row.meal] = mapFood(row);
    return plan;
  };

  r.get('/plan', (req, res) => res.json({ plan: readPlan(req.user.id) }));

  r.put('/plan/:weekday/:meal', validate(slotSchema), (req, res, next) => {
    try {
      const weekday = Number(req.params.weekday);
      const { meal } = req.params;
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new HttpError(400, 'weekday must be 0 (Monday) to 6 (Sunday).');
      if (!MEALS.includes(meal)) throw new HttpError(400, `meal must be one of ${MEALS.join(', ')}.`);
      if (req.body.foodId == null) {
        db.prepare('DELETE FROM plan_slots WHERE user_id = ? AND weekday = ? AND meal = ?').run(req.user.id, weekday, meal);
      } else {
        visibleFood(req.user.id, req.body.foodId);
        db.prepare('INSERT INTO plan_slots (user_id, weekday, meal, food_id) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, weekday, meal) DO UPDATE SET food_id = excluded.food_id').run(req.user.id, weekday, meal, req.body.foodId);
      }
      res.json({ plan: readPlan(req.user.id) });
    } catch (e) {
      next(e);
    }
  });

  r.post('/plan/apply', validate(z.object({ date: dateStr })), (req, res) => {
    const { date } = req.body;
    const weekday = (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const day = readPlan(req.user.id)[weekday];
    const added = db.transaction(() => MEALS.filter((m) => day[m]).map((m) => addEntry(req.user.id, date, m, day[m], 1)))();
    res.status(201).json({ entries: added });
  });

  return r;
}
