import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/** Load data from the API. Re-runs when `path` changes; `reload()` refetches. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { signal: ctrl.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false }));
      });
    return () => ctrl.abort();
  }, [path, tick]);

  return { ...state, reload, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) };
}

/** Animate a number towards a target value. */
export function useCountUp(value, duration = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      from.current = value;
      return undefined;
    }
    const start = performance.now();
    const a = from.current;
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = a + (value - a) * (1 - Math.pow(1 - t, 3));
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}
