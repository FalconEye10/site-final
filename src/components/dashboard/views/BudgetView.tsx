/**
 * Budget & Financial Management.
 *
 * Board-only module covering the club's whole financial mandate: executive
 * KPIs, annual budget execution, per-project profitability, the transaction
 * register, monthly dues and an append-only audit trail — plus a full XLSX
 * export and an end-of-mandate archive routine.
 *
 * All styling is inherited from the dashboard shell's token system
 * (--adm-* variables and adm-* utility classes); this module introduces no
 * palette of its own.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  FileSpreadsheet,
  FolderKanban,
  History,
  LayoutDashboard,
  Loader2,
  Receipt,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react';

import { Modal, Panel, TextInput } from './budget/ui';
import { useBudgetData } from './budget/useBudgetData';
import { DuesRecord, currentMandateLabel } from './budget/types';
import { exportBudgetWorkbook } from './budget/exportWorkbook';
import { DashboardTab } from './budget/tabs/DashboardTab';
import { GeneralBudgetTab } from './budget/tabs/GeneralBudgetTab';
import { ProjectsTab } from './budget/tabs/ProjectsTab';
import { TransactionsTab } from './budget/tabs/TransactionsTab';
import { DuesTab } from './budget/tabs/DuesTab';
import { AuditTab } from './budget/tabs/AuditTab';

type TabId = 'dashboard' | 'general' | 'proiecte' | 'registru' | 'cotizatii' | 'audit';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard & KPI', icon: LayoutDashboard },
  { id: 'general', label: 'Buget General', icon: Wallet },
  { id: 'proiecte', label: 'Buget pe Proiecte', icon: FolderKanban },
  { id: 'registru', label: 'Registru Tranzacții', icon: Receipt },
  { id: 'cotizatii', label: 'Urmărire Cotizații', icon: Users },
  { id: 'audit', label: 'Audit Log', icon: History },
];

/**
 * Roles allowed into this module. In this app the board is stored as role
 * `admin` (the UI already labels that "Board Member") or `board`; explicit
 * function titles are accepted too so a Treasurer/Secretary record set up with
 * a descriptive role still resolves correctly.
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

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState('');
  const [archiving, setArchiving] = useState(false);

  const data = useBudgetData(allowed ? currentUserName : '');
  const mandate = useMemo(() => currentMandateLabel(), []);

  const activeMembers = useMemo(
    () => members.filter(member => normalize(member?.status) !== 'inactiv' && member?.id != null),
    [members]
  );

  /**
   * Mirror active members into the dues ledger so the matrix always has a row
   * per member. Guarded by a ref because `dues` updates via snapshot and would
   * otherwise re-trigger this effect mid-write.
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
      setActiveTab('dashboard');
    } catch (err) {
      console.error('[budget] archiving mandate failed', err);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-0 sm:p-2 md:p-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="adm-meta-label">Mandat {mandate} · Acces Board</span>
          <h1 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--adm-ink)' }}>
            Buget &amp; Management Financiar
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium" style={{ color: 'var(--adm-ink-dim)' }}>
            Evidența completă a veniturilor, cheltuielilor, proiectelor și cotizațiilor clubului.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="adm-btn-ghost" onClick={() => setArchiveOpen(true)}>
            <Archive className="h-3.5 w-3.5" /> Arhivează Mandatul
          </button>
          <button type="button" className="adm-btn-primary" onClick={handleExport}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Exportă Buget (.XLSX)
          </button>
        </div>
      </header>

      {data.error && (
        <div
          className="px-4 py-3 text-xs font-semibold"
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

      {/* Sub-navigation */}
      <nav
        className="flex gap-1 overflow-x-auto no-scrollbar whitespace-nowrap"
        style={{ borderBottom: '1px solid var(--adm-border)' }}
        role="tablist"
      >
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
              className="relative flex shrink-0 items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
              style={{ color: isActive ? 'var(--adm-ink)' : 'var(--adm-ink-faint)' }}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="budget-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5"
                  style={{ background: 'var(--theme-color, #89cff0)' }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Content */}
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
          {activeTab === 'dashboard' && <DashboardTab transactions={data.transactions} />}

          {activeTab === 'general' && (
            <GeneralBudgetTab
              lines={data.lines}
              transactions={data.transactions}
              onSave={data.saveLine}
              onDelete={data.deleteLine}
            />
          )}

          {activeTab === 'proiecte' && (
            <ProjectsTab
              projects={data.projects}
              transactions={data.transactions}
              onSave={data.saveProject}
              onDelete={data.deleteProject}
            />
          )}

          {activeTab === 'registru' && (
            <TransactionsTab
              transactions={data.transactions}
              projects={data.projects}
              currentUserName={currentUserName}
              onSave={data.saveTransaction}
              onDelete={data.deleteTransaction}
              onApprove={data.approveTransaction}
              onRevert={data.revertTransaction}
            />
          )}

          {activeTab === 'cotizatii' && <DuesTab dues={data.dues} onSaveMonth={data.saveDuesMonth} />}

          {activeTab === 'audit' && <AuditTab entries={data.audit} duesPayments={data.duesPayments} />}
        </motion.div>
      )}

      {/* Archive / fresh start */}
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
              className="adm-btn-ghost"
              onClick={() => {
                setArchiveOpen(false);
                setArchiveConfirm('');
              }}
            >
              Anulează
            </button>
            <button
              type="button"
              className="adm-btn-danger"
              onClick={handleArchive}
              disabled={archiving || archiveConfirm.trim().toUpperCase() !== 'ARHIVEAZĂ'}
            >
              {archiving ? 'Se arhivează…' : 'Confirmă arhivarea'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
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
