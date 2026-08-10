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
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Panel
        title="Buget pe Proiecte"
        subtitle="Estimat vs. realizat, profit caritabil și eficiență per proiect"
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
                <tr key={row.id} className="adm-table-row cursor-pointer" onClick={() => openEdit(row)}>
                  <Td className="font-semibold">{row.name}</Td>
                  <Td>
                    <Badge label={PROJECT_STATUS_LABELS[row.status]} color={STATUS_COLORS[row.status]} />
                  </Td>
                  <Td numeric align="right" style={{ color: 'var(--adm-ink-dim)' }}>
                    {formatRON(row.estimatedIncome)}
                  </Td>
                  <Td numeric align="right">
                    {formatRON(row.realizedIncome)}
                  </Td>
                  <Td numeric align="right" style={{ color: 'var(--adm-ink-dim)' }}>
                    {formatRON(row.estimatedExpense)}
                  </Td>
                  <Td numeric align="right">
                    {formatRON(row.realizedExpense)}
                  </Td>
                  <Td
                    numeric
                    align="right"
                    style={{
                      color: row.netCharitable >= 0 ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)',
                    }}
                  >
                    {formatRON(row.netCharitable)}
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
                      className="adm-icon-btn"
                      aria-label={`Șterge proiectul ${row.name}`}
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
        </TableWrap>
      </Panel>

      <Modal
        open={draft !== null}
        title={original ? 'Editează Proiectul' : 'Proiect Nou'}
        subtitle="Sumele realizate se calculează automat din tranzacțiile alocate proiectului."
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
              {saving ? 'Se salvează…' : 'Salvează'}
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
                placeholder="ex. Smash Rally"
              />
            </Field>
            <Field label="Status" required>
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
                value={draft.estimatedIncome}
                onChange={event => setDraft({ ...draft, estimatedIncome: Number(event.target.value) })}
              />
            </Field>
            <Field label="Cheltuieli Estimative (RON)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={draft.estimatedExpense}
                onChange={event => setDraft({ ...draft, estimatedExpense: Number(event.target.value) })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
};
