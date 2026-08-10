import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'admin';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  showDot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
  warning: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
  danger: 'bg-red-400/10 text-red-300 border-red-400/25',
  neutral: 'bg-white/5 text-white/60 border-white/10',
  admin: 'bg-blue-400/10 text-blue-300 border-blue-400/25',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  neutral: 'bg-white/40',
  admin: 'bg-[#89cff0]',
};

export function Badge({ children, variant = 'neutral', className = '', showDot = false }: BadgeProps) {
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold tracking-wide transition-colors ${variants[variant]} ${className}`}
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
