import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

let app;
beforeEach(() => {
  app = createApp({ db: openDb(':memory:'), secret: 'test-secret', isTest: true });
});

async function signUp(name = 'Aisha Khan', email = 'aisha@example.com') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'password123' });
  expect(res.status).toBe(201);
  return agent;
}
const profile = { sex: 'female', age: 30, heightCm: 165, weightKg: 72, goalKg: 66, activity: 1.375 };

describe('auth', () => {
  it('registers, remembers the session and logs out', async () => {
    const agent = await signUp();
    const me = await agent.get('/api/auth/me');
    expect(me.body.user).toMatchObject({ name: 'Aisha Khan', email: 'aisha@example.com', hasProfile: false });
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
  });

  it('rejects a duplicate email and a wrong password', async () => {
    await signUp();
    const dup = await request(app).post('/api/auth/register').send({ name: 'X', email: 'AISHA@example.com', password: 'password123' });
    expect(dup.status).toBe(409);
    const bad = await request(app).post('/api/auth/login').send({ email: 'aisha@example.com', password: 'nope' });
    expect(bad.status).toBe(401);
  });

  it('validates input', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('tracking', () => {
  it('saves a profile and returns targets', async () => {
    const agent = await signUp();
    const res = await agent.put('/api/me/profile').send(profile);
    expect(res.status).toBe(200);
    expect(res.body.targets.mode).toBe('lose');
    expect(res.body.targets.weeks).toBe(12);
  });

  it('logs food from the library with scaled values and sums the day', async () => {
    const agent = await signUp();
    const { body } = await agent.get('/api/me/foods');
    const apple = body.foods.find((f) => f.name === 'Apple');
    const add = await agent.post('/api/me/logs').send({ date: '2026-11-20', meal: 'snack', foodId: apple.id, qty: 2 });
    expect(add.status).toBe(201);
    expect(add.body.entry.kcal).toBe(190);
    expect(add.body.entry.servings.fruit).toBe(2);

    const sum = await agent.get('/api/me/summary?from=2026-11-14&to=2026-11-20');
    expect(sum.body.days).toEqual([expect.objectContaining({ date: '2026-11-20', kcal: 190, items: 1 })]);
  });

  it('logs a custom food and keeps it for later', async () => {
    const agent = await signUp();
    const add = await agent.post('/api/me/logs').send({ date: '2026-11-20', meal: 'lunch', custom: { name: 'Mum’s pulao', kcal: 600, protein: 20, carbs: 80, fat: 18 } });
    expect(add.status).toBe(201);
    const { body } = await agent.get('/api/me/foods');
    expect(body.foods.some((f) => f.name === 'Mum’s pulao' && f.custom)).toBe(true);
  });

  it("does not let one user see or delete another user's entries", async () => {
    const a = await signUp();
    const { body } = await a.get('/api/me/foods');
    const entry = (await a.post('/api/me/logs').send({ date: '2026-11-20', meal: 'lunch', foodId: body.foods[0].id })).body.entry;
    const b = await signUp('Bilal', 'bilal@example.com');
    expect((await b.get('/api/me/logs?from=2026-11-20&to=2026-11-20')).body.entries).toHaveLength(0);
    expect((await b.delete(`/api/me/logs/${entry.id}`)).status).toBe(404);
  });

  it('requires a profile before the balance check, then analyses it', async () => {
    const agent = await signUp();
    expect((await agent.get('/api/me/insights/balance?from=2026-11-14&to=2026-11-20')).status).toBe(409);
    await agent.put('/api/me/profile').send(profile);
    const res = await agent.get('/api/me/insights/balance?from=2026-11-14&to=2026-11-20');
    expect(res.status).toBe(200);
    expect(res.body.daysLogged).toBe(0);
  });

  it('applies the weekly plan to a date', async () => {
    const agent = await signUp();
    const { body } = await agent.get('/api/me/foods');
    // 2026-11-20 is a Friday -> weekday 4
    await agent.put('/api/me/plan/4/breakfast').send({ foodId: body.foods[0].id });
    await agent.put('/api/me/plan/4/dinner').send({ foodId: body.foods[1].id });
    const res = await agent.post('/api/me/plan/apply').send({ date: '2026-11-20' });
    expect(res.body.entries).toHaveLength(2);
  });

  it('updates profile weight from weigh-ins', async () => {
    const agent = await signUp();
    await agent.put('/api/me/profile').send(profile);
    const res = await agent.post('/api/me/weigh-ins').send({ date: '2026-11-20', weightKg: 71.2 });
    expect(res.body.profile.weightKg).toBe(71.2);
  });
});

describe('reviews', () => {
  it('is public to read, one per user to write, and shows first names only', async () => {
    const agent = await signUp();
    expect((await request(app).put('/api/reviews/me').send({ rating: 5, body: 'Great app for tracking.' })).status).toBe(401);
    await agent.put('/api/reviews/me').send({ rating: 4, body: 'Helped me eat more vegetables.' });
    await agent.put('/api/reviews/me').send({ rating: 5, body: 'Updated: now I hit my protein goal.' });
    const pub = await request(app).get('/api/reviews');
    expect(pub.body.stats.count).toBe(1);
    expect(pub.body.reviews[0]).toMatchObject({ author: 'Aisha', rating: 5, mine: false });
    const mine = await agent.get('/api/reviews');
    expect(mine.body.reviews[0].mine).toBe(true);
  });

  it('rejects a too-short review', async () => {
    const agent = await signUp();
    expect((await agent.put('/api/reviews/me').send({ rating: 3, body: 'ok' })).status).toBe(400);
  });
});
