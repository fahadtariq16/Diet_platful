export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
export const MEALS = [
  ['breakfast', 'Breakfast'],
  ['lunch', 'Lunch'],
  ['dinner', 'Dinner'],
  ['snack', 'Snacks']
];
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const ACTIVITY = [
  [1.2, 'Mostly sitting'],
  [1.375, 'Light (walks, 1–3 workouts a week)'],
  [1.55, 'Moderate (3–5 workouts a week)'],
  [1.725, 'Very active (physical job or daily training)']
];

export function sumEntries(list = []) {
  return list.reduce(
    (a, e) => ({
      kcal: a.kcal + e.kcal,
      protein: a.protein + e.protein,
      carbs: a.carbs + e.carbs,
      fat: a.fat + e.fat,
      fiber: a.fiber + (e.fiber || 0),
      veg: a.veg + (e.servings?.veg || 0),
      fruit: a.fruit + (e.servings?.fruit || 0)
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, veg: 0, fruit: 0 }
  );
}

/** Status of a calorie total against a target: good within ±10%. */
export function kcalStatus(kcal, target) {
  if (!target || !kcal) return 'none';
  const r = kcal / target;
  if (r > 1.1) return 'high';
  if (r >= 0.9) return 'good';
  return 'low';
}

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
