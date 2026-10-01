import { formatRomaniaDateTime, getRomaniaDateParts } from './romaniaTime';

export const COTIZATIE_LUNARA_PRE_OCT = 15;
export const COTIZATIE_LUNARA_OCT_PLUS = 20;
export const COTIZATIE_LUNARA = 20; // Cotizație standard curentă (începând cu Octombrie 2026)

/**
 * Returnează valoarea cotizației pentru o anumită lună:
 * - Lunile de dinainte de 1 Octombrie 2026: 15 RON / lună
 * - Începând cu 1 Octombrie 2026 inclusiv: 20 RON / lună
 *
 * @param year Anul (ex: 2026)
 * @param monthIndex0Based Indexul lunii 0-indexed (0 = Ian, 7 = Aug, 8 = Sep, 9 = Oct, ...)
 */
export function getFeeForMonth(year: number, monthIndex0Based: number): number {
  if (year < 2026) return COTIZATIE_LUNARA_PRE_OCT;
  if (year === 2026 && monthIndex0Based < 9) return COTIZATIE_LUNARA_PRE_OCT;
  return COTIZATIE_LUNARA_OCT_PLUS;
}

export function getFeeForMonth1Based(year: number, month1Based: number): number {
  return getFeeForMonth(year, month1Based - 1);
}

export interface MemberMonth {
  monthIndex: number;
  year: number;
  name: string;
  shortName: string;
  status: 'Achitat' | 'Neachitat' | 'Viitor' | 'Neaplicabil';
  amountPaid?: number;
  fee?: number;
}

export interface PaymentReceipt {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  dateFormatted: string;
  amount: number;
  monthsCovered: string[];
  signatureMemberBase64?: string;
  signatureTreasurerBase64?: string;
  collector: string;
  status: 'Valid' | 'Anulat';
}

const MONTH_NAMES = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
];
const SHORT_MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];

export const INITIAL_COLLECTION_START = "2026-08-01"; // Start colectare cotizații pe site din August 2026

/**
 * Returnează data de la care se calculează datoriile pentru un membru.
 * Pentru mandatul curent inițial, colectarea pe site începe din August 2026 (2026-08-01).
 * Pentru membrii înscriși ulterior (după August 2026), se calculează de la luna efectivă de joinDate.
 */
export function getEffectiveStartDate(joinDateStr: string | undefined | null): Date {
  const collectionStart = new Date(2026, 7, 1); // August 1, 2026 (luna 8, index 7)
  if (!joinDateStr) return collectionStart;
  const parsed = new Date(joinDateStr);
  if (Number.isNaN(parsed.getTime())) return collectionStart;
  
  const normalizedParsed = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  // Dacă s-a alăturat înainte de startul colectării pe site, startul este August 2026
  return normalizedParsed < collectionStart ? collectionStart : normalizedParsed;
}

/**
 * Generează istoricul calendaristic al membrului de la startul colectării până în prezent.
 * Aplică automat plățile (totalPaid) peste cele mai vechi luni.
 * Se plătește luna întreagă (15 RON Aug-Sep 2026, 20 RON din Oct 2026) indiferent de ziua înscrierii.
 */
export function generateMemberLedger(joinDateStr: string | undefined | null, totalPaid: number = 0): MemberMonth[] {
  const startDate = getEffectiveStartDate(joinDateStr);
  const nowParts = getRomaniaDateParts(new Date());
  const currentTargetY = nowParts.year;
  const currentTargetM = nowParts.month - 1; // 0-indexed
  const months: MemberMonth[] = [];

  let currentY = startDate.getFullYear();
  let currentM = startDate.getMonth();
  
  let remainingPaid = Math.max(0, Number(totalPaid) || 0);

  while (currentY < currentTargetY || (currentY === currentTargetY && currentM <= currentTargetM)) {
    const feeForThisMonth = getFeeForMonth(currentY, currentM);
    let status: 'Achitat' | 'Neachitat' = 'Neachitat';
    let amountPaidForThisMonth = 0;

    if (remainingPaid >= feeForThisMonth) {
      status = 'Achitat';
      amountPaidForThisMonth = feeForThisMonth;
      remainingPaid -= feeForThisMonth;
    }

    months.push({
      monthIndex: currentM + 1,
      year: currentY,
      name: MONTH_NAMES[currentM],
      shortName: SHORT_MONTHS[currentM],
      status,
      amountPaid: amountPaidForThisMonth,
      fee: feeForThisMonth
    });

    currentM++;
    if (currentM > 11) {
      currentM = 0;
      currentY++;
    }
  }

  return months;
}

