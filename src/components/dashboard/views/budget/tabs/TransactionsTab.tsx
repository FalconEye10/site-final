import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, Pencil, Plus, Receipt, RotateCcw, Search, Trash2, X } from 'lucide-react';
import {
  Badge,
  EmptyState,
  Field,
  Modal,
  Panel,
  Select,
  TableWrap,
  Td,
  TextArea,
  TextInput,
  Th,
} from '../ui';
import {
  BudgetProject,
  GENERAL_PROJECT_ID,
  TX_STATUS_LABELS,
  TX_TYPE_LABELS,
  Transaction,
  TxStatus,
  TxType,
  categoriesFor,
  formatRON,
} from '../types';
import { nextTransactionCode, projectName } from '../selectors';

interface Props {
  transactions: Transaction[];
  projects: BudgetProject[];
  currentUserName: string;
  onSave: (tx: Transaction, previous?: Transaction) => Promise<void>;
  onDelete: (tx: Transaction) => Promise<void>;
  onApprove: (tx: Transaction) => Promise<void>;
  onRevert: (tx: Transaction, reason: string) => Promise<void>;
}

const STATUS_COLORS: Record<TxStatus, string> = {
  platit: 'var(--adm-acc-emerald)',
  asteptare: 'var(--adm-acc-amber)',
  respins: 'var(--adm-acc-rose)',
  anulata: 'var(--adm-ink-faint)',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const TransactionsTab: React.FC<Props> = ({
  transactions,
  projects,
  currentUserName,
  onSave,
  onDelete,
  onApprove,
  onRevert,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TxType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [draft, setDraft] = useState<Transaction | null>(null);
  const [original, setOriginal] = useState<Transaction | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [pendingRevert, setPendingRevert] = useState<Transaction | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);

  const knownCategories = useMemo(
    () => [...new Set([...categoriesFor('venit'), ...categoriesFor('cheltuiala'), ...transactions.map(tx => tx.category)])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ro')),
    [transactions]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return transactions
      .filter(tx => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (projectFilter !== 'all' && (tx.projectId || GENERAL_PROJECT_ID) !== projectFilter) return false;
        if (fromDate && tx.date < fromDate) return false;
        if (toDate && tx.date > toDate) return false;
        if (!term) return true;

        return [tx.code, tx.category, tx.source, tx.notes, tx.approvedBy, projectName(projects, tx.projectId)]
          .filter(Boolean)
          .some(field => String(field).toLowerCase().includes(term));
      })
      .sort((a, b) => (a.date === b.date ? b.code.localeCompare(a.code) : b.date.localeCompare(a.date)));
  }, [transactions, projects, search, typeFilter, statusFilter, categoryFilter, projectFilter, fromDate, toDate]);

  const filteredTotal = filtered.reduce(
    (acc, tx) => {
      if (tx.status === 'respins' || tx.status === 'anulata') return acc;
      if (tx.type === 'venit') acc.income += tx.amount;
      else acc.expense += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const hasActiveFilters =
    Boolean(search) ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    projectFilter !== 'all' ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setProjectFilter('all');
    setFromDate('');
    setToDate('');
  };

  const openCreate = () => {
    setOriginal(undefined);
    setErrors({});
    setDraft({
      id: `tx-${Date.now()}`,
      code: nextTransactionCode(transactions),
      date: todayISO(),
      type: 'venit',
      category: categoriesFor('venit')[0],
      projectId: GENERAL_PROJECT_ID,
      amount: 0,
      status: 'asteptare',
      source: '',
      documentUrl: '',
      approvedBy: '',
      notes: '',
    });
  };

  const openEdit = (tx: Transaction) => {
    setOriginal(tx);
    setErrors({});
    setDraft({ ...tx });
  };

  /**
   * Expenses must carry a proof-of-spend link — that is the decont rule the
   * treasurer is audited against, so it is enforced here rather than by
   * convention.
   */
  const validate = (tx: Transaction): Record<string, string> => {
    const next: Record<string, string> = {};

    if (!tx.date) next.date = 'Data este obligatorie.';
    if (!tx.category.trim()) next.category = 'Alege o categorie.';
    if (!Number.isFinite(tx.amount) || tx.amount <= 0) next.amount = 'Suma trebuie să fie mai mare decât 0.';
    if (!tx.source.trim()) next.source = 'Specifică membrul sau sursa.';

    if (tx.type === 'cheltuiala') {
      if (!tx.documentUrl.trim()) {
        next.documentUrl = 'Dovada este obligatorie pentru orice cheltuială / decont.';
      } else if (!isValidUrl(tx.documentUrl)) {
        next.documentUrl = 'Introdu un link valid (http:// sau https://).';
      }
    } else if (tx.documentUrl.trim() && !isValidUrl(tx.documentUrl)) {
      next.documentUrl = 'Introdu un link valid (http:// sau https://).';
    }

    return next;
  };

  const submit = async () => {
    if (!draft) return;
    const normalized: Transaction = {
      ...draft,
      amount: Number(draft.amount) || 0,
      source: draft.source.trim(),
      documentUrl: draft.documentUrl.trim(),
      notes: draft.notes.trim(),
      approvedBy: draft.status === 'platit' ? draft.approvedBy || currentUserName : draft.approvedBy,
    };

    const found = validate(normalized);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSave(normalized, original);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const submitRevert = async () => {
    if (!pendingRevert || !revertReason.trim()) return;
    setReverting(true);
    try {
      await onRevert(pendingRevert, revertReason.trim());
      setPendingRevert(null);
      setRevertReason('');
    } finally {
      setReverting(false);
    }
  };

  const changeType = (type: TxType) => {
    if (!draft) return;
    const allowed = categoriesFor(type);
    setDraft({
      ...draft,
      type,
      // Keep the category valid for the new side of the ledger.
      category: allowed.includes(draft.category) ? draft.category : allowed[0],
    });
  };

  return (
    <>
      <Panel
        title="Registru Tranzacții"
        subtitle={`${filtered.length} din ${transactions.length} mișcări · +${formatRON(filteredTotal.income)} / −${formatRON(filteredTotal.expense)} RON`}
        bodyClassName="p-0"
        actions={
          <button type="button" className="adm-btn-primary" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Tranzacție Nouă
          </button>
        }
      >
        <div className="flex flex-col gap-3 p-4" style={{ borderBottom: '1px solid var(--adm-border)' }}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--adm-ink-faint)' }}
            />
            <TextInput
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Caută după cod, categorie, sursă, proiect sau observații…"
              className="!pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'all' | TxType)}>
              <option value="all">Toate tipurile</option>
              <option value="venit">Venit</option>
              <option value="cheltuiala">Cheltuială</option>
            </Select>
            <Select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as 'all' | TxStatus)}
            >
              <option value="all">Toate statusurile</option>
              {(Object.keys(TX_STATUS_LABELS) as TxStatus[]).map(status => (
                <option key={status} value={status}>
                  {TX_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
              <option value="all">Toate categoriile</option>
              {knownCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select value={projectFilter} onChange={event => setProjectFilter(event.target.value)}>
              <option value="all">Toate proiectele</option>
              <option value={GENERAL_PROJECT_ID}>General</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <TextInput
              type="date"
              value={fromDate}
              onChange={event => setFromDate(event.target.value)}
              aria-label="De la data"
            />
            <TextInput
              type="date"
              value={toDate}
              onChange={event => setToDate(event.target.value)}
              aria-label="Până la data"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="self-start text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: 'var(--theme-color, #89cff0)' }}
            >
              Resetează filtrele
            </button>
          )}
        </div>

        <TableWrap>
          <thead className="adm-table-head">
            <tr>
              <Th>ID</Th>
              <Th>Data</Th>
              <Th>Tip</Th>
              <Th>Categorie</Th>
              <Th>Proiect</Th>
              <Th align="right">Sumă</Th>
              <Th>Status</Th>
              <Th>Membru / Sursă</Th>
              <Th align="center">Dovadă</Th>
              <Th>Aprobat de</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyState
                colSpan={11}
                icon={<Receipt className="h-10 w-10" />}
                title={hasActiveFilters ? 'Niciun rezultat' : 'Registrul este gol'}
                description={
                  hasActiveFilters
                    ? 'Ajustează filtrele sau resetează-le pentru a vedea toate tranzacțiile.'
                    : 'Adaugă prima tranzacție pentru a începe evidența financiară a mandatului.'
                }
                action={
                  hasActiveFilters ? (
                    <button type="button" className="adm-btn-ghost" onClick={resetFilters}>
                      Resetează filtrele
                    </button>
                  ) : (
                    <button type="button" className="adm-btn-primary" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5" /> Tranzacție Nouă
                    </button>
                  )
                }
              />
            ) : (
              filtered.map(tx => (
                <tr key={tx.id} className="adm-table-row">
                  <Td>
                    <span className="adm-meta-label" style={{ color: 'var(--adm-ink-dim)' }}>
                      {tx.code}
                    </span>
                  </Td>
                  <Td numeric>{tx.date}</Td>
                  <Td>
                    <Badge
                      label={TX_TYPE_LABELS[tx.type]}
                      color={tx.type === 'venit' ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
                    />
                  </Td>
                  <Td>{tx.category}</Td>
                  <Td style={{ color: 'var(--adm-ink-dim)' }}>{projectName(projects, tx.projectId)}</Td>
                  <Td
                    numeric
                    align="right"
                    style={{ color: tx.type === 'venit' ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)' }}
                  >
                    {tx.type === 'venit' ? '+' : '−'}
                    {formatRON(tx.amount)}
                  </Td>
                  <Td>
                    <Badge label={TX_STATUS_LABELS[tx.status]} color={STATUS_COLORS[tx.status]} />
                  </Td>
                  <Td>{tx.source || '—'}</Td>
                  <Td align="center">
                    {tx.documentUrl ? (
                      <a
                        href={tx.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="adm-icon-btn mx-auto"
                        aria-label={`Deschide dovada pentru ${tx.code}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--adm-ink-faint)' }}>—</span>
                    )}
                  </Td>
                  <Td style={{ color: 'var(--adm-ink-dim)' }}>{tx.approvedBy || '—'}</Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      {tx.status === 'asteptare' && (
                        <button
                          type="button"
                          className="adm-icon-btn"
                          aria-label={`Aprobă ${tx.code}`}
                          title="Aprobă"
                          onClick={() => onApprove(tx)}
                          style={{ color: 'var(--adm-acc-emerald)' }}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {tx.status !== 'anulata' && (
                        <button
                          type="button"
                          className="adm-icon-btn"
                          aria-label={`Revert ${tx.code}`}
                          title="Revert (anulează, dar păstrează în registru)"
                          onClick={() => setPendingRevert(tx)}
                          style={{ color: 'var(--adm-acc-amber)' }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="adm-icon-btn"
                        aria-label={`Editează ${tx.code}`}
                        title="Editează"
                        onClick={() => openEdit(tx)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="adm-icon-btn"
                        aria-label={`Șterge ${tx.code}`}
                        title="Șterge"
                        onClick={() => setPendingDelete(tx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Panel>

      {/* Add / Edit */}
      <Modal
        open={draft !== null}
        title={original ? `Editează ${original.code}` : 'Tranzacție Nouă'}
        subtitle="Cheltuielile necesită obligatoriu un link către dovadă (factură, chitanță, Drive)."
        onClose={() => setDraft(null)}
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setDraft(null)}>
              Anulează
            </button>
            <button type="button" className="adm-btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Se salvează…' : original ? 'Salvează modificările' : 'Adaugă tranzacția'}
            </button>
          </>
        }
      >
        {draft && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID Tranzacție">
              <TextInput value={draft.code} readOnly disabled />
            </Field>
            <Field label="Data" required error={errors.date}>
              <TextInput
                type="date"
                value={draft.date}
                onChange={event => setDraft({ ...draft, date: event.target.value })}
              />
            </Field>

            <Field label="Tip" required>
              <Select value={draft.type} onChange={event => changeType(event.target.value as TxType)}>
                <option value="venit">Venit</option>
                <option value="cheltuiala">Cheltuială</option>
              </Select>
            </Field>
            <Field label="Categorie" required error={errors.category}>
              <Select
                value={draft.category}
                onChange={event => setDraft({ ...draft, category: event.target.value })}
              >
                {categoriesFor(draft.type).map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                {!categoriesFor(draft.type).includes(draft.category) && (
                  <option value={draft.category}>{draft.category}</option>
                )}
              </Select>
            </Field>

            <Field label="Proiect" required>
              <Select
                value={draft.projectId}
                onChange={event => setDraft({ ...draft, projectId: event.target.value })}
              >
                <option value={GENERAL_PROJECT_ID}>General</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sumă (RON)" required error={errors.amount}>
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={draft.amount}
                onChange={event => setDraft({ ...draft, amount: Number(event.target.value) })}
              />
            </Field>

            <Field label="Status" required>
              <Select
                value={draft.status}
                onChange={event => setDraft({ ...draft, status: event.target.value as TxStatus })}
              >
                {(Object.keys(TX_STATUS_LABELS) as TxStatus[]).map(status => (
                  <option key={status} value={status}>
                    {TX_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Membru / Sursă" required error={errors.source}>
              <TextInput
                value={draft.source}
                onChange={event => setDraft({ ...draft, source: event.target.value })}
                placeholder="ex. Popa Andrei / SC Exemplu SRL"
              />
            </Field>

            <Field
              label="Dovadă / Document"
              required={draft.type === 'cheltuiala'}
              error={errors.documentUrl}
              hint="Link Google Drive, poză chitanță sau factură PDF."
              className="sm:col-span-2"
            >
              <TextInput
                type="url"
                value={draft.documentUrl}
                onChange={event => setDraft({ ...draft, documentUrl: event.target.value })}
                placeholder="https://drive.google.com/…"
              />
            </Field>

            <Field label="Aprobat de" hint="Se completează automat la aprobare." className="sm:col-span-2">
              <TextInput
                value={draft.approvedBy}
                onChange={event => setDraft({ ...draft, approvedBy: event.target.value })}
                placeholder={currentUserName}
              />
            </Field>

            <Field label="Observații" className="sm:col-span-2">
              <TextArea
                rows={3}
                value={draft.notes}
                onChange={event => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Detalii suplimentare despre această mișcare financiară…"
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={pendingDelete !== null}
        title="Confirmă ștergerea"
        onClose={() => setPendingDelete(null)}
        width="max-w-md"
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setPendingDelete(null)}>
              Anulează
            </button>
            <button
              type="button"
              className="adm-btn-danger"
              onClick={async () => {
                if (pendingDelete) await onDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              <X className="h-3.5 w-3.5" /> Șterge definitiv
            </button>
          </>
        }
      >
        {pendingDelete && (
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
            Tranzacția <strong style={{ color: 'var(--adm-ink)' }}>{pendingDelete.code}</strong> (
            {formatRON(pendingDelete.amount)} RON — {pendingDelete.category}) va fi eliminată din registru.
            Operațiunea rămâne înregistrată permanent în Audit Log.
          </p>
        )}
      </Modal>

      {/* Revert confirmation */}
      <Modal
        open={pendingRevert !== null}
        title="Revert tranzacție"
        subtitle="Tranzacția rămâne vizibilă în registru cu statusul „Anulată (Revert)”, nu este ștearsă."
        onClose={() => {
          if (reverting) return;
          setPendingRevert(null);
          setRevertReason('');
        }}
        width="max-w-md"
        footer={
          <>
            <button
              type="button"
              className="adm-btn-ghost"
              disabled={reverting}
              onClick={() => {
                setPendingRevert(null);
                setRevertReason('');
              }}
            >
              Anulează
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              disabled={reverting || !revertReason.trim()}
              onClick={submitRevert}
            >
              <RotateCcw className="h-3.5 w-3.5" /> {reverting ? 'Se procesează…' : 'Confirmă revert'}
            </button>
          </>
        }
      >
        {pendingRevert && (
          <div className="space-y-4">
            <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
              Tranzacția <strong style={{ color: 'var(--adm-ink)' }}>{pendingRevert.code}</strong> (
              {formatRON(pendingRevert.amount)} RON — {pendingRevert.category}) va fi marcată drept revertată.
              Rândul rămâne în registru și în Audit Log, dar nu mai contează la totaluri.
            </p>
            <Field label="Motiv revert" required hint="Obligatoriu — explică de ce este anulată această mișcare.">
              <TextArea
                rows={3}
                value={revertReason}
                onChange={event => setRevertReason(event.target.value)}
                placeholder="Ex: Plată introdusă greșit / dublată, sumă eronată, tranzacție anulată de sponsor…"
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
};
