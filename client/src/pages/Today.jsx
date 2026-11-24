import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/hooks.js';
import { useToast } from '../lib/toast.jsx';
import { addDays, fmtLong, todayKey } from '../lib/dates.js';
import { MEALS, fmt, kcalStatus, sumEntries } from '../lib/format.js';
import { CloseIcon, MacroBars, Reveal, Ring } from '../components/ui.jsx';

function defaultMeal() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

function FoodPicker({ foods, value, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? foods.filter((f) => f.name.toLowerCase().includes(s)) : foods).slice(0, 8);
  }, [foods, q]);
  const picked = foods.find((f) => f.id === value);
  return (
    <div className="field" style={{ position: 'relative' }}>
      <label htmlFor="food-search">Food</label>
      <input
        id="food-search"
        className="input"
        role="combobox"
        aria-expanded={open}
        aria-controls="food-list"
        autoComplete="off"
        placeholder="Search, e.g. daal, salmon, apple"
        value={open ? q : picked ? `${picked.name} · ${picked.unit}` : q}
        onFocus={() => { setOpen(true); setQ(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQ(e.target.value)}
      />
      <AnimatePresence>
        {open && (
          <motion.ul id="food-list" role="listbox" className="card" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, listStyle: 'none', margin: '6px 0 0', padding: 6, maxHeight: 300, overflowY: 'auto' }}>
            {list.length === 0 && <li className="note" style={{ padding: 10 }}>No match. Use "Enter my own food" below.</li>}
            {list.map((f) => (
              <li key={f.id} role="option" aria-selected={f.id === value}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(f.id); setOpen(false); }} style={{ width: '100%', textAlign: 'left', border: 0, background: f.id === value ? 'var(--soft)' : 'transparent', padding: '9px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{f.name}{f.custom && <span className="note"> · yours</span>}</span>
                  <span className="note num">{fmt(f.kcal)} kcal · {f.unit}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMPTY_CUSTOM = { name: '', unit: '1 portion', kcal: '', protein: '', carbs: '', fat: '', fiber: '', veg: '', fruit: '' };

export default function Today() {
  const { user } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(todayKey());
  const profile = useApi('/me/profile');
  const foodsQ = useApi('/me/foods');
  const logs = useApi(`/me/logs?from=${date}&to=${date}`);
  const targets = profile.data?.targets;
  const foods = foodsQ.data?.foods || [];
  const entries = logs.data?.entries || [];
  const totals = sumEntries(entries);

  const [meal, setMeal] = useState(defaultMeal());
  const [foodId, setFoodId] = useState(null);
  const [qty, setQty] = useState(1);
  const [customMode, setCustomMode] = useState(false);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const [msg, setMsg] = useState({ text: '', kind: '' });
  const [busy, setBusy] = useState(false);

  const picked = foods.find((f) => f.id === foodId);
  const preview = customMode
    ? custom.kcal ? { kcal: custom.kcal * qty, protein: (custom.protein || 0) * qty, carbs: (custom.carbs || 0) * qty, fat: (custom.fat || 0) * qty } : null
    : picked ? { kcal: picked.kcal * qty, protein: picked.protein * qty, carbs: picked.carbs * qty, fat: picked.fat * qty } : null;

  const add = async (e) => {
    e.preventDefault();
    setMsg({ text: '', kind: '' });
    if (date > todayKey()) return setMsg({ text: "You can't log meals for a future date.", kind: 'err' });
    if (!(qty >= 0.25 && qty <= 10)) return setMsg({ text: 'Portions must be between 0.25 and 10.', kind: 'err' });
    let body;
    if (customMode) {
      if (!custom.name.trim()) return setMsg({ text: 'Give your food a name.', kind: 'err' });
      if (!(Number(custom.kcal) > 0)) return setMsg({ text: 'Enter the calories for one portion.', kind: 'err' });
      const n = (v) => Math.max(0, Number(v) || 0);
      body = { date, meal, qty, custom: { name: custom.name.trim(), unit: custom.unit || '1 portion', kcal: n(custom.kcal), protein: n(custom.protein), carbs: n(custom.carbs), fat: n(custom.fat), fiber: n(custom.fiber), servings: { veg: n(custom.veg), fruit: n(custom.fruit) } } };
    } else {
      if (!foodId) return setMsg({ text: 'Pick a food from the list first.', kind: 'err' });
      body = { date, meal, qty, foodId };
    }
    setBusy(true);
    try {
      const { entry } = await api('/me/logs', { method: 'POST', body });
      logs.setData((d) => ({ entries: [...(d?.entries || []), entry] }));
      setMsg({ text: `Added ${entry.name} (${fmt(entry.kcal)} kcal).`, kind: 'ok' });
      setQty(1);
      if (customMode) { setCustom(EMPTY_CUSTOM); setCustomMode(false); foodsQ.reload(); }
    } catch (err) {
      setMsg({ text: err.message, kind: 'err' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    const before = logs.data;
    logs.setData((d) => ({ entries: d.entries.filter((x) => x.id !== id) }));
    try {
      await api(`/me/logs/${id}`, { method: 'DELETE' });
    } catch (err) {
      logs.setData(before);
      toast(err.message);
    }
  };

  const status = kcalStatus(totals.kcal, targets?.kcal);
  const chip = !totals.kcal
    ? ['warn', 'Nothing logged yet']
    : status === 'high' ? ['bad', `Over by ${fmt(totals.kcal - targets.kcal)} kcal`]
    : status === 'good' ? ['good', 'On target']
    : targets ? ['warn', `${fmt(targets.kcal - totals.kcal)} kcal left`] : ['good', `${fmt(totals.kcal)} kcal`];

  const balance = targets && [
    ['Vegetables', totals.veg, 3, 'servings'],
    ['Fruit', totals.fruit, 2, 'servings'],
    ['Fibre', totals.fiber, targets.fiber, 'g'],
    ['Protein', totals.protein, targets.protein, 'g']
  ];

  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Hi {user?.name?.split(' ')[0]}</span>
          <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>{date === todayKey() ? 'Today' : fmtLong(date)}</h1>
          <p>{date === todayKey() ? fmtLong(date) : 'Looking back at an earlier day.'}</p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">←</button>
          <input className="input" type="date" aria-label="Pick a date" value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayKey()} aria-label="Next day">→</button>
        </div>
      </div>

      {profile.data && !profile.data.profile && (
        <Reveal className="card pad row" style={{ marginBottom: 24, justifyContent: 'space-between', borderLeft: '4px solid var(--accent)' }}>
          <div>
            <h3>Set your goal first</h3>
            <p className="muted">Tell us your height, weight and goal so we can give you a calorie and macro target.</p>
          </div>
          <Link className="btn btn-primary" to="/app/pathway">Set up my pathway</Link>
        </Reveal>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 24, alignItems: 'start' }}>
        <div className="stack" style={{ gap: 24 }}>
          <Reveal className="card pad">
            <div className="row" style={{ gap: 24, flexWrap: 'nowrap' }}>
              <Ring value={totals.kcal} target={targets?.kcal} />
              <MacroBars totals={totals} targets={targets} />
            </div>
            <div className="row" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--line)', justifyContent: 'space-between' }}>
              <span className={`chip ${chip[0]}`}>{chip[1]}</span>
              <span className="note">{entries.length} item{entries.length === 1 ? '' : 's'} logged</span>
            </div>
          </Reveal>

          <Reveal as="form" className="card pad stack" onSubmit={add} noValidate delay={0.05}>
            <h3>Add food</h3>
            <div className="two">
              <div className="field">
                <label htmlFor="meal">Meal</label>
                <select className="input" id="meal" value={meal} onChange={(e) => setMeal(e.target.value)}>
                  {MEALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="qty">Portions</label>
                <input className="input num" id="qty" type="number" min="0.25" max="10" step="0.25" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
            </div>
            {!customMode ? (
              <FoodPicker foods={foods} value={foodId} onChange={setFoodId} />
            ) : (
              <motion.div className="stack" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ gap: 12 }}>
                <div className="two">
                  <div className="field"><label htmlFor="cname">Food name</label><input className="input" id="cname" maxLength={60} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></div>
                  <div className="field"><label htmlFor="cunit">Portion size</label><input className="input" id="cunit" maxLength={30} value={custom.unit} onChange={(e) => setCustom({ ...custom, unit: e.target.value })} /></div>
                </div>
                <div className="grid-auto">
                  {[['kcal', 'kcal'], ['protein', 'Protein g'], ['carbs', 'Carbs g'], ['fat', 'Fat g'], ['fiber', 'Fibre g'], ['veg', 'Veg servings'], ['fruit', 'Fruit servings']].map(([k, l]) => (
                    <div className="field" key={k}>
                      <label htmlFor={`c-${k}`}>{l}</label>
                      <input className="input num" id={`c-${k}`} type="number" min="0" step="0.5" inputMode="decimal" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <p className="note">It's saved to your foods, so next time you can just search for it.</p>
              </motion.div>
            )}
            <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => setCustomMode((c) => !c)}>
              {customMode ? 'Pick from the list instead' : 'Enter my own food'}
            </button>
            {preview && (
              <div className="row note num" style={{ background: 'var(--soft)', padding: '10px 12px', borderRadius: 10 }}>
                <span><b style={{ color: 'var(--ink)' }}>{fmt(preview.kcal)}</b> kcal</span>
                <span><b style={{ color: 'var(--ink)' }}>{Math.round(preview.protein)} g</b> protein</span>
                <span><b style={{ color: 'var(--ink)' }}>{Math.round(preview.carbs)} g</b> carbs</span>
                <span><b style={{ color: 'var(--ink)' }}>{Math.round(preview.fat)} g</b> fat</span>
              </div>
            )}
            <p className={`msg ${msg.kind}`} role="status">{msg.text}</p>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add to log'}</button>
          </Reveal>
        </div>

        <div className="stack" style={{ gap: 24 }}>
          {balance && (
            <Reveal className="card pad">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <h3>Balance check for this day</h3>
                <Link className="note" to="/balance">Why these?</Link>
              </div>
              <div className="stack" style={{ gap: 12 }}>
                {balance.map(([label, v, goal, unit]) => {
                  const ok = v >= goal * 0.9;
                  return (
                    <div key={label}>
                      <div className="macro-row num"><b>{label}</b><span>{Math.round(v * 10) / 10} / {goal} {unit}</span></div>
                      <div className="meter"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (v / goal) * 100)}%` }} transition={{ duration: 1 }} style={{ background: ok ? 'var(--good)' : 'var(--warn)' }} /></div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {MEALS.map(([m, label], i) => {
              const items = entries.filter((e) => e.meal === m);
              return (
                <Reveal key={m} delay={i * 0.05} className="card" style={{ padding: 18 }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3>{label}</h3>
                    <span className="note num">{fmt(sumEntries(items).kcal)} kcal</span>
                  </div>
                  {logs.loading && !logs.data ? (
                    <p className="note">Loading…</p>
                  ) : items.length === 0 ? (
                    <p className="note">Nothing here yet.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      <AnimatePresence initial={false}>
                        {items.map((e) => (
                          <motion.li key={e.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: '0.93rem' }}>
                            <span>{e.name}{e.qty !== 1 && <span className="note"> ×{e.qty}</span>}</span>
                            <span className="note num">{fmt(e.kcal)} kcal</span>
                            <button className="icon-btn danger" type="button" aria-label={`Remove ${e.name}`} onClick={() => remove(e.id)}><CloseIcon /></button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </Reveal>
              );
            })}
          </div>
          {logs.error && <p className="msg err">{logs.error.message}</p>}
        </div>
      </div>
    </div>
  );
}