/**
 * Calculează datoria totală (conform formulei stricte dinamice).
 * Lunile dinainte de Octombrie 2026 (Aug, Sep): 15 RON/lună.
 * Din 1 Octombrie 2026 inclusiv: 20 RON/lună.
 */
export function calculateDebt(joinDateStr: string | undefined | null, totalPaid: number = 0): number {
  const startDate = getEffectiveStartDate(joinDateStr);
  const nowParts = getRomaniaDateParts(new Date());
  
  const currentTargetY = nowParts.year;
  const currentTargetM = nowParts.month - 1; // 0-indexed
  
  let currentY = startDate.getFullYear();
  let currentM = startDate.getMonth(); // 0-indexed
  
  if (currentTargetY < currentY || (currentTargetY === currentY && currentTargetM < currentM)) return 0;
  
  let totalExpected = 0;
  while (currentY < currentTargetY || (currentY === currentTargetY && currentM <= currentTargetM)) {
    totalExpected += getFeeForMonth(currentY, currentM);
    currentM++;
    if (currentM > 11) {
      currentM = 0;
      currentY++;
    }
  }
  
  const safePaid = Math.max(0, Number(totalPaid) || 0);
  const debt = totalExpected - safePaid;
  return Math.max(0, debt);
}

export const calculateDynamicDebt = calculateDebt;

/**
 * Determină următoarea lună calendaristică restantă și suma datorată (ex: "Octombrie 2026", 20 RON)
 */
export function getTargetPaymentDetails(joinDateStr: string | undefined | null, totalPaid: number = 0): {
  monthName: string;
  year: number;
  label: string;
  amountDue: number;
} {
  const startDate = getEffectiveStartDate(joinDateStr);
  let remainingPaid = Math.max(0, Number(totalPaid) || 0);
  let currentY = startDate.getFullYear();
  let currentM = startDate.getMonth(); // 0-indexed

  while (true) {
    const fee = getFeeForMonth(currentY, currentM);
    if (remainingPaid >= fee) {
      remainingPaid -= fee;
      currentM++;
      if (currentM > 11) {
        currentM = 0;
        currentY++;
      }
    } else {
      break;
    }
  }

  const fee = getFeeForMonth(currentY, currentM);
  const monthName = MONTH_NAMES[currentM];
  return {
    monthName,
    year: currentY,
    label: `${monthName} ${currentY}`,
    amountDue: fee
  };
}

/**
 * Determină următoarea lună calendaristică restantă (ex: "Octombrie 2026")
 */
export function getTargetMonthForPayment(joinDateStr: string | undefined | null, totalPaid: number = 0): string {
  return getTargetPaymentDetails(joinDateStr, totalPaid).label;
}

/**
 * Determină valoarea cotizației pentru următoarea lună restantă (15 RON pt lunile pre-Octombrie, 20 RON din Octombrie 2026)
 */
export function getTargetAmountForPayment(joinDateStr: string | undefined | null, totalPaid: number = 0): number {
  return getTargetPaymentDetails(joinDateStr, totalPaid).amountDue;
}

/**
 * Generare SMART ID (Referință Tranzacție) - Ex: TX-IUN26-SS-13
 */
