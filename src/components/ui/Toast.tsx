import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
}

// Global Event Emitter for Toasts (Lightweight alternative to Context for this setup)
type Listener = (toast: Omit<ToastProps, 'id'>) => void;
let listeners: Listener[] = [];

export const toast = {
  success: (message: string) => listeners.forEach(l => l({ message, type: 'success' })),
  error: (message: string) => listeners.forEach(l => l({ message, type: 'error' })),
  info: (message: string) => listeners.forEach(l => l({ message, type: 'info' })),
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const handleToast = (newToast: Omit<ToastProps, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, { ...newToast, id }]);
      
      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };

    listeners.push(handleToast);
    return () => {
      listeners = listeners.filter(l => l !== handleToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2.5 pointer-events-none font-anthropic">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-700 shadow-xl rounded-[2px] p-3.5 flex items-center gap-3 w-80 pointer-events-auto text-slate-900 dark:text-slate-100 font-anthropic"
          >
            {t.type === 'success' && <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />}
            {t.type === 'error' && <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0" size={18} />}
            {t.type === 'info' && <Info className="text-blue-600 dark:text-blue-400 shrink-0" size={18} />}
            
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 font-anthropic leading-snug">{t.message}</p>
            
            <button 
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-[2px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
