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
  INITIAL_TREASURY_BALANCE,
  MANDATE_MONTHS,
  QUARTERS,
  Transaction,
  TreasuryPayment,
  TxType,
  isProjectLocked,
  mandateMonthIndex,
  roundRON,
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
  initialBalance: number;
  mandateNet: number;
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
  duesPayments: TreasuryPayment[] = [],
  folderCashBalance: number = INITIAL_TREASURY_BALANCE
): BudgetKpis {
  const directIncome = sumWhere(transactions, tx => isSettled(tx) && tx.type === 'venit');
  const duesIncome = duesPayments
    .filter(p => p.status !== 'Anulat')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const settledIncome = roundRON(directIncome + duesIncome);
  const settledExpense = roundRON(sumWhere(transactions, tx => isSettled(tx) && tx.type === 'cheltuiala'));
  const mandateNet = settledIncome - settledExpense;

  // Banii din mapă (5.663 LEI) reprezintă totalul fizic actual existent în casierie (cu tot cu cotizațiile încasate).
  // Pentru a evita dubla numărare (8.000+ RON dacă s-ar fi adăugat cotizațiile peste soldul total din mapă),
  // soldul disponibil total reflectă exact numerarul din mapă ajustat cu intrările/ieșirile din registrul de tranzacții.
  const currentBalance = roundRON(folderCashBalance + directIncome - settledExpense);
  const pending = transactions.filter(tx => tx.status === 'asteptare');

  return {
    currentBalance,
    initialBalance: roundRON(folderCashBalance),
    mandateNet,
    settledIncome,
    settledExpense,
    directIncome: roundRON(directIncome),
    duesIncome: roundRON(duesIncome),
    mandateIncome: roundRON(sumWhere(transactions, tx => isCommitted(tx) && tx.type === 'venit') + duesIncome),
    mandateExpense: roundRON(sumWhere(transactions, tx => isCommitted(tx) && tx.type === 'cheltuiala')),
    charityRedirected: roundRON(
      sumWhere(
        transactions,
        tx => isSettled(tx) && tx.type === 'cheltuiala' && tx.category === CHARITY_CATEGORY
      )
    ),
    pendingCount: pending.length,
    pendingAmount: roundRON(sum(pending.map(tx => Number(tx.amount) || 0))),
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
    .map(([label, value]) => ({ label, value: roundRON(value) }))
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
      income: roundRON(txIncome + duesIncome),
      expense: roundRON(sumWhere(inQuarterTx, tx => tx.type === 'cheltuiala')),
    };
  });
}

export interface MonthCashflow {
  key: string;
  label: string;
  shortLabel: string;
  monthIndex: number;
  income: number;
  expense: number;
  net: number;
  runningBalance: number;
  txCount: number;
  savingsRate: number;
}

const MONTH_NAMES_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
];

/** Settled monthly cashflow across the whole mandate (June -> May). */
export function monthlyCashflow(
  transactions: Transaction[],
  duesPayments: TreasuryPayment[] = [],
  referenceDate: Date = new Date(),
  initialBalance: number = INITIAL_TREASURY_BALANCE
): MonthCashflow[] {
  const refYear = referenceDate.getFullYear();
  const startYear = referenceDate.getMonth() >= 5 ? refYear : refYear - 1;

  const mandateKeys: { year: number; month: number; index: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = (5 + i) % 12; // 5 = June
    const y = i < 7 ? startYear : startYear + 1;
    mandateKeys.push({ year: y, month: m, index: i });
  }

  let running = roundRON(initialBalance);

  return mandateKeys.map(({ year, month, index }) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthName = MONTH_NAMES_RO[month];
    const label = `${monthName} ${year}`;
    const shortLabel = MANDATE_MONTHS[index];

    const inMonthTx = transactions.filter(tx => {
      if (!isSettled(tx) || !tx.date) return false;
      return tx.date.startsWith(monthKey);
    });

    const inMonthDues = duesPayments.filter(p => {
      if (p.status === 'Anulat') return false;
      // Dues are assigned by their target membership month (e.g. 'August 2026')
      // or fallback to receipt payment date if month is absent
      if (p.month && p.month.toLowerCase().includes(monthName.toLowerCase()) && p.month.includes(String(year))) {
        return true;
      }
      if (!p.month && p.date && p.date.startsWith(monthKey)) {
        return true;
      }
      return false;
    });

    const txIncome = inMonthTx.filter(tx => tx.type === 'venit').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const duesIncome = inMonthDues.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const income = roundRON(txIncome + duesIncome);
    const expense = roundRON(
      inMonthTx.filter(tx => tx.type === 'cheltuiala').reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
    );
    const net = income - expense;
    running += net;
    const txCount = inMonthTx.length + inMonthDues.length;
    const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

    return {
      key: monthKey,
      label,
      shortLabel,
      monthIndex: index,
      income,
      expense,
      net,
      runningBalance: running,
      txCount,
      savingsRate,
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
    const realized = roundRON(sumWhere(
      transactions,
      tx => isSettled(tx) && tx.type === line.type && tx.category === line.category
    ));
    const planned = roundRON(line.planned);
    return {
      ...line,
      planned,
      realized,
      difference: planned - realized,
      execution: planned > 0 ? realized / planned : 0,
    };
  });
}

export interface ProjectRow extends BudgetProject {
  realizedIncome: number;
  realizedExpense: number;
  /** Settled income minus settled expense — what the project freed up for charity. */
  netCharitable: number;
  /** Percentage ROI: ((realizedIncome - realizedExpense) / realizedExpense) * 100. null when 0 spend. */
  roi: number | null;
  /** Whether the project is locked (attendance closed and date passed). */
  isLocked: boolean;
}

export function projectRows(
  projects: BudgetProject[],
  transactions: Transaction[],
  events: { id: string; date?: string; time?: string; attendanceClosed?: boolean }[] = [],
  todayStr?: string
): ProjectRow[] {
  return projects.map(project => {
    const realizedIncome = roundRON(sumWhere(
      transactions,
      tx => isSettled(tx) && tx.projectId === project.id && tx.type === 'venit'
    ));
    const realizedExpense = roundRON(sumWhere(
      transactions,
      tx => isSettled(tx) && tx.projectId === project.id && tx.type === 'cheltuiala'
    ));
    const estimatedIncome = roundRON(project.estimatedIncome);
    const estimatedExpense = roundRON(project.estimatedExpense);
    const netCharitable = realizedIncome - realizedExpense;
    const roi = realizedExpense > 0 ? Math.round((netCharitable / realizedExpense) * 100) : null;
    const locked = isProjectLocked(project, events, todayStr);

    return {
      ...project,
      estimatedIncome,
      estimatedExpense,
      realizedIncome,
      realizedExpense,
      netCharitable,
      roi,
      isLocked: locked,
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
 * for all settled transactions ('platit'), starting from the reference initial treasury fund
 * (banii din mapă), returning a map of transaction ID -> running balance.
 */
export function computeRunningBalances(
  transactions: Transaction[],
  initialBalance: number = INITIAL_TREASURY_BALANCE
): Map<string, number> {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  const balanceMap = new Map<string, number>();
  let running = roundRON(initialBalance);

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