export function generateSmartTransactionId(memberName: string, dateObj: Date): string {
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  
  // Eliminăm diacriticele și luăm inițialele
  const cleanName = (memberName || 'VOL').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const initials = cleanName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 3) || 'MEM';
  
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CHIT-${year}-${month}-${initials}-${randomSuffix}`;
}

/**
 * Calculează calificativul și procentul de prezență
 */
export function calculateQualification(p: number, _e: number, u: number, status?: string, role?: string): { rate: string, qualification: string, colorClass: string, percentage: number, barColorClass: string } {
  // If member is Board / Admin, they are exempt from attendance tracking
  if (role?.toLowerCase() === 'admin' || status?.toLowerCase() === 'admin') {
    return {
      rate: '—',
      qualification: 'Board',
      colorClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60',
      percentage: 0,
      barColorClass: 'bg-amber-500'
    };
  }

  // If member is passive, they are not penalized and get a neutral qualification
  if (status?.toLowerCase() === 'passive') {
    return {
      rate: '100%',
      qualification: 'Pasiv',
      colorClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
      percentage: 100,
      barColorClass: 'bg-indigo-500'
    };
  }

  // Enforce minimum 0, fallback for NaN or negative
  const presences = Math.max(0, isNaN(p) ? 0 : p);
  const unexcused = Math.max(0, isNaN(u) ? 0 : u);
  
  const totalRelevant = presences + unexcused;
  
  let percentage = 100;
  if (totalRelevant > 0) {
    percentage = (presences / totalRelevant) * 100;
  }
  
  const rateStr = Math.round(percentage) + '%';
  
  let qualification = 'Critic';
  let colorClass = 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'; // <65%
  let barColorClass = 'bg-rose-600';
  
  if (percentage === 100) {
    qualification = 'Maxim';
    colorClass = 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'; // Perfect Blue
    barColorClass = 'bg-sky-600';
  } else if (percentage >= 85) {
    qualification = 'Excelent';
    colorClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'; // Emerald Green
    barColorClass = 'bg-emerald-600';
  } else if (percentage >= 75) {
    qualification = 'Foarte Bine';
    colorClass = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'; // Indigo
    barColorClass = 'bg-indigo-500';
  } else if (percentage >= 65) {
    qualification = 'Satisfăcător';
    colorClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'; // Amber
    barColorClass = 'bg-amber-500';
  }
  
  return { rate: rateStr, qualification, colorClass, percentage, barColorClass };
}

export function processDynamicPayment(
  joinDateStr: string,
  totalPaid: number,
  amountPaying: number,
  memberId: string,
  memberName: string,
  signatureMemberBase64: string,
  signatureTreasurerBase64: string,
  collector: string = 'Trezorier'
): { updatedTotalPaid: number; receipt: PaymentReceipt } {
  
  const currentMonths = generateMemberLedger(joinDateStr, totalPaid);
  const unpaidMonths = currentMonths.filter(m => m.status === 'Neachitat');
  
  let tempAmount = amountPaying;
  const monthsCovered: string[] = [];
  
  for (const m of unpaidMonths) {
    const fee = m.fee || getFeeForMonth(m.year, m.monthIndex - 1);
    if (tempAmount >= fee) {
      monthsCovered.push(`${m.name} ${m.year}`);
      tempAmount -= fee;
    } else {
      break;
    }
  }

  const dateNow = new Date();
  const dateFormatted = formatRomaniaDateTime(dateNow, { 
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const receipt: PaymentReceipt = {
    id: 'R-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    memberId,
    memberName,
    date: dateNow.toISOString(),
    dateFormatted,
    amount: amountPaying,
    monthsCovered,
    signatureMemberBase64,
    signatureTreasurerBase64,
    collector,
    status: 'Valid'
  };
  return {
    updatedTotalPaid: totalPaid + amountPaying,
    receipt
  };
}
