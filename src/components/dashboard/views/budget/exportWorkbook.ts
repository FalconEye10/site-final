/** Assembles the whole budget module into one multi-sheet Excel workbook. */

import { SheetSpec, downloadXlsx } from '../../../../utils/xlsx';
import { TreasuryPayment } from '../../../../utils/supabaseService';
import {
  AuditEntry,
  BudgetLine,
  BudgetProject,
  DuesRecord,
  MANDATE_MONTHS,
  PROJECT_STATUS_LABELS,
  TX_STATUS_LABELS,
  TX_TYPE_LABELS,
  Transaction,
} from './types';
import {
  budgetLineRows,
  categoryBreakdown,
  computeKpis,
  duesRows,
  projectName,
  projectRows,
  quarterlyCashflow,
} from './selectors';

interface WorkbookInput {
  mandate: string;
  transactions: Transaction[];
  projects: BudgetProject[];
  lines: BudgetLine[];
  dues: DuesRecord[];
  audit: AuditEntry[];
  duesPayments: TreasuryPayment[];
}

function timestamp(value: number): string {
  return value ? new Date(value).toLocaleString('ro-RO') : '';
}

export function buildBudgetSheets(input: WorkbookInput): SheetSpec[] {
  const { mandate, transactions, projects, lines, dues, audit, duesPayments = [] } = input;
  const kpis = computeKpis(transactions, duesPayments);

  const summary: SheetSpec = {
    name: 'Sumar Executiv',
    header: ['Indicator', 'Valoare (RON)'],
    widths: [38, 18],
    rows: [
      ['Mandat', mandate],
      ['Sold Curent (Disponibil)', kpis.currentBalance],
      ['Total Venituri Mandat', kpis.mandateIncome],
      ['Total Cheltuieli Mandat', kpis.mandateExpense],
      ['Venituri / Încasări Directe', kpis.directIncome],
      ['Cotizații Încasate', kpis.duesIncome],
      ['Cheltuieli Plătite', kpis.settledExpense],
      ['Donații Caritabile Redirecționate', kpis.charityRedirected],
      [],
      ['Distribuția Cheltuielilor', ''],
      ...categoryBreakdown(transactions, 'cheltuiala').map(slice => [slice.label, slice.value]),
      [],
      ['Surse de Venit', ''],
      ...categoryBreakdown(transactions, 'venit', duesPayments).map(slice => [slice.label, slice.value]),
      [],
      ['Cashflow Trimestrial', 'Venituri', 'Cheltuieli', 'Net'],
      ...quarterlyCashflow(transactions, duesPayments).map(quarter => [
        `${quarter.label} (${quarter.span})`,
        quarter.income,
        quarter.expense,
        quarter.income - quarter.expense,
      ]),
    ],
  };

  const general: SheetSpec = {
    name: 'Buget General',
    header: [
      'Categorie / Linie Bugetară',
      'Tip',
      'Buget Planificat (RON)',
      'Realizat (RON)',
      'Diferență / Rămas (RON)',
      '% Execuție',
    ],
    widths: [34, 14, 20, 18, 22, 14],
    rows: budgetLineRows(lines, transactions).map(row => [
      row.category,
      TX_TYPE_LABELS[row.type],
      row.planned,
      row.realized,
      row.difference,
      row.planned > 0 ? `${Math.round(row.execution * 100)}%` : '—',
    ]),
  };

  const projectsSheet: SheetSpec = {
    name: 'Buget pe Proiecte',
    header: [
      'Nume Proiect',
      'Status',
      'Venit Estimat',
      'Venit Realizat',
      'Cheltuieli Estimative',
      'Cheltuieli Reale',
      'Profit Net Caritabil',
      'Eficiență Buget (ROI)',
    ],
    widths: [26, 16, 16, 16, 20, 18, 20, 20],
    rows: projectRows(projects, transactions).map(row => [
      row.name,
      PROJECT_STATUS_LABELS[row.status],
      row.estimatedIncome,
      row.realizedIncome,
      row.estimatedExpense,
      row.realizedExpense,
      row.netCharitable,
      row.roi === null ? '—' : Number(row.roi.toFixed(2)),
    ]),
  };

  const ledger: SheetSpec = {
    name: 'Registru Tranzacții',
    header: [
      'ID Tranzacție',
      'Data',
      'Tip',
      'Categorie',
      'Proiect',
      'Sumă (RON)',
      'Status',
      'Membru / Sursă',
      'Dovadă / Document',
      'Aprobat de',
      'Observații',
    ],
    widths: [14, 12, 14, 24, 22, 14, 18, 24, 40, 20, 36],
    rows: [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(tx => [
        tx.code,
        tx.date,
        TX_TYPE_LABELS[tx.type],
        tx.category,
        projectName(projects, tx.projectId),
        tx.amount,
        TX_STATUS_LABELS[tx.status],
        tx.source,
        tx.documentUrl,
        tx.approvedBy,
        tx.notes,
      ]),
  };

  const duesSheet: SheetSpec = {
    name: 'Cotizații',
    header: ['Nume Membru', 'Funcție Board', ...MANDATE_MONTHS, 'Total Achitat', 'Status'],
    widths: [26, 20, ...MANDATE_MONTHS.map(() => 7), 16, 14],
    rows: duesRows(dues)
      .sort((a, b) => a.memberName.localeCompare(b.memberName, 'ro'))
      .map(row => [
        row.memberName,
        row.boardRole,
        ...row.months.map(value => Number(value) || 0),
        row.totalPaid,
        row.isComplete ? 'Complet' : 'Restanțier',
      ]),
  };

  // Fiecare rând poartă `ts` (milisecunde) pentru sortare cronologică corectă;
  // sortarea pe textul formatat „DD.MM.YYYY" ar amesteca ordinea între luni/zile.
  const auditActionRows = audit.map(entry => ({
    ts: entry.timestamp ?? 0,
    row: [
      timestamp(entry.timestamp),
      entry.user,
      entry.action,
      entry.txCode,
      entry.oldValue,
      entry.newValue,
      entry.details,
      '',
      '',
    ],
  }));

  // Dues receipts have no image support in this minimal .xlsx writer, so the
  // signature columns record presence ("Da"/"Nu") rather than the ink itself —
  // the actual images stay viewable in-app on the Audit Log tab.
  const duesPaymentRows = input.duesPayments.map(payment => ({
    ts: payment.date ? new Date(payment.date).getTime() || 0 : 0,
    row: [
      payment.date ? new Date(payment.date).toLocaleString('ro-RO') : '',
      'Trezorier',
      'Încasare Cotizație',
      payment.id,
      '',
      `+${payment.amount} RON`,
      `Cotizație ${payment.month} — ${payment.memberName}`,
      payment.memberSignature ? 'Da' : 'Nu',
      payment.treasurerSignature ? 'Da' : 'Nu',
    ],
  }));

  const auditSheet: SheetSpec = {
    name: 'Audit Log',
    header: [
      'Timestamp',
      'Utilizator',
      'Acțiune',
      'ID Tranzacție',
      'Valoare Veche',
      'Valoare Nouă',
      'Detalii',
      'Semnătură Membru',
      'Semnătură Trezorier',
    ],
    widths: [20, 22, 18, 18, 26, 26, 40, 16, 18],
    rows: [...auditActionRows, ...duesPaymentRows]
      .sort((a, b) => b.ts - a.ts)
      .map(entry => entry.row),
  };

  return [summary, general, projectsSheet, ledger, duesSheet, auditSheet];
}

export function exportBudgetWorkbook(input: WorkbookInput): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const safeMandate = input.mandate.replace(/[^0-9]+/g, '-').replace(/(^-|-$)/g, '');
  downloadXlsx(`Buget-Interact-${safeMandate}-${stamp}.xlsx`, buildBudgetSheets(input));
}
