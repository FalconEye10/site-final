import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  EmptyState,
  Field,
  Modal,
  Panel,
  Select,
  TableWrap,
  Td,
  TextInput,
  Th,
} from '../ui';
import {
  BudgetProject,
  PROJECT_STATUS_LABELS,
  ProjectStatus,
  Transaction,
  formatRON,
} from '../types';
import { projectRows } from '../selectors';
import { toast } from '../../../../ui/Toast';

interface Props {
  projects: BudgetProject[];
  transactions: Transaction[];
  onSave: (project: BudgetProject, previous?: BudgetProject) => Promise<void>;
  onDelete: (project: BudgetProject) => Promise<void>;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planuit: 'var(--adm-acc-blue)',
  derulare: 'var(--adm-acc-amber)',
  finalizat: 'var(--adm-acc-emerald)',
};

export const ProjectsTab: React.FC<Props> = ({ projects, transactions, onSave, onDelete }) => {
  const [draft, setDraft] = useState<BudgetProject | null>(null);
  const [original, setOriginal] = useState<BudgetProject | undefined>();
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BudgetProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = projectRows(projects, transactions);

  const openCreate = () => {
    setOriginal(undefined);
    setDraft({
      id: `prj-${Date.now()}`,
      name: '',
      status: 'planuit',
      estimatedIncome: 0,
      estimatedExpense: 0,
    });
  };

  const openEdit = (project: BudgetProject) => {
    setOriginal(project);
    setDraft({ ...project });
  };

  const submit = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      await onSave(
        {
          ...draft,
          name: draft.name.trim(),
          estimatedIncome: Number(draft.estimatedIncome) || 0,
          estimatedExpense: Number(draft.estimatedExpense) || 0,
        },
        original
      );
      toast.success(`Proiectul „${draft.name}” a fost salvat cu succes.`);
      setDraft(null);
    } catch (err) {
      toast.error('Eroare la salvarea proiectului.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete);
      toast.success(`Proiectul „${pendingDelete.name}” a fost șters.`);
      setPendingDelete(null);
    } catch (err) {
      toast.error('Eroare la ștergerea proiectului.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Visual Workflow Guide Banner */}
      <div className="p-3.5 sm:p-4 rounded-[2px] bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-anthropic">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-[2px] bg-amber-500 text-white shrink-0 mt-0.5 sm:mt-0">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-title">
              2. Buget pe Proiecte (Profit &amp; Eficiență Caritabilă)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Creează proiecte individuale (ex: Gala Voluntarilor, Smash Rally). Când adaugi tranzacții în <em>Registru</em> și le asociezi unui proiect, sumele reale, profitul caritabil și ROI-ul se calculează <strong>automat</strong> aici.
            </p>
          </div>
        </div>
      </div>

      <Panel
        title="Buget pe Proiecte &amp; Evenimente"
        subtitle="Estimat vs. Realizat, Profit Net Caritabil și Eficiență (ROI) per proiect"
        bodyClassName="p-0"
        actions={
          <button type="button" className="adm-btn-primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Proiect Nou
          </button>
        }
      >
        <TableWrap>
          <thead className="adm-table-head">
            <tr>
              <Th>Nume Proiect</Th>
              <Th>Status</Th>
              <Th align="right">Venit Estimat</Th>
              <Th align="right">Venit Realizat</Th>
              <Th align="right">Chelt. Estimative</Th>
              <Th align="right">Chelt. Reale</Th>
              <Th align="right">Profit Net Caritabil</Th>
              <Th align="right">Eficiență (ROI)</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyState
                colSpan={9}
                icon={<FolderKanban className="h-10 w-10" />}
                title="Niciun proiect înregistrat"
                description="Creează un proiect pentru a aloca tranzacții și a urmări rentabilitatea caritabilă."
              />
            ) : (
              rows.map(row => (
                <tr
                  key={row.id}
                  className="adm-table-row cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  onClick={() => openEdit(row)}
                >
                  <Td className="font-semibold text-slate-900 dark:text-white">{row.name}</Td>
                  <Td>
                    <Badge label={PROJECT_STATUS_LABELS[row.status]} color={STATUS_COLORS[row.status]} />
                  </Td>
                  <Td numeric align="right" style={{ color: 'var(--adm-ink-dim)' }}>
                    {formatRON(row.estimatedIncome)} RON
                  </Td>
                  <Td numeric align="right" className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatRON(row.realizedIncome)} RON
                  </Td>
                  <Td numeric align="right" style={{ color: 'var(--adm-ink-dim)' }}>
                    {formatRON(row.estimatedExpense)} RON
                  </Td>
                  <Td numeric align="right" className="font-bold text-rose-600 dark:text-rose-400">
                    −{formatRON(row.realizedExpense)} RON
                  </Td>
                  <Td
                    numeric
                    align="right"
                    className="font-bold"
                    style={{
                      color: row.netCharitable >= 0 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)',
                    }}
                  >
                    {formatRON(row.netCharitable)} RON
                  </Td>
                  <Td numeric align="right">
                    {row.roi === null ? (
                      <span style={{ color: 'var(--adm-ink-faint)' }}>—</span>
                    ) : (
                      <span
                        style={{ color: row.roi >= 1 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-amber)' }}
                      >
                        {row.roi.toFixed(2)}×
                      </span>
                    )}
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      className="adm-icon-btn hover:text-rose-500"
                      aria-label={`Șterge proiectul ${row.name}`}
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
        </TableWrap>
      </Panel>

      {/* Edit / Add Modal */}
      <Modal
        open={draft !== null}
        title={original ? `Editează Proiectul „${original.name}”` : 'Proiect Nou'}
        subtitle="Sumele realizate se calculează automat din tranzacțiile alocate acestui proiect."
        onClose={() => setDraft(null)}
        width="max-w-xl"
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setDraft(null)}>
              Anulează
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={submit}
              disabled={saving || !draft?.name.trim()}
            >
              {saving ? 'Se salvează…' : 'Salvează proiectul'}
            </button>
          </>
        }
      >
        {draft && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nume Proiect" required className="sm:col-span-2">
              <TextInput
                value={draft.name}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
                placeholder="ex. Smash Rally / Gala Voluntarilor"
              />
            </Field>
            <Field label="Status Proiect" required>
              <Select
                value={draft.status}
                onChange={event => setDraft({ ...draft, status: event.target.value as ProjectStatus })}
              >
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(status => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <div />
            <Field label="Venit Estimat (RON)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={draft.estimatedIncome || ''}
                onChange={event => setDraft({ ...draft, estimatedIncome: Number(event.target.value) })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Cheltuieli Estimative (RON)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={draft.estimatedExpense || ''}
                onChange={event => setDraft({ ...draft, estimatedExpense: Number(event.target.value) })}
                placeholder="0.00"
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={pendingDelete !== null}
        title="Confirmă Ștergerea Proiectului"
        onClose={() => setPendingDelete(null)}
        width="max-w-md"
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Anulează
            </button>
            <button type="button" className="adm-btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" /> {deleting ? 'Se șterge…' : 'Șterge proiectul'}
            </button>
          </>
        }
      >
        {pendingDelete && (
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
            Ești sigur că vrei să elimini proiectul <strong style={{ color: 'var(--adm-ink)' }}>{pendingDelete.name}</strong>?
            Tranzacțiile alocate acestui proiect vor rămâne în registru, dar vor fi afișate la secțiunea General.
          </p>
        )}
      </Modal>
    </div>
  );
};
