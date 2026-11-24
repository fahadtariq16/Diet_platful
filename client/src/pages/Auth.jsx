import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth.jsx';

function AuthShell({ title, sub, children }) {
  return (
    <div className="wrap page" style={{ display: 'grid', placeItems: 'center' }}>
      <motion.div className="card pad" style={{ width: '100%', maxWidth: 440 }} initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
        <h2 style={{ fontSize: '2rem' }}>{title}</h2>
        <p className="muted" style={{ margin: '8px 0 24px' }}>{sub}</p>
        {children}
      </motion.div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // new accounts without a profile go to the pathway first
  const home = (u) => loc.state?.from || (u.hasProfile ? '/app' : '/app/pathway');
  if (user) return <Navigate to={home(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      nav(home(u), { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" sub="Log in to see today's meals and your progress.">
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input className="input" id="password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <p className="msg err" role="alert">{err}</p>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="note">New here? <Link to="/register">Create a free account</Link></p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.hasProfile ? '/app' : '/app/pathway'} replace state={{ welcome: true }} />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form.password.length < 8) return setErr('Use at least 8 characters for your password.');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      // the <Navigate> above takes over once the user is set
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Start eating with a plan" sub="Free account. Your log stays private to you.">
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input className="input" id="name" autoComplete="given-name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="remail">Email</label>
          <input className="input" id="remail" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="rpassword">Password</label>
          <input className="input" id="rpassword" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <span className="note">At least 8 characters.</span>
        </div>
        <p className="msg err" role="alert">{err}</p>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="note">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
