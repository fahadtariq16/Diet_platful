import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/hooks.js';
import { addDays, todayKey } from '../lib/dates.js';
import { Reveal, Ring, Segmented } from '../components/ui.jsx';
import PlateDiagram from '../components/PlateDiagram.jsx';

const PLATE = {
  veg: { title: 'Vegetables: about a third of the plate', color: 'var(--veg)', body: 'The more colour and variety, the better. Potatoes and chips do not count here: they act like a carb.', eg: 'Salad, spinach, carrots, broccoli, peppers, sauerkraut, cucumber, tomatoes', hand: 'Two open handfuls' },
  fruit: { title: 'Fruit: the rest of the half', color: 'var(--fruit)', body: 'Whole fruit beats juice. Juice keeps the sugar and loses most of the fibre.', eg: 'Apples, berries, oranges, bananas, pears', hand: 'One fist' },
  grains: { title: 'Whole grains: a quarter', color: 'var(--carbs)', body: 'Choose whole and intact grains. White rice, white bread and pasta are fine in smaller amounts.', eg: 'Rye bread, buckwheat, oats, brown rice, quinoa, wholewheat roti', hand: 'One cupped hand' },
  protein: { title: 'Protein: a quarter', color: 'var(--protein)', body: 'Mix plant and animal protein. Limit processed meat like sausages and bacon.', eg: 'Chicken, fish, eggs, lentils (daal), chickpeas, tofu, cottage cheese', hand: 'One palm' }
};

const SWAPS = [
  ['A full plate of white rice', 'Half rice, half vegetables or daal'],
  ['A can of soft drink', 'Sparkling water with lemon'],
  ['Crisps', 'A handful of almonds or carrot sticks with hummus'],
  ['Orange juice', 'A whole orange'],
  ['White toast and jam', 'Rye bread with cottage cheese'],
  ['Fried paratha every day', 'Wholewheat roti on most days']
];

const HANDS = [
  ['Palm', 'Protein', 'Chicken, fish, tofu', 'var(--protein)'],
  ['Fist', 'Vegetables', 'Aim for two per meal', 'var(--veg)'],
  ['Cupped hand', 'Carbs', 'Rice, pasta, potatoes', 'var(--carbs)'],
  ['Thumb', 'Fats', 'Oil, butter, nut butter', 'var(--fat)']
];

