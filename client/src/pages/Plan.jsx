import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { useApi } from '../lib/hooks.js';
import { useToast } from '../lib/toast.jsx';
import { todayKey, weekdayIdx } from '../lib/dates.js';
import { DAYS, MEALS, fmt, kcalStatus } from '../lib/format.js';
import { Reveal } from '../components/ui.jsx';

const fits = (meal, f) => (meal === 'snack' ? f.tags.includes('s') : meal === 'breakfast' ? f.tags.includes('b') || f.tags.includes('s') : f.tags.includes('m'));

export default function Plan() {
  const toast = useToast();
  const planQ = useApi('/me/plan');
  const foodsQ = useApi('/me/foods');
  const profile = useApi('/me/profile');
  const [busy, setBusy] = useState(false);
  const plan = planQ.data?.plan;
  const foods = foodsQ.data?.foods || [];
  const target = profile.data?.targets?.kcal;
  const today = weekdayIdx(todayKey());

  const setSlot = async (day, meal, foodId) => {
    const food = foods.find((f) => f.id === foodId) || null;
    const before = planQ.data;
    planQ.setData((d) => ({ plan: d.plan.map((p, i) => (i === day ? { ...p, [meal]: food } : p)) }));
    try {
      await api(`/me/plan/${day}/${meal}`, { method: 'PUT', body: { foodId: foodId || null } });
    } catch (e) {
      planQ.setData(before);
      toast(e.message);
    }
  };

  const applyToday = async () => {
    setBusy(true);
    try {
      const { entries } = await api('/me/plan/apply', { method: 'POST', body: { date: todayKey() } });
      toast(entries.length ? `Added ${entries.length} planned item${entries.length === 1 ? '' : 's'} to today's log.` : "Today's plan is empty. Pick some meals first.");
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Meal plan</span>
          <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>Plan the week ahead</h1>
          <p>Choose what you want to eat each day. The bar under each day shows how close it lands to your {target ? `${fmt(target)} kcal ` : ''}target.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={applyToday} disabled={busy || !plan}>
          {busy ? 'Adding…' : "Add today's plan to my log"}
        </button>
      </div>

      {!plan ? (
        <p className="muted">{planQ.error ? planQ.error.message : 'Loading your plan…'}</p>
      ) : (
        <Reveal style={{ overflowX: 'auto', borderRadius: 'var(--r)' }}>
          <div className="card" style={{ display: 'grid', gridTemplateColumns: '110px repeat(7, minmax(140px, 1fr))', minWidth: 1100, overflow: 'hidden' }}>
            <div style={cell(true)} />
            {DAYS.map((d, i) => (
              <div key={d} style={{ ...cell(true), background: i === today ? 'var(--accent)' : 'var(--soft)', color: i === today ? 'var(--accent-ink)' : undefined }}>
                {d}{i === today ? ' · today' : ''}
              </div>
            ))}
            {MEALS.map(([meal, label]) => (
              <Row key={meal}>
                <div style={{ ...cell(), fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>{label}</div>
                {plan.map((day, i) => (
                  <div key={i} style={cell()}>
                    <select aria-label={`${DAYS[i]} ${label}`} value={day[meal]?.id || ''} onChange={(e) => setSlot(i, meal, Number(e.target.value) || null)} style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', fontSize: '0.85rem' }}>
                      <option value="">—</option>
                      {foods.filter((f) => fits(meal, f) || f.custom).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                ))}
              </Row>
            ))}
            <div style={{ ...cell(), fontWeight: 600, color: 'var(--muted)', borderBottom: 0 }}>Total</div>
            {plan.map((day, i) => {
              const k = MEALS.reduce((a, [m]) => a + (day[m]?.kcal || 0), 0);
              const s = kcalStatus(k, target);
              const col = s === 'high' ? 'var(--bad)' : s === 'good' ? 'var(--good)' : 'var(--carbs)';
              return (
                <div key={i} style={{ ...cell(), borderBottom: 0, fontSize: '0.85rem' }}>
                  <b className="num">{fmt(k)} kcal</b>
                  <div className="meter" style={{ height: 6, marginTop: 6 }}>
                    <motion.div animate={{ width: `${target ? Math.min(100, (k / target) * 100) : 0}%` }} transition={{ duration: 0.6 }} style={{ background: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      )}
      <p className="note" style={{ marginTop: 14 }}>Green: within 10% of your target. Yellow: under. Red: over. Changes save as you pick.</p>
    </div>
  );
}

const Row = ({ children }) => <>{children}</>;
const cell = (head) => ({ padding: 10, borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line)', ...(head ? { fontFamily: 'var(--display)', fontWeight: 600, background: 'var(--soft)' } : {}) });
