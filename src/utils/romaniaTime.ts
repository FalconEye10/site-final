/**
 * Utilitar Centralizat pentru Ora și Fusul Orar al României (Europe/Bucharest).
 * 
 * Asigură că toate datele, orele, afișările, formularele și programările
 * respectă cu strictețe Ora României (EET/EEST), indiferent de fusul orar
 * setat pe dispozitivul utilizatorului (telefon, laptop, tabletă).
 */

export const ROMANIA_TIMEZONE = 'Europe/Bucharest';

const dtfRomaniaParts = new Intl.DateTimeFormat('en-US', {
  timeZone: ROMANIA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Returnează componentele calendaristice (an, lună, zi, oră, minut, secundă)
 * specifice orei curente din România.
 */
export function getRomaniaDateParts(inputDate: Date | string | number = new Date()) {
  let d: Date;
  if (typeof inputDate === 'string' || typeof inputDate === 'number') {
    d = new Date(inputDate);
  } else {
    d = inputDate;
  }

  // Dacă data este invalidă, fallback la data curentă
  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const parts = dtfRomaniaParts.formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  let hour = parseInt(getPart('hour'), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    timeStr,
  };
}

/**
 * Returnează data de astăzi în România în formatul "YYYY-MM-DD"
 */
export function getRomaniaTodayString(): string {
  return getRomaniaDateParts(new Date()).dateStr;
}

/**
 * Returnează data de astăzi plus un număr de zile, în format "YYYY-MM-DD" (Ora României)
 */
export function getRomaniaAddDaysString(daysToAdd: number): string {
  const now = new Date();
  const target = new Date(now.getTime() + daysToAdd * 86400000);
  return getRomaniaDateParts(target).dateStr;
}

/**
 * Returnează ora și minutul curent din România, precum și următoarele ore întregi sugerate
 */
export function getRomaniaTimeNow(): {
  hour: string;
  minute: string;
  nextHour: string;
  nextEndHour: string;
} {
  const parts = getRomaniaDateParts(new Date());
  const nextH = (parts.hour + 1) % 24;
  const nextEndH = (parts.hour + 2) % 24;
  return {
    hour: String(parts.hour).padStart(2, '0'),
    minute: String(parts.minute).padStart(2, '0'),
    nextHour: String(nextH).padStart(2, '0'),
    nextEndHour: String(nextEndH).padStart(2, '0'),
  };
}

/**
 * Calculează timestamp-ul UTC exact în milisecunde pentru o dată și oră din România.
 * Indispensabil pentru compararea corectă cu `Date.now()`.
 */
export function getRomaniaDateTimeMs(dateStr: string, timeStr: string = '00:00'): number {
  if (!dateStr) return 0;
  const time = timeStr && timeStr.includes(':') ? timeStr : '00:00';
  const [h, m] = time.split(':');

  const utcGuess = new Date(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00.000Z`);
  const parts = getRomaniaDateParts(utcGuess);
  const romaniaAsUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  const offsetMs = romaniaAsUtc.getTime() - utcGuess.getTime();

  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const hr = parseInt(h, 10) || 0;
  const min = parseInt(m, 10) || 0;
  const targetUtcMs = Date.UTC(yr, mo - 1, dy, hr, min, 0) - offsetMs;

  return targetUtcMs;
}

/**
 * Formatează orice dată / timestamp conform Orei României cu locale 'ro-RO'.
 */
export function formatRomaniaDate(
  dateInput: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
): string {
  if (!dateInput) return '';
  let d: Date;
  if (typeof dateInput === 'string') {
    // Dacă e doar format YYYY-MM-DD, evităm decalajele forțând miezul zilei
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      d = new Date(`${dateInput.trim()}T12:00:00Z`);
    } else {
      d = new Date(dateInput);
    }
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: ROMANIA_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Formatează Data și Ora conform Orei României (ex: "16 aug. 2026, 21:45").
 */
export function formatRomaniaDateTime(
  dateInput: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  return formatRomaniaDate(dateInput, options);
}

/**
 * Returnează Luna și Anul formatate cu majuscule în limba română (ex: "AUGUST 2026").
 */
export function formatRomaniaMonthYear(dateInput: Date | string | number = new Date()): string {
  return formatRomaniaDate(dateInput, { month: 'long', year: 'numeric' }).toUpperCase();
}
