/**
 * Firestore data layer for the budget module.
 *
 * Mirrors the live-subscription pattern used by the other dashboard views
 * (onSnapshot per collection). Every mutation that touches money also appends
 * an immutable audit entry — the audit log is append-only by construction:
 * nothing in this module ever updates or deletes a `budget_audit` document.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface Mutations {
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
}

/** Seed budget lines so a fresh mandate opens with the standard chart of accounts. */
function defaultLines(): Omit<BudgetLine, 'id'>[] {
  return [
    ...INCOME_CATEGORIES.map(category => ({
      category,
      planned: 0,
      spent: 0,
      type: 'venit' as const,
    })),
    ...EXPENSE_CATEGORIES.map(category => ({
      category,
      planned: 0,
      spent: 0,
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

function useCollection<T>(name: string, order?: string): { items: T[]; loading: boolean; error: string | null } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let q = supabase.from(name).select('*');
        if (order) {
          q = q.order(order, { ascending: name === COLLECTIONS.audit ? true : false });
        }
        const { data, error: err } = await q;
        if (err) throw err;
        setItems(data || []);
        setError(null);
      } catch (err: any) {
        console.error(`[budget] fetch failed for ${name}`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`${name}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: name }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [name, order]);

  return { items, loading, error };
}

/**
 * Live feed of every member's dues receipt (member/treasurer signatures
 * included), read via a collectionGroup query across `members/*\/payments`.
 * This is the same data ViewPayments ("Istoric Plăți") shows — the audit log
 * mirrors it read-only so a board member sees cotizație receipts alongside
 * the rest of the financial trail without a second source of truth.
 */
function useDuesPaymentsFeed(): { items: TreasuryPayment[]; loading: boolean; error: string | null } {
  const [items, setItems] = useState<TreasuryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const { data, error: err } = await supabase
          .from('payments')
          .select('*')
          .order('date', { ascending: false });
        if (err) throw err;
        const list = (data || [])
          .filter((payment: any) => payment.status !== 'Anulat');
        setItems(list);
        setError(null);
      } catch (err: any) {
        console.error('[budget] fetch failed for dues payments', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    const channel = supabase
      .channel('budget_payments_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading, error };
}

export function useBudgetData(currentUserName: string): BudgetData & Mutations {
  const transactions = useCollection<Transaction>(COLLECTIONS.transactions);
  const projects = useCollection<BudgetProject>(COLLECTIONS.projects);
  const lines = useCollection<BudgetLine>(COLLECTIONS.lines);
  const dues = useCollection<DuesRecord>(COLLECTIONS.dues);
  const audit = useCollection<AuditEntry>(COLLECTIONS.audit, 'timestamp');
  const duesPayments = useDuesPaymentsFeed();

  const logAudit = useCallback(
    async (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'user'>) => {
      const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await supabase.from(COLLECTIONS.audit).insert({
        ...entry,
        id,
        timestamp: Date.now(),
        user: currentUserName || 'Necunoscut',
      });
    },
    [currentUserName]
  );

  const saveTransaction = useCallback(
    async (tx: Transaction, previous?: Transaction) => {
      const { id, ...payload } = tx;
      await supabase.from(COLLECTIONS.transactions).upsert({
        id,
        ...payload,
        createdAt: previous?.createdAt ?? Date.now(),
      });

      const action: AuditAction = previous ? 'Editare' : 'Creare';
      await logAudit({
        action,
        txCode: tx.code,
        oldValue: previous ? describeTransaction(previous) : '—',
        newValue: describeTransaction(tx),
        details: previous
          ? `Tranzacție modificată (${tx.category})`
          : `Tranzacție nouă înregistrată (${tx.category})`,
      });
    },
    [logAudit]
  );

  const approveTransaction = useCallback(
    async (tx: Transaction) => {
      const approved: Transaction = { ...tx, status: 'platit', approvedBy: currentUserName || 'Board' };
      const { id, ...payload } = approved;
      await supabase.from(COLLECTIONS.transactions).update(payload).eq('id', id);
      await logAudit({
        action: 'Aprobare',
        txCode: tx.code,
        oldValue: `Status: ${tx.status}`,
        newValue: 'Status: platit',
        details: `Aprobat de ${currentUserName || 'Board'} — ${tx.amount} RON`,
      });
    },
    [logAudit, currentUserName]
  );

  const deleteTransaction = useCallback(
    async (tx: Transaction) => {
      await supabase.from(COLLECTIONS.transactions).delete().eq('id', tx.id);
      await logAudit({
        action: 'Ștergere',
        txCode: tx.code,
        oldValue: describeTransaction(tx),
        newValue: '—',
        details: `Tranzacție ștearsă din registru (${tx.category})`,
      });
    },
    [logAudit]
  );

  /**
   * Unlike deleteTransaction, this never removes the document — the row stays
   * in the registry with status `anulata` so there is a visible trace that the
   * movement existed and was reverted, plus the reason why.
   */
  const revertTransaction = useCallback(
    async (tx: Transaction, reason: string) => {
      const reverted: Transaction = {
        ...tx,
        status: 'anulata',
        notes: tx.notes ? `${tx.notes}\n\n[Revert] ${reason}` : `[Revert] ${reason}`,
      };
      const { id, ...payload } = reverted;
      await supabase.from(COLLECTIONS.transactions).update(payload).eq('id', id);
      await logAudit({
        action: 'Revert',
        txCode: tx.code,
        oldValue: describeTransaction(tx),
        newValue: describeTransaction(reverted),
        details: `Tranzacție revertată (${tx.category}) — motiv: ${reason}`,
      });
    },
    [logAudit]
  );

  const saveProject = useCallback(
    async (project: BudgetProject, previous?: BudgetProject) => {
      const { id, ...payload } = project;
      await supabase.from(COLLECTIONS.projects).upsert({ id, ...payload });
      await logAudit({
        action: previous ? 'Editare' : 'Creare',
        txCode: `PRJ-${project.id.slice(-4)}`,
        oldValue: previous ? `${previous.name} — est. ${previous.estimatedIncome}/${previous.estimatedExpense}` : '—',
        newValue: `${project.name} — est. ${project.estimatedIncome}/${project.estimatedExpense}`,
        details: `Proiect ${previous ? 'actualizat' : 'creat'}: ${project.name}`,
      });
    },
    [logAudit]
  );

  const deleteProject = useCallback(
    async (project: BudgetProject) => {
      await supabase.from(COLLECTIONS.projects).delete().eq('id', project.id);
      await logAudit({
        action: 'Ștergere',
        txCode: `PRJ-${project.id.slice(-4)}`,
        oldValue: project.name,
        newValue: '—',
        details: `Proiect șters: ${project.name}`,
      });
    },
    [logAudit]
  );

  const saveLine = useCallback(
    async (line: BudgetLine, previous?: BudgetLine) => {
      const { id, ...payload } = line;
      await supabase.from(COLLECTIONS.lines).upsert({ id, ...payload });
      await logAudit({
        action: previous ? 'Editare' : 'Creare',
        txCode: `BL-${slug(line.category).slice(0, 8)}`,
        oldValue: previous ? `Planificat: ${previous.planned} RON` : '—',
        newValue: `Planificat: ${line.planned} RON`,
        details: `Linie bugetară ${previous ? 'actualizată' : 'creată'}: ${line.category}`,
      });
    },
    [logAudit]
  );

  const deleteLine = useCallback(
    async (line: BudgetLine) => {
      await supabase.from(COLLECTIONS.lines).delete().eq('id', line.id);
      await logAudit({
        action: 'Ștergere',
        txCode: `BL-${slug(line.category).slice(0, 8)}`,
        oldValue: `${line.category}: ${line.planned} RON`,
        newValue: '—',
        details: `Linie bugetară ștearsă: ${line.category}`,
      });
    },
    [logAudit]
  );

  const saveDues = useCallback(async (record: DuesRecord) => {
    const { id, ...payload } = record;
    await supabase.from(COLLECTIONS.dues).upsert({ id, ...payload });
  }, []);

  /**
   * Actualizează o singură lună din fișa de cotizații într-o tranzacție care
   * recitește documentul de pe server. Doi trezorieri care editează luni diferite
   * ale aceluiași membru nu-și mai suprascriu unul altuia valorile (scrierea
   * întregului array `months` de la client pierdea editarea concurentă).
   */
  const saveDuesMonth = useCallback(async (record: DuesRecord, monthIndex: number, value: number) => {
    try {
      const { data: snap } = await supabase
        .from(COLLECTIONS.dues)
        .select('*')
        .eq('id', record.id)
        .single();

      if (!snap) {
        const { id, ...payload } = record;
        const months = Array.isArray(payload.months) ? [...payload.months] : Array(12).fill(0);
        months[monthIndex] = value;
        await supabase.from(COLLECTIONS.dues).upsert({ id, ...payload, months });
      } else {
        const months = Array.isArray(snap.months) ? [...snap.months] : Array(12).fill(0);
        months[monthIndex] = value;
        await supabase.from(COLLECTIONS.dues).update({ months }).eq('id', record.id);
      }
    } catch (err) {
      console.error('[budget] failed to save dues month', err);
    }
  }, []);

  /**
   * Snapshots the mandate into `budget_archives/{label}` and then clears the
   * live ledger. Budget lines survive with their plans reset to zero so the new
   * mandate keeps the same chart of accounts. The audit log is never cleared.
   */
  const archiveMandate = useCallback(
    async (label: string) => {
      const archiveId = `${slug(label)}-${Date.now()}`;
      await supabase.from(COLLECTIONS.archives).upsert({
        id: archiveId,
        mandate: label,
        data: {
          transactions: transactions.items,
          projects: projects.items,
          lines: lines.items,
          dues: dues.items,
        },
        createdAt: new Date().toISOString()
      });

      if (transactions.items.length > 0) {
        await supabase.from(COLLECTIONS.transactions).delete().in('id', transactions.items.map(t => t.id));
      }
      if (projects.items.length > 0) {
        await supabase.from(COLLECTIONS.projects).delete().in('id', projects.items.map(p => p.id));
      }

      await Promise.all([
        ...dues.items.map(record => supabase.from(COLLECTIONS.dues).upsert({
          id: record.id,
          memberName: record.memberName,
          boardRole: record.boardRole,
          months: Array(12).fill(0),
        })),
        ...lines.items.map(line => supabase.from(COLLECTIONS.lines).upsert({
          id: line.id,
          category: line.category,
          type: line.type,
          planned: 0,
        }))
      ]);

      await logAudit({
        action: 'Arhivare',
        txCode: archiveId,
        oldValue: `${transactions.items.length} tranzacții active`,
        newValue: '0 tranzacții — mandat nou',
        details: `Mandatul ${label} a fost arhivat și registrele au fost resetate`,
      });
    },
    [transactions.items, projects.items, lines.items, dues.items, logAudit, currentUserName]
  );

  /** One-time bootstrap of the standard chart of accounts on an empty ledger. */
  useEffect(() => {
    if (lines.loading || lines.error || lines.items.length > 0) return;
    const seedLines = async () => {
      try {
        const toSeed = defaultLines().map((line, idx) => ({
          id: `line-${idx}`,
          ...line
        }));
        await supabase.from(COLLECTIONS.lines).upsert(toSeed);
      } catch (err) {
        console.error('[budget] seeding budget lines failed', err);
      }
    };
    seedLines();
  }, [lines.loading, lines.error, lines.items.length]);

  const loading =
    transactions.loading || projects.loading || lines.loading || dues.loading || audit.loading;
  const error =
    transactions.error || projects.error || lines.error || dues.error || audit.error || null;

  return useMemo(
    () => ({
      transactions: transactions.items,
      projects: projects.items,
      lines: lines.items,
      dues: dues.items,
      audit: audit.items,
      duesPayments: duesPayments.items,
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
    }),
    [
      transactions.items,
      projects.items,
      lines.items,
      dues.items,
      audit.items,
      duesPayments.items,
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
    ]
  );
}

function describeTransaction(tx: Transaction): string {
  return `${tx.amount} RON · ${tx.category} · ${tx.status}`;
}

export { currentMandateLabel };
