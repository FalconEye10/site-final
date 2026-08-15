import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center flex flex-col items-center justify-center rounded-[2px] border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 font-anthropic ${className}`}>
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[2px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-4 shadow-xs">
        <Icon size={24} className="stroke-[1.75]" />
      </div>

      <h3 className="text-base sm:text-lg font-bold font-anthropicSerif text-slate-900 dark:text-white mb-1.5 tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-5">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-civic-primary px-4 py-2.5 text-xs font-title font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer"
        >
          {ActionIcon && <ActionIcon size={14} />}
          {actionLabel}
        </button>
      )}
    </div>
  );
};
