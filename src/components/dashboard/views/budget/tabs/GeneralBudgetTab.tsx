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
import { toast } from '../../../../ui/Toast';

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
  const [pendingDelete, setPendingDelete] = useState<BudgetLine | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      toast.success(`Linia bugetară „${draft.category}” a fost salvată.`);
      setDraft(null);
    } catch (err) {
      toast.error('Eroare la salvarea liniei bugetare.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete);
      toast.success(`Linia bugetară „${pendingDelete.category}” a fost ștearsă.`);
      setPendingDelete(null);
    } catch (err) {
      toast.error('Eroare la ștergerea liniei bugetare.');
    } finally {
      setDeleting(false);
    }
  };

  const executionColor = (row: (typeof rows)[number]) => {
    if (row.type === 'venit') return row.execution >= 1 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-blue)';
    if (row.execution > 1) return 'var(--adm-acc-rose)';
    if (row.execution > 0.85) return 'var(--adm-acc-amber)';
    return 'var(--adm-acc-emerald)';
  };

  return (
    <div className="space-y-4">
      {/* Visual Workflow Guide Banner */}
      <div className="p-3.5 sm:p-4 rounded-[2px] bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-anthropic">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-[2px] bg-sky-500 text-white shrink-0 mt-0.5 sm:mt-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
              1. Buget General (Planificat vs. Realizat)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Stabilește plafoanele anuale de cheltuieli și țintele de venituri. Cifrele „Realizat” sunt calculate <strong>automat</strong> din toate tranzacțiile înregistrate în <em>Registrul de Tranzacții</em>.
            </p>
          </div>
        </div>
      </div>

      <Panel
        title="Buget General — Planificat vs. Realizat"
        subtitle="Execuția bugetară pe fiecare linie a mandatului (Sumele realizate provin din Registrul de Tranzacții)"
        bodyClassName="p-0"
        actions={
          <button type="button" className="adm-btn-primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Linie Bugetară Nouă
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
                  className="adm-table-row cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  onClick={() => openEdit(row)}
                >
                  <Td className="font-semibold">{row.category}</Td>
                  <Td>
                    <Badge
                      label={TX_TYPE_LABELS[row.type]}
                      color={row.type === 'venit' ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
                    />
                  </Td>
                  <Td numeric align="right">
                    {formatRON(row.planned)} RON
                  </Td>
                  <Td numeric align="right" className="font-bold">
                    {formatRON(row.realized)} RON
                  </Td>
                  <Td
                    numeric
                    align="right"
                    style={{ color: row.difference < 0 ? 'var(--adm-acc-rose)' : 'var(--adm-ink)' }}
                  >
                    {formatRON(row.difference)} RON
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
                      className="adm-icon-btn hover:text-rose-500"
                      aria-label={`Șterge linia ${row.category}`}
                      onClick={event => {
                        event.stopPropagation();
                        setPendingDelete(row);
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

      {/* Edit / Add Modal */}
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

      {/* Delete Confirmation Modal */}
      <Modal
        open={pendingDelete !== null}
        title="Confirmă Ștergerea Liniei Bugetare"
        onClose={() => setPendingDelete(null)}
        width="max-w-md"
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Anulează
            </button>
            <button type="button" className="adm-btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" /> {deleting ? 'Se șterge…' : 'Șterge linia'}
            </button>
          </>
        }
      >
        {pendingDelete && (
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
            Ești sigur că vrei să elimini linia bugetară <strong style={{ color: 'var(--adm-ink)' }}>{pendingDelete.category}</strong>?
            Tranzacțiile existente din această categorie nu vor fi șterse, dar nu vor mai fi grupate sub această linie planificată.
          </p>
        )}
      </Modal>
    </div>
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
          className="adm-meta-label font-bold"
          style={{ color: emphasis ? color : 'var(--adm-ink-dim)', letterSpacing: '0.12em' }}
        >
          {label}
        </span>
      </td>
      <Td numeric align="right" style={{ color }}>
        {formatRON(planned)} RON
      </Td>
      <Td numeric align="right" className="font-bold" style={{ color }}>
        {formatRON(realized)} RON
      </Td>
      <Td numeric align="right" style={{ color }}>
        {formatRON(difference)} RON
      </Td>
      <Td numeric>{planned !== 0 ? `${Math.round(execution * 100)}%` : '—'}</Td>
      <Td />
    </tr>
  );
};
