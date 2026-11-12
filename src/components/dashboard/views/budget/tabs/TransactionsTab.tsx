import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Badge,
  EmptyState,
  Field,
  Modal,
  MoneyInput,
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
  PAYMENT_METHODS,
  TX_STATUS_LABELS,
  TX_TYPE_LABELS,
  Transaction,
  TxStatus,
  TxType,
  categoriesFor,
  formatRON,
  isProjectLocked,
  roundRON,
} from '../types';
import { normalizeDiacritics } from '../../../../../utils/text';
import { computeRunningBalances, nextTransactionCode, projectName } from '../selectors';
import { processReceiptFile } from '../receiptUtils';
import { EventData } from '../../../../../utils/supabaseService';
import { toast } from '../../../../ui/Toast';

interface Props {
  transactions: Transaction[];
  projects: BudgetProject[];
  events?: EventData[];
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

type PeriodFilter = 'all' | 'this_month' | 'last_30' | 'this_quarter' | 'custom';

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

function exportTransactionsCSV(transactions: Transaction[], projects: BudgetProject[]) {
  try {
    const headers = [
      'Cod Tranzacție',
      'Data',
      'Tip',
      'Categorie',
      'Proiect',
      'Sumă (RON)',
      'Status',
      'Sursă / Membru / Beneficiar',
      'Metodă Plată',
      'Aprobat De',
      'Observații',
      'Link Dovadă',
    ];

    const rows = transactions.map(tx => [
      tx.code,
      tx.date,
      tx.type === 'venit' ? 'Venit' : 'Cheltuială',
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      `"${projectName(projects, tx.projectId).replace(/"/g, '""')}"`,
      tx.amount,
      TX_STATUS_LABELS[tx.status] || tx.status,
      `"${(tx.source || '').replace(/"/g, '""')}"`,
      `"${(tx.paymentMethod || 'Nespecificat').replace(/"/g, '""')}"`,
      `"${(tx.approvedBy || '').replace(/"/g, '""')}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
      `"${(tx.documentUrl || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Registru_Financiar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Registrul a fost exportat în format CSV.');
  } catch (err) {
    toast.error('Eroare la exportul registrului.');
  }
}

export const TransactionsTab: React.FC<Props> = ({
  transactions,
  projects,
  events = [],
  currentUserName,
  onSave,
  onDelete,
  onApprove,
  onRevert,
}) => {
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | TxType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Draft state
  const [draft, setDraft] = useState<Transaction | null>(null);
  const [original, setOriginal] = useState<Transaction | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isPhysicalReceipt, setIsPhysicalReceipt] = useState(false);

  // Modals state
  const [lightboxTx, setLightboxTx] = useState<Transaction | null>(null);
  const [viewVoucher, setViewVoucher] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<Transaction | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Quick Reassign Project from Lightbox
  const [reassigningProjectId, setReassigningProjectId] = useState<string>('');
  const [savingReassign, setSavingReassign] = useState(false);

  // Calculate live progressive running balance
  const runningBalances = useMemo(() => computeRunningBalances(transactions), [transactions]);

  const knownCategories = useMemo(
    () =>
      [
        ...new Set([
          ...categoriesFor('venit'),
          ...categoriesFor('cheltuiala'),
          ...transactions.map(tx => tx.category),
        ]),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'ro')),
    [transactions]
  );

  // Period Date Range calculation
  const dateRangeForPeriod = useMemo<{ start?: string; end?: string }>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (periodFilter === 'this_month') {
      const start = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
      const end = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);
      return { start, end };
    }
    if (periodFilter === 'last_30') {
      const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const end = now.toISOString().slice(0, 10);
      return { start, end };
    }
    if (periodFilter === 'this_quarter') {
      const quarterIndex = Math.floor(currentMonth / 3);
      const start = new Date(currentYear, quarterIndex * 3, 1).toISOString().slice(0, 10);
      const end = new Date(currentYear, (quarterIndex + 1) * 3, 0).toISOString().slice(0, 10);
      return { start, end };
    }
    if (periodFilter === 'custom') {
      return { start: fromDate || undefined, end: toDate || undefined };
    }
    return {};
  }, [periodFilter, fromDate, toDate]);

  // Filtered transactions list
  const filtered = useMemo(() => {
    const term = normalizeDiacritics(search);

    return transactions
      .filter(tx => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (projectFilter !== 'all' && (tx.projectId || GENERAL_PROJECT_ID) !== projectFilter) return false;

        // Period filter
        if (dateRangeForPeriod.start && tx.date < dateRangeForPeriod.start) return false;
        if (dateRangeForPeriod.end && tx.date > dateRangeForPeriod.end) return false;

        if (!term) return true;

        const prjName = projectName(projects, tx.projectId);
        return [
          tx.code,
          tx.category,
          tx.source,
          tx.notes,
          tx.approvedBy,
          tx.paymentMethod,
          prjName,
          String(tx.amount),
        ]
          .filter(Boolean)
          .some(field => normalizeDiacritics(String(field)).includes(term));
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [
    transactions,
    projects,
    search,
    typeFilter,
    statusFilter,
    categoryFilter,
    projectFilter,
    dateRangeForPeriod,
  ]);

  const filteredStats = useMemo(() => {
    return filtered.reduce(
      (acc, tx) => {
        if (tx.status === 'respins' || tx.status === 'anulata') return acc;
        if (tx.type === 'venit') {
          acc.income += Number(tx.amount) || 0;
          if (tx.status === 'platit') acc.settledIncome += Number(tx.amount) || 0;
        } else {
          acc.expense += Number(tx.amount) || 0;
          if (tx.status === 'platit') acc.settledExpense += Number(tx.amount) || 0;
        }
        return acc;
      },
      { income: 0, expense: 0, settledIncome: 0, settledExpense: 0 }
    );
  }, [filtered]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (periodFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (projectFilter !== 'all') count++;
    return count;
  }, [search, periodFilter, typeFilter, statusFilter, categoryFilter, projectFilter]);

  const resetFilters = () => {
    setSearch('');
    setPeriodFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setProjectFilter('all');
    setFromDate('');
    setToDate('');
  };

  const openCreate = (initialType: TxType = 'venit') => {
    setOriginal(undefined);
    setErrors({});
    setIsPhysicalReceipt(false);
    setDraft({
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: nextTransactionCode(transactions),
      date: todayISO(),
      type: initialType,
      category: categoriesFor(initialType)[0],
      projectId: GENERAL_PROJECT_ID,
      amount: 0,
      status: 'platit',
      source: '',
      documentUrl: '',
      receiptImage: '',
      receiptType: 'url',
      paymentMethod: 'Transfer Bancar',
      approvedBy: currentUserName || 'Board',
      notes: '',
    });
  };

  const openEdit = (tx: Transaction) => {
    if (tx.projectId && tx.projectId !== GENERAL_PROJECT_ID) {
      const parentPrj = projects.find(p => p.id === tx.projectId);
      if (parentPrj && isProjectLocked(parentPrj, events)) {
        toast.error('Proiectul asociat este încheiat și arhivat. Operațiunile financiare ale proiectului nu mai pot fi modificate.');
        return;
      }
    }
    setOriginal(tx);
    setErrors({});
    setIsPhysicalReceipt(tx.receiptType === 'physical');
    setDraft({ ...tx });
  };

  const handleReceiptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Fișierul este prea mare (maxim 15MB).');
      return;
    }

    setUploadingReceipt(true);
    try {
      const processed = await processReceiptFile(file);
      if (draft) {
        setDraft({
          ...draft,
          receiptImage: processed.receiptImage,
          receiptType: 'image',
          documentUrl: processed.documentUrl,
        });
        toast.success(`Dovada a fost optimizată și atașată (${processed.sizeKb} KB).`);
      }
    } catch (err) {
      toast.error('A apărut o problemă la procesarea bonului.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const validate = (tx: Transaction): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!tx.date) errs.date = 'Data este obligatorie.';
    if (!tx.category.trim()) errs.category = 'Alege o categorie.';
    if (!Number.isFinite(tx.amount) || roundRON(tx.amount) <= 0)
      errs.amount = 'Suma trebuie să fie mai mare decât 0 RON.';
    if (!tx.source.trim()) errs.source = 'Specifică membrul, sponsorul sau beneficiarul.';

    // Check proof rules for expense
    if (tx.type === 'cheltuiala') {
      if (!isPhysicalReceipt && !tx.receiptImage && !tx.documentUrl.trim()) {
        errs.documentUrl = 'Atașează un link către document, încarcă poza sau bifează chitanță fizică.';
      } else if (tx.documentUrl.trim() && !isValidUrl(tx.documentUrl) && !tx.receiptImage && !isPhysicalReceipt) {
        errs.documentUrl = 'Introdu un link valid (http:// sau https://) sau bifează chitanță fizică.';
      }
    } else if (tx.documentUrl.trim() && !isValidUrl(tx.documentUrl) && !tx.receiptImage) {
      errs.documentUrl = 'Introdu un link valid (http:// sau https://).';
    }

    return errs;
  };

  const submit = async () => {
    if (!draft) return;

    const normalized: Transaction = {
      ...draft,
      amount: roundRON(draft.amount),
      source: draft.source.trim(),
      documentUrl: isPhysicalReceipt ? 'Chitanță fizică la dosar' : draft.documentUrl.trim(),
      receiptType: isPhysicalReceipt ? 'physical' : draft.receiptImage ? 'image' : 'url',
      notes: draft.notes.trim(),
      approvedBy: draft.status === 'platit' ? draft.approvedBy || currentUserName || 'Board' : draft.approvedBy,
    };

    const foundErrors = validate(normalized);
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) return;

    setSaving(true);
    try {
      await onSave(normalized, original);
      toast.success(
        original
          ? `Tranzacția ${normalized.code} a fost actualizată.`
          : `Tranzacția ${normalized.code} (${formatRON(normalized.amount)} RON) a fost înregistrată!`
      );
      setDraft(null);
    } catch (err: any) {
      toast.error('A apărut o problemă la salvarea tranzacției.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.projectId && pendingDelete.projectId !== GENERAL_PROJECT_ID) {
      const parentPrj = projects.find(p => p.id === pendingDelete.projectId);
      if (parentPrj && isProjectLocked(parentPrj, events)) {
        toast.error('Proiectul asociat este încheiat și arhivat. Operațiunile financiare ale proiectului nu pot fi șterse.');
        setPendingDelete(null);
        return;
      }
    }
    setDeleting(true);
    try {
      await onDelete(pendingDelete);
      toast.success(`Tranzacția ${pendingDelete.code} a fost ștearsă.`);
      setPendingDelete(null);
    } catch (err) {
      toast.error('Eroare la ștergerea tranzacției.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReassignProject = async (tx: Transaction, targetProjectId: string) => {
    if (tx.projectId === targetProjectId) return;

    // Check if current project is locked
    if (tx.projectId && tx.projectId !== GENERAL_PROJECT_ID) {
      const currentPrj = projects.find(p => p.id === tx.projectId);
      if (currentPrj && isProjectLocked(currentPrj, events)) {
        toast.error('Proiectul curent este încheiat și arhivat. Bonul nu mai poate fi mutat.');
        return;
      }
    }

    // Check if target project is locked
    if (targetProjectId && targetProjectId !== GENERAL_PROJECT_ID) {
      const targetPrj = projects.find(p => p.id === targetProjectId);
      if (targetPrj && isProjectLocked(targetPrj, events)) {
        toast.error('Proiectul țintă este încheiat și arhivat. Nu se pot transfera bonuri către el.');
        return;
      }
    }

    setSavingReassign(true);
    try {
      const updatedTx: Transaction = {
        ...tx,
        projectId: targetProjectId,
      };
      await onSave(updatedTx, tx);
      const targetName = projectName(projects, targetProjectId);
      toast.success(`Bonul ${tx.code} a fost repartizat către: „${targetName}”!`);
      if (lightboxTx && lightboxTx.id === tx.id) {
        setLightboxTx(updatedTx);
      }
    } catch (err) {
      toast.error('Eroare la repartizarea bonului.');
    } finally {
      setSavingReassign(false);
    }
  };

  const submitRevert = async () => {
    if (!pendingRevert || !revertReason.trim()) return;
    setReverting(true);
    try {
      await onRevert(pendingRevert, revertReason.trim());
      toast.success(`Tranzacția ${pendingRevert.code} a fost anulată (revertată).`);
      setPendingRevert(null);
      setRevertReason('');
    } catch (err) {
      toast.error('Eroare la anularea tranzacției.');
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
      category: allowed.includes(draft.category) ? draft.category : allowed[0],
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Register Panel */}
      <Panel
        title="Registru Tranzacții & Deconturi"
        subtitle={`${filtered.length} din ${transactions.length} mișcări afișate · Sold selecție: ${formatRON(filteredStats.settledIncome - filteredStats.settledExpense)} RON`}
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="adm-btn-ghost text-xs font-bold uppercase tracking-wider py-1.5 px-3"
              onClick={() => exportTransactionsCSV(filtered, projects)}
              title="Descarcă registrul curent în format CSV"
            >
              <Download className="h-3.5 w-3.5" /> Exportă CSV
            </button>
            <button
              type="button"
              className="adm-btn-primary text-xs font-bold uppercase tracking-wider py-1.5 px-3"
              onClick={() => openCreate('venit')}
            >
              <Plus className="h-3.5 w-3.5" /> Tranzacție Nouă
            </button>
          </div>
        }
      >
        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 p-4 bg-slate-50/50 dark:bg-slate-900/30" style={{ borderBottom: '1px solid var(--adm-border)' }}>
          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 font-title">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Perioadă:
              </span>
              {(
                [
                  { id: 'all', label: 'Tot Mandatul' },
                  { id: 'this_month', label: 'Luna Aceasta' },
                  { id: 'last_30', label: 'Ultimele 30 Zile' },
                  { id: 'this_quarter', label: 'Trimestrul Curent' },
                  { id: 'custom', label: 'Personalizat' },
                ] as const
              ).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id)}
                  className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all ${
                    periodFilter === p.id
                      ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-sky-500 hover:text-sky-600 transition-colors"
              >
                <X className="h-3 w-3" /> Resetează ({activeFiltersCount} filtre)
              </button>
            )}
          </div>

          {/* Search and Secondary Dropdowns */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: 'var(--adm-ink-faint)' }}
              />
              <TextInput
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Caută după cod, membru, categorie, notițe…"
                className="!pl-9"
              />
            </div>

            <Select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'all' | TxType)}>
              <option value="all">Toate tipurile (Venit / Cheltuială)</option>
              <option value="venit">Doar Venituri (+)</option>
              <option value="cheltuiala">Doar Cheltuieli / Deconturi (−)</option>
            </Select>

            <Select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | TxStatus)}>
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
              <option value={GENERAL_PROJECT_ID}>General (Fond Club)</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Custom Date Pickers (Shown if 'custom' period is active) */}
          {periodFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500">Interval:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs">De la:</span>
                <TextInput
                  type="date"
                  value={fromDate}
                  onChange={event => setFromDate(event.target.value)}
                  className="!py-1 !px-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">Până la:</span>
                <TextInput
                  type="date"
                  value={toDate}
                  onChange={event => setToDate(event.target.value)}
                  className="!py-1 !px-2 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <TableWrap className="[&_table]:min-w-[1180px]">
          <thead className="adm-table-head">
            <tr>
              <Th>ID</Th>
              <Th>Data</Th>
              <Th>Tip</Th>
              <Th>Categorie</Th>
              <Th>Proiect</Th>
              <Th align="right">Sumă</Th>
              <Th align="right">Sold Progresiv</Th>
              <Th>Status</Th>
              <Th>Sursă / Membru</Th>
              <Th>Metodă</Th>
              <Th align="center">Dovadă</Th>
              <Th align="right">Acțiuni</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyState
                colSpan={12}
                icon={<Receipt className="h-10 w-10" />}
                title={activeFiltersCount > 0 ? 'Nicio tranzacție conform filtrelor' : 'Registrul este gol'}
                description={
                  activeFiltersCount > 0
                    ? 'Ajustează filtrele sau apasă pe „Resetează filtrele” pentru a vedea toate înregistrările.'
                    : 'Adaugă prima mișcare financiară pentru a începe evidența contabilă a mandatului.'
                }
                action={
                  activeFiltersCount > 0 ? (
                    <button type="button" className="adm-btn-ghost" onClick={resetFilters}>
                      Resetează filtrele
                    </button>
                  ) : (
                    <button type="button" className="adm-btn-primary" onClick={() => openCreate('venit')}>
                      <Plus className="h-3.5 w-3.5" /> Adaugă Prima Tranzacție
                    </button>
                  )
                }
              />
            ) : (
              filtered.map(tx => {
                const progressiveBalance = runningBalances.get(tx.id);
                const isExpense = tx.type === 'cheltuiala';
                const hasProof = Boolean(tx.receiptImage || tx.documentUrl);

                return (
                  <tr
                    key={tx.id}
                    className="adm-table-row hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <Td>
                      <span className="adm-meta-label font-mono font-bold" style={{ color: 'var(--adm-ink-dim)' }}>
                        {tx.code}
                      </span>
                    </Td>
                    <Td numeric>{tx.date}</Td>
                    <Td>
                      <Badge
                        label={TX_TYPE_LABELS[tx.type]}
                        color={!isExpense ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)'}
                        icon={!isExpense ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      />
                    </Td>
                    <Td className="font-semibold">{tx.category}</Td>
                    <Td style={{ color: 'var(--adm-ink-dim)' }}>{projectName(projects, tx.projectId)}</Td>
                    <Td
                      numeric
                      align="right"
                      className="font-bold text-sm"
                      style={{ color: !isExpense ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)' }}
                    >
                      {!isExpense ? '+' : '−'}
                      {formatRON(tx.amount)} RON
                    </Td>
                    <Td numeric align="right" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {tx.status === 'platit' && progressiveBalance !== undefined ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-[2px] ${
                            progressiveBalance >= 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {formatRON(progressiveBalance)} RON
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge label={TX_STATUS_LABELS[tx.status]} color={STATUS_COLORS[tx.status]} />
                    </Td>
                    <Td className="max-w-[160px] truncate" title={tx.source}>
                      {tx.source || '—'}
                    </Td>
                    <Td className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {tx.paymentMethod || '—'}
                    </Td>
                    <Td align="center">
                      {hasProof ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold font-title hover:brightness-105 transition-all cursor-pointer shadow-2xs"
                          onClick={() => setLightboxTx(tx)}
                          title="Vezi bonul fiscal / dovada justificativă"
                        >
                          {tx.receiptImage ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                          <span>Vezi Bon</span>
                        </button>
                      ) : (
                        <span style={{ color: 'var(--adm-ink-faint)' }}>—</span>
                      )}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Voucher */}
                        <button
                          type="button"
                          className="adm-icon-btn"
                          aria-label={`Vezi fișa ${tx.code}`}
                          title="Vizualizează chitanța / fișa completă"
                          onClick={() => setViewVoucher(tx)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Quick Approve */}
                        {tx.status === 'asteptare' && (
                          <button
                            type="button"
                            className="adm-icon-btn"
                            aria-label={`Aprobă ${tx.code}`}
                            title="Aprobă tranzacția"
                            onClick={() => onApprove(tx)}
                            style={{ color: 'var(--adm-acc-emerald)' }}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        {/* Revert */}
                        {tx.status !== 'anulata' && (
                          <button
                            type="button"
                            className="adm-icon-btn"
                            aria-label={`Revert ${tx.code}`}
                            title="Revert (Anulare contabilă motivată)"
                            onClick={() => setPendingRevert(tx)}
                            style={{ color: 'var(--adm-acc-amber)' }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          type="button"
                          className="adm-icon-btn"
                          aria-label={`Editează ${tx.code}`}
                          title="Editează"
                          onClick={() => openEdit(tx)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          className="adm-icon-btn hover:text-rose-500"
                          aria-label={`Șterge ${tx.code}`}
                          title="Șterge definitiv"
                          onClick={() => setPendingDelete(tx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableWrap>
      </Panel>

      {/* ========================================================================= */}
      {/* 3. Modal: Add / Edit Transaction                                          */}
      {/* ========================================================================= */}
      <Modal
        open={draft !== null}
        title={original ? `Editează Tranzacția ${original.code}` : 'Tranzacție Financiară Nouă'}
        subtitle="Înregistrează o încasare sau un decont de cheltuieli în evidența mandatului."
        onClose={() => setDraft(null)}
        width="max-w-2xl"
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setDraft(null)}>
              Anulează
            </button>
            <button type="button" className="adm-btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Se salvează…' : original ? 'Salvează modificările' : 'Înregistrează tranzacția'}
            </button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            {/* Segmented Type Picker */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => changeType('venit')}
                className={`flex items-center justify-center gap-2 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  draft.type === 'venit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" /> Venit / Încasare (+)
              </button>
              <button
                type="button"
                onClick={() => changeType('cheltuiala')}
                className={`flex items-center justify-center gap-2 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  draft.type === 'cheltuiala'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownRight className="h-4 w-4" /> Cheltuială / Decont (−)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ID Tranzacție">
                <TextInput value={draft.code} readOnly disabled className="font-mono bg-slate-100 dark:bg-slate-800" />
              </Field>

              <Field label="Data Efectuării" required error={errors.date}>
                <TextInput
                  type="date"
                  value={draft.date}
                  onChange={event => setDraft({ ...draft, date: event.target.value })}
                />
              </Field>

              <Field label="Sumă (RON întregi)" required error={errors.amount}>
                <MoneyInput
                  value={draft.amount}
                  onChangeValue={val => setDraft({ ...draft, amount: val })}
                  placeholder="0"
                />
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

              <Field label="Proiect Asociat" required>
                <Select
                  value={draft.projectId}
                  onChange={event => setDraft({ ...draft, projectId: event.target.value })}
                >
                  <option value={GENERAL_PROJECT_ID}>General (Fondul Clubului)</option>
                  {projects.map(project => {
                    const locked = isProjectLocked(project, events);
                    return (
                      <option key={project.id} value={project.id} disabled={locked}>
                        {project.name} {locked ? '• [Încheiat & Arhivat]' : ''}
                      </option>
                    );
                  })}
                </Select>
              </Field>

              <Field label="Metodă de Plată">
                <Select
                  value={draft.paymentMethod || PAYMENT_METHODS[0]}
                  onChange={event => setDraft({ ...draft, paymentMethod: event.target.value })}
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Sursă / Membru / Beneficiar" required error={errors.source} className="sm:col-span-2">
                <TextInput
                  value={draft.source}
                  onChange={event => setDraft({ ...draft, source: event.target.value })}
                  placeholder="ex. Popa Andrei (Decont cazare) / SC Exemplu SRL (Sponsorizare)"
                />
              </Field>

              {/* Proof / Receipt Attachment Section */}
              <div className="sm:col-span-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-[2px] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Dovadă / Chitanță / Bon Fiscal {draft.type === 'cheltuiala' && <span className="text-rose-500">*</span>}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPhysicalReceipt}
                      onChange={e => setIsPhysicalReceipt(e.target.checked)}
                      className="rounded text-sky-500"
                    />
                    <span>Chitanță fizică / Decont semnat la dosar</span>
                  </label>
                </div>

                {!isPhysicalReceipt && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Link Google Drive / Cloud" error={errors.documentUrl} hint="Link către factura PDF sau poza chitanței">
                      <TextInput
                        type="url"
                        value={draft.documentUrl}
                        onChange={event => setDraft({ ...draft, documentUrl: event.target.value })}
                        placeholder="https://drive.google.com/…"
                      />
                    </Field>

                    <Field label="Sau Încarcă Bon / Factură" hint="Optimizat automat canvas la max 1200px JPEG">
                      <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-[2px] text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <Upload className="h-4 w-4 text-sky-500" />
                        <span>
                          {uploadingReceipt
                            ? 'Se optimizează bonul…'
                            : draft.receiptImage
                            ? 'Înlocuiește bonul'
                            : 'Fă poză / Încarcă fișier'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptFileUpload}
                          disabled={uploadingReceipt}
                          className="hidden"
                        />
                      </label>
                    </Field>
                  </div>
                )}

                {draft.receiptImage && !isPhysicalReceipt && (
                  <div className="relative inline-flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-[2px] border border-slate-200 dark:border-slate-700">
                    <img
                      src={draft.receiptImage}
                      alt="Preview Bon"
                      className="h-16 w-auto max-w-[120px] object-cover rounded-[2px] border border-slate-200 dark:border-slate-700"
                    />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Bon atașat cu succes</span>
                      <span className="text-[11px] text-slate-500 block">Optimizat și gata de salvare</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, receiptImage: '' })}
                      className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full ml-2"
                      title="Elimină bonul"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <Field label="Status Tranzacție" required>
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

              <Field label="Aprobat / Procesat de">
                <TextInput
                  value={draft.approvedBy}
                  onChange={event => setDraft({ ...draft, approvedBy: event.target.value })}
                  placeholder={currentUserName || 'Board'}
                />
              </Field>

              <Field label="Observații / Detalii Decont" className="sm:col-span-2">
                <TextArea
                  rows={2}
                  value={draft.notes}
                  onChange={event => setDraft({ ...draft, notes: event.target.value })}
                  placeholder="Scopul cheltuielii, număr de factură, detalii transfer bancar…"
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 3.5 Modal: Lightbox Bon Fiscal & Document Justificativ                    */}
      {/* ========================================================================= */}
      {lightboxTx && (
        <Modal
          open={Boolean(lightboxTx)}
          title={`Bon Fiscal / Document Justificativ • ${lightboxTx.code}`}
          subtitle={`${lightboxTx.type === 'venit' ? 'Venit' : 'Plată'} • ${formatRON(lightboxTx.amount)} RON • ${projectName(projects, lightboxTx.projectId)}`}
          onClose={() => setLightboxTx(null)}
          width="max-w-2xl"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <span className="text-xs text-slate-500 font-data">
                Dată: {lightboxTx.date} · Aprobator: {lightboxTx.approvedBy || 'Board'}
              </span>
              <div className="flex items-center gap-2">
                {lightboxTx.receiptImage && (
                  <button
                    type="button"
                    className="adm-btn-ghost text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = lightboxTx.receiptImage!;
                      link.download = `Bon_${lightboxTx.code}.jpg`;
                      link.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Descarcă Bonul
                  </button>
                )}
                <button
                  type="button"
                  className="adm-btn-primary text-xs font-bold uppercase tracking-wider"
                  onClick={() => setLightboxTx(null)}
                >
                  Închide
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 font-anthropic">
            {lightboxTx.receiptImage ? (
              <div className="flex flex-col items-center justify-center p-3 bg-slate-900/10 dark:bg-slate-950/50 rounded-[2px] border border-slate-200 dark:border-slate-800">
                <img
                  src={lightboxTx.receiptImage}
                  alt={`Bon ${lightboxTx.code}`}
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-[2px] shadow-sm cursor-zoom-in"
                  onClick={() => window.open(lightboxTx.receiptImage, '_blank')}
                  title="Fă clic pentru a deschide la rezoluție maximă"
                />
                <span className="mt-2 text-[11px] text-slate-400">
                  Fă clic pe imagine pentru a o deschide separat
                </span>
              </div>
            ) : isValidUrl(lightboxTx.documentUrl) ? (
              <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-[2px] border border-slate-200 dark:border-slate-800">
                <FileText className="h-10 w-10 text-sky-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Documentul justificativ este stocat pe un link extern (Google Drive / Cloud).
                </p>
                <a
                  href={lightboxTx.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="adm-btn-primary inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                >
                  <LinkIcon className="h-4 w-4" /> Deschide Documentul în Tab Nou
                </a>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                {lightboxTx.documentUrl || 'Chitanță fizică înregistrată la dosar.'}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-[2px] border border-slate-200 dark:border-slate-800 text-xs font-data">
              <div>
                <span className="text-slate-500 block">Sumă</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatRON(lightboxTx.amount)} RON</span>
              </div>
              <div>
                <span className="text-slate-500 block">Categorie</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{lightboxTx.category}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Metodă Plată</span>
                <span className="font-bold text-slate-900 dark:text-white">{lightboxTx.paymentMethod || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sursă / Beneficiar</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{lightboxTx.source || '—'}</span>
              </div>
            </div>

            {lightboxTx.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-[2px] border border-slate-200 dark:border-slate-800">
                Observații: {lightboxTx.notes}
              </p>
            )}

            {/* Quick Reallocate / Repartizează Proiect */}
            <div className="p-3 bg-sky-50/60 dark:bg-sky-950/30 rounded-[2px] border border-sky-200 dark:border-sky-800/60 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title flex items-center justify-between">
                <span>Repartizare Bon pe Buget de Proiect</span>
                <span className="text-[11px] font-normal text-slate-500 font-data">
                  Curent: <strong>{projectName(projects, lightboxTx.projectId)}</strong>
                </span>
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={reassigningProjectId || lightboxTx.projectId || GENERAL_PROJECT_ID}
                  onChange={e => setReassigningProjectId(e.target.value)}
                  className="text-xs flex-1"
                >
                  <option value={GENERAL_PROJECT_ID}>General (Fondul Clubului - Fără proiect)</option>
                  {projects.map(p => {
                    const locked = isProjectLocked(p, events);
                    return (
                      <option key={p.id} value={p.id} disabled={locked}>
                        {p.name} {locked ? '• [Încheiat & Arhivat]' : ''}
                      </option>
                    );
                  })}
                </Select>
                <button
                  type="button"
                  onClick={() => handleReassignProject(lightboxTx, reassigningProjectId || lightboxTx.projectId || GENERAL_PROJECT_ID)}
                  disabled={savingReassign || (reassigningProjectId === lightboxTx.projectId && !reassigningProjectId)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-[2px] text-xs font-bold font-title uppercase tracking-wider cursor-pointer transition-colors shrink-0"
                >
                  {savingReassign ? 'Se mută…' : 'Repartizează'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 4. Modal: View Digital Voucher / Fișă Tranzacție                         */}
      {/* ========================================================================= */}
      <Modal
        open={viewVoucher !== null}
        title={`Fișă Tranzacție ${viewVoucher?.code || ''}`}
        subtitle="Dispoziție oficială și document justificativ din registrul financiar al clubului."
        onClose={() => setViewVoucher(null)}
        width="max-w-xl"
        footer={
          <>
            <button
              type="button"
              className="adm-btn-ghost"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="h-4 w-4" /> Printează Fișa
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={() => {
                if (viewVoucher) {
                  openEdit(viewVoucher);
                  setViewVoucher(null);
                }
              }}
            >
              <Pencil className="h-4 w-4" /> Editează
            </button>
          </>
        }
      >
        {viewVoucher && (
          <div className="space-y-4">
            {/* Header Voucher Card */}
            <div
              className="p-4 rounded-[2px] border text-center flex flex-col items-center justify-center gap-1"
              style={{
                background:
                  viewVoucher.type === 'venit'
                    ? 'color-mix(in srgb, var(--adm-acc-emerald) 8%, transparent)'
                    : 'color-mix(in srgb, var(--adm-acc-rose) 8%, transparent)',
                borderColor:
                  viewVoucher.type === 'venit'
                    ? 'color-mix(in srgb, var(--adm-acc-emerald) 30%, transparent)'
                    : 'color-mix(in srgb, var(--adm-acc-rose) 30%, transparent)',
              }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {viewVoucher.type === 'venit' ? 'Încasare / Venit Fonduri' : 'Dispoziție de Plată / Decont'}
              </span>
              <div
                className="text-3xl font-extrabold font-data tracking-tight"
                style={{
                  color: viewVoucher.type === 'venit' ? 'var(--adm-acc-emerald)' : 'var(--adm-acc-rose)',
                }}
              >
                {viewVoucher.type === 'venit' ? '+' : '−'}
                {formatRON(viewVoucher.amount)} RON
              </div>
              <Badge label={TX_STATUS_LABELS[viewVoucher.status]} color={STATUS_COLORS[viewVoucher.status]} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2px] border border-slate-200 dark:border-slate-800 font-anthropic">
              <div>
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Cod:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{viewVoucher.code}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Data:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewVoucher.date}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Categorie:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewVoucher.category}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Proiect:</span>
                <span className="font-bold text-slate-900 dark:text-white">{projectName(projects, viewVoucher.projectId)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Sursă / Membru:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewVoucher.source || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Metodă Plată:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewVoucher.paymentMethod || 'Nespecificat'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Aprobat / Procesat de:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewVoucher.approvedBy || 'Board'}</span>
              </div>
              {viewVoucher.notes && (
                <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Observații:</span>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewVoucher.notes}</p>
                </div>
              )}
            </div>

            {/* Proof Section */}
            {(viewVoucher.receiptImage || viewVoucher.documentUrl) && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Dovadă Justificativă:
                </span>
                {viewVoucher.receiptImage ? (
                  <div className="mt-2 text-center">
                    <img
                      src={viewVoucher.receiptImage}
                      alt="Dovadă Chitanță"
                      className="max-h-64 mx-auto object-contain rounded-[2px] border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                ) : isValidUrl(viewVoucher.documentUrl) ? (
                  <a
                    href={viewVoucher.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-500 hover:text-sky-600 underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" /> Deschide Documentul Justificativ ({viewVoucher.documentUrl})
                  </a>
                ) : (
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {viewVoucher.documentUrl}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 5. Modal: Delete Confirmation                                             */}
      {/* ========================================================================= */}
      <Modal
        open={pendingDelete !== null}
        title="Confirmă Ștergerea Tranzacției"
        onClose={() => setPendingDelete(null)}
        width="max-w-md"
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Anulează
            </button>
            <button type="button" className="adm-btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" /> {deleting ? 'Se șterge…' : 'Șterge definitiv'}
            </button>
          </>
        }
      >
        {pendingDelete && (
          <div className="space-y-3">
            <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
              Ești sigur că vrei să elimini tranzacția <strong style={{ color: 'var(--adm-ink)' }}>{pendingDelete.code}</strong> (
              {formatRON(pendingDelete.amount)} RON — {pendingDelete.category})?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tranzacția va fi ștearsă imediat din registru și soldul va fi recalculat automat.
              Operațiunea de ștergere este înregistrată permanent în Audit Log.
            </p>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 6. Modal: Revert Confirmation                                             */}
      {/* ========================================================================= */}
      <Modal
        open={pendingRevert !== null}
        title="Revert Tranzacție"
        subtitle="Tranzacția rămâne vizibilă în registru cu statusul „Anulată (Revert)”, fără a mai fi calculată la sold."
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
              <RotateCcw className="h-3.5 w-3.5" /> {reverting ? 'Se procesează…' : 'Confirmă Anularea'}
            </button>
          </>
        }
      >
        {pendingRevert && (
          <div className="space-y-4">
            <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
              Tranzacția <strong style={{ color: 'var(--adm-ink)' }}>{pendingRevert.code}</strong> (
              {formatRON(pendingRevert.amount)} RON — {pendingRevert.category}) va fi marcată drept anulată.
            </p>
            <Field label="Motiv Anulare / Revert" required hint="Specifică de ce această tranzacție este invalidată.">
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
    </div>
  );
};
