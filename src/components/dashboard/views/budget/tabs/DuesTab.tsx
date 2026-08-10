import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Badge, EmptyState, Panel, Select, TableWrap, Td, TextInput, Th } from '../ui';
import {
  DuesRecord,
  FULL_MANDATE_DUE,
  MANDATE_MONTHS,
  MONTHLY_DUE,
  formatRON,
} from '../types';
import { duesRows } from '../selectors';

interface Props {
  dues: DuesRecord[];
  onSaveMonth: (record: DuesRecord, monthIndex: number, value: number) => Promise<void>;
}

export const DuesTab: React.FC<Props> = ({ dues, onSaveMonth }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complet' | 'restant'>('all');

  /**
   * Cell edits are held locally while the input is focused so a keystroke is
   * not round-tripped through Firestore mid-typing; the value is committed on
   * blur. `dues` stays the source of truth for every non-focused cell.
   */
  const [editing, setEditing] = useState<{ id: string; month: number; value: string } | null>(null);

  useEffect(() => {
    // Drop a stale edit if the underlying record disappears (e.g. after archive).
    if (editing && !dues.some(record => record.id === editing.id)) setEditing(null);
  }, [dues, editing]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return duesRows(dues)
      .filter(row => {
        if (statusFilter === 'complet' && !row.isComplete) return false;
        if (statusFilter === 'restant' && row.isComplete) return false;
        if (!term) return true;
        return `${row.memberName} ${row.boardRole}`.toLowerCase().includes(term);
      })
      .sort((a, b) => a.memberName.localeCompare(b.memberName, 'ro'));
  }, [dues, search, statusFilter]);

  const totals = useMemo(() => {
    const all = duesRows(dues);
    const collected = all.reduce((sum, row) => sum + row.totalPaid, 0);
    const expected = all.length * FULL_MANDATE_DUE;
    return {
      collected,
      expected,
      complete: all.filter(row => row.isComplete).length,
      members: all.length,
      monthly: MANDATE_MONTHS.map((_, index) =>
        all.reduce((sum, row) => sum + (Number(row.months[index]) || 0), 0)
      ),
    };
  }, [dues]);

  const commit = async (record: DuesRecord, month: number, raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    const months = record.months || [];
    if ((Number(months[month]) || 0) === value) return;
    await onSaveMonth(record, month, value);
  };

  return (
    <Panel
      title="Urmărire Cotizații"
      subtitle={`Mandat Iulie → Iunie · ${MONTHLY_DUE} RON/lună · prag "Complet" ${FULL_MANDATE_DUE} RON`}
      bodyClassName="p-0"
      actions={
        <div className="flex items-center gap-3">
          <span className="adm-meta-label">
            {totals.complete}/{totals.members} complet
          </span>
          <span className="adm-meta-label" style={{ color: 'var(--theme-color, #89cff0)' }}>
            {formatRON(totals.collected)} / {formatRON(totals.expected)} RON
          </span>
        </div>
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
            placeholder="Caută membru sau funcție…"
            className="!pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as 'all' | 'complet' | 'restant')}
          className="sm:w-56"
        >
          <option value="all">Toți membrii</option>
          <option value="complet">Doar complet achitați</option>
          <option value="restant">Doar restanțieri</option>
        </Select>
      </div>

      <TableWrap className="[&_table]:min-w-[1080px]">
        <thead className="adm-table-head">
          <tr>
            <Th className="sticky left-0 z-10" >Nume Membru</Th>
            <Th>Funcție Board</Th>
            {MANDATE_MONTHS.map(month => (
              <Th key={month} align="center">
                {month}
              </Th>
            ))}
            <Th align="right">Total Achitat</Th>
            <Th align="center">Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyState
              colSpan={16}
              icon={<Users className="h-10 w-10" />}
              title={dues.length === 0 ? 'Niciun membru sincronizat' : 'Niciun rezultat'}
              description={
                dues.length === 0
                  ? 'Membrii activi sunt importați automat din secțiunea Membri la deschiderea modulului.'
                  : 'Modifică termenul de căutare sau filtrul de status.'
              }
            />
          ) : (
            rows.map(row => (
              <tr key={row.id} className="adm-table-row">
                <Td
                  className="sticky left-0 z-10 font-semibold"
                  style={{ background: 'var(--adm-panel)' }}
                >
                  {row.memberName}
                </Td>
                <Td style={{ color: 'var(--adm-ink-dim)' }}>{row.boardRole || '—'}</Td>

                {MANDATE_MONTHS.map((month, index) => {
                  const isEditing = editing?.id === row.id && editing.month === index;
                  const stored = Number(row.months[index]) || 0;
                  const paid = stored > 0;

                  return (
                    <td key={month} className="px-1 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        aria-label={`${row.memberName} — ${month}`}
                        value={isEditing ? editing.value : stored || ''}
                        placeholder="0"
                        onFocus={() => setEditing({ id: row.id, month: index, value: String(stored || '') })}
                        onChange={event =>
                          setEditing({ id: row.id, month: index, value: event.target.value })
                        }
                        onBlur={async () => {
                          if (isEditing) await commit(row, index, editing.value);
                          setEditing(null);
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                          if (event.key === 'Escape') setEditing(null);
                        }}
                        className="w-14 px-1 py-1.5 text-center text-xs font-bold tabular-nums outline-none transition-colors"
                        style={{
                          borderRadius: 2,
                          background: paid
                            ? 'color-mix(in srgb, var(--adm-acc-emerald) 12%, transparent)'
                            : 'var(--adm-surface)',
                          border: `1px solid ${
                            paid
                              ? 'color-mix(in srgb, var(--adm-acc-emerald) 32%, transparent)'
                              : 'var(--adm-border)'
                          }`,
                          color: paid ? 'var(--adm-acc-emerald)' : 'var(--adm-ink-faint)',
                        }}
                      />
                    </td>
                  );
                })}

                <Td numeric align="right">
                  {formatRON(row.totalPaid)}
                </Td>
                <Td align="center">
                  <Badge
                    label={row.isComplete ? 'Complet' : 'Restanțier'}
                    color={row.isComplete ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
                  />
                </Td>
              </tr>
            ))
          )}
        </tbody>

        {rows.length > 0 && (
          <tfoot>
            <tr style={{ borderTop: '1px solid var(--adm-border-strong)', background: 'var(--adm-surface)' }}>
              <td className="sticky left-0 z-10 px-4 py-3" style={{ background: 'var(--adm-surface)' }}>
                <span className="adm-meta-label">Total lunar</span>
              </td>
              <td />
              {totals.monthly.map((value, index) => (
                <Td key={MANDATE_MONTHS[index]} numeric align="center" className="!px-1 text-xs">
                  {value > 0 ? formatRON(value) : '—'}
                </Td>
              ))}
              <Td numeric align="right" style={{ color: 'var(--theme-color, #89cff0)' }}>
                {formatRON(totals.collected)}
              </Td>
              <Td />
            </tr>
          </tfoot>
        )}
      </TableWrap>
    </Panel>
  );
};
