import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useApi } from '../lib/hooks.js';
import { Meter, Reveal, StarPicker, Stars, avatarColor } from '../components/ui.jsx';

const when = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Reviews() {
  const { user } = useAuth();
  const list = useApi(`/reviews?limit=100&u=${user?.id || 0}`);
  const stats = list.data?.stats;
  const reviews = list.data?.reviews || [];

  return (
    <div className="wrap page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h1 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)' }}>What people say</h1>
          <p>Honest reviews from people who use Diet Plateful. One review per person, and you can edit yours any time.</p>
        </div>
      </div>

      <div className="split-1-2">
        <div className="stack" style={{ gap: 24 }}>
          <Reveal className="card pad">
            <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
              <span className="num" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '3.4rem', lineHeight: 1 }}>{stats?.count ? Number(stats.average).toFixed(1) : '–'}</span>
              <div>
                <Stars value={stats?.average || 0} />
                <div className="note num">{stats?.count ? `${stats.count} review${stats.count === 1 ? '' : 's'}` : 'No reviews yet'}</div>
              </div>
            </div>
            <div className="stack" style={{ gap: 6, marginTop: 18 }}>
              {[5, 4, 3, 2, 1].map((s) => (
                <div key={s} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 28px', gap: 10, alignItems: 'center' }} className="note num">
                  <span>{s}★</span>
                  <Meter value={stats?.distribution?.[s] || 0} max={stats?.count || 1} color="var(--carbs)" />
                  <span>{stats?.distribution?.[s] || 0}</span>
                </div>
              ))}
            </div>
          </Reveal>
          {user ? (
            <ReviewForm onSaved={list.reload} />
          ) : (
            <Reveal className="card pad">
              <h3>Want to leave a review?</h3>
              <p className="muted" style={{ margin: '8px 0 16px' }}>Log in so each review comes from a real account.</p>
              <div className="row">
                <Link className="btn btn-primary btn-sm" to="/login" state={{ from: '/reviews' }}>Log in</Link>
                <Link className="btn btn-ghost btn-sm" to="/register">Sign up</Link>
              </div>
            </Reveal>
          )}
        </div>

        <div className="stack" style={{ gap: 14 }}>
          {list.error && <p className="msg err">{list.error.message}</p>}
          {!list.data && !list.error && <p className="muted">Loading reviews…</p>}
          {list.data && reviews.length === 0 && (
            <div className="card empty-state"><h3>No reviews yet</h3><p>Yours can be the first.</p></div>
          )}
          <AnimatePresence initial={false}>
            {reviews.map((r, i) => (
              <motion.article key={r.id} layout className="card pad" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="avatar" style={{ background: avatarColor(r.author) }}>{r.author[0]?.toUpperCase()}</span>
                    <div>
                      <b>{r.author}</b>
                      {r.mine && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', marginLeft: 6 }}>YOU</span>}
                      <div><Stars value={r.rating} size={15} /></div>
                    </div>
                  </div>
                  <span className="note">{when(r.updatedAt)}{r.updatedAt !== r.createdAt ? ' · edited' : ''}</span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.body}</p>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ onSaved }) {
  const mine = useApi('/reviews/me');
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState({ text: '', kind: '' });
  const [busy, setBusy] = useState(false);
  const existing = mine.data?.review;

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setBody(existing.body);
    }
  }, [existing]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setMsg({ text: 'Pick a star rating first.', kind: 'err' });
    if (body.trim().length < 10) return setMsg({ text: 'Write at least a sentence (10 characters or more).', kind: 'err' });
    setBusy(true);
    try {
      await api('/reviews/me', { method: 'PUT', body: { rating, body: body.trim() } });
      setMsg({ text: existing ? 'Your review is updated.' : 'Thanks! Your review is live.', kind: 'ok' });
      mine.reload();
      onSaved();
    } catch (err) {
      setMsg({ text: err.message, kind: 'err' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api('/reviews/me', { method: 'DELETE' });
      setRating(0);
      setBody('');
      setMsg({ text: 'Your review was deleted.', kind: 'ok' });
      mine.reload();
      onSaved();
    } catch (err) {
      setMsg({ text: err.message, kind: 'err' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal as="form" className="card pad stack" onSubmit={submit} noValidate style={{ gap: 14 }}>
      <h3>{existing ? 'Edit your review' : 'Write a review'}</h3>
      <div className="field"><span className="label">Your rating</span><StarPicker value={rating} onChange={setRating} /></div>
      <div className="field">
        <label htmlFor="rv-body">Your review</label>
        <textarea className="input" id="rv-body" maxLength={800} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What helped? What was missing?" />
        <span className="note num" style={{ justifySelf: 'end' }}>{body.length} / 800</span>
      </div>
      <p className="note">Only your first name is shown.</p>
      <p className={`msg ${msg.kind}`} role="status">{msg.text}</p>
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={busy}>{existing ? 'Update review' : 'Post review'}</button>
        {existing && <button className="btn btn-ghost" type="button" onClick={remove} disabled={busy}>Delete</button>}
      </div>
    </Reveal>
  );
}
