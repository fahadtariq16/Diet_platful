import { describe, expect, it } from 'vitest';
import { analyzeBalance, calcTargets, macroSplit } from '../src/lib/nutrition.js';

const base = { sex: 'female', age: 30, heightCm: 165, weightKg: 70, goalKg: 70, activity: 1.375 };

describe('calcTargets', () => {
  it('uses Mifflin–St Jeor for BMR', () => {
    // 10*70 + 6.25*165 - 5*30 - 161 = 1420.25
    expect(calcTargets(base).bmr).toBe(1420);
  });

  it('keeps calories at maintenance when goal equals weight', () => {
    const t = calcTargets(base);
    expect(t.mode).toBe('maintain');
    expect(t.weeks).toBe(0);
    expect(t.kcal).toBe(Math.round((1420.25 * 1.375) / 10) * 10);
  });

  it('creates a deficit and a timeline when losing weight', () => {
    const t = calcTargets({ ...base, goalKg: 65 });
    expect(t.mode).toBe('lose');
    expect(t.weeks).toBe(10); // 5 kg at 0.5 kg a week
    expect(t.kcal).toBeLessThan(t.tdee);
  });

  it('never goes below the safety floor', () => {
    const t = calcTargets({ ...base, age: 70, heightCm: 150, weightKg: 50, goalKg: 45, activity: 1.2 });
    expect(t.kcal).toBe(1200);
  });

  it('macros add up to roughly the calorie target', () => {
    const t = calcTargets({ ...base, goalKg: 64 });
    const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    expect(Math.abs(fromMacros - t.kcal)).toBeLessThan(15);
  });
});

describe('macroSplit', () => {
  it('returns percentages of calories', () => {
    expect(macroSplit({ protein: 25, carbs: 50, fat: 0 })).toEqual({ protein: 33, carbs: 67, fat: 0 });
  });
  it('handles an empty day', () => {
    expect(macroSplit({ protein: 0, carbs: 0, fat: 0 })).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('analyzeBalance', () => {
  const targets = calcTargets(base);
  const foods = [
    { name: 'Salad', kcal: 180, protein: 4, carbs: 12, fat: 14, fiber: 5, tags: 'ms', servings: { veg: 3 } },
    { name: 'Apple', kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, tags: 's', servings: { fruit: 1 } },
    { name: 'Shake', kcal: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, tags: 's', servings: { protein: 1 } }
  ];

  it('says there is not enough data with no entries', () => {
    const r = analyzeBalance([], targets, foods);
    expect(r.enoughData).toBe(false);
    expect(r.score).toBeNull();
  });

  it('flags missing vegetables and suggests vegetable foods', () => {
    const entries = ['2026-11-01', '2026-11-02', '2026-11-03'].map((date) => ({
      date, name: 'Burger', kcal: 2000, protein: 60, carbs: 250, fat: 80, fiber: 8, servings: { grains: 4 }
    }));
    const r = analyzeBalance(entries, targets, foods);
    expect(r.enoughData).toBe(true);
    const veg = r.components.find((c) => c.key === 'veg');
    expect(veg.status).toBe('low');
    const tip = r.tips.find((t) => t.key === 'veg');
    expect(tip.foods[0]).toBe('Salad');
    expect(r.score).toBeLessThan(70);
  });

  it('averages per logged day, not per entry', () => {
    const entries = [
      { date: '2026-11-01', name: 'A', kcal: 1000, protein: 50, carbs: 100, fat: 30, fiber: 10, servings: {} },
      { date: '2026-11-01', name: 'B', kcal: 1000, protein: 50, carbs: 100, fat: 30, fiber: 10, servings: {} }
    ];
    expect(analyzeBalance(entries, targets, foods).average.kcal).toBe(2000);
  });
});
