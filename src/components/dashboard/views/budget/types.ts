/** Domain model for the Budget & Financial Management module. */

export type TxType = 'venit' | 'cheltuiala';
export type TxStatus = 'platit' | 'asteptare' | 'respins' | 'anulata';
export type ProjectStatus = 'planuit' | 'derulare' | 'finalizat';
export type AuditAction = 'Creare' | 'Aprobare' | 'Editare' | 'Ștergere' | 'Arhivare' | 'Revert';

export interface Transaction {
  id: string;
  /** Human-facing code, e.g. TX-001. */
  code: string;
  /** ISO yyyy-mm-dd. */
  date: string;
  type: TxType;
  category: string;
  /** Project id, or GENERAL_PROJECT_ID for non-project movements. */
  projectId: string;
  amount: number;
  status: TxStatus;
  /** Membru / sursă. */
  source: string;
  /** Drive link, receipt photo or PDF invoice. Mandatory for expenses. */
  documentUrl: string;
  approvedBy: string;
  notes: string;
  createdAt?: number;
}

export interface BudgetProject {
  id: string;
  name: string;
  status: ProjectStatus;
  estimatedIncome: number;
  estimatedExpense: number;
}

export interface BudgetLine {
  id: string;
  category: string;
  type: TxType;
  planned: number;
}

export interface DuesRecord {
  id: string;
  memberName: string;
  boardRole: string;
  /** 12 entries, mandate order July → June. */
  months: number[];
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  user: string;
  action: AuditAction;
  txCode: string;
  oldValue: string;
  newValue: string;
  details: string;
}

// --- Constants ------------------------------------------------------------

export const GENERAL_PROJECT_ID = 'general';

export const INCOME_CATEGORIES = [
  'Cotizații Lunare',
  'Sponsorizări Firme',
  'Vânzare Bilete',
  'Donații Proiecte',
] as const;

export const EXPENSE_CATEGORIES = [
  'Logistică Evenimente',
  'Donație Caritabilă',
  'Promovare / Print',
  'Protocol / Admin',
] as const;

/** Expenses in this category are charitable redirects, tracked as a headline KPI. */
export const CHARITY_CATEGORY = 'Donație Caritabilă';

export const ALL_CATEGORIES: string[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function categoriesFor(type: TxType): string[] {
  return type === 'venit' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES];
}

/** The club mandate runs June → May (12 months), so month 0 of the ledger is June. */
export const MANDATE_MONTHS = [
  'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec', 'Ian', 'Feb', 'Mar', 'Apr', 'Mai',
] as const;

export const QUARTERS = [
  { label: 'Q1', span: 'Iun–Aug', months: [0, 1, 2] },
  { label: 'Q2', span: 'Sep–Nov', months: [3, 4, 5] },
  { label: 'Q3', span: 'Dec–Feb', months: [6, 7, 8] },
  { label: 'Q4', span: 'Mar–Mai', months: [9, 10, 11] },
] as const;

/** Monthly dues rate; a full mandate is 12 × this. Mirrors utils/finance.ts. */
export const MONTHLY_DUE = 15;
export const FULL_MANDATE_DUE = MONTHLY_DUE * 12; // 180 RON

export const TX_STATUS_LABELS: Record<TxStatus, string> = {
  platit: 'Plătit / Încasat',
  asteptare: 'În așteptare',
  respins: 'Respins',
  anulata: 'Anulată (Revert)',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planuit: 'Plănuit',
  derulare: 'În Derulare',
  finalizat: 'Finalizat',
};

export const TX_TYPE_LABELS: Record<TxType, string> = {
  venit: 'Venit',
  cheltuiala: 'Cheltuială',
};

/**
 * Maps a calendar month (0 = January, 5 = June) onto its mandate index (0 = June, 11 = May),
 * so a transaction date lands in the right quarter of the club year.
 */
export function mandateMonthIndex(calendarMonth: number): number {
  return (calendarMonth + 7) % 12;
}

export function formatRON(value: number): string {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value);
}

/** Label for the current mandate, e.g. "2026 / 2027". Mandate flips in June. */
export function currentMandateLabel(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const startYear = reference.getMonth() >= 5 ? year : year - 1;
  return `${startYear} / ${startYear + 1}`;
}
