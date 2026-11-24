// Pure nutrition maths. No database or HTTP code here, so it is easy to test.

export const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725];

// General guidance used by the balance check.
// Macro ranges follow the widely used "acceptable macronutrient distribution ranges".
export const GUIDE = {
  macroRanges: {
    protein: { min: 10, max: 35 },
    carbs: { min: 45, max: 65 },
    fat: { min: 20, max: 35 }
  },
  fiberPer1000Kcal: 14,
  servings: { veg: 3, fruit: 2 }
};

const round = (n, d = 0) => {
  const m = 10 ** d;
  return Math.round(n * m) / m;
};
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/**
 * Daily targets from a profile, using the Mifflin–St Jeor equation.
 * profile: { sex: 'female'|'male', age, heightCm, weightKg, goalKg, activity }
 */
export function calcTargets(profile) {
  const { sex, age, heightCm, weightKg, goalKg, activity } = profile;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const tdee = bmr * activity;
  const diff = goalKg - weightKg;
  const floor = sex === 'male' ? 1500 : 1200;

  let mode = 'maintain';
  let ratePerWeek = 0;
  let kcal = tdee;
  if (diff <= -0.5) {
    mode = 'lose';
    ratePerWeek = 0.5;
    kcal = Math.max(tdee - 550, floor);
  } else if (diff >= 0.5) {
    mode = 'gain';
    ratePerWeek = 0.25;
    kcal = tdee + 275;
  }
  kcal = Math.round(kcal / 10) * 10;

  const protein = Math.round(clamp(1.6 * Math.min(weightKg, goalKg + 10), 60, 220));
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * GUIDE.fiberPer1000Kcal);
  const weeks = mode === 'maintain' ? 0 : Math.ceil(Math.abs(diff) / ratePerWeek);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    mode,
    ratePerWeek,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    weeks,
    diffKg: round(diff, 1)
  };
}

/** Sum a list of log entries. */
export function sumEntries(entries) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, veg: 0, fruit: 0, grains: 0, proteinSv: 0, dairy: 0 };
  for (const e of entries) {
    t.kcal += e.kcal;
    t.protein += e.protein;
    t.carbs += e.carbs;
    t.fat += e.fat;
    t.fiber += e.fiber || 0;
    const sv = e.servings || {};
    t.veg += sv.veg || 0;
    t.fruit += sv.fruit || 0;
    t.grains += sv.grains || 0;
    t.proteinSv += sv.protein || 0;
    t.dairy += sv.dairy || 0;
  }
  return t;
}

/** Share of calories from each macro, in percent. */
export function macroSplit({ protein, carbs, fat }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: round((protein * 4 * 100) / total),
    carbs: round((carbs * 4 * 100) / total),
    fat: round((fat * 9 * 100) / total)
  };
}

function rangeScore(value, min, max, softness) {
  if (value >= min && value <= max) return 1;
  const dist = value < min ? min - value : value - max;
  return clamp(1 - dist / softness, 0, 1);
}
function atLeastScore(value, target) {
  if (target <= 0) return 1;
  return clamp(value / target, 0, 1);
}
function statusOf(value, min, max) {
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'good';
}

