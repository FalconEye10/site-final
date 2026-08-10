import React, { useMemo, useState } from 'react';
import { History, Lock, Search } from 'lucide-react';
import { Badge, EmptyState, Panel, Select, TableWrap, Td, TextInput, Th } from '../ui';
import { AuditAction, AuditEntry } from '../types';
import { TreasuryPayment } from '../../../../../utils/supabaseService';

const ACTION_COLORS: Record<AuditAction, string> = {
  Creare: 'var(--adm-acc-blue)',
  Aprobare: 'var(--adm-acc-emerald)',
  Editare: 'var(--adm-acc-amber)',
  Ștergere: 'var(--adm-acc-rose)',
  Arhivare: 'var(--adm-acc-indigo)',
  Revert: 'var(--adm-ink-faint)',
};

/** Cotizație receipts render as their own pseudo-action so they're visually distinct from budget mutations. */
const DUES_ACTION_LABEL = 'Încasare Cotizație';
const DUES_ACTION_COLOR = 'var(--adm-acc-teal)';

const ACTIONS = Object.keys(ACTION_COLORS) as AuditAction[];

function formatTimestamp(value: number): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Unified timeline row. Budget mutations (`kind: 'action'`) come from the
 * append-only `budget_audit` collection; dues receipts (`kind: 'payment'`)
 * are mirrored read-only from the same `members/*\/payments` subcollections
 * that back "Istoric Plăți", signatures included, so nothing here can drift
 * out of sync with the treasurer's actual receipt log.
 */
type AuditRow =
  | {
      kind: 'action';
      id: string;
      timestamp: number;
      user: string;
      action: AuditAction;
      txCode: string;
      oldValue: string;
      newValue: string;
      details: string;
    }
  | {
      kind: 'payment';
      id: string;
      timestamp: number;
      user: string;
      memberName: string;
      amount: number;
      month: string;
      memberSignature: string;
      treasurerSignature: string;
    };

function toRows(entries: AuditEntry[], payments: TreasuryPayment[]): AuditRow[] {
  const actionRows: AuditRow[] = entries.map(entry => ({ kind: 'action', ...entry }));
  const paymentRows: AuditRow[] = payments.map(payment => ({
    kind: 'payment',
    id: payment.id,
    timestamp: new Date(payment.date).getTime() || 0,
    user: 'Trezorier',
    memberName: payment.memberName,
    amount: payment.amount,
    month: payment.month,
    memberSignature: payment.memberSignature,
    treasurerSignature: payment.treasurerSignature,
  }));
  return [...actionRows, ...paymentRows];
}

const SignatureThumb: React.FC<{ src?: string; label: string }> = ({ src, label }) =>
  src ? (
    <img
      src={src}
      alt={label}
      className="h-8 w-16 object-contain"
      style={{
        background: '#ffffff',
        borderRadius: 2,
        border: '2px solid var(--adm-border-strong)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        mixBlendMode: 'normal',
      }}
    />
  ) : (
    <span className="text-xs" style={{ color: 'var(--adm-ink-faint)' }}>
      —
    </span>
  );

