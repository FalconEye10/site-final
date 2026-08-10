import React, { useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import {
  Badge,
  EmptyState,
  Field,
  Modal,
  MiniBar,
  Panel,
  Select,
  TableWrap,
  Td,
  TextInput,
  Th,
} from '../ui';
import { ALL_CATEGORIES, BudgetLine, TX_TYPE_LABELS, Transaction, TxType, formatRON } from '../types';
import { budgetLineRows } from '../selectors';

interface Props {
  lines: BudgetLine[];
  transactions: Transaction[];
  onSave: (line: BudgetLine, previous?: BudgetLine) => Promise<void>;
  onDelete: (line: BudgetLine) => Promise<void>;
}

const EMPTY_DRAFT: BudgetLine = { id: '', category: ALL_CATEGORIES[0], type: 'venit', planned: 0 };

export const GeneralBudgetTab: React.FC<Props> = ({ lines, transactions, onSave, onDelete }) => {
  const [draft, setDraft] = useState<BudgetLine | null>(null);
  const [original, setOriginal] = useState<BudgetLine | undefined>();
  const [saving, setSaving] = useState(false);

  const rows = budgetLineRows(lines, transactions).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'venit' ? -1 : 1;
    return a.category.localeCompare(b.category, 'ro');
  });

  const totals = rows.reduce(
    (acc, row) => {
      const bucket = row.type === 'venit' ? acc.income : acc.expense;
      bucket.planned += row.planned;
      bucket.realized += row.realized;
      return acc;
    },
    { income: { planned: 0, realized: 0 }, expense: { planned: 0, realized: 0 } }
  );

  const openCreate = () => {
    setOriginal(undefined);
    setDraft({ ...EMPTY_DRAFT, id: `line-${Date.now()}` });
  };

  const openEdit = (line: BudgetLine) => {
    setOriginal(line);
    setDraft({ ...line });
  };

  const submit = async () => {
    if (!draft || !draft.category.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...draft, planned: Number(draft.planned) || 0 }, original);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const executionColor = (row: (typeof rows)[number]) => {
    if (row.type === 'venit') return row.execution >= 1 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-blue)';
    if (row.execution > 1) return 'var(--adm-acc-rose)';
    if (row.execution > 0.85) return 'var(--adm-acc-amber)';
    return 'var(--adm-acc-emerald)';
  };

  return (
    <>
      <Panel
        title="Buget General — Planificat vs. Realizat"
        subtitle="Execuția bugetară pe fiecare linie a mandatului"
        bodyClassName="p-0"
        actions={
          <button type="button" className="adm-btn-primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Linie Nouă
          </button>
        }
      >
        <TableWrap>
          <thead className="adm-table-head">
            <tr>
              <Th>Categorie / Linie Bugetară</Th>
              <Th>Tip</Th>
              <Th align="right">Buget Planificat</Th>
              <Th align="right">Realizat</Th>
              <Th align="right">Diferență / Rămas</Th>
              <Th>% Execuție</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyState
                colSpan={7}
                icon={<Wallet className="h-10 w-10" />}
                title="Niciun buget planificat"
                description="Adaugă linii bugetare pentru a urmări execuția pe categorii."
              />
            ) : (
              rows.map(row => (
                <tr
                  key={row.id}
                  className="adm-table-row cursor-pointer"
                  onClick={() => openEdit(row)}
                >
                  <Td>{row.category}</Td>
                  <Td>
                    <Badge
                      label={TX_TYPE_LABELS[row.type]}
                      color={row.type === 'venit' ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
                    />
                  </Td>
                  <Td numeric align="right">
                    {formatRON(row.planned)}
                  </Td>
                  <Td numeric align="right">
                    {formatRON(row.realized)}
                  </Td>
                  <Td
                    numeric
                    align="right"
                    style={{ color: row.difference < 0 ? 'var(--adm-acc-rose)' : 'var(--adm-ink)' }}
                  >
                    {formatRON(row.difference)}
                  </Td>
                  <Td>
                    <div className="flex min-w-[120px] items-center gap-2">
                      <MiniBar ratio={row.execution} color={executionColor(row)} />
                      <span className="w-11 shrink-0 text-right text-xs font-bold tabular-nums">
                        {row.planned > 0 ? `${Math.round(row.execution * 100)}%` : '—'}
                      </span>
                    </div>
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      className="adm-icon-btn"
                      aria-label={`Șterge linia ${row.category}`}
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(row);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <SummaryRow
                label="Total Venituri"
                planned={totals.income.planned}
                realized={totals.income.realized}
                color="var(--adm-acc-emerald)"
              />
              <SummaryRow
                label="Total Cheltuieli"
                planned={totals.expense.planned}
                realized={totals.expense.realized}
                color="var(--adm-acc-rose)"
              />
              <SummaryRow
                label="Rezultat Net"
                planned={totals.income.planned - totals.expense.planned}
                realized={totals.income.realized - totals.expense.realized}
                color="var(--theme-color, #89cff0)"
                emphasis
              />
            </tfoot>
          )}
        </TableWrap>
      </Panel>

      <Modal
        open={draft !== null}
        title={original ? 'Editează Linia Bugetară' : 'Linie Bugetară Nouă'}
        subtitle="Suma planificată este comparată automat cu tranzacțiile înregistrate."
        onClose={() => setDraft(null)}
        width="max-w-lg"
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setDraft(null)}>
              Anulează
            </button>
            <button type="button" className="adm-btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Se salvează…' : 'Salvează'}
            </button>
          </>
        }
      >
        {draft && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tip" required>
              <Select
                value={draft.type}
                onChange={event => setDraft({ ...draft, type: event.target.value as TxType })}
              >
                <option value="venit">Venit</option>
                <option value="cheltuiala">Cheltuială</option>
              </Select>
            </Field>
            <Field label="Buget Planificat (RON)" required>
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={draft.planned}
                onChange={event => setDraft({ ...draft, planned: Number(event.target.value) })}
              />
            </Field>
            <Field label="Categorie / Linie Bugetară" required className="sm:col-span-2">
              <TextInput
                list="budget-line-categories"
                value={draft.category}
                onChange={event => setDraft({ ...draft, category: event.target.value })}
                placeholder="ex. Logistică Evenimente"
              />
              <datalist id="budget-line-categories">
                {ALL_CATEGORIES.map(category => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
};

const SummaryRow: React.FC<{
  label: string;
  planned: number;
  realized: number;
  color: string;
  emphasis?: boolean;
}> = ({ label, planned, realized, color, emphasis }) => {
  const difference = planned - realized;
  const execution = planned !== 0 ? realized / planned : 0;

  return (
    <tr style={{ borderTop: '1px solid var(--adm-border-strong)', background: 'var(--adm-surface)' }}>
      <td className="px-4 py-3" colSpan={2}>
        <span
          className="adm-meta-label"
          style={{ color: emphasis ? color : 'var(--adm-ink-dim)', letterSpacing: '0.12em' }}
        >
          {label}
        </span>
      </td>
      <Td numeric align="right" style={{ color }}>
        {formatRON(planned)}
      </Td>
      <Td numeric align="right" style={{ color }}>
        {formatRON(realized)}
      </Td>
      <Td numeric align="right" style={{ color }}>
        {formatRON(difference)}
      </Td>
      <Td numeric>{planned !== 0 ? `${Math.round(execution * 100)}%` : '—'}</Td>
      <Td />
    </tr>
  );
};
