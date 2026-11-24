import { motion } from 'framer-motion';

// The plate method: half vegetables and fruit, a quarter whole grains, a quarter protein.
// Segments are drawn as arcs and animate in one after another.
const SEGMENTS = [
  { key: 'veg', label: 'Vegetables', share: 0.35, color: 'var(--veg)' },
  { key: 'fruit', label: 'Fruit', share: 0.15, color: 'var(--fruit)' },
  { key: 'grains', label: 'Whole grains', share: 0.25, color: 'var(--carbs)' },
  { key: 'protein', label: 'Protein', share: 0.25, color: 'var(--protein)' }
];

function arc(cx, cy, r, start, end) {
  const a0 = start * 2 * Math.PI - Math.PI / 2;
  const a1 = end * 2 * Math.PI - Math.PI / 2;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

export default function PlateDiagram({ size = 300, active, onHover }) {
  const c = size / 2;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label="A balanced plate: half vegetables and fruit, a quarter whole grains, a quarter protein">
      <circle cx={c} cy={c} r={c - 2} fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
      {SEGMENTS.map((s, i) => {
        const d = arc(c, c, c - 18, acc, acc + s.share);
        const mid = acc + s.share / 2;
        acc += s.share;
        const a = mid * 2 * Math.PI - Math.PI / 2;
        const lx = c + (c - 70) * Math.cos(a), ly = c + (c - 70) * Math.sin(a);
        const dim = active && active !== s.key;
        return (
          <g key={s.key} onMouseEnter={() => onHover?.(s.key)} onMouseLeave={() => onHover?.(null)} style={{ cursor: onHover ? 'pointer' : 'default' }}>
            <motion.path d={d} fill={s.color} stroke="var(--surface)" strokeWidth="4" initial={{ scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: dim ? 0.35 : 1 }} animate={{ opacity: dim ? 0.35 : 1 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.15, type: 'spring', stiffness: 160, damping: 18 }} style={{ transformOrigin: `${c}px ${c}px` }} />
            <motion.text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontFamily="var(--display)" fontWeight="700" fontSize={size / 22} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 + i * 0.15 }} style={{ pointerEvents: 'none' }}>
              {s.label}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}
