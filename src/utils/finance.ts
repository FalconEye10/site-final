import { formatRomaniaDateTime } from './romaniaTime';

export const COTIZATIE_LUNARA = 15;

export interface MemberMonth {
  monthIndex: number;
  year: number;
  name: string;
  shortName: string;
  status: 'Achitat' | 'Neachitat' | 'Viitor' | 'Neaplicabil';
  amountPaid?: number;
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
  const collectionStart = new Date(INITIAL_COLLECTION_START);
  if (!joinDateStr) return collectionStart;
  const parsed = new Date(joinDateStr);
  if (Number.isNaN(parsed.getTime())) return collectionStart;
  // Dacă s-a alăturat înainte de startul colectării pe site, startul este August 2026
  return parsed < collectionStart ? collectionStart : parsed;
}

/**
 * Generează istoricul calendaristic al membrului de la startul colectării până în prezent.
 * Aplică automat plățile (totalPaid) peste cele mai vechi luni.
 * OPȚIUNEA B: Se plătește luna întreagă (15 RON) indiferent de ziua înscrierii în acea lună.
 */
export function generateMemberLedger(joinDateStr: string | undefined | null, totalPaid: number = 0): MemberMonth[] {
  const startDate = getEffectiveStartDate(joinDateStr);
  const currentDate = new Date();
  const months: MemberMonth[] = [];

  // Guard: dacă joinDate este în viitor (eroare de introducere), returnăm array gol
  if (startDate > currentDate) return months;
  
  let currentY = startDate.getFullYear();
  let currentM = startDate.getMonth();
  
  let remainingPaid = Math.max(0, totalPaid || 0);

  while (currentY < currentDate.getFullYear() || (currentY === currentDate.getFullYear() && currentM <= currentDate.getMonth())) {
    let status: 'Achitat' | 'Neachitat' = 'Neachitat';
    let amountPaidForThisMonth = 0;

    if (remainingPaid >= COTIZATIE_LUNARA) {
      status = 'Achitat';
      amountPaidForThisMonth = COTIZATIE_LUNARA;
      remainingPaid -= COTIZATIE_LUNARA;
    }

    months.push({
      monthIndex: currentM + 1,
      year: currentY,
      name: MONTH_NAMES[currentM],
      shortName: SHORT_MONTHS[currentM],
      status,
      amountPaid: amountPaidForThisMonth
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
 * Calculează datoria totală (conform formulei stricte).
 * OPȚIUNEA B: Se plătește luna întreagă (15 RON) indiferent de ziua înscrierii.
 */
export function calculateDebt(joinDateStr: string | undefined | null, totalPaid: number = 0): number {
  const startDate = getEffectiveStartDate(joinDateStr);
  const currentDate = new Date();
  
  if (currentDate < startDate) return 0;
  
  const currentY = currentDate.getFullYear();
  const currentM = currentDate.getMonth() + 1; // 1-indexed (Ian=1, Aug=8...)
  
  const startY = startDate.getFullYear();
  const startM = startDate.getMonth() + 1; // 1-indexed
  
  // Math.max(0, ...) — guard defensiv contra joinDate eronate care ar putea produce valori negative
  const totalMonths = Math.max(0, (currentY - startY) * 12 + (currentM - startM) + 1);
  if (totalMonths <= 0) return 0;
  
  const totalExpected = totalMonths * COTIZATIE_LUNARA;
  const safePaid = Math.max(0, Number(totalPaid) || 0);
  const debt = totalExpected - safePaid;
  return Math.max(0, debt);
}

export const calculateDynamicDebt = calculateDebt;

/**
 * Determină următoarea lună calendaristică restantă (ex: "August 2026")
 */
export function getTargetMonthForPayment(joinDateStr: string | undefined | null, totalPaid: number = 0): string {
  const startDate = getEffectiveStartDate(joinDateStr);
  const monthsPaid = Math.floor((totalPaid || 0) / COTIZATIE_LUNARA);
  
  const targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + monthsPaid, 1);
  return `${MONTH_NAMES[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
}

/**
 * Generare SMART ID (Referință Tranzacție) - Ex: TX-IUN26-SS-13
 */
export function generateSmartTransactionId(memberName: string, dateObj: Date): string {
  const month = SHORT_MONTHS[dateObj.getMonth()].toUpperCase();
  const year = dateObj.getFullYear().toString().slice(2);
  
  // Eliminăm diacriticele și luăm inițialele
  const cleanName = memberName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const initials = cleanName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  
  // Sufix random de 4 caractere alfanumerice pentru unicitate garantată (reduce coliziuni ~1.7M combinații)
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `TX-${month}${year}-${initials}-${day}-${randomSuffix}`;
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
      colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
      percentage: 0,
      barColorClass: 'bg-amber-500'
    };
  }

  // If member is passive, they are not penalized and get a neutral qualification
  if (status?.toLowerCase() === 'passive') {
    return {
      rate: '100%',
      qualification: 'Pasiv',
      colorClass: 'bg-indigo-50/50 text-indigo-600 border-indigo-200/50',
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
  let colorClass = 'bg-rose-50 text-rose-600 border-rose-200'; // <65%
  let barColorClass = 'bg-rose-600';
  
  if (percentage === 100) {
    qualification = 'Maxim';
    colorClass = 'bg-[#00ADFF]/10 text-[#00ADFF] border-[#00ADFF]/30'; // Perfect Blue
    barColorClass = 'bg-[#00ADFF]';
  } else if (percentage >= 85) {
    qualification = 'Excelent';
    colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-200'; // Emerald Green
    barColorClass = 'bg-emerald-600';
  } else if (percentage >= 75) {
    qualification = 'Foarte Bine';
    colorClass = 'bg-indigo-50 text-indigo-500 border-indigo-200'; // Indigo
    barColorClass = 'bg-indigo-500';
  } else if (percentage >= 65) {
    qualification = 'Satisfăcător';
    colorClass = 'bg-orange-50 text-orange-500 border-orange-200'; // Orange
    barColorClass = 'bg-orange-500';
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
    if (tempAmount >= COTIZATIE_LUNARA) {
      monthsCovered.push(`${m.name} ${m.year}`);
      tempAmount -= COTIZATIE_LUNARA;
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
