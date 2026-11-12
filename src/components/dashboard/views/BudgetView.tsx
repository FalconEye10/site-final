/**
 * Budget & Financial Management.
 *
 * Board-only module covering the club's whole financial mandate:
 * Executive Treasury Command Center with real-time balance banner,
 * quick action buttons, monthly cashflow analytics, project financial hub,
 * full transactions ledger, dues tracking matrix and an immutable audit trail.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  Check,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Loader2,
  Plus,
  Receipt,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';

import { Field, Modal, MoneyInput, Panel, Select, TextArea, TextInput } from './budget/ui';
import { useBudgetData } from './budget/useBudgetData';
import {
  DuesRecord,
  GENERAL_PROJECT_ID,
  PAYMENT_METHODS,
  Transaction,
  TxType,
  categoriesFor,
  currentMandateLabel,
  formatRON,
  isProjectLocked,
  roundRON,
} from './budget/types';
import { computeKpis, nextTransactionCode } from './budget/selectors';
import { exportBudgetWorkbook } from './budget/exportWorkbook';
import { DashboardTab } from './budget/tabs/DashboardTab';
import { ProjectsTab } from './budget/tabs/ProjectsTab';
import { TransactionsTab } from './budget/tabs/TransactionsTab';
import { AuditTab } from './budget/tabs/AuditTab';
import { processReceiptFile } from './budget/receiptUtils';
import { toast } from '../../ui/Toast';

type TabId = 'buget' | 'registru' | 'audit';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'buget', label: 'Buget & Proiecte', icon: LayoutDashboard },
  { id: 'registru', label: 'Registru Plăți & Bonuri', icon: Receipt },
  { id: 'audit', label: 'Audit Log', icon: History },
];

/**
 * Roles allowed into this module (Board / Admin only).
 */
const BOARD_ROLES = new Set([
  'admin',
  'board',
  'board member',
  'presedinte',
  'președinte',
  'president',
  'vicepresedinte',
  'vicepreședinte',
  'vice-president',
  'trezorier',
  'treasurer',
  'secretar',
  'secretary',
]);

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim();
}

function isBoardMember(user: any, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  return BOARD_ROLES.has(normalize(user?.role)) || BOARD_ROLES.has(normalize(user?.boardRole));
}

interface BudgetViewProps {
  isAdmin?: boolean;
  currentUserObj?: any;
  members?: any[];
}

