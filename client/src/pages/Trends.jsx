import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../lib/hooks.js';
import { addDays, fmtDay, rangeKeys, todayKey } from '../lib/dates.js';
import { MEALS, fmt, kcalStatus, sumEntries } from '../lib/format.js';
import { ChartTip, Reveal, Segmented, StatTiles } from '../components/ui.jsx';

const axis = { stroke: 'var(--muted)', fontSize: 12, tickLine: false, axisLine: false };

export default function Trends() {
  const [range, setRange] = useState('week');
  const today = todayKey();
  const days = range === 'month' ? 30 : 7;
  const from = addDays(today, -(days - 1));
  const profile = useApi('/me/profile');
  const summary = useApi(range === 'day' ? null : `/me/summary?from=${from}&to=${today}`);
  const dayLogs = useApi(range === 'day' ? `/me/logs?from=${today}&to=${today}` : null);
  const targets = profile.data?.targets;
  const target = targets?.kcal || 0;

  const series = useMemo(() => {
    if (range === 'day') return [];
    const by = Object.fromEntries((summary.data?.days || []).map((d) => [d.date, d]));
    return rangeKeys(from, today).map((k, i, arr) => {
      const d = by[k];
      const window = arr.slice(Math.max(0, i - 6), i + 1).map((x) => by[x]?.kcal).filter(Boolean);
      return {
        key: k,
        label: range === 'week' ? fmtDay(k) : fmtDay(k, { day: 'numeric', month: 'short' }),
        kcal: d?.kcal || 0,
        kcalOrNull: d?.kcal || null,
        protein: d?.protein || 0,
        carbs: d?.carbs || 0,
        fat: d?.fat || 0,
        avg7: window.length ? Math.round(window.reduce((a, b) => a + b, 0) / window.length) : null
      };
    });
  }, [summary.data, range, from, today]);

  const perMeal = useMemo(() => {
    const entries = dayLogs.data?.entries || [];
    return MEALS.map(([m, label]) => {
      const t = sumEntries(entries.filter((e) => e.meal === m));
      return { label, protein: Math.round(t.protein * 4), carbs: Math.round(t.carbs * 4), fat: Math.round(t.fat * 9) };
    });
  }, [dayLogs.data]);

  // macro split for the donut
  const macroTotals = range === 'day'
    ? sumEntries(dayLogs.data?.entries || [])
    : series.reduce((a, d) => ({ protein: a.protein + d.protein, carbs: a.carbs + d.carbs, fat: a.fat + d.fat }), { protein: 0, carbs: 0, fat: 0 });
  const pie = [
    { name: 'Protein', value: Math.round(macroTotals.protein * 4), color: 'var(--protein)' },
    { name: 'Carbs', value: Math.round(macroTotals.carbs * 4), color: 'var(--carbs)' },
    { name: 'Fat', value: Math.round(macroTotals.fat * 9), color: 'var(--fat)' }
  ];
  const pieTotal = pie.reduce((a, p) => a + p.value, 0);

  let stats;
  if (range === 'day') {
    const t = sumEntries(dayLogs.data?.entries || []);
    stats = [
      [fmt(t.kcal), 'kcal eaten today'],
      [target ? fmt(Math.max(0, target - t.kcal)) : '–', 'kcal left to target'],
      [`${Math.round(t.protein)} g`, `protein${targets ? ` (goal ${targets.protein} g)` : ''}`],
      [`${Math.round(t.fiber)} g`, `fibre${targets ? ` (goal ${targets.fiber} g)` : ''}`]
    ];
  } else {
    const logged = series.filter((d) => d.kcal > 0);
    const avg = logged.length ? logged.reduce((a, d) => a + d.kcal, 0) / logged.length : 0;
    const onTarget = series.filter((d) => kcalStatus(d.kcal, target) === 'good').length;
    const avgP = logged.length ? logged.reduce((a, d) => a + d.protein, 0) / logged.length : 0;
    stats = [
      [fmt(avg), 'average kcal per logged day'],
      [`${onTarget} / ${days}`, 'days within 10% of target'],
      [`${Math.round(avgP)} g`, `average protein${targets ? ` (goal ${targets.protein} g)` : ''}`],
      [`${logged.length} / ${days}`, 'days with anything logged']
    ];
  }

  const color = (v) => {
    const s = kcalStatus(v, target);
    return s === 'high' ? 'var(--bad)' : s === 'good' ? 'var(--good)' : s === 'low' ? 'var(--carbs)' : 'var(--line)';
  };
  const loading = (range === 'day' ? dayLogs : summary).loading;
  const empty = range === 'day' ? !(dayLogs.data?.entries || []).length : !series.some((d) => d.kcal);

  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Trends</span>
          <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>Your diet on a graph</h1>
          <p>One day, the last 7 days or the last 30. The dashed line is your daily calorie target.</p>
        </div>
        <Segmented id="range" label="Time range" value={range} onChange={setRange} options={[['day', 'Day'], ['week', 'Week'], ['month', 'Month']]} />
      </div>

      <div className="split-2-1">
        <Reveal className="card pad" style={{ minWidth: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>{range === 'day' ? 'Today, by meal (kcal from each macro)' : range === 'week' ? 'Calories, last 7 days' : 'Calories, last 30 days'}</h3>
            <div className="row note" style={{ gap: 14 }}>
              {range === 'day' ? (
                <><Key c="var(--protein)" t="Protein" /><Key c="var(--carbs)" t="Carbs" /><Key c="var(--fat)" t="Fat" /></>
              ) : range === 'week' ? (
                <><Key c="var(--good)" t="On target" /><Key c="var(--carbs)" t="Under" /><Key c="var(--bad)" t="Over" /><Key c="var(--ink)" t="Target" dash /></>
              ) : (
                <><Key c="var(--accent)" t="Daily" /><Key c="var(--fat)" t="7-day average" /><Key c="var(--ink)" t="Target" dash /></>
              )}
            </div>
          </div>
          <div className="chart-box" style={{ position: 'relative' }}>
            {!loading && empty && (
              <div className="empty-state" style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'grid', placeContent: 'center' }}>
                <h3>No meals logged {range === 'day' ? 'today' : 'in this period'}</h3>
                <p>Charts fill in as you log.</p>
                <Link className="btn btn-primary btn-sm" to="/app" style={{ justifySelf: 'center' }}>Log a meal</Link>
              </div>
            )}
            <ResponsiveContainer>
              {range === 'day' ? (
                <BarChart data={perMeal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} width={48} tickFormatter={fmt} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--soft)' }} />
                  <Bar dataKey="protein" name="Protein" stackId="m" fill="var(--protein)" />
                  <Bar dataKey="carbs" name="Carbs" stackId="m" fill="var(--carbs)" />
                  <Bar dataKey="fat" name="Fat" stackId="m" fill="var(--fat)" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : range === 'week' ? (
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} width={48} tickFormatter={fmt} domain={[0, (max) => Math.max(max, target * 1.2)]} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--soft)' }} />
                  <Bar dataKey="kcal" name="Calories" radius={[8, 8, 0, 0]} maxBarSize={56} animationDuration={900}>
                    {series.map((d) => <Cell key={d.key} fill={color(d.kcal)} />)}
                  </Bar>
                  {target > 0 && <ReferenceLine y={target} stroke="var(--ink)" strokeDasharray="6 5" label={{ value: `${fmt(target)} target`, position: 'insideTopRight', fill: 'var(--muted)', fontSize: 12 }} />}
                </BarChart>
              ) : (
                <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kcalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis {...axis} width={48} tickFormatter={fmt} domain={[0, (max) => Math.max(max, target * 1.2)]} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="kcalOrNull" name="Calories" stroke="var(--accent)" strokeWidth={2} fill="url(#kcalFill)" connectNulls dot={{ r: 2.5, fill: 'var(--accent)' }} animationDuration={1000} />
                  <Line type="monotone" dataKey="avg7" name="7-day average" stroke="var(--fat)" strokeWidth={3} dot={false} connectNulls />
                  {target > 0 && <ReferenceLine y={target} stroke="var(--ink)" strokeDasharray="6 5" />}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 20 }}>
            <StatTiles items={stats} />
          </div>
        </Reveal>

        <Reveal className="card pad" delay={0.1}>
          <h3>Where your calories came from</h3>
          <p className="note" style={{ margin: '4px 0 12px' }}>{range === 'day' ? 'Today' : `Last ${days} days`}. A balanced split is roughly 10–35% protein, 45–65% carbs and 20–35% fat.</p>
          <div style={{ height: 220 }}>
            {pieTotal > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="none" animationDuration={900}>
                    {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="note" style={{ paddingTop: 80, textAlign: 'center' }}>Nothing to show yet.</p>
            )}
          </div>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {pie.map((p) => (
              <div key={p.name} className="macro-row num">
                <span style={{ color: 'var(--ink)' }}><Key c={p.color} t={p.name} /></span>
                <b>{pieTotal ? Math.round((p.value / pieTotal) * 100) : 0}%</b>
              </div>
            ))}
          </div>
          <Link className="btn btn-ghost btn-sm" to="/balance#my-balance" style={{ marginTop: 16 }}>See my full balance check</Link>
        </Reveal>
      </div>
    </div>
  );
}

function Key({ c, t, dash }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <i style={dash ? { width: 14, borderTop: `2px dashed ${c}` } : { width: 10, height: 10, borderRadius: 3, background: c }} />
      {t}
    </span>
  );
}