export const AuditTab: React.FC<{ entries: AuditEntry[]; duesPayments: TreasuryPayment[] }> = ({
  entries,
  duesPayments,
}) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | AuditAction | 'cotizatie'>('all');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return toRows(entries, duesPayments)
      .filter(row => {
        if (actionFilter === 'cotizatie' && row.kind !== 'payment') return false;
        if (actionFilter !== 'all' && actionFilter !== 'cotizatie' && (row.kind !== 'action' || row.action !== actionFilter))
          return false;

        if (!term) return true;
        const haystack =
          row.kind === 'action'
            ? [row.user, row.txCode, row.details, row.oldValue, row.newValue]
            : [row.user, row.memberName, row.month, `${row.amount}`];
        return haystack.filter(Boolean).some(field => String(field).toLowerCase().includes(term));
      })
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [entries, duesPayments, search, actionFilter]);

  return (
    <Panel
      title="Audit Log"
      subtitle="Jurnal append-only al operațiunilor financiare și încasărilor de cotizații"
      bodyClassName="p-0"
      actions={
        <span className="flex items-center gap-1.5 adm-meta-label">
          <Lock className="h-3 w-3" /> Imutabil
        </span>
      }
    >
      <div
        className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_auto]"
        style={{ borderBottom: '1px solid var(--adm-border)' }}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--adm-ink-faint)' }}
          />
          <TextInput
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Caută după utilizator, membru, ID tranzacție sau detalii…"
            className="!pl-9"
          />
        </div>
        <Select
          value={actionFilter}
          onChange={event => setActionFilter(event.target.value as 'all' | AuditAction | 'cotizatie')}
          className="sm:w-56"
        >
          <option value="all">Toate acțiunile</option>
          <option value="cotizatie">{DUES_ACTION_LABEL}</option>
          {ACTIONS.map(action => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
      </div>

      <TableWrap className="[&_table]:min-w-[1040px]">
        <thead className="adm-table-head">
          <tr>
            <Th>Timestamp</Th>
            <Th>Utilizator</Th>
            <Th>Acțiune</Th>
            <Th>ID Tranzacție</Th>
            <Th>Valoare Veche</Th>
            <Th>Valoare Nouă</Th>
            <Th>Detalii</Th>
            <Th align="center">Semnături</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyState
              colSpan={8}
              icon={<History className="h-10 w-10" />}
              title={entries.length === 0 && duesPayments.length === 0 ? 'Niciun eveniment înregistrat' : 'Niciun rezultat'}
              description={
                entries.length === 0 && duesPayments.length === 0
                  ? 'Fiecare operațiune financiară și încasare de cotizație va apărea aici automat.'
                  : 'Modifică termenul de căutare sau filtrul de acțiune.'
              }
            />
          ) : (
            rows.map(row =>
              row.kind === 'action' ? (
                <tr key={`action-${row.id}`} className="adm-table-row">
                  <Td numeric className="whitespace-nowrap" style={{ color: 'var(--adm-ink-dim)' }}>
                    {formatTimestamp(row.timestamp)}
                  </Td>
                  <Td className="font-semibold">{row.user}</Td>
                  <Td>
                    <Badge label={row.action} color={ACTION_COLORS[row.action] ?? 'var(--adm-ink-dim)'} />
                  </Td>
                  <Td>
                    <span className="adm-meta-label" style={{ color: 'var(--adm-ink-dim)' }}>
                      {row.txCode || '—'}
                    </span>
                  </Td>
                  <Td className="max-w-[180px] truncate text-xs" style={{ color: 'var(--adm-ink-faint)' }}>
                    {row.oldValue || '—'}
                  </Td>
                  <Td className="max-w-[180px] truncate text-xs" style={{ color: 'var(--adm-ink)' }}>
                    {row.newValue || '—'}
                  </Td>
                  <Td className="max-w-[240px] text-xs" style={{ color: 'var(--adm-ink-dim)' }}>
                    {row.details || '—'}
                  </Td>
                  <Td align="center">
                    <span style={{ color: 'var(--adm-ink-faint)' }}>—</span>
                  </Td>
                </tr>
              ) : (
                <tr key={`payment-${row.id}`} className="adm-table-row">
                  <Td numeric className="whitespace-nowrap" style={{ color: 'var(--adm-ink-dim)' }}>
                    {formatTimestamp(row.timestamp)}
                  </Td>
                  <Td className="font-semibold">{row.user}</Td>
                  <Td>
                    <Badge label={DUES_ACTION_LABEL} color={DUES_ACTION_COLOR} />
                  </Td>
                  <Td>
                    <span className="adm-meta-label" style={{ color: 'var(--adm-ink-dim)' }}>
                      {row.id}
                    </span>
                  </Td>
                  <Td className="text-xs" style={{ color: 'var(--adm-ink-faint)' }}>
                    —
                  </Td>
                  <Td numeric className="text-xs" style={{ color: 'var(--adm-acc-emerald)' }}>
                    +{row.amount} RON
                  </Td>
                  <Td className="max-w-[240px] text-xs" style={{ color: 'var(--adm-ink-dim)' }}>
                    Cotizație {row.month} — {row.memberName}
                  </Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1.5">
                      <SignatureThumb src={row.memberSignature} label={`Semnătură ${row.memberName}`} />
                      <SignatureThumb src={row.treasurerSignature} label="Semnătură Trezorier" />
                    </div>
                  </Td>
                </tr>
              )
            )
          )}
        </tbody>
      </TableWrap>
    </Panel>
  );
};
