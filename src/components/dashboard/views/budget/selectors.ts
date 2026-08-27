/**
 * Pure derivations over the transaction ledger.
 *
 * Two different notions of "total" are used deliberately and consistently:
 *  - *settled*   — status `platit` only. Money that actually moved. Drives the
 *                  current balance, "realized" columns and budget execution.
 *  - *committed* — everything except `respins`. Settled plus still-pending.
 *                  Drives the mandate headline totals, so a treasurer sees
 *                  obligations already entered rather than only cleared ones.
 */

import {
  BudgetLine,
  BudgetProject,
  CHARITY_CATEGORY,
  DuesRecord,
  EXPENSE_CATEGORIES,
  FULL_MANDATE_DUE,
  GENERAL_PROJECT_ID,
  INCOME_CATEGORIES,
  QUARTERS,
  Transaction,
  TreasuryPayment,
  TxType,
  mandateMonthIndex,
} from './types';

export const isSettled = (tx: Transaction) => tx.status === 'platit';
export const isCommitted = (tx: Transaction) => tx.status !== 'respins' && tx.status !== 'anulata';

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumWhere(transactions: Transaction[], predicate: (tx: Transaction) => boolean): number {
  return sum(transactions.filter(predicate).map(tx => Number(tx.amount) || 0));
}

export interface BudgetKpis {
  currentBalance: number;
  settledIncome: number;
  settledExpense: number;
  mandateIncome: number;
  mandateExpense: number;
  charityRedirected: number;
  pendingCount: number;
  pendingAmount: number;
  directIncome: number;
  duesIncome: number;
}

export function computeKpis(
  transactions: Transaction[],
  duesPayments: TreasuryPayment[] = []
): BudgetKpis {
  const directIncome = sumWhere(transactions, tx => isSettled(tx) && tx.type === 'venit');
  const duesIncome = duesPayments
    .filter(p => p.status !== 'Anulat')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const settledIncome = directIncome + duesIncome;
  const settledExpense = sumWhere(transactions, tx => isSettled(tx) && tx.type === 'cheltuiala');
  const pending = transactions.filter(tx => tx.status === 'asteptare');

  return {
    currentBalance: settledIncome - settledExpense,
    settledIncome,
    settledExpense,
    directIncome,
    duesIncome,
    mandateIncome: sumWhere(transactions, tx => isCommitted(tx) && tx.type === 'venit') + duesIncome,
    mandateExpense: sumWhere(transactions, tx => isCommitted(tx) && tx.type === 'cheltuiala'),
    charityRedirected: sumWhere(
      transactions,
      tx => isSettled(tx) && tx.type === 'cheltuiala' && tx.category === CHARITY_CATEGORY
    ),
    pendingCount: pending.length,
    pendingAmount: sum(pending.map(tx => Number(tx.amount) || 0)),
  };
}

export interface CategorySlice {
  label: string;
  value: number;
}

/** Settled totals per category for one side of the ledger, largest first. */
export function categoryBreakdown(
  transactions: Transaction[],
  type: TxType,
  duesPayments: TreasuryPayment[] = []
): CategorySlice[] {
  const categories = type === 'venit' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const known = new Set<string>(categories);

  const totals = new Map<string, number>();
  for (const category of categories) totals.set(category, 0);

  for (const tx of transactions) {
    if (!isSettled(tx) || tx.type !== type) continue;
    const key = known.has(tx.category) ? tx.category : tx.category || 'Altele';
    totals.set(key, (totals.get(key) ?? 0) + (Number(tx.amount) || 0));
  }

  // Include member dues payments in income category breakdown
  if (type === 'venit' && duesPayments.length > 0) {
    const validDuesSum = duesPayments
      .filter(p => p.status !== 'Anulat')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    if (validDuesSum > 0) {
      const duesCategoryKey = 'Cotizații Lunare';
      totals.set(duesCategoryKey, (totals.get(duesCategoryKey) ?? 0) + validDuesSum);
    }
  }

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter(slice => slice.value > 0)
    .sort((a, b) => b.value - a.value);
}

export interface QuarterCashflow {
  label: string;
  span: string;
  income: number;
  expense: number;
}

