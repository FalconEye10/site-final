/**
 * Shared presentational primitives for the budget module.
 *
 * Everything here draws from the dashboard's existing token set
 * (--adm-* variables, adm-* utility classes) so the module re-themes with the
 * rest of the shell in both dark and light mode. No literal palette values.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// --- Panels ---------------------------------------------------------------

export const Panel: React.FC<{
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, className = '', bodyClassName = '', children }) => (
  <section className={`bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] shadow-xs ${className}`}>
    {(title || actions) && (
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          {title && (
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-title text-slate-800 dark:text-slate-200">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 font-anthropic">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
    )}
    <div className={bodyClassName || 'p-5'}>{children}</div>
  </section>
);

// --- KPI card -------------------------------------------------------------

export const KpiCard: React.FC<{
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  accent?: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
}> = ({ label, value, unit = 'RON', hint, accent, icon, emphasis }) => (
  <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
    {accent && (
      <span
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: accent }}
      />
    )}
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">
          {label}
        </span>
        {icon && <span style={{ color: accent || 'var(--civic-primary)' }}>{icon}</span>}
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        <span
          className={`text-2xl sm:text-3xl font-black font-data leading-none ${
            emphasis ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'
          }`}
          style={emphasis && accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-data">
          {unit}
        </span>
      </div>
    </div>

    {hint && (
      <p className="mt-3 pt-2 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 font-anthropic leading-relaxed">
        {hint}
      </p>
    )}
  </div>
);

// --- Badges ---------------------------------------------------------------

export const Badge: React.FC<{
  label: string;
  color: string;
  bg?: string;
  icon?: React.ReactNode;
}> = ({ label, color, bg, icon }) => (
  <span
    className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]"
    style={{
      borderRadius: 2,
      color,
      background: bg ?? `color-mix(in srgb, ${color} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`,
    }}
  >
    {icon}
    {label}
  </span>
);

// --- Form controls --------------------------------------------------------

export const Field: React.FC<{
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ label, hint, error, required, className = '', children }) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="adm-meta-label text-xs sm:text-sm">
      {label}
      {required && <span style={{ color: 'var(--adm-acc-rose)' }}> *</span>}
    </span>
    {children}
    {error ? (
      <span className="text-xs font-semibold" style={{ color: 'var(--adm-acc-rose)' }}>
        {error}
      </span>
    ) : (
      hint && (
        <span className="text-xs font-medium" style={{ color: 'var(--adm-ink-faint)' }}>
          {hint}
        </span>
      )
    )}
  </label>
);

const CONTROL_CLASS = 'admin-input w-full px-3 py-2 text-sm font-medium outline-none';
const CONTROL_STYLE: React.CSSProperties = { borderRadius: 2 };

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = props => (
  <input {...props} className={`${CONTROL_CLASS} ${props.className ?? ''}`} style={{ ...CONTROL_STYLE, ...props.style }} />
);

export interface MoneyInputProps {
  value: number;
  onChangeValue: (val: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  min?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChangeValue,
  placeholder = '0',
  className = '',
  required,
  min = 0,
  disabled,
  autoFocus,
}) => {
  const [text, setText] = React.useState<string>(() => (value ? String(Math.round(value)) : ''));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setText(value ? String(Math.round(value)) : '');
    }
  }, [value, isFocused]);

  const parsed = Number(text.replace(',', '.'));
  const hasDecimals = !Number.isNaN(parsed) && text.trim() !== '' && parsed % 1 !== 0;
  const rounded = Math.round(Number.isNaN(parsed) ? 0 : parsed);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    const p = Number(raw.replace(',', '.'));
    if (!Number.isNaN(p)) {
      onChangeValue(Math.max(min, Math.round(p)));
    } else if (raw.trim() === '') {
      onChangeValue(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const finalRounded = Math.max(min, rounded);
    setText(finalRounded ? String(finalRounded) : '');
    onChangeValue(finalRounded);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`${CONTROL_CLASS} pr-12 font-data font-bold ${className}`}
          style={{ ...CONTROL_STYLE }}
        />
        <span
          className="pointer-events-none absolute right-3 text-xs font-bold font-title select-none"
          style={{ color: 'var(--adm-ink-faint)' }}
        >
          RON
        </span>
      </div>
      {hasDecimals && (
        <span
          className="text-[11px] font-semibold flex items-center gap-1"
          style={{ color: 'var(--adm-acc-amber)' }}
        >
          <span>ℹ️</span> Rotunjit automat la cel mai apropiat întreg:{' '}
          <strong className="underline underline-offset-2">{rounded.toLocaleString('ro-RO')} RON</strong>
        </span>
      )}
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = props => (
  <select {...props} className={`${CONTROL_CLASS} ${props.className ?? ''}`} style={{ ...CONTROL_STYLE, ...props.style }} />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = props => (
  <textarea {...props} className={`${CONTROL_CLASS} ${props.className ?? ''}`} style={{ ...CONTROL_STYLE, ...props.style }} />
);

// --- Modal ----------------------------------------------------------------

export const Modal: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
}> = ({ open, title, subtitle, onClose, footer, width = 'max-w-3xl', children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portalled into body, so it escapes any transformed/scrolling ancestor.
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs font-anthropic">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={`bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] shadow-2xl relative z-10 w-full ${width} overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-title text-slate-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[2px] text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};

// --- Table shell ----------------------------------------------------------

export const TableWrap: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`overflow-x-auto rounded-[2px] border border-slate-200 dark:border-slate-800 ${className}`}>
    <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
  </div>
);

export const Th: React.FC<{
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}> = ({ children, align = 'left', className = '' }) => (
  <th
    className={`whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider font-title bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 ${className}`}
    style={{ textAlign: align }}
  >
    {children}
  </th>
);

export const Td: React.FC<{
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  numeric?: boolean;
  style?: React.CSSProperties;
  title?: string;
  colSpan?: number;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ children, align = 'left', className = '', numeric, style, title, colSpan, onClick }) => (
  <td
    title={title}
    colSpan={colSpan}
    onClick={onClick}
    className={`px-4 py-3 text-xs sm:text-sm border-b border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 ${
      numeric ? 'font-data tabular-nums' : ''
    } ${onClick ? 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40' : ''} ${className}`}
    style={{ textAlign: align, ...style }}
  >
    {children}
  </td>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
}> = ({ icon, title, description, action, colSpan }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span style={{ color: 'var(--adm-ink-faint)', opacity: 0.5 }}>{icon}</span>
      <p className="text-sm font-bold" style={{ color: 'var(--adm-ink-dim)' }}>
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-xs font-medium" style={{ color: 'var(--adm-ink-faint)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );
  }
  return content;
};

/** Thin proportional bar used inside table rows for execution / progress. */
export const MiniBar: React.FC<{ ratio: number; color: string }> = ({ ratio, color }) => (
  <div className="h-1.5 w-full overflow-hidden" style={{ background: 'var(--adm-surface)', borderRadius: 2 }}>
    <div
      className="h-full transition-[width] duration-500"
      style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`, background: color, borderRadius: 2 }}
    />
  </div>
);
