import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef();
  const show = useCallback((text) => {
    clearTimeout(timer.current);
    setMsg({ text, id: Date.now() });
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status">
        <AnimatePresence>
          {msg && (
            <motion.div key={msg.id} className="toast" initial={{ y: 80, x: '-50%', opacity: 0 }} animate={{ y: 0, x: '-50%', opacity: 1 }} exit={{ y: 80, x: '-50%', opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