export default function Balance() {
  const { user } = useAuth();
  const [active, setActive] = useState('veg');
  const guide = useApi('/guide');
  const R = guide.data?.guide?.macroRanges;
  const info = PLATE[active];

  return (
    <>
      <div className="wrap page" style={{ paddingBottom: 0 }}>
        <div className="page-head">
          <div>
            <span className="eyebrow">Balance guide</span>
            <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.4rem)' }}>How to balance your diet</h1>
            <p>You don't need to count every calorie to eat well. Start with the shape of your plate, then use Diet Plateful to check how close your real meals come.</p>
          </div>
          {user && <a className="btn btn-primary" href="#my-balance">Check my balance</a>}
        </div>
      </div>

      <section className="block" style={{ paddingTop: 16 }}>
        <div className="wrap split-1-2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'center' }}>
          <Reveal style={{ display: 'grid', placeItems: 'center' }}>
            <PlateDiagram size={380} active={active} onHover={(k) => k && setActive(k)} />
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }} role="tablist" aria-label="Parts of the plate">
              {Object.keys(PLATE).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={active === k} className="btn btn-sm btn-ghost" style={active === k ? { borderColor: PLATE[k].color, color: 'var(--ink)' } : undefined} onClick={() => setActive(k)}>
                  {k === 'veg' ? 'Vegetables' : k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </Reveal>
          <div>
            <span className="eyebrow">The plate method</span>
            <h2 style={{ marginBottom: 20 }}>Half plants, a quarter grains, a quarter protein.</h2>
            <AnimatePresence mode="wait">
              <motion.div key={active} className="card pad" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} style={{ borderTop: `4px solid ${info.color}` }}>
                <h3 style={{ fontSize: '1.3rem' }}>{info.title}</h3>
                <p style={{ margin: '10px 0 14px' }}>{info.body}</p>
                <p className="note"><b style={{ color: 'var(--ink)' }}>Examples:</b> {info.eg}</p>
                <p className="note" style={{ marginTop: 6 }}><b style={{ color: 'var(--ink)' }}>Portion by hand:</b> {info.hand}</p>
              </motion.div>
            </AnimatePresence>
            <p className="note" style={{ marginTop: 16 }}>Also: drink water as your main drink, cook with healthy oils like olive or rapeseed oil, and keep sweets and sugary drinks occasional.</p>
          </div>
        </div>
      </section>

      <section className="block band">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">No scale needed</span>
            <h2>Measure portions with your hand</h2>
            <p className="muted" style={{ margin: '12px 0 28px', maxWidth: '56ch' }}>Your hand grows with your body, so it's a rough but personal portion guide. Per meal, most adults do well with:</p>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
            {HANDS.map(([hand, what, eg, c], i) => (
              <Reveal key={hand} delay={i * 0.07} className="card pad" whileHover={{ y: -4 }} style={{ borderLeft: `4px solid ${c}` }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '1.6rem' }}>{hand}</div>
                <b>{what}</b>
                <p className="note">{eg}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap split-1-2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <Reveal>
            <span className="eyebrow">Macros</span>
            <h2>Where your calories should come from</h2>
            <p className="muted" style={{ margin: '12px 0 24px' }}>These are the commonly used healthy ranges for adults. Inside them there's lots of room for your own taste and culture.</p>
            {R && (
              <div className="stack">
                {[['Protein', R.protein, 'var(--protein)'], ['Carbs', R.carbs, 'var(--carbs)'], ['Fat', R.fat, 'var(--fat)']].map(([n, r, c]) => (
                  <div key={n}>
                    <div className="macro-row num"><b>{n}</b><span>{r.min}–{r.max}% of calories</span></div>
                    <div className="meter" style={{ height: 14, position: 'relative' }}>
                      <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9 }} style={{ position: 'absolute', left: `${r.min}%`, width: `${r.max - r.min}%`, background: c, transformOrigin: 'left' }} />
                    </div>
                  </div>
                ))}
                <div className="note num" style={{ display: 'flex', justifyContent: 'space-between' }}><span>0%</span><span>50%</span><span>100%</span></div>
              </div>
            )}
          </Reveal>
          <Reveal delay={0.1}>
            <span className="eyebrow">Small swaps</span>
            <h2>Easy changes that add up</h2>
            <div className="card" style={{ marginTop: 24, overflow: 'hidden' }}>
              {SWAPS.map(([a, b], i) => (
                <div key={a} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, padding: '14px 18px', borderTop: i ? '1px solid var(--line)' : 0, alignItems: 'center' }}>
                  <span className="muted" style={{ textDecoration: 'line-through', textDecorationColor: 'var(--line)' }}>{a}</span>
                  <span aria-hidden="true" style={{ color: 'var(--accent)' }}>→</span>
                  <b style={{ fontWeight: 600 }}>{b}</b>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="block band" id="my-balance" style={{ scrollMarginTop: 64 }}>
        <div className="wrap">{user ? <MyBalance /> : <GuestCta />}</div>
      </section>
    </>
  );
}

function GuestCta() {
  return (
    <Reveal className="empty-state">
      <span className="eyebrow">Your balance</span>
      <h2>See how balanced your own meals are</h2>
      <p>Log what you eat for a few days and Diet Plateful scores your balance, shows what's missing, and suggests foods to fix it.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-primary" to="/register">Create a free account</Link>
        <Link className="btn btn-ghost" to="/login">Log in</Link>
      </div>
    </Reveal>
  );
}