/** Settled income vs expense per mandate quarter (Q1 = Jun–Aug). */
export function quarterlyCashflow(
  transactions: Transaction[],
  duesPayments: TreasuryPayment[] = []
): QuarterCashflow[] {
  return QUARTERS.map(quarter => {
    const inQuarterTx = transactions.filter(tx => {
      if (!isSettled(tx)) return false;
      const parsed = new Date(tx.date);
      if (Number.isNaN(parsed.getTime())) return false;
      return (quarter.months as readonly number[]).includes(mandateMonthIndex(parsed.getMonth()));
    });

    const inQuarterDues = duesPayments.filter(p => {
      if (p.status === 'Anulat' || !p.date) return false;
      const parsed = new Date(p.date);
      if (Number.isNaN(parsed.getTime())) return false;
      return (quarter.months as readonly number[]).includes(mandateMonthIndex(parsed.getMonth()));
    });

    const txIncome = sumWhere(inQuarterTx, tx => tx.type === 'venit');
    const duesIncome = inQuarterDues.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return {
      label: quarter.label,
      span: quarter.span,
      income: txIncome + duesIncome,
      expense: sumWhere(inQuarterTx, tx => tx.type === 'cheltuiala'),
    };
  });
}

export interface BudgetLineRow extends BudgetLine {
  realized: number;
  /** Planned minus realized. Positive = budget still available / income short. */
  difference: number;
  /** 0–∞, realized as a share of planned. */
  execution: number;
}

export function budgetLineRows(lines: BudgetLine[], transactions: Transaction[]): BudgetLineRow[] {
  return lines.map(line => {
    const realized = sumWhere(
      transactions,
      tx => isSettled(tx) && tx.type === line.type && tx.category === line.category
    );
    return {
      ...line,
      realized,
      difference: line.planned - realized,
      execution: line.planned > 0 ? realized / line.planned : 0,
    };
  });
}

export interface ProjectRow extends BudgetProject {
  realizedIncome: number;
  realizedExpense: number;
  /** Settled income minus settled expense — what the project freed up for charity. */
  netCharitable: number;
  /** Realized income per unit of realized spend. null when nothing has been spent. */
  roi: number | null;
}

export function projectRows(projects: BudgetProject[], transactions: Transaction[]): ProjectRow[] {
  return projects.map(project => {
    const realizedIncome = sumWhere(
      transactions,
      tx => isSettled(tx) && tx.projectId === project.id && tx.type === 'venit'
    );
    const realizedExpense = sumWhere(
      transactions,
      tx => isSettled(tx) && tx.projectId === project.id && tx.type === 'cheltuiala'
    );

    return {
      ...project,
      realizedIncome,
      realizedExpense,
      netCharitable: realizedIncome - realizedExpense,
      roi: realizedExpense > 0 ? realizedIncome / realizedExpense : null,
    };
  });
}

export interface DuesRow extends DuesRecord {
  totalPaid: number;
  isComplete: boolean;
}

export function duesRows(records: DuesRecord[]): DuesRow[] {
  return records.map(record => {
    const totalPaid = sum((record.months || []).map(value => Number(value) || 0));
    return { ...record, totalPaid, isComplete: totalPaid >= FULL_MANDATE_DUE };
  });
}

/** Resolves a transaction's project id to a display name. */
export function projectName(projects: BudgetProject[], projectId: string): string {
  if (!projectId || projectId === GENERAL_PROJECT_ID) return 'General';
  return projects.find(project => project.id === projectId)?.name ?? 'General';
}

/** Next sequential transaction code, continuing the highest existing TX-nnn. */
export function nextTransactionCode(transactions: Transaction[]): string {
  const highest = transactions.reduce((max, tx) => {
    const match = /^TX-(\d+)$/.exec(tx.code ?? '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `TX-${String(highest + 1).padStart(3, '0')}`;
}

/**
 * Calculates progressive running balance in chronological order (earliest to latest)
 * for all settled transactions ('platit'), returning a map of transaction ID -> running balance.
 */
export function computeRunningBalances(transactions: Transaction[]): Map<string, number> {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  const balanceMap = new Map<string, number>();
  let running = 0;

  for (const tx of sorted) {
    if (tx.status === 'platit') {
      if (tx.type === 'venit') {
        running += Number(tx.amount) || 0;
      } else {
        running -= Number(tx.amount) || 0;
      }
    }
    balanceMap.set(tx.id, running);
  }

  return balanceMap;
}

