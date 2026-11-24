import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/hooks.js';
import { useToast } from '../lib/toast.jsx';
import { addDays, parseKey, todayKey } from '../lib/dates.js';
import { ACTIVITY, fmt } from '../lib/format.js';
import { Reveal } from '../components/ui.jsx';

const DEFAULTS = { sex: 'female', age: 30, heightCm: 168, weightKg: 75, goalKg: 68, activity: 1.375 };
const fmtShort = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function Pathway() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const profileQ = useApi('/me/profile');
  const weighQ = useApi('/me/weigh-ins');
  const today = todayKey();
  const recent = useApi(`/me/summary?from=${addDays(today, -7)}&to=${addDays(today, -1)}`);

  const [form, setForm] = useState(DEFAULTS);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [weigh, setWeigh] = useState({ date: today, weightKg: '' });

  useEffect(() => {
    if (profileQ.data?.profile) setForm(profileQ.data.profile);
  }, [profileQ.data]);

  const targets = profileQ.data?.targets;
  const profile = profileQ.data?.profile;
  const weighIns = weighQ.data?.weighIns || [];

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const body = { ...form, age: Number(form.age), heightCm: Number(form.heightCm), weightKg: Number(form.weightKg), goalKg: Number(form.goalKg), activity: Number(form.activity) };
      const data = await api('/me/profile', { method: 'PUT', body });
      profileQ.setData(data);
      if (!user.hasProfile) setUser({ ...user, hasProfile: true });
      toast('Your pathway is updated.');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const addWeigh = async (e) => {
    e.preventDefault();
    const kg = Number(weigh.weightKg);
    if (!(kg >= 35 && kg <= 300)) return toast('Enter a weight between 35 and 300 kg.');
    try {
      const data = await api('/me/weigh-ins', { method: 'POST', body: { date: weigh.date, weightKg: kg } });
      weighQ.reload();
      if (data.profile) profileQ.setData({ profile: data.profile, targets: data.targets });
      setWeigh({ ...weigh, weightKg: '' });
      toast('Weigh-in saved.');
    } catch (e2) {
      toast(e2.message);
    }
  };

  // Plan line starts at the first weigh-in (or today) and moves at the planned rate.
  const chart = useMemo(() => {
    if (!targets || !profile) return null;
    const startKey = weighIns[0]?.date || today;
    const startW = weighIns[0]?.weightKg ?? profile.weightKg;
    const diff = profile.goalKg - startW;
    const weeks = targets.mode === 'maintain' ? 8 : Math.ceil(Math.abs(diff) / targets.ratePerWeek);
    const plan = [];
    for (let w = 0; w <= Math.max(weeks, 4); w++) {
      const moved = Math.min(Math.abs(diff), targets.ratePerWeek * w);
      plan.push({ t: parseKey(addDays(startKey, w * 7)).getTime(), plan: Math.round((startW + Math.sign(diff) * moved) * 10) / 10 });
    }
    const actual = weighIns.map((x) => ({ t: parseKey(x.date).getTime(), actual: x.weightKg }));
    const step = Math.max(1, Math.ceil(plan.length / 6));
    const ticks = plan.filter((_, i) => i % step === 0).map((p) => p.t);
    return { plan, actual, weeks, startKey, ticks };
  }, [targets, profile, weighIns, today]);

  const milestones = useMemo(() => {
    if (!targets || !profile || targets.mode === 'maintain') return [];
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, kg: Math.round((profile.weightKg + targets.diffKg * f) * 10) / 10, date: addDays(today, Math.round(targets.weeks * f * 7)) }));
  }, [targets, profile, today]);

  // Real pace from the last 7 days of logged calories
  const pace = useMemo(() => {
    const days = (recent.data?.days || []).filter((d) => d.kcal > 0);
    if (!targets || days.length < 3) return null;
    const avg = days.reduce((a, d) => a + d.kcal, 0) / days.length;
    const kgPerWeek = ((avg - targets.tdee) * 7) / 7700;
    return { avg, kgPerWeek, n: days.length };
  }, [recent.data, targets]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Pathway</span>
          <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>Your road to the goal</h1>
          <p>{loc.state?.welcome && !profile ? 'Welcome! Start by telling us a bit about you. ' : ''}We work out a daily calorie and macro target and map the weeks to your goal weight.</p>
        </div>
      </div>

      <div className="split-1-2">
        <div className="stack" style={{ gap: 24 }}>
          <Reveal as="form" className="card pad stack" onSubmit={save} noValidate style={{ gap: 14 }}>
            <h3>About you</h3>
            <div className="two">
              <div className="field"><label htmlFor="sex">Sex</label><select className="input" id="sex" value={form.sex} onChange={set('sex')}><option value="female">Female</option><option value="male">Male</option></select></div>
              <div className="field"><label htmlFor="age">Age</label><input className="input num" id="age" type="number" min="18" max="100" value={form.age} onChange={set('age')} /></div>
            </div>
            <div className="two">
              <div className="field"><label htmlFor="h">Height (cm)</label><input className="input num" id="h" type="number" min="120" max="230" value={form.heightCm} onChange={set('heightCm')} /></div>
              <div className="field"><label htmlFor="w">Weight now (kg)</label><input className="input num" id="w" type="number" min="35" max="300" step="0.1" value={form.weightKg} onChange={set('weightKg')} /></div>
            </div>
            <div className="field"><label htmlFor="g">Goal weight (kg)</label><input className="input num" id="g" type="number" min="35" max="300" step="0.1" value={form.goalKg} onChange={set('goalKg')} /></div>
            <div className="field"><label htmlFor="act">How active are you?</label>
              <select className="input" id="act" value={form.activity} onChange={set('activity')}>
                {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <p className="msg err" role="alert">{err}</p>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : profile ? 'Update my pathway' : 'Build my pathway'}</button>
            <p className="note">Estimates use the Mifflin–St Jeor formula. They're a starting point, not medical advice. If you're pregnant or managing a health condition, check with a doctor or dietitian first.</p>
          </Reveal>

          {profile && (
            <Reveal as="form" className="card pad stack" onSubmit={addWeigh} noValidate delay={0.05} style={{ gap: 12 }}>
              <h3>Log a weigh-in</h3>
              <p className="note">Weigh yourself once a week, same time of day. Your targets update with your latest weight.</p>
              <div className="two">
                <div className="field"><label htmlFor="wd">Date</label><input className="input" id="wd" type="date" max={today} value={weigh.date} onChange={(e) => setWeigh({ ...weigh, date: e.target.value })} /></div>
                <div className="field"><label htmlFor="wk">Weight (kg)</label><input className="input num" id="wk" type="number" min="35" max="300" step="0.1" value={weigh.weightKg} onChange={(e) => setWeigh({ ...weigh, weightKg: e.target.value })} /></div>
              </div>
              <button className="btn btn-ghost" type="submit">Save weigh-in</button>
            </Reveal>
          )}
        </div>

        {!targets ? (
          <Reveal className="card empty-state">
            <h3>Your pathway appears here</h3>
            <p>Fill in the form and press "Build my pathway".</p>
          </Reveal>
        ) : (
          <div className="stack" style={{ gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
              {[['var(--accent)', fmt(targets.kcal), 'kcal a day'], ['var(--protein)', `${targets.protein} g`, 'protein'], ['var(--carbs)', `${targets.carbs} g`, 'carbs'], ['var(--fat)', `${targets.fat} g`, 'fat']].map(([c, v, l], i) => (
                <motion.div key={l} className="card" style={{ padding: 16, borderTop: `4px solid ${c}`, boxShadow: 'none' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="num" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '1.7rem' }}>{v}</div>
                  <div className="note">{l}</div>
                </motion.div>
              ))}
            </div>

            <Reveal className="card pad">
              <h3>
                {targets.mode === 'maintain'
                  ? `You're at your goal. Keep it steady at about ${fmt(targets.kcal)} kcal a day.`
                  : `${targets.mode === 'lose' ? 'Lose' : 'Gain'} ${Math.abs(targets.diffKg)} kg in about ${targets.weeks} weeks (${targets.ratePerWeek} kg a week)`}
              </h3>
              <p className="note" style={{ marginTop: 4 }}>Your body burns about {fmt(targets.tdee)} kcal a day. {targets.mode === 'lose' ? 'Eating ' + fmt(targets.tdee - targets.kcal) + ' kcal less than that' : targets.mode === 'gain' ? 'Eating ' + fmt(targets.kcal - targets.tdee) + ' kcal more' : 'Eating about that much'} gets you there at a pace you can keep.</p>
              {milestones.length > 0 && (
                <ol style={{ listStyle: 'none', margin: '22px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 10 }}>
                  {milestones.map((m, i) => (
                    <motion.li key={m.f} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} style={{ textAlign: 'center' }}>
                      <div style={{ width: 30, height: 30, margin: '0 auto 8px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '0.72rem', fontWeight: 700, border: '3px solid', borderColor: i === 0 ? 'var(--accent)' : 'var(--line)', background: i === 0 ? 'var(--accent)' : 'var(--surface)', color: i === 0 ? 'var(--accent-ink)' : 'var(--ink)' }}>{i === 0 ? '✓' : `${m.f * 100}`}</div>
                      <div className="num" style={{ fontFamily: 'var(--display)', fontWeight: 800 }}>{m.kg} kg</div>
                      <div className="note">{i === 0 ? 'Today' : parseKey(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</div>
                    </motion.li>
                  ))}
                </ol>
              )}
            </Reveal>

            <Reveal className="card pad" style={{ background: 'var(--soft)', boxShadow: 'none' }}>
              {!pace ? (
                <p>Log meals on at least 3 of the last 7 days and we'll compare your real eating with this plan. <Link to="/app">Log a meal</Link></p>
              ) : (
                <p>
                  Over {pace.n} logged days you ate <b className="num">{fmt(pace.avg)} kcal</b> a day on average. At that rate you'd be {pace.kgPerWeek < 0 ? 'losing' : 'gaining'} about <b className="num">{Math.abs(Math.round(pace.kgPerWeek * 100) / 100)} kg a week</b>.{' '}
                  {targets.mode !== 'maintain' && Math.sign(pace.kgPerWeek) !== Math.sign(targets.diffKg) ? <b>That moves you away from your goal. Aim closer to {fmt(targets.kcal)} kcal.</b> : null}
                  {targets.mode === 'lose' && pace.kgPerWeek < -1 ? ' That is faster than 1 kg a week, which is hard to keep up and can cost muscle.' : null}
                </p>
              )}
            </Reveal>

            {chart && (
              <Reveal className="card pad">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3>Plan vs your weigh-ins</h3>
                  <span className="note">{weighIns.length ? `${weighIns.length} weigh-in${weighIns.length === 1 ? '' : 's'}` : 'No weigh-ins yet'}</span>
                </div>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <ComposedChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={chart.ticks} tickFormatter={fmtShort} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} allowDuplicatedCategory={false} />
                      <YAxis domain={['auto', 'auto']} stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} width={56} unit=" kg" />
                      <Tooltip labelFormatter={fmtShort} formatter={(v, n) => [`${v} kg`, n]} contentStyle={{ background: 'var(--ink)', border: 0, borderRadius: 8, color: 'var(--bg)' }} itemStyle={{ color: 'var(--bg)' }} labelStyle={{ color: 'var(--bg)', fontWeight: 700 }} />
                      <ReferenceLine y={profile.goalKg} stroke="var(--fat)" strokeDasharray="3 4" label={{ value: `Goal ${profile.goalKg} kg`, fill: 'var(--muted)', fontSize: 12, position: 'insideBottomLeft' }} />
                      <Line data={chart.plan} dataKey="plan" name="Plan" stroke="var(--accent)" strokeWidth={3} dot={false} animationDuration={1100} />
                      <Line data={chart.actual} dataKey="actual" name="Your weight" stroke="var(--ink)" strokeWidth={2} dot={{ r: 4, fill: 'var(--ink)' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Reveal>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
