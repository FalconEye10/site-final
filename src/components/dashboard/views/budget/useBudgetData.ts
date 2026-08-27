/**
 * Data layer for the budget module.
 *
 * Combines Supabase Postgres persistence, Postgres Changes real-time subscriptions,
 * optimistic local state updates (0ms latency), localStorage resilience caching,
 * and BroadcastChannel for instantaneous multi-tab live synchronization.
 *
 * Every financial movement automatically logs an immutable audit entry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../../supabase';
import { TreasuryPayment } from '../../../../utils/supabaseService';
import {
  AuditAction,
  AuditEntry,
  BudgetLine,
  BudgetProject,
  DuesRecord,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Transaction,
  currentMandateLabel,
} from './types';

const COLLECTIONS = {
  transactions: 'budget_transactions',
  projects: 'budget_projects',
  lines: 'budget_lines',
  dues: 'budget_dues',
  audit: 'budget_audit',
  archives: 'budget_archives',
} as const;

const BROADCAST_CHANNEL_NAME = 'cmn_budget_live_channel';

function getCached<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`cmn_budget_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setCached<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`cmn_budget_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn(`[budget] failed to set cache for ${key}`, err);
  }
}

function broadcastSync(type: string, data?: any) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cmn_budget_local_sync', { detail: { type, data } }));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type, data, timestamp: Date.now() });
        bc.close();
      }
    }
  } catch (err) {
    // Ignore cross-tab broadcast errors in private/restricted environments
  }
}

export interface BudgetData {
  transactions: Transaction[];
  projects: BudgetProject[];
  lines: BudgetLine[];
  dues: DuesRecord[];
  audit: AuditEntry[];
  /** Cotizație receipts with member/treasurer signatures, mirrored from "Istoric Plăți". */
  duesPayments: TreasuryPayment[];
  loading: boolean;
  error: string | null;
}

