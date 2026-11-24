import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/hooks.js';
import { MacroBars, Reveal, Ring, Stars, avatarColor } from '../components/ui.jsx';
import PlateDiagram from '../components/PlateDiagram.jsx';

const rise = (d = 0) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: [0.2, 0.8, 0.2, 1] } });

const FEATURES = [
  ['01', 'Track every meal', 'Search 40+ everyday foods, from oatmeal to chicken karahi, or add your own. Portions scale the numbers for you.'],
  ['02', 'See it on a graph', 'Switch between one day, the last week and the last month. Every chart shows your target so you know where you stand.'],
  ['03', 'Learn to balance', 'Diet Plateful checks your real meals against the plate method and tells you what is missing, with foods that fix it.'],
  ['04', 'Follow a pathway', 'Set a goal weight. Get a daily calorie and macro target, dated milestones, and a chart of your weigh-ins against the plan.']
];

export default function Home() {
  const { user } = useAuth();
  const { data } = useApi('/reviews?limit=3');
  const { data: lib } = useApi('/foods/library');
  const foods = lib?.foods?.map((f) => f.name) || [];

  return (
    <>
      <header style={{ padding: 'clamp(40px,7vw,88px) 0 40px' }}>
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 'clamp(28px,5vw,64px)', alignItems: 'center' }}>
          <div>
            <motion.span className="note" style={{ fontWeight: 600, display: 'block', marginBottom: 18 }} {...rise()}>
              Diet tracker and balance coach
            </motion.span>
            <motion.h1 {...rise(0.08)}>
              Eat on purpose. Watch it{' '}
              <span style={{ position: 'relative', whiteSpace: 'nowrap' }}>
                add up.
                <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: '-0.12em', width: '100%', height: '0.32em', overflow: 'visible' }}>
                  <motion.path d="M4 14 C 60 4, 120 18, 180 9 S 270 6, 296 12" stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.6, ease: [0.6, 0.1, 0.2, 1] }} />
                </svg>
              </span>
            </motion.h1>
            <motion.p className="muted" style={{ fontSize: '1.15rem', maxWidth: '52ch', margin: '22px 0 30px' }} {...rise(0.16)}>
              Log your meals in seconds, see your calories and macros on a chart, and learn how to balance your plate with advice based on what you actually ate.
            </motion.p>
            <motion.div className="row" {...rise(0.24)}>
              {user ? (
                <Link className="btn btn-primary" to="/app">Open my day</Link>
              ) : (
                <Link className="btn btn-primary" to="/register">Start free</Link>
              )}
              <Link className="btn btn-ghost" to="/balance">How to balance a diet</Link>
            </motion.div>
          </div>

          <motion.aside className="card pad" initial={{ opacity: 0, y: 30, rotate: 1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }} aria-label="Example of the daily view">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
              <h3>Today</h3>
              <span className="chip warn">Example day</span>
            </div>
            <div className="row" style={{ gap: 24, flexWrap: 'nowrap' }}>
              <Ring value={1480} target={1790} />
              <MacroBars totals={{ protein: 92, carbs: 170, fat: 48 }} targets={{ protein: 118, carbs: 198, fat: 56 }} />
            </div>
            <div className="row" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--line)', justifyContent: 'space-between' }}>
              <span className="chip good">Vegetables 3 / 3</span>
              <span className="chip low">Fruit 1 / 2</span>
              <span className="chip good">Fibre 26 g</span>
            </div>
          </motion.aside>
        </div>
      </header>

      <section className="block">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">What you can do</span>
            <h2 style={{ maxWidth: '18ch' }}>Two jobs: keep track, and get better at balance.</h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 36 }}>
            {FEATURES.map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 0.08} className="card pad" whileHover={{ y: -4 }}>
                <span className="eyebrow num">{n}</span>
                <h3 style={{ fontSize: '1.35rem', marginBottom: 10 }}>{t}</h3>
                <p className="muted">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="block band">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 48, alignItems: 'center' }}>
          <Reveal style={{ display: 'grid', placeItems: 'center' }}>
            <PlateDiagram size={340} />
          </Reveal>
          <Reveal delay={0.1}>
            <span className="eyebrow">The balance idea</span>
            <h2>Half your plate is plants. The rest is grains and protein.</h2>
            <p className="muted" style={{ margin: '16px 0 24px', maxWidth: '50ch' }}>
              That's the plate method, the simplest way to balance a meal without counting anything. DietPlateful teaches it, then checks your real meals against it: vegetables, fruit, fibre, protein and how your calories split between carbs and fat.
            </p>
            <Link className="btn btn-primary" to="/balance">Read the balance guide</Link>
          </Reveal>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <Reveal className="row" style={{ justifyContent: 'space-between', alignItems: 'end', marginBottom: 28 }}>
            <div>
              <span className="eyebrow">Reviews</span>
              <h2>From people using it</h2>
            </div>
            {data?.stats?.count > 0 && (
              <div className="row">
                <Stars value={data.stats.average} />
                <span className="muted num">
                  {Number(data.stats.average).toFixed(1)} from {data.stats.count} review{data.stats.count === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </Reveal>
          {data?.reviews?.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
              {data.reviews.map((r, i) => (
                <Reveal key={r.id} delay={i * 0.08} className="card pad">
                  <div className="row" style={{ marginBottom: 10 }}>
                    <span className="avatar" style={{ background: avatarColor(r.author) }}>{r.author[0]?.toUpperCase()}</span>
                    <div>
                      <b>{r.author}</b>
                      <div><Stars value={r.rating} size={15} /></div>
                    </div>
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.body}</p>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="card empty-state">
              <h3>No reviews yet</h3>
              <p>Try Diet Plateful for a week, then tell others how it went.</p>
              <Link className="btn btn-ghost" to="/reviews">Go to reviews</Link>
            </Reveal>
          )}
        </div>
      </section>

      {!user && (
        <section className="block band">
          <Reveal className="wrap" style={{ textAlign: 'center' }}>
            <h2>Your first week starts with one meal.</h2>
            <p className="muted" style={{ margin: '14px auto 26px', maxWidth: '46ch' }}>Create an account, set your goal, and log what you eat today.</p>
            <Link className="btn btn-primary" to="/register">Create my free account</Link>
          </Reveal>
        </section>
      )}
    </>
  );
}
