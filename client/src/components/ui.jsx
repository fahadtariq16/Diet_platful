import { motion } from 'framer-motion';
import { fmt } from '../lib/format.js';
import { useCountUp } from '../lib/hooks.js';

export function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r="13" fill="none" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M15 2 A13 13 0 0 1 27.3 19" fill="none" stroke="var(--protein)" strokeWidth="2.5" />
      <path d="M27.3 19 A13 13 0 0 1 6 24.5" fill="none" stroke="var(--carbs)" strokeWidth="2.5" />
      <path d="M6 24.5 A13 13 0 0 1 15 2" fill="none" stroke="var(--fat)" strokeWidth="2.5" />
      <circle cx="15" cy="15" r="4" fill="var(--accent)" />
    </svg>
  );
}

/** Fades and lifts content into place when it scrolls into view. */
export function Reveal({ children, delay = 0, as = 'div', ...rest }) {
  const M = motion[as];
  return (
    <M initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }} {...rest}>
      {children}
    </M>
  );
}

export function PageTransition({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

/** Calorie ring. */
export function Ring({ value, target, size = 150, stroke = 12, label = 'kcal' }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = target ? value / target : 0;
  const shown = useCountUp(value);
  const color = pct > 1.1 ? 'var(--bad)' : 'var(--accent)';
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - Math.min(pct, 1)) }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <div className="center">
        <div className="big num">{fmt(shown)}</div>
        <div className="small num">{target ? `of ${fmt(target)} ${label}` : label}</div>
      </div>
    </div>
  );
}

export function Meter({ value, max, color, height = 8 }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="meter" style={{ height }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }} style={{ background: color }} />
    </div>
  );
}

export function MacroBars({ totals, targets }) {
  const rows = [
    ['Protein', 'protein', 'var(--protein)'],
    ['Carbs', 'carbs', 'var(--carbs)'],
    ['Fat', 'fat', 'var(--fat)']
  ];
  return (
    <div className="stack" style={{ gap: 12, width: '100%' }}>
      {rows.map(([label, key, color]) => (
        <div key={key}>
          <div className="macro-row num">
            <b>{label}</b>
            <span>
              {Math.round(totals[key])}
              {targets ? ` / ${targets[key]}` : ''} g
            </span>
          </div>
          <Meter value={totals[key]} max={targets ? targets[key] : Math.max(totals[key], 1)} color={color} />
        </div>
      ))}
    </div>
  );
}

const STAR = 'M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4L2.7 9.5l6.5-.7z';
export function Stars({ value, size = 18 }) {
  return (
    <span className="stars" aria-label={`${Number(value).toFixed(1)} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ color: i <= Math.round(value) ? undefined : 'var(--line)' }}>
          <path fill="currentColor" d={STAR} />
        </svg>
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }) {
  return (
    <div className="star-pick" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} className={i <= value ? 'on' : ''} onClick={() => onChange(i)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d={STAR} />
          </svg>
        </button>
      ))}
    </div>
  );
}

/** Segmented control with a sliding pill. */
export function Segmented({ options, value, onChange, label, id }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {value === v && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span>{text}</span>
        </button>
      ))}
    </div>
  );
}

export function StatTiles({ items }) {
  return (
    <div className="stats">
      {items.map(([v, l], i) => (
        <motion.div key={l} className="stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <div className="v num">{v}</div>
          <div className="l">{l}</div>
        </motion.div>
      ))}
    </div>
  );
}

export function ChartTip({ active, payload, label, unit = 'kcal' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip-box">
      <b>{label}</b>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <div key={p.dataKey}>
            {p.name}: {fmt(p.value)} {p.unit ?? unit}
          </div>
        ))}
    </div>
  );
}

export function avatarColor(s) {
  const cols = ['--protein', '--carbs', '--fat', '--accent'];
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `var(${cols[h % cols.length]})`;
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
