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
  /** Drive link, receipt photo or PDF invoice. Mandatory for expenses if not physical receipt. */
  documentUrl: string;
  receiptImage?: string;
  receiptType?: 'url' | 'image' | 'physical';
  paymentMethod?: string;
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
  eventId?: string;
  date?: string;
  /** True when project is locked because the calendar event has passed and attendance is closed. */
  isLocked?: boolean;
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

export interface TreasuryPayment {
  id: string;
  memberId?: string;
  memberName?: string;
  amount: number;
  month?: string;
  date?: string;
  status?: string;
  receiptNumber?: string;
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

export const PAYMENT_METHODS = [
  'Transfer Bancar',
  'Numerar / Casierie',
  'Card / POS',
  'Decont Cheltuieli',
  'Sponsorizare Directă',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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

/** Monthly dues rate; current rate is 20 RON/month (was 15 RON pre-Oct 2026). Full mandate is 15+15+(8*20) = 190 RON. */
export const MONTHLY_DUE = 20;
export const FULL_MANDATE_DUE = 15 + 15 + 8 * 20; // 190 RON (Aug-Sep @ 15 RON, Oct-Mai @ 20 RON)

/**
 * Fond curent total în mapă / casierie de referință (cu tot cu cotizații): 5.663 LEI.
 * Aceasta este suma totală fizică existentă în mapă în acest moment.
 * Banii din mapă includ deja cotizațiile încasate până în prezent.
 */
export const INITIAL_TREASURY_BALANCE = 5663;

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

/**
 * Verifică dacă un proiect este blocat la editare/modificări financiare.
 * Un proiect este considerat blocat (Locked) dacă:
 * 1. Are status explicit 'finalizat', SAU
 * 2. Are asociat un eveniment în calendar (`eventId`) care are prezența închisă (`attendanceClosed === true`)
 *    și data lui a trecut față de data curentă a României.
 */
export function isProjectLocked(
  project: { status: ProjectStatus; eventId?: string; date?: string; isLocked?: boolean },
  events: { id: string; date?: string; time?: string; attendanceClosed?: boolean }[] = [],
  todayStr?: string
): boolean {
  if (project.isLocked || project.status === 'finalizat') return true;
  if (!project.eventId) return false;

  const ev = events.find(e => e.id === project.eventId);
  if (!ev) return false;

  const isAttendanceClosed = Boolean(ev.attendanceClosed);
  const evDate = ev.date || project.date;
  const currentToday = todayStr || new Date().toISOString().slice(0, 10);

  // Dacă prezența este închisă și data evenimentului a trecut (sau este astăzi cu prezență închisă)
  if (isAttendanceClosed && evDate && evDate <= currentToday) {
    return true;
  }

  return false;
}

export function roundRON(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Math.round(Number.isNaN(parsed) ? 0 : parsed);
  }
  return Math.round(Number(value) || 0);
}

export function formatRON(value: number, includeCurrency = false): string {
  const rounded = roundRON(value);
  const formatted = rounded.toLocaleString('ro-RO');
  return includeCurrency ? `${formatted} RON` : formatted;
}

/** Label for the current mandate, e.g. "2026 / 2027". Mandate flips in June. */
export function currentMandateLabel(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const startYear = reference.getMonth() >= 5 ? year : year - 1;
  return `${startYear} / ${startYear + 1}`;
}
