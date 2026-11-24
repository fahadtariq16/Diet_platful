import { useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../lib/auth.jsx';
import { Logo } from './ui.jsx';

const PUBLIC_LINKS = [
  ['/balance', 'Balance guide'],
  ['/reviews', 'Reviews']
];
const APP_LINKS = [
  ['/app', 'Today'],
  ['/app/trends', 'Trends'],
  ['/balance', 'Balance'],
  ['/app/pathway', 'Pathway'],
  ['/app/plan', 'Meal plan'],
  ['/reviews', 'Reviews']
];

export function Nav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = user ? APP_LINKS : PUBLIC_LINKS;
  return (
    <nav className="nav" aria-label="Main">
      <div className="wrap">
        <Link className="logo" to={user ? '/app' : '/'}>
          <Logo /> Diet Plateful
        </Link>
        <button className="btn btn-ghost btn-sm nav-menu-btn" type="button" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((o) => !o)}>
          Menu
        </button>
        <ul className={`nav-links${open ? ' open' : ''}`} id="nav-links" onClick={() => setOpen(false)}>
          {links.map(([to, label]) => (
            <li key={to}>
              <NavLink to={to} end={to === '/app'}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-pill" className="active-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            {user ? (
              <button className="btn btn-ghost btn-sm" type="button" onClick={logout} style={{ marginLeft: 8 }}>
                Log out
              </button>
            ) : (
              <span className="row" style={{ marginLeft: 8, gap: 8 }}>
                <Link className="btn btn-ghost btn-sm" to="/login">Log in</Link>
                <Link className="btn btn-primary btn-sm" to="/register">Sign up free</Link>
              </span>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <span>Plateful · Track what you eat. Learn to balance it.</span>
        <span>Nutrition values are typical averages and vary by recipe and brand. Not medical advice.</span>
      </div>
    </footer>
  );
}

export function Layout() {
  const location = useLocation();
  // useOutlet freezes the current page so the exit animation shows the old page, not the new one
  const outlet = useOutlet();
  return (
    <>
      <Nav />
      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
        <motion.main key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="wrap page muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