function topContributors(entries, key, n = 3) {
  const by = new Map();
  for (const e of entries) by.set(e.name, (by.get(e.name) || 0) + (e[key] || 0));
  return [...by.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
}

function bestFoods(foods, scoreFn, n = 3) {
  return foods
    .map((f) => ({ f, s: scoreFn(f) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.f.name);
}

/**
 * How balanced was the eating in a period?
 * entries: log entries (with servings), targets: from calcTargets, foods: food library for suggestions.
 */
export function analyzeBalance(entries, targets, foods = []) {
  const days = new Set(entries.map((e) => e.date));
  const dayCount = days.size;
  if (dayCount === 0) {
    return { enoughData: false, daysLogged: 0, score: null, components: [], tips: [] };
  }

  const sum = sumEntries(entries);
  const avg = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / dayCount]));
  const split = macroSplit(avg);
  const fiberTarget = Math.round((targets.kcal / 1000) * GUIDE.fiberPer1000Kcal);
  const R = GUIDE.macroRanges;

  const components = [
    {
      key: 'calories',
      label: 'Calories',
      value: Math.round(avg.kcal),
      unit: 'kcal',
      target: `${targets.kcal} kcal`,
      status: statusOf(avg.kcal, targets.kcal * 0.9, targets.kcal * 1.1),
      score: rangeScore(avg.kcal, targets.kcal * 0.9, targets.kcal * 1.1, targets.kcal * 0.3)
    },
    {
      key: 'protein',
      label: 'Protein',
      value: Math.round(avg.protein),
      unit: 'g',
      target: `${targets.protein} g`,
      status: avg.protein >= targets.protein * 0.9 ? 'good' : 'low',
      score: atLeastScore(avg.protein, targets.protein * 0.9)
    },
    {
      key: 'carbs',
      label: 'Carbs share',
      value: split.carbs,
      unit: '%',
      target: `${R.carbs.min}–${R.carbs.max}%`,
      status: statusOf(split.carbs, R.carbs.min, R.carbs.max),
      score: rangeScore(split.carbs, R.carbs.min, R.carbs.max, 15)
    },
    {
      key: 'fat',
      label: 'Fat share',
      value: split.fat,
      unit: '%',
      target: `${R.fat.min}–${R.fat.max}%`,
      status: statusOf(split.fat, R.fat.min, R.fat.max),
      score: rangeScore(split.fat, R.fat.min, R.fat.max, 12)
    },
    {
      key: 'fiber',
      label: 'Fibre',
      value: Math.round(avg.fiber),
      unit: 'g',
      target: `${fiberTarget} g`,
      status: avg.fiber >= fiberTarget * 0.9 ? 'good' : 'low',
      score: atLeastScore(avg.fiber, fiberTarget * 0.9)
    },
    {
      key: 'veg',
      label: 'Vegetables',
      value: round(avg.veg, 1),
      unit: 'servings',
      target: `${GUIDE.servings.veg}+ servings`,
      status: avg.veg >= GUIDE.servings.veg ? 'good' : 'low',
      score: atLeastScore(avg.veg, GUIDE.servings.veg)
    },
    {
      key: 'fruit',
      label: 'Fruit',
      value: round(avg.fruit, 1),
      unit: 'servings',
      target: `${GUIDE.servings.fruit}+ servings`,
      status: avg.fruit >= GUIDE.servings.fruit ? 'good' : 'low',
      score: atLeastScore(avg.fruit, GUIDE.servings.fruit)
    }
  ];

  const score = Math.round((components.reduce((a, c) => a + c.score, 0) / components.length) * 100);

  const tips = [];
  const per = (k) => (f) => (f.kcal > 0 ? f[k] / f.kcal : 0);
  const sv = (k) => (f) => (f.servings?.[k] || 0) / Math.max(f.kcal, 50);
  for (const c of components) {
    if (c.status === 'good') continue;
    if (c.key === 'calories' && c.status === 'high') {
      tips.push({ key: c.key, text: `You average ${c.value} kcal, above your ${targets.kcal} kcal target. Your biggest calorie sources were:`, foods: topContributors(entries, 'kcal') });
    } else if (c.key === 'calories') {
      tips.push({ key: c.key, text: `You average ${c.value} kcal, under your ${targets.kcal} kcal target. Eating too little makes it hard to keep going. Add a balanced snack such as:`, foods: bestFoods(foods.filter((f) => f.tags.includes('s')), (f) => f.protein + f.fiber) });
    } else if (c.key === 'protein') {
      tips.push({ key: c.key, text: `Protein is ${c.value} g a day against ${targets.protein} g. Protein keeps you full and protects muscle. Good protein per calorie:`, foods: bestFoods(foods, per('protein')) });
    } else if (c.key === 'carbs' && c.status === 'high') {
      tips.push({ key: c.key, text: `${c.value}% of your calories come from carbs. Swap part of the rice, bread or pasta for vegetables or protein. Main carb sources:`, foods: topContributors(entries, 'carbs') });
    } else if (c.key === 'carbs') {
      tips.push({ key: c.key, text: `Only ${c.value}% of calories come from carbs. Whole grains, fruit and beans give steady energy and fibre:`, foods: bestFoods(foods, (f) => f.fiber / Math.max(f.kcal, 50)) });
    } else if (c.key === 'fat' && c.status === 'high') {
      tips.push({ key: c.key, text: `${c.value}% of your calories come from fat. The biggest fat sources in your log were:`, foods: topContributors(entries, 'fat') });
    } else if (c.key === 'fat') {
      tips.push({ key: c.key, text: `Fat is only ${c.value}% of calories. Some healthy fat helps you absorb vitamins. Try:`, foods: ['Almonds', 'Avocado toast with egg', 'Baked salmon with potatoes and greens'].filter((n) => foods.some((f) => f.name === n)) });
    } else if (c.key === 'fiber') {
      tips.push({ key: c.key, text: `Fibre is ${c.value} g a day against about ${fiberTarget} g. High-fibre choices:`, foods: bestFoods(foods, per('fiber')) });
    } else if (c.key === 'veg') {
      tips.push({ key: c.key, text: `You eat ${c.value} servings of vegetables a day. Aim for ${GUIDE.servings.veg} or more: fill half your plate with them. Easy wins:`, foods: bestFoods(foods, sv('veg')) });
    } else if (c.key === 'fruit') {
      tips.push({ key: c.key, text: `You eat ${c.value} servings of fruit a day. Aim for ${GUIDE.servings.fruit}. Whole fruit beats juice:`, foods: bestFoods(foods.filter((f) => !/juice/i.test(f.name)), sv('fruit')) });
    }
  }

  return {
    enoughData: dayCount >= 3,
    daysLogged: dayCount,
    score,
    average: { kcal: Math.round(avg.kcal), protein: Math.round(avg.protein), carbs: Math.round(avg.carbs), fat: Math.round(avg.fat), fiber: Math.round(avg.fiber) },
    split,
    components: components.map((c) => ({ ...c, score: round(c.score, 2) })),
    tips
  };
}