export const BudgetView: React.FC<BudgetViewProps> = ({ isAdmin = false, currentUserObj, members = [] }) => {
  const allowed = isBoardMember(currentUserObj, isAdmin);
  const currentUserName = currentUserObj?.name || currentUserObj?.username || 'Board';

  const [activeTab, setActiveTab] = useState<TabId>('buget');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState('');
  const [archiving, setArchiving] = useState(false);

  // Global Quick Transaction Modal
  const [quickTxType, setQuickTxType] = useState<TxType | null>(null);
  const [quickDraft, setQuickDraft] = useState<Transaction | null>(null);
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
  const [savingQuick, setSavingQuick] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const data = useBudgetData(allowed ? currentUserName : '');
  const mandate = useMemo(() => currentMandateLabel(), []);
  const kpis = useMemo(() => computeKpis(data.transactions, data.duesPayments), [data.transactions, data.duesPayments]);

  const activeMembers = useMemo(
    () => members.filter(member => normalize(member?.status) !== 'inactiv' && member?.id != null),
    [members]
  );

  /**
   * Mirror active members into the dues ledger so the matrix always has a row per member.
   */
  const seedingDues = useRef(false);
  useEffect(() => {
    if (!allowed || data.loading || seedingDues.current || activeMembers.length === 0) return;

    const existing = new Set(data.dues.map(record => record.id));
    const missing = activeMembers.filter(member => !existing.has(String(member.id)));
    if (missing.length === 0) return;

    seedingDues.current = true;
    Promise.all(
      missing.map(member =>
        data.saveDues({
          id: String(member.id),
          memberName: member.name ?? 'Membru',
          boardRole: BOARD_ROLES.has(normalize(member.role)) ? member.role : '',
          months: Array(12).fill(0),
        } as DuesRecord)
      )
    )
      .catch(err => console.error('[budget] syncing members into dues failed', err))
      .finally(() => {
        seedingDues.current = false;
      });
  }, [allowed, data.loading, data.dues, activeMembers, data.saveDues]);

  if (!allowed) {
    return (
      <div className="p-6">
        <Panel className="mx-auto max-w-xl">
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <ShieldAlert className="h-12 w-12" style={{ color: 'var(--adm-acc-rose)', opacity: 0.7 }} />
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--adm-ink)' }}>
              Acces restricționat
            </h2>
            <p className="max-w-sm text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
              Modulul de Buget &amp; Management Financiar este disponibil exclusiv membrilor Board-ului
              (Președinte, Trezorier, Vicepreședinte, Secretar).
            </p>
            <span className="adm-meta-label">Cod eroare · RBAC-BOARD-403</span>
          </div>
        </Panel>
      </div>
    );
  }

  const handleExport = () => {
    exportBudgetWorkbook({
      mandate,
      transactions: data.transactions,
      projects: data.projects,
      lines: data.lines,
      dues: data.dues,
      audit: data.audit,
      duesPayments: data.duesPayments,
    });
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await data.archiveMandate(mandate);
      setArchiveOpen(false);
      setArchiveConfirm('');
      setActiveTab('buget');
    } catch (err) {
      console.error('[budget] archiving mandate failed', err);
    } finally {
      setArchiving(false);
    }
  };

  // Open Global Quick Action
  const openGlobalQuickTx = (type: TxType) => {
    setQuickErrors({});
    const initialTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: nextTransactionCode(data.transactions),
      date: new Date().toISOString().slice(0, 10),
      type,
      category: categoriesFor(type)[0],
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
    };
    setQuickDraft(initialTx);
    setQuickTxType(type);
  };

  const handleQuickFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickDraft) return;

    setUploadingReceipt(true);
    try {
      const processed = await processReceiptFile(file);
      setQuickDraft({
        ...quickDraft,
        receiptImage: processed.receiptImage,
        receiptType: 'image',
        documentUrl: processed.documentUrl,
      });
      toast.success(`Bonul a fost optimizat și atașat (${processed.sizeKb} KB).`);
    } catch (err) {
      toast.error('A apărut o problemă la optimizarea bonului.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const submitGlobalQuickTx = async () => {
    if (!quickDraft) return;
    const errs: Record<string, string> = {};

    if (!quickDraft.date) errs.date = 'Data este obligatorie.';
    if (!quickDraft.category.trim()) errs.category = 'Alege o categorie.';
    if (roundRON(quickDraft.amount) <= 0) errs.amount = 'Suma trebuie să fie mai mare decât 0 RON.';
    if (!quickDraft.source.trim()) errs.source = 'Specifică sursa, membrul sau beneficiarul.';

    if (quickDraft.projectId && quickDraft.projectId !== GENERAL_PROJECT_ID) {
      const selectedProject = data.projects.find(p => p.id === quickDraft.projectId);
      if (selectedProject && isProjectLocked(selectedProject, data.events)) {
        errs.projectId = 'Acest proiect este încheiat și arhivat. Nu se mai pot asocia tranzacții.';
      }
    }

    setQuickErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingQuick(true);
    try {
      const normalized: Transaction = {
        ...quickDraft,
        amount: roundRON(quickDraft.amount),
        notes: quickDraft.notes.trim(),
        source: quickDraft.source.trim(),
      };
      await data.saveTransaction(normalized);
      toast.success(
        `${normalized.type === 'venit' ? 'Venitul' : 'Plata'} (${formatRON(
          normalized.amount
        )} RON) a fost înregistrată cu succes!`
      );
      setQuickDraft(null);
      setQuickTxType(null);
    } catch (err) {
      toast.error('Eroare la salvarea tranzacției.');
    } finally {
      setSavingQuick(false);
    }
  };

  const netMandateResult = kpis.settledIncome - kpis.settledExpense;
  const isNetPositive = netMandateResult >= 0;

  return (
    <div className="flex flex-col gap-5 p-0 sm:p-2 md:p-6 font-anthropic">
      {/* ========================================================================= */}
      {/* TOP ACTION HEADER: COMMAND CENTER FINANCIAR (PERMANENT VIZIBIL)           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Real-time Financial Status Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-title block">
              Sold Disponibil Total
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`text-2xl sm:text-3xl font-black font-data leading-none ${
                  kpis.currentBalance >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                }`}
              >
                {formatRON(kpis.currentBalance)}
              </span>
              <span className="text-xs font-bold text-slate-500">RON</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              În mapă curent (cu tot cu cotizații): {formatRON(kpis.initialBalance)} RON
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:pl-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-title block">
              Rezultat Net Mandat
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`text-lg sm:text-xl font-bold font-data ${
                  isNetPositive ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                }`}
              >
                {isNetPositive ? '+' : ''}
                {formatRON(netMandateResult)} RON
              </span>
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:pl-6 text-xs text-slate-500 font-data flex flex-wrap gap-x-4 gap-y-0.5 xl:block xl:space-y-0.5">
            <div>
              Încasat:{' '}
              <strong className="text-emerald-800 dark:text-emerald-300">+{formatRON(kpis.settledIncome)} RON</strong>
            </div>
            <div>
              Plătit:{' '}
              <strong className="text-rose-800 dark:text-rose-300">−{formatRON(kpis.settledExpense)} RON</strong>
            </div>
          </div>
        </div>

        {/* 2 Global Quick Action Buttons + Utilities */}
        <div className="flex flex-wrap items-center gap-2.5 font-title">
          <button
            type="button"
            onClick={() => openGlobalQuickTx('venit')}
            className="px-3.5 py-2.5 rounded-[2px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>+ Înregistrează Venit</span>
          </button>

          <button
            type="button"
            onClick={() => openGlobalQuickTx('cheltuiala')}
            className="px-3.5 py-2.5 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>− Înregistrează Plată / Bon</span>
          </button>

          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block mx-1" />

          <button
            type="button"
            className="adm-btn-ghost text-xs font-bold uppercase tracking-wider py-2 px-3"
            onClick={handleExport}
            title="Descarcă întreg registrul în format Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-800 dark:text-emerald-300" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            type="button"
            className="adm-btn-ghost text-xs font-bold uppercase tracking-wider py-2 px-3 text-slate-500"
            onClick={() => setArchiveOpen(true)}
            title="Arhivează mandatul curent și pregătește registrele pentru noul an"
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Arhivare</span>
          </button>
        </div>
      </div>

      {data.error && (
        <div
          className="px-4 py-3 text-xs sm:text-sm font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--adm-acc-rose) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--adm-acc-rose) 30%, transparent)',
            color: 'var(--adm-acc-rose)',
            borderRadius: 2,
          }}
        >
          Sincronizarea cu baza de date a eșuat: {data.error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3 TAB-URI CLARE: BUGET & PROIECTE · REGISTRU · AUDIT LOG                  */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 font-title overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Rendering */}
      {data.loading ? (
        <div className="flex items-center justify-center gap-3 py-24" style={{ color: 'var(--adm-ink-faint)' }}>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Se încarcă datele financiare…</span>
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        >
          {activeTab === 'buget' && (
            <div className="space-y-6">
              <DashboardTab
                transactions={data.transactions}
                duesPayments={data.duesPayments}
              />
              <ProjectsTab
                projects={data.projects}
                transactions={data.transactions}
                events={data.events}
                currentUserName={currentUserName}
                onSave={data.saveProject}
                onDelete={data.deleteProject}
                onSaveTransaction={data.saveTransaction}
              />
            </div>
          )}

          {activeTab === 'registru' && (
            <TransactionsTab
              transactions={data.transactions}
              projects={data.projects}
              events={data.events}
              currentUserName={currentUserName}
              onSave={data.saveTransaction}
              onDelete={data.deleteTransaction}
              onApprove={data.approveTransaction}
              onRevert={data.revertTransaction}
            />
          )}

          {activeTab === 'audit' && <AuditTab entries={data.audit} duesPayments={data.duesPayments} />}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* GLOBAL QUICK TRANSACTION MODAL                                            */}
      {/* ========================================================================= */}
      {quickDraft && quickTxType && (
        <Modal
          open={Boolean(quickDraft)}
          title={quickTxType === 'venit' ? 'Înregistrează Venit Rapid' : 'Înregistrează Plată / Bon Rapid'}
          subtitle={`Operațiunea va fi salvată direct în Registru (Cod: ${quickDraft.code}) și soldul recalculat automat.`}
          onClose={() => {
            setQuickDraft(null);
            setQuickTxType(null);
          }}
          width="max-w-xl"
          footer={
            <>
              <button
                type="button"
                className="adm-btn-ghost text-xs font-bold uppercase tracking-wider"
                onClick={() => {
                  setQuickDraft(null);
                  setQuickTxType(null);
                }}
              >
                Anulează
              </button>
              <button
                type="button"
                className="adm-btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                onClick={submitGlobalQuickTx}
                disabled={savingQuick || uploadingReceipt}
              >
                <Check className="h-4 w-4" />
                {savingQuick ? 'Se salvează…' : 'Salvează Tranzacția'}
              </button>
            </>
          }
        >
          <div className="space-y-4 font-anthropic">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Data Tranzacției" required error={quickErrors.date}>
                <TextInput
                  type="date"
                  value={quickDraft.date}
                  onChange={e => setQuickDraft({ ...quickDraft, date: e.target.value })}
                />
              </Field>

              <Field label="Sumă (RON întregi)" required error={quickErrors.amount}>
                <MoneyInput
                  value={quickDraft.amount}
                  onChangeValue={val => setQuickDraft({ ...quickDraft, amount: val })}
                  placeholder="0"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Categorie" required error={quickErrors.category}>
                <Select
                  value={quickDraft.category}
                  onChange={e => setQuickDraft({ ...quickDraft, category: e.target.value })}
                >
                  {categoriesFor(quickDraft.type).map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Proiect Asociat" error={quickErrors.projectId}>
                <Select
                  value={quickDraft.projectId}
                  onChange={e => setQuickDraft({ ...quickDraft, projectId: e.target.value })}
                >
                  <option value={GENERAL_PROJECT_ID}>General (Fondul Clubului)</option>
                  {data.projects.map(p => {
                    const locked = isProjectLocked(p, data.events);
                    return (
                      <option key={p.id} value={p.id} disabled={locked}>
                        {p.name} {locked ? '• [Încheiat & Arhivat]' : ''}
                      </option>
                    );
                  })}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Sursă / Membru / Beneficiar" required error={quickErrors.source}>
                <TextInput
                  value={quickDraft.source}
                  onChange={e => setQuickDraft({ ...quickDraft, source: e.target.value })}
                  placeholder="ex. Popa Andrei (Decont), Sponsor SRL…"
                />
              </Field>

              <Field label="Metodă de Plată">
                <Select
                  value={quickDraft.paymentMethod || PAYMENT_METHODS[0]}
                  onChange={e => setQuickDraft({ ...quickDraft, paymentMethod: e.target.value })}
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Bon Upload Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-[2px] border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Bon Fiscal / Factură / Chitanță
                </span>
                {quickDraft.type === 'cheltuiala' && (
                  <span className="text-[11px] text-rose-500 font-semibold">* Recomandat pentru decont</span>
                )}
              </div>

              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-[2px] text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Upload className="h-4 w-4 text-sky-500" />
                <span>
                  {uploadingReceipt
                    ? 'Se optimizează bonul…'
                    : quickDraft.receiptImage
                    ? 'Înlocuiește bonul'
                    : 'Fă poză la bon / Încarcă fișier'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQuickFileUpload}
                  disabled={uploadingReceipt}
                  className="hidden"
                />
              </label>

              {quickDraft.receiptImage && (
                <div className="relative inline-flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-[2px] border border-slate-200 dark:border-slate-700">
                  <img
                    src={quickDraft.receiptImage}
                    alt="Preview Bon"
                    className="h-16 w-auto max-w-[120px] object-cover rounded-[2px] border border-slate-200 dark:border-slate-700"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Bon atașat</span>
                    <span className="text-[11px] text-slate-500">Optimizat canvas JPEG</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuickDraft({ ...quickDraft, receiptImage: '' })}
                    className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full ml-auto cursor-pointer"
                    title="Elimină bonul"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <Field label="Observații / Notă justificativă">
              <TextArea
                rows={2}
                value={quickDraft.notes}
                onChange={e => setQuickDraft({ ...quickDraft, notes: e.target.value })}
                placeholder="Detalii suplimentare, scop, număr de factură…"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Archive / Fresh start Modal */}
      <Modal
        open={archiveOpen}
        title={`Arhivează mandatul ${mandate}`}
        subtitle="Închide anul financiar și pregătește registrele pentru noul mandat."
        onClose={() => {
          setArchiveOpen(false);
          setArchiveConfirm('');
        }}
        width="max-w-lg"
        footer={
          <>
            <button
              type="button"
              className="adm-btn-ghost text-xs font-bold uppercase tracking-wider"
              onClick={() => {
                setArchiveOpen(false);
                setArchiveConfirm('');
              }}
            >
              Anulează
            </button>
            <button
              type="button"
              className="adm-btn-danger text-xs font-bold uppercase tracking-wider"
              onClick={handleArchive}
              disabled={archiving || archiveConfirm.trim().toUpperCase() !== 'ARHIVEAZĂ'}
            >
              {archiving ? 'Se arhivează…' : 'Confirmă arhivarea'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4 font-anthropic">
          <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--adm-ink-dim)' }}>
            Toate datele mandatului curent ({data.transactions.length} tranzacții, {data.projects.length}{' '}
            proiecte, {data.dues.length} fișe de cotizații) vor fi salvate într-o arhivă permanentă, apoi
            registrele active vor fi golite pentru noul an școlar.
          </p>

          <ul className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: 'var(--adm-ink-dim)' }}>
            <li>· Liniile bugetare se păstrează, cu sumele planificate resetate la 0.</li>
            <li>· Cotizațiile se resetează pentru toți membrii, păstrând numele și funcțiile.</li>
            <li>· Audit Log-ul nu se șterge niciodată — arhivarea este înregistrată în el.</li>
          </ul>

          <div
            className="px-3 py-2.5 text-xs font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--adm-acc-amber) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--adm-acc-amber) 30%, transparent)',
              color: 'var(--adm-ink)',
              borderRadius: 2,
            }}
          >
            Recomandare: exportă întâi fișierul .XLSX, ca să ai o copie locală înainte de resetare.
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="adm-meta-label">
              Scrie <strong style={{ color: 'var(--adm-ink)' }}>ARHIVEAZĂ</strong> pentru a confirma
            </span>
            <TextInput
              value={archiveConfirm}
              onChange={event => setArchiveConfirm(event.target.value)}
              placeholder="ARHIVEAZĂ"
              autoComplete="off"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};
