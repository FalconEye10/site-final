/**
 * Chart primitives for the budget dashboard.
 *
 * Hand-rolled (the project ships no charting library) and coloured entirely
 * from the dashboard accent variables, so both light and dark themes stay
 * legible without a second palette.
 */

import React from 'react';
import { formatRON } from './types';
import { MonthCashflow } from './selectors';

/** Categorical series colours, drawn from the shell's accent tokens. */
export const SERIES_COLORS = [
  'var(--adm-acc-blue)',
  'var(--adm-acc-emerald)',
  'var(--adm-acc-amber)',
  'var(--adm-acc-indigo)',
  'var(--adm-acc-pink)',
  'var(--adm-acc-teal)',
  'var(--adm-acc-rose)',
];

export interface Slice {
  label: string;
  value: number;
}

/**
 * Donut rendered with the r = 100/2π trick: the circumference is exactly 100,
 * so each arc's stroke-dasharray is just its percentage share.
 */
export const DonutChart: React.FC<{
  slices: Slice[];
  caption?: string;
  emptyLabel?: string;
}> = ({ slices, caption, emptyLabel = 'Fără date' }) => {
  const total = slices.reduce((acc, slice) => acc + slice.value, 0);

  if (total <= 0) {
    return (
      <div className="flex h-[190px] flex-col items-center justify-center gap-2">
        <div
          className="h-24 w-24 rounded-full"
          style={{ border: '6px solid var(--adm-border)', opacity: 0.6 }}
        />
        <span className="text-xs font-semibold" style={{ color: 'var(--adm-ink-faint)' }}>
          {emptyLabel}
        </span>
      </div>
    );
  }

  let cursor = 0;
  const arcs = slices.map((slice, index) => {
    const percent = (slice.value / total) * 100;
    const arc = {
      ...slice,
      percent,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      offset: -cursor,
    };
    cursor += percent;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="transparent"
            stroke="var(--adm-border)"
            strokeWidth="3.2"
          />
          {arcs.map(arc => (
            <circle
              key={arc.label}
              cx="18"
              cy="18"
              r="15.9155"
              fill="transparent"
              stroke={arc.color}
              strokeWidth="3.2"
              strokeDasharray={`${arc.percent} ${100 - arc.percent}`}
              strokeDashoffset={arc.offset}
            >
              <title>{`${arc.label}: ${formatRON(arc.value)} RON (${arc.percent.toFixed(1)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="adm-editorial-number text-xl leading-none" style={{ color: 'var(--adm-ink)' }}>
            {formatRON(total)}
          </span>
          <span className="adm-meta-label mt-1">{caption ?? 'RON'}</span>
        </div>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-2.5">
        {arcs.map(arc => (
          <li key={arc.label} className="flex items-center gap-2.5 text-xs">
            <span className="h-2.5 w-2.5 shrink-0" style={{ background: arc.color, borderRadius: 1 }} />
            <span className="min-w-0 flex-1 truncate font-semibold" style={{ color: 'var(--adm-ink-dim)' }}>
              {arc.label}
            </span>
            <span className="shrink-0 tabular-nums font-bold" style={{ color: 'var(--adm-ink)' }}>
              {arc.percent.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface GroupedBar {
  label: string;
  span?: string;
  values: number[];
}

/** Grouped column chart with a shared scale and four horizontal gridlines. */
export const GroupedBarChart: React.FC<{
  groups: GroupedBar[];
  series: { label: string; color: string }[];
  height?: number;
}> = ({ groups, series, height = 280 }) => {
  const peak = Math.max(...groups.flatMap(group => group.values), 0);
  
  const calculateCleanScale = (maxVal: number) => {
    if (maxVal <= 0) return 500;
    const rawStep = maxVal / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / mag;
    let niceStep: number;
    if (residual <= 1) niceStep = 1 * mag;
    else if (residual <= 2) niceStep = 2 * mag;
    else if (residual <= 5) niceStep = 5 * mag;
    else niceStep = 10 * mag;
    return Math.max(Math.ceil(maxVal / niceStep) * niceStep, 100);
  };

  const scaleMax = calculateCleanScale(peak);
  const gridlines = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {series.map(item => (
          <span key={item.label} className="flex items-center gap-2 text-xs font-semibold">
            <span className="h-3 w-3 rounded-[2px]" style={{ background: item.color }} />
            <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        {/* Y axis */}
        <div
          className="flex shrink-0 flex-col justify-between py-0 text-right pr-1 select-none font-data"
          style={{ height, color: 'var(--adm-ink-faint)' }}
        >
          {gridlines.map(fraction => (
            <span key={fraction} className="text-[11px] font-bold tabular-nums leading-none">
              {formatRON(Math.round(scaleMax * fraction))}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex flex-col justify-between" style={{ height }}>
            {gridlines.map(fraction => (
              <span key={fraction} className="border-t border-slate-200/80 dark:border-slate-800/80" />
            ))}
          </div>

          <div className="relative flex items-end justify-around gap-2 px-2" style={{ height }}>
            {groups.map(group => (
              <div key={group.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-2">
                {group.values.map((value, index) => {
                  const barHeight = scaleMax > 0 ? (value / scaleMax) * 100 : 0;
                  return (
                    <div
                      key={series[index]?.label ?? index}
                      className="group relative w-full max-w-[48px] min-w-[24px] transition-all duration-300 hover:brightness-110 flex flex-col justify-start items-center overflow-hidden"
                      style={{
                        height: `${barHeight}%`,
                        background: series[index]?.color,
                        minHeight: value > 0 ? 6 : 0,
                        borderRadius: '3px 3px 0 0',
                      }}
                    >
                      {barHeight >= 18 && (
                        <span className="text-[10px] font-bold text-white/95 font-data mt-1 select-none">
                          {formatRON(value)}
                        </span>
                      )}
                      <span
                        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-[11px] font-bold tabular-nums opacity-0 transition-opacity group-hover:opacity-100 z-20 shadow-md bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-700 rounded-[3px] text-slate-900 dark:text-white"
                      >
                        {formatRON(value)} RON
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex justify-around gap-2 border-t border-slate-300 dark:border-slate-700">
            {groups.map(group => (
              <div key={group.label} className="flex min-w-0 flex-1 flex-col items-center pt-2">
                <span className="text-xs font-bold font-title text-slate-800 dark:text-slate-200">
                  {group.label}
                </span>
                {group.span && (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-data">
                    {group.span}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MonthlyBarChart: React.FC<{
  months: MonthCashflow[];
  height?: number;
}> = ({ months, height = 310 }) => {
  // Determine highest monthly amount
  const peak = Math.max(...months.flatMap(m => [m.income, m.expense]), 0);

  // Clean tick-scale tailored to actual cashflow values
  const calculateCleanScale = (maxVal: number) => {
    if (maxVal <= 0) return 500;
    if (maxVal <= 250) return 250;
    if (maxVal <= 500) return 500;
    if (maxVal <= 1000) return 1000;
    if (maxVal <= 1250) return 1250;
    if (maxVal <= 1500) return 1500;
    if (maxVal <= 2000) return 2000;
    if (maxVal <= 2500) return 2500;
    if (maxVal <= 3000) return 3000;
    const rawStep = maxVal / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / mag;
    let niceStep: number;
    if (residual <= 1) niceStep = 1 * mag;
    else if (residual <= 2) niceStep = 2 * mag;
    else if (residual <= 5) niceStep = 5 * mag;
    else niceStep = 10 * mag;
    return Math.max(Math.ceil(maxVal / niceStep) * niceStep, 100);
  };

  const scaleMax = calculateCleanScale(peak);
  const gridFractions = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="w-full select-none">
      {/* Legend & Note */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-title">
              Venituri Încasate
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-title">
              Cheltuieli Decontate
            </span>
          </div>
        </div>
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Plafon scală: <strong className="text-slate-800 dark:text-slate-200 font-data">{formatRON(scaleMax)} RON</strong>
        </div>
      </div>

      {/* Main Chart Canvas with Y-Axis */}
      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 no-scrollbar">
        {/* Y-Axis Column */}
        <div
          className="flex shrink-0 flex-col justify-between text-right font-data pr-1 select-none"
          style={{ height }}
        >
          {gridFractions.map(f => (
            <div key={f} className="flex items-center justify-end h-4 -my-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                {formatRON(Math.round(scaleMax * f))}
              </span>
            </div>
          ))}
        </div>

        {/* Plotting Area with background styling */}
        <div className="relative min-w-[720px] flex-1">
          {/* Subtle Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height }}>
            {gridFractions.map(f => (
              <div
                key={f}
                className="w-full border-t border-slate-200/70 dark:border-slate-800/60"
              />
            ))}
          </div>

          {/* Month Columns & Bars Container */}
          <div className="relative flex items-end justify-between px-2" style={{ height }}>
            {months.map(m => {
              const incomeRatio = scaleMax > 0 ? m.income / scaleMax : 0;
              const expenseRatio = scaleMax > 0 ? m.expense / scaleMax : 0;

              const incomeHeightPx = Math.round(incomeRatio * height);
              const expenseHeightPx = Math.round(expenseRatio * height);

              const hasActivity = m.income > 0 || m.expense > 0;
              const isPositive = m.net >= 0;

              return (
                <div
                  key={m.key}
                  className="group relative flex h-full flex-1 flex-col justify-end items-center px-1"
                >
                  {/* Premium Floating Tooltip on Hover */}
                  <div
                    className="pointer-events-none absolute bottom-full mb-3 z-30 hidden group-hover:flex flex-col items-center whitespace-nowrap p-3 shadow-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-700 rounded-lg animate-in fade-in duration-150"
                    style={{ minWidth: 150 }}
                  >
                    <span className="text-xs font-bold font-title text-slate-900 dark:text-white">
                      {m.label}
                    </span>
                    <div className="w-full mt-2 space-y-1 text-xs font-data">
                      <div className="flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300">
                        <span>Venituri:</span>
                        <strong className="font-bold">+{formatRON(m.income)} RON</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-rose-800 dark:text-rose-300">
                        <span>Cheltuieli:</span>
                        <strong className="font-bold">−{formatRON(m.expense)} RON</strong>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-black font-data mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700 w-full flex items-center justify-between gap-2 ${
                        isPositive ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      <span>Balanță lună:</span>
                      <strong>{isPositive ? '+' : ''}{formatRON(m.net)} RON</strong>
                    </div>
                  </div>

                  {/* Clean Single Label above the month columns */}
                  <div className="h-6 mb-1.5 flex items-center justify-center">
                    {hasActivity && (
                      <span
                        className={`text-[10px] font-bold font-data px-1.5 py-0.5 rounded transition-all group-hover:scale-105 ${
                          isPositive
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40'
                            : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/40'
                        }`}
                      >
                        {isPositive ? '+' : ''}{formatRON(m.net)}
                      </span>
                    )}
                  </div>

                  {/* The Two Bars (Sleek, rounded-top pillars with subtle gradients, without redundant text inside) */}
                  <div className="flex items-end justify-center gap-1.5 w-full max-w-[48px]">
                    {/* Income Bar (Emerald) */}
                    <div
                      className="w-1/2 rounded-t-md transition-all duration-300 relative group-hover:brightness-105 shadow-xs"
                      style={{
                        height: incomeHeightPx > 0 ? Math.max(incomeHeightPx, 6) : 0,
                        background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      }}
                    />

                    {/* Expense Bar (Rose) */}
                    <div
                      className="w-1/2 rounded-t-md transition-all duration-300 relative group-hover:brightness-105 shadow-xs"
                      style={{
                        height: expenseHeightPx > 0 ? Math.max(expenseHeightPx, 6) : 0,
                        background: 'linear-gradient(180deg, #f43f5e 0%, #e11d48 100%)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-Axis Month Baseline */}
          <div className="mt-3 flex justify-between px-2 border-t border-slate-200 dark:border-slate-800 pt-2.5">
            {months.map(m => (
              <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center">
                <span className="text-xs font-bold font-title text-slate-700 dark:text-slate-300">
                  {m.shortLabel}
                </span>
                <span className="text-[10px] font-medium font-data text-slate-400 dark:text-slate-500">
                  '{m.key.slice(2, 4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
