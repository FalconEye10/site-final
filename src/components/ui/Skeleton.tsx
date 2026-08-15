import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-[2px] ${className}`}
      {...props}
    />
  );
};

export const SkeletonCard: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 sm:p-6 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B22] shadow-xs space-y-4 font-anthropic"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-[2px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B22] overflow-hidden shadow-xs">
      {/* Table Header */}
      <div className="p-3.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded-[2px] shrink-0" />
            {Array.from({ length: cols - 1 }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B22] flex items-center gap-3.5 shadow-xs"
        >
          <Skeleton className="w-10 h-10 rounded-[2px] shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-7 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
};
