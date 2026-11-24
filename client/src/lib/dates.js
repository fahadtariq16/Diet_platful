const pad = (n) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD (not UTC, so late-night meals land on the right day). */
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const todayKey = () => keyOf(new Date());
export const addDays = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
/** Inclusive list of date keys. */
export const rangeKeys = (from, to) => {
  const out = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
};
export const weekdayIdx = (k) => (parseKey(k).getDay() + 6) % 7; // Monday = 0
export const fmtDay = (k, opts = { weekday: 'short', day: 'numeric' }) => parseKey(k).toLocaleDateString('en-GB', opts);
export const fmtLong = (k) => parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