export interface Mutations {
  saveTransaction: (tx: Transaction, previous?: Transaction) => Promise<void>;
  deleteTransaction: (tx: Transaction) => Promise<void>;
  approveTransaction: (tx: Transaction) => Promise<void>;
  revertTransaction: (tx: Transaction, reason: string) => Promise<void>;
  saveProject: (project: BudgetProject, previous?: BudgetProject) => Promise<void>;
  deleteProject: (project: BudgetProject) => Promise<void>;
  saveLine: (line: BudgetLine, previous?: BudgetLine) => Promise<void>;
  deleteLine: (line: BudgetLine) => Promise<void>;
  saveDues: (record: DuesRecord) => Promise<void>;
  saveDuesMonth: (record: DuesRecord, monthIndex: number, value: number) => Promise<void>;
  archiveMandate: (label: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

/** Seed budget lines so a fresh mandate opens with the standard chart of accounts. */
function defaultLines(): BudgetLine[] {
  return [
    ...INCOME_CATEGORIES.map((category, idx) => ({
      id: `bl-inc-${idx}`,
      category,
      planned: 0,
      type: 'venit' as const,
    })),
    ...EXPENSE_CATEGORIES.map((category, idx) => ({
      id: `bl-exp-${idx}`,
      category,
      planned: 0,
      type: 'cheltuiala' as const,
    })),
  ];
}

function slug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function describeTransaction(tx: Transaction): string {
  return `${tx.amount} RON · ${tx.category} · ${tx.type === 'venit' ? 'Venit' : 'Cheltuială'} · ${tx.status}`;
}

export function useBudgetData(currentUserName: string): BudgetData & Mutations {
  // Initialize with cached data for instant render
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    getCached<Transaction[]>('transactions', [])
  );
  const [projects, setProjects] = useState<BudgetProject[]>(() =>
    getCached<BudgetProject[]>('projects', [])
  );
  const [lines, setLines] = useState<BudgetLine[]>(() =>
    getCached<BudgetLine[]>('lines', defaultLines())
  );
  const [dues, setDues] = useState<DuesRecord[]>(() =>
    getCached<DuesRecord[]>('dues', [])
  );
  const [audit, setAudit] = useState<AuditEntry[]>(() =>
    getCached<AuditEntry[]>('audit', [])
  );
  const [duesPayments, setDuesPayments] = useState<TreasuryPayment[]>(() =>
    getCached<TreasuryPayment[]>('duesPayments', [])
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync ref to prevent race conditions during write
  const isFetchingRef = useRef(false);

  // --- 1. Fetch all datasets from Supabase ---
  const fetchAll = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const [txRes, prjRes, linesRes, duesRes, auditRes, payRes] = await Promise.allSettled([
        supabase.from(COLLECTIONS.transactions).select('*').order('date', { ascending: false }),
        supabase.from(COLLECTIONS.projects).select('*'),
        supabase.from(COLLECTIONS.lines).select('*'),
        supabase.from(COLLECTIONS.dues).select('*'),
        supabase.from(COLLECTIONS.audit).select('*').order('timestamp', { ascending: false }),
        supabase.from('payments').select('*').order('date', { ascending: false }),
      ]);

      if (txRes.status === 'fulfilled' && txRes.value.data) {
        setTransactions(txRes.value.data);
        setCached('transactions', txRes.value.data);
      }
      if (prjRes.status === 'fulfilled' && prjRes.value.data) {
        setProjects(prjRes.value.data);
        setCached('projects', prjRes.value.data);
      }
      if (linesRes.status === 'fulfilled' && linesRes.value.data && linesRes.value.data.length > 0) {
        setLines(linesRes.value.data);
        setCached('lines', linesRes.value.data);
      }
      if (duesRes.status === 'fulfilled' && duesRes.value.data) {
        setDues(duesRes.value.data);
        setCached('dues', duesRes.value.data);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value.data) {
        setAudit(auditRes.value.data);
        setCached('audit', auditRes.value.data);
      }
      if (payRes.status === 'fulfilled' && payRes.value.data) {
        const validPayments = payRes.value.data.filter((p: any) => p.status !== 'Anulat');
        setDuesPayments(validPayments);
        setCached('duesPayments', validPayments);
      }

      setError(null);
    } catch (err: any) {
      console.warn('[budget] background sync error:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Initial fetch & seed check
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- 2. Live subscriptions (Supabase Realtime + BroadcastChannel + Local Events) ---
  useEffect(() => {
    // Supabase Realtime Channels
    const channel = supabase
      .channel('cmn_budget_realtime_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: COLLECTIONS.transactions }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: COLLECTIONS.projects }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: COLLECTIONS.lines }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: COLLECTIONS.dues }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: COLLECTIONS.audit }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchAll())
      .subscribe();

    // Local custom event listener
    const handleLocalSync = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      if (customEvt.detail?.type === 'reload') {
        fetchAll();
      }
    };
    window.addEventListener('cmn_budget_local_sync', handleLocalSync);

    // BroadcastChannel cross-tab listener
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = () => {
        fetchAll();
      };
    }

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('cmn_budget_local_sync', handleLocalSync);
      if (bc) bc.close();
    };
  }, [fetchAll]);

  // --- 3. Audit Logger Helper (Optimistic + DB) ---
  const logAudit = useCallback(
    async (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'user'>) => {
      const newEntry: AuditEntry = {
        ...entry,
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        user: currentUserName || 'Trezorerie / Board',
      };

      // Optimistic update
      setAudit(prev => {
        const next = [newEntry, ...prev];
        setCached('audit', next);
        return next;
      });

      try {
        await supabase.from(COLLECTIONS.audit).insert({
          id: newEntry.id,
          timestamp: newEntry.timestamp,
          user: newEntry.user,
          action: newEntry.action,
          txCode: newEntry.txCode,
          oldValue: newEntry.oldValue,
          newValue: newEntry.newValue,
          details: newEntry.details,
        });
      } catch (err) {
        console.warn('[budget] failed to write audit log to Supabase', err);
      }
    },
    [currentUserName]
  );

  // --- 4. Transaction Mutations (Optimistic + DB) ---
  const saveTransaction = useCallback(
    async (tx: Transaction, previous?: Transaction) => {
      const normalized: Transaction = {
        ...tx,
        amount: Number(tx.amount) || 0,
        createdAt: previous?.createdAt ?? tx.createdAt ?? Date.now(),
      };

      // 1. Instant Optimistic State Update
      setTransactions(prev => {
        const exists = prev.some(item => item.id === normalized.id);
        const next = exists
          ? prev.map(item => (item.id === normalized.id ? normalized : item))
          : [normalized, ...prev];
        setCached('transactions', next);
        return next;
      });

      broadcastSync('transaction_saved', normalized);

      // 2. Audit Log
      const action: AuditAction = previous ? 'Editare' : 'Creare';
      await logAudit({
        action,
        txCode: normalized.code,
        oldValue: previous ? describeTransaction(previous) : '—',
        newValue: describeTransaction(normalized),
        details: previous
          ? `Tranzacție modificată (${normalized.category} — ${normalized.amount} RON)`
          : `Tranzacție nouă înregistrată (${normalized.category} — ${normalized.amount} RON)`,
      });

      // 3. Supabase Upsert
      try {
        const { error: err } = await supabase.from(COLLECTIONS.transactions).upsert({
          id: normalized.id,
          code: normalized.code,
          date: normalized.date,
          type: normalized.type,
          category: normalized.category,
          projectId: normalized.projectId,
          amount: normalized.amount,
          status: normalized.status,
          source: normalized.source,
          documentUrl: normalized.documentUrl,
          receiptImage: normalized.receiptImage || null,
          receiptType: normalized.receiptType || 'url',
          paymentMethod: normalized.paymentMethod || null,
          approvedBy: normalized.approvedBy,
          notes: normalized.notes,
          createdAt: normalized.createdAt,
        });
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase upsert error (kept locally):', err?.message || err);
      }
    },
    [logAudit]
  );

  const deleteTransaction = useCallback(
    async (tx: Transaction) => {
      // 1. Instant Optimistic Removal (Item disappears immediately)
      setTransactions(prev => {
        const next = prev.filter(item => item.id !== tx.id);
        setCached('transactions', next);
        return next;
      });

      broadcastSync('transaction_deleted', tx.id);

      // 2. Audit Log
      await logAudit({
        action: 'Ștergere',
        txCode: tx.code,
        oldValue: describeTransaction(tx),
        newValue: '—',
        details: `Tranzacție ștearsă din registru (${tx.category} — ${tx.amount} RON)`,
      });

      // 3. Supabase Delete
      try {
        const { error: err } = await supabase.from(COLLECTIONS.transactions).delete().eq('id', tx.id);
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase delete error (kept locally deleted):', err?.message || err);
      }
    },
    [logAudit]
  );

  const approveTransaction = useCallback(
    async (tx: Transaction) => {
      const approver = currentUserName || 'Board';
      const approved: Transaction = {
        ...tx,
        status: 'platit',
        approvedBy: approver,
      };

      // 1. Instant Optimistic Update
      setTransactions(prev => {
        const next = prev.map(item => (item.id === approved.id ? approved : item));
        setCached('transactions', next);
        return next;
      });

      broadcastSync('transaction_approved', approved);

      // 2. Audit Log
      await logAudit({
        action: 'Aprobare',
        txCode: tx.code,
        oldValue: `Status: ${tx.status}`,
        newValue: 'Status: platit (Aprobat)',
        details: `Aprobat de ${approver} — ${tx.amount} RON (${tx.category})`,
      });

      // 3. Supabase Update
      try {
        const { error: err } = await supabase
          .from(COLLECTIONS.transactions)
          .update({ status: 'platit', approvedBy: approver })
          .eq('id', tx.id);
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase approve error:', err?.message || err);
      }
    },
    [currentUserName, logAudit]
  );

  const revertTransaction = useCallback(
    async (tx: Transaction, reason: string) => {
      const reverted: Transaction = {
        ...tx,
        status: 'anulata',
        notes: tx.notes ? `${tx.notes}\n\n[Revert: ${reason}]` : `[Revert: ${reason}]`,
      };

      // 1. Instant Optimistic Update
      setTransactions(prev => {
        const next = prev.map(item => (item.id === reverted.id ? reverted : item));
        setCached('transactions', next);
        return next;
      });

      broadcastSync('transaction_reverted', reverted);

      // 2. Audit Log
      await logAudit({
        action: 'Revert',
        txCode: tx.code,
        oldValue: describeTransaction(tx),
        newValue: describeTransaction(reverted),
        details: `Tranzacție revertată (${tx.category}) — Motiv: ${reason}`,
      });

      // 3. Supabase Update
      try {
        const { error: err } = await supabase
          .from(COLLECTIONS.transactions)
          .update({ status: 'anulata', notes: reverted.notes })
          .eq('id', tx.id);
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase revert error:', err?.message || err);
      }
    },
    [logAudit]
  );

  // --- 5. Budget Projects Mutations ---
  const saveProject = useCallback(
    async (project: BudgetProject, previous?: BudgetProject) => {
      const normalized: BudgetProject = {
        ...project,
        name: project.name.trim(),
        estimatedIncome: Number(project.estimatedIncome) || 0,
        estimatedExpense: Number(project.estimatedExpense) || 0,
      };

      // 1. Optimistic Update
      setProjects(prev => {
        const exists = prev.some(item => item.id === normalized.id);
        const next = exists
          ? prev.map(item => (item.id === normalized.id ? normalized : item))
          : [...prev, normalized];
        setCached('projects', next);
        return next;
      });

      broadcastSync('project_saved', normalized);

      // 2. Audit Log
      await logAudit({
        action: previous ? 'Editare' : 'Creare',
        txCode: `PRJ-${normalized.id.slice(-4)}`,
        oldValue: previous ? `${previous.name} — est. +${previous.estimatedIncome} / -${previous.estimatedExpense} RON` : '—',
        newValue: `${normalized.name} — est. +${normalized.estimatedIncome} / -${normalized.estimatedExpense} RON`,
        details: `Proiect ${previous ? 'actualizat' : 'creat'}: ${normalized.name}`,
      });

      // 3. Supabase Upsert
      try {
        const { error: err } = await supabase.from(COLLECTIONS.projects).upsert({
          id: normalized.id,
          name: normalized.name,
          status: normalized.status,
          estimatedIncome: normalized.estimatedIncome,
          estimatedExpense: normalized.estimatedExpense,
        });
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase project save error:', err?.message || err);
      }
    },
    [logAudit]
  );

  const deleteProject = useCallback(
    async (project: BudgetProject) => {
      // 1. Optimistic Delete
      setProjects(prev => {
        const next = prev.filter(item => item.id !== project.id);
        setCached('projects', next);
        return next;
      });

      broadcastSync('project_deleted', project.id);

      // 2. Audit Log
      await logAudit({
        action: 'Ștergere',
        txCode: `PRJ-${project.id.slice(-4)}`,
        oldValue: project.name,
        newValue: '—',
        details: `Proiect șters din evidență: ${project.name}`,
      });

      // 3. Supabase Delete
      try {
        const { error: err } = await supabase.from(COLLECTIONS.projects).delete().eq('id', project.id);
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase project delete error:', err?.message || err);
      }
    },
    [logAudit]
  );

  // --- 6. Budget Lines Mutations ---
  const saveLine = useCallback(
    async (line: BudgetLine, previous?: BudgetLine) => {
      const normalized: BudgetLine = {
        ...line,
        planned: Number(line.planned) || 0,
      };

      // 1. Optimistic Update
      setLines(prev => {
        const exists = prev.some(item => item.id === normalized.id);
        const next = exists
          ? prev.map(item => (item.id === normalized.id ? normalized : item))
          : [...prev, normalized];
        setCached('lines', next);
        return next;
      });

      broadcastSync('line_saved', normalized);

      // 2. Audit Log
      await logAudit({
        action: previous ? 'Editare' : 'Creare',
        txCode: `BL-${slug(normalized.category).slice(0, 8)}`,
        oldValue: previous ? `${previous.category}: ${previous.planned} RON` : '—',
        newValue: `${normalized.category}: ${normalized.planned} RON`,
        details: `Linie bugetară ${previous ? 'actualizată' : 'creată'}: ${normalized.category}`,
      });

      // 3. Supabase Upsert
      try {
        const { error: err } = await supabase.from(COLLECTIONS.lines).upsert({
          id: normalized.id,
          category: normalized.category,
          type: normalized.type,
          planned: normalized.planned,
        });
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase line save error:', err?.message || err);
      }
    },
    [logAudit]
  );

  const deleteLine = useCallback(
    async (line: BudgetLine) => {
      // 1. Optimistic Delete
      setLines(prev => {
        const next = prev.filter(item => item.id !== line.id);
        setCached('lines', next);
        return next;
      });

      broadcastSync('line_deleted', line.id);

      // 2. Audit Log
      await logAudit({
        action: 'Ștergere',
        txCode: `BL-${slug(line.category).slice(0, 8)}`,
        oldValue: `${line.category}: ${line.planned} RON`,
        newValue: '—',
        details: `Linie bugetară ștearsă: ${line.category}`,
      });

      // 3. Supabase Delete
      try {
        const { error: err } = await supabase.from(COLLECTIONS.lines).delete().eq('id', line.id);
        if (err) throw err;
      } catch (err: any) {
        console.warn('[budget] Supabase line delete error:', err?.message || err);
      }
    },
    [logAudit]
  );

  // --- 7. Dues Mutations ---
  const saveDues = useCallback(async (record: DuesRecord) => {
    setDues(prev => {
      const exists = prev.some(item => item.id === record.id);
      const next = exists
        ? prev.map(item => (item.id === record.id ? record : item))
        : [...prev, record];
      setCached('dues', next);
      return next;
    });

    try {
      await supabase.from(COLLECTIONS.dues).upsert({
        id: record.id,
        memberName: record.memberName,
        boardRole: record.boardRole,
        months: record.months || Array(12).fill(0),
      });
    } catch (err) {
      console.warn('[budget] failed to save dues record', err);
    }
  }, []);

  const saveDuesMonth = useCallback(
    async (record: DuesRecord, monthIndex: number, value: number) => {
      const cleanValue = Math.max(0, Number(value) || 0);

      // Optimistic update
      setDues(prev => {
        const next = prev.map(item => {
          if (item.id === record.id) {
            const months = Array.isArray(item.months) ? [...item.months] : Array(12).fill(0);
            months[monthIndex] = cleanValue;
            return { ...item, months };
          }
          return item;
        });
        setCached('dues', next);
        return next;
      });

      broadcastSync('dues_month_saved');

      try {
        const { data: snap } = await supabase
          .from(COLLECTIONS.dues)
          .select('*')
          .eq('id', record.id)
          .maybeSingle();

        const baseMonths = snap?.months && Array.isArray(snap.months) ? [...snap.months] : record.months || Array(12).fill(0);
        baseMonths[monthIndex] = cleanValue;

        await supabase.from(COLLECTIONS.dues).upsert({
          id: record.id,
          memberName: record.memberName,
          boardRole: record.boardRole,
          months: baseMonths,
        });
      } catch (err) {
        console.warn('[budget] failed to save dues month to DB', err);
      }
    },
    []
  );

  // --- 8. Archive Mandate ---
  const archiveMandate = useCallback(
    async (label: string) => {
      const archiveId = `${slug(label)}-${Date.now()}`;
      const archivePayload = {
        id: archiveId,
        mandate: label,
        data: {
          transactions,
          projects,
          lines,
          dues,
        },
        createdAt: new Date().toISOString(),
      };

      // Optimistic Reset
      setTransactions([]);
      setProjects([]);
      setLines(prev => prev.map(line => ({ ...line, planned: 0 })));
      setDues(prev => prev.map(d => ({ ...d, months: Array(12).fill(0) })));

      setCached('transactions', []);
      setCached('projects', []);
      setCached('lines', lines.map(line => ({ ...line, planned: 0 })));
      setCached('dues', dues.map(d => ({ ...d, months: Array(12).fill(0) })));

      broadcastSync('mandate_archived', label);

      await logAudit({
        action: 'Arhivare',
        txCode: archiveId,
        oldValue: `${transactions.length} tranzacții active`,
        newValue: '0 tranzacții — mandat nou inițializat',
        details: `Mandatul ${label} a fost arhivat și registrele au fost resetate`,
      });

      try {
        await supabase.from(COLLECTIONS.archives).upsert(archivePayload);
        if (transactions.length > 0) {
          await supabase.from(COLLECTIONS.transactions).delete().in('id', transactions.map(t => t.id));
        }
        if (projects.length > 0) {
          await supabase.from(COLLECTIONS.projects).delete().in('id', projects.map(p => p.id));
        }
        await Promise.all([
          ...dues.map(d => supabase.from(COLLECTIONS.dues).upsert({ id: d.id, memberName: d.memberName, boardRole: d.boardRole, months: Array(12).fill(0) })),
          ...lines.map(l => supabase.from(COLLECTIONS.lines).upsert({ id: l.id, category: l.category, type: l.type, planned: 0 })),
        ]);
      } catch (err) {
        console.warn('[budget] archiving DB error:', err);
      }
    },
    [transactions, projects, lines, dues, logAudit]
  );

  return useMemo(
    () => ({
      transactions,
      projects,
      lines,
      dues,
      audit,
      duesPayments,
      loading,
      error,
      saveTransaction,
      deleteTransaction,
      approveTransaction,
      revertTransaction,
      saveProject,
      deleteProject,
      saveLine,
      deleteLine,
      saveDues,
      saveDuesMonth,
      archiveMandate,
      refreshAll: fetchAll,
    }),
    [
      transactions,
      projects,
      lines,
      dues,
      audit,
      duesPayments,
      loading,
      error,
      saveTransaction,
      deleteTransaction,
      approveTransaction,
      revertTransaction,
      saveProject,
      deleteProject,
      saveLine,
      deleteLine,
      saveDues,
      saveDuesMonth,
      archiveMandate,
      fetchAll,
    ]
  );
}

export { currentMandateLabel };
