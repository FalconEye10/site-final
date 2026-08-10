/**
 * Chart primitives for the budget dashboard.
 *
 * Hand-rolled (the project ships no charting library) and coloured entirely
 * from the dashboard accent variables, so both light and dark themes stay
 * legible without a second palette.
 */

import React from 'react';
import { formatRON } from './types';

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
}> = ({ groups, series, height = 220 }) => {
  const peak = Math.max(...groups.flatMap(group => group.values), 0);
  // Round the axis up to a clean step so gridline labels stay readable.
  const step = peak > 0 ? Math.pow(10, Math.floor(Math.log10(peak))) / 2 : 1;
  const scaleMax = peak > 0 ? Math.ceil(peak / step) * step : 100;
  const gridlines = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {series.map(item => (
          <span key={item.label} className="flex items-center gap-2 text-xs font-semibold">
            <span className="h-2.5 w-2.5" style={{ background: item.color, borderRadius: 1 }} />
            <span style={{ color: 'var(--adm-ink-dim)' }}>{item.label}</span>
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        {/* Y axis */}
        <div
          className="flex shrink-0 flex-col justify-between py-0 text-right"
          style={{ height, color: 'var(--adm-ink-faint)' }}
        >
          {gridlines.map(fraction => (
            <span key={fraction} className="text-[10px] font-semibold tabular-nums leading-none">
              {formatRON(Math.round(scaleMax * fraction))}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex flex-col justify-between" style={{ height }}>
            {gridlines.map(fraction => (
              <span key={fraction} style={{ borderTop: '1px solid var(--adm-grid-line)' }} />
            ))}
          </div>

          <div className="relative flex items-end justify-around gap-2" style={{ height }}>
            {groups.map(group => (
              <div key={group.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1.5">
                {group.values.map((value, index) => (
                  <div
                    key={series[index]?.label ?? index}
                    className="group relative w-full max-w-[34px] transition-[height] duration-500"
                    style={{
                      height: `${scaleMax > 0 ? (value / scaleMax) * 100 : 0}%`,
                      background: series[index]?.color,
                      minHeight: value > 0 ? 2 : 0,
                      borderRadius: '2px 2px 0 0',
                    }}
                  >
                    <span
                      className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 text-[10px] font-bold tabular-nums opacity-0 transition-opacity group-hover:opacity-100"
                      style={{
                        background: 'var(--adm-panel)',
                        border: '1px solid var(--adm-border)',
                        color: 'var(--adm-ink)',
                        borderRadius: 2,
                      }}
                    >
                      {formatRON(value)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-around gap-2" style={{ borderTop: '1px solid var(--adm-border)' }}>
            {groups.map(group => (
              <div key={group.label} className="flex min-w-0 flex-1 flex-col items-center pt-2">
                <span className="text-xs font-bold" style={{ color: 'var(--adm-ink-dim)' }}>
                  {group.label}
                </span>
                {group.span && (
                  <span className="text-[10px] font-medium" style={{ color: 'var(--adm-ink-faint)' }}>
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
