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
  <section className={`adm-glass-static ${className}`}>
    {(title || actions) && (
      <header
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--adm-border)' }}
      >
        <div>
          {title && <h3 className="adm-meta-label" style={{ color: 'var(--adm-ink-dim)' }}>{title}</h3>}
          {subtitle && (
            <p className="mt-1 text-xs font-medium" style={{ color: 'var(--adm-ink-faint)' }}>
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
}> = ({ label, value, unit = 'RON', hint, accent = 'var(--theme-color, #89cff0)', icon, emphasis }) => (
  <div className="adm-glass-static relative overflow-hidden p-5">
    <span className="adm-accent-bar" style={{ background: accent }} />
    <div className="flex items-start justify-between gap-3 pl-3">
      <div className="min-w-0">
        <div className="adm-meta-label">{label}</div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span
            className="adm-editorial-number text-3xl leading-none"
            style={{ color: emphasis ? accent : 'var(--adm-ink)' }}
          >
            {value}
          </span>
          <span className="text-xs font-bold" style={{ color: 'var(--adm-ink-faint)' }}>
            {unit}
          </span>
        </div>
        {hint && (
          <p className="mt-2 text-[11px] font-medium leading-snug" style={{ color: 'var(--adm-ink-faint)' }}>
            {hint}
          </p>
        )}
      </div>
      {icon && <span style={{ color: accent }}>{icon}</span>}
    </div>
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
    className="inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
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
    <span className="adm-meta-label">
      {label}
      {required && <span style={{ color: 'var(--adm-acc-rose)' }}> *</span>}
    </span>
    {children}
    {error ? (
      <span className="text-[11px] font-semibold" style={{ color: 'var(--adm-acc-rose)' }}>
        {error}
      </span>
    ) : (
      hint && (
        <span className="text-[11px] font-medium" style={{ color: 'var(--adm-ink-faint)' }}>
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
    <div className="dashboard-shell fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="adm-command-overlay fixed inset-0" onClick={onClose} />
      <div
        className={`adm-glass-static relative z-10 my-auto w-full ${width}`}
        style={{ boxShadow: '0 32px 64px -24px rgba(0,0,0,0.7)' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header
          className="flex items-start justify-between gap-4 px-6 py-5"
          style={{ borderBottom: '1px solid var(--adm-border)' }}
        >
          <div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--adm-ink)' }}>
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--adm-ink-faint)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="adm-icon-btn" aria-label="Închide">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <footer
            className="flex flex-wrap items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--adm-border)' }}
          >
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
  <div className={`adm-table-wrap overflow-x-auto ${className}`}>
    <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
  </div>
);

export const Th: React.FC<{
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}> = ({ children, align = 'left', className = '' }) => (
  <th
    className={`adm-meta-label whitespace-nowrap px-4 py-3 ${className}`}
    style={{ textAlign: align, color: 'var(--adm-ink-dim)' }}
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
}> = ({ children, align = 'left', className = '', numeric, style }) => (
  <td
    className={`px-4 py-3 ${numeric ? 'tabular-nums font-semibold' : 'font-medium'} ${className}`}
    style={{ textAlign: align, color: 'var(--adm-ink)', ...style }}
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
