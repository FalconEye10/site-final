import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'admin';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  showDot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  danger: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  neutral: 'bg-slate-200 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
  admin: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-500 dark:bg-slate-300',
  admin: 'bg-sky-500',
};

export function Badge({ children, variant = 'neutral', className = '', showDot = false }: BadgeProps) {
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] border text-xs font-bold tracking-wide transition-colors ${variants[variant]} ${className}`}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          {variant === 'success' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}></span>
        </span>
      )}
      {children}
    </span>
  );
}