function MyBalance() {
  const [days, setDays] = useState('7');
  const to = todayKey();
  const from = addDays(to, -(Number(days) - 1));
  const q = useApi(`/me/insights/balance?from=${from}&to=${to}`);
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash === '#my-balance' && q.data) document.getElementById('my-balance')?.scrollIntoView({ behavior: 'smooth' });
  }, [loc.hash, q.data]);

  const d = q.data;
  const scoreColor = d?.score >= 80 ? 'var(--good)' : d?.score >= 55 ? 'var(--warn)' : 'var(--bad)';

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Your balance</span>
          <h2>How balanced were your meals?</h2>
          <p>Based on everything you logged, averaged per day you logged food.</p>
        </div>
        <Segmented id="bal" label="Period" value={days} onChange={setDays} options={[['7', 'Last 7 days'], ['30', 'Last 30 days']]} />
      </div>

      {q.error?.status === 409 ? (
        <div className="card empty-state">
          <h3>Set up your profile first</h3>
          <p>We need your height, weight and goal to know your targets.</p>
          <Link className="btn btn-primary" to="/app/pathway">Set up my pathway</Link>
        </div>
      ) : q.error ? (
        <p className="msg err">{q.error.message}</p>
      ) : !d ? (
        <p className="muted">Checking your meals…</p>
      ) : d.daysLogged === 0 ? (
        <div className="card empty-state">
          <h3>Nothing logged in this period</h3>
          <p>Log your meals for at least 3 days to get a useful balance check.</p>
          <Link className="btn btn-primary" to="/app">Log a meal</Link>
        </div>
      ) : (
        <div className="split-1-2">
          <div className="card pad" style={{ textAlign: 'center', display: 'grid', justifyItems: 'center', gap: 12 }}>
            <div style={{ '--accent': scoreColor }}>
              <Ring value={d.score} target={100} size={180} stroke={14} label="balance score" />
            </div>
            <p className="note">From {d.daysLogged} day{d.daysLogged === 1 ? '' : 's'} with meals logged.</p>
            {!d.enoughData && <span className="chip warn">Log 3+ days for a reliable score</span>}
          </div>
          <div className="stack">
            <div className="card pad">
              <h3 style={{ marginBottom: 14 }}>The details</h3>
              <div className="stack" style={{ gap: 12 }}>
                {d.components.map((c, i) => (
                  <motion.div key={c.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px,1fr) 2fr auto', gap: 12, alignItems: 'center' }}>
                    <b>{c.label}</b>
                    <div>
                      <div className="meter"><motion.div initial={{ width: 0 }} animate={{ width: `${c.score * 100}%` }} transition={{ duration: 0.9, delay: i * 0.05 }} style={{ background: c.status === 'good' ? 'var(--good)' : c.status === 'high' ? 'var(--bad)' : 'var(--warn)' }} /></div>
                      <span className="note num">{c.value} {c.unit} · goal {c.target}</span>
                    </div>
                    <span className={`chip ${c.status}`}>{c.status === 'good' ? 'Good' : c.status === 'high' ? 'Too high' : 'Too low'}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            {d.tips.length > 0 ? (
              <div className="card pad">
                <h3 style={{ marginBottom: 14 }}>What to change</h3>
                <ol className="stack" style={{ margin: 0, paddingLeft: 20, gap: 14 }}>
                  {d.tips.map((t) => (
                    <li key={t.key}>
                      <p>{t.text}</p>
                      {t.foods.length > 0 && (
                        <div className="row" style={{ gap: 6, marginTop: 8 }}>
                          {t.foods.map((f) => <span key={f} className="chip" style={{ color: 'var(--ink)' }}>{f}</span>)}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="card pad"><h3>Nicely balanced</h3><p className="muted">Everything is within the healthy ranges. Keep doing what you're doing.</p></div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
