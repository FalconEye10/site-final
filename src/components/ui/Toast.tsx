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
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white/95 backdrop-blur-xl border border-brand-primary/10 shadow-[0_8px_30px_rgba(0,31,38,0.08),0_0_0_1px_rgba(40,250,252,0.04)] rounded-2xl p-4 flex items-center gap-3 w-80 pointer-events-auto"
          >
            {t.type === 'success' && <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />}
            {t.type === 'error' && <AlertCircle className="text-red-500 shrink-0" size={20} />}
            {t.type === 'info' && <Info className="text-blue-500 shrink-0" size={20} />}
            
            <p className="text-sm font-semibold text-brand-accent flex-1 font-['Manrope']">{t.message}</p>
            
            <button 
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-full hover:bg-[#FAF9F5] text-brand-accent/40 hover:text-brand-accent transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
