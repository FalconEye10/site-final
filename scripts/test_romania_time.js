const ROMANIA_TIMEZONE = 'Europe/Bucharest';

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

function getRomaniaDateParts(inputDate = new Date()) {
  const d = typeof inputDate === 'string' || typeof inputDate === 'number' ? new Date(inputDate) : inputDate;
  const parts = dtfRomaniaParts.formatToParts(d);
  const getPart = (type) => parts.find(p => p.type === type)?.value || '00';

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  let hour = parseInt(getPart('hour'), 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

function getRomaniaDateTimeMs(dateStr, timeStr = '00:00') {
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

function formatRomania(date, options = {}) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: ROMANIA_TIMEZONE,
    ...options
  }).format(d);
}

// Test outputs
console.log('Current Romania date parts:', getRomaniaDateParts());
console.log('Today in Romania:', getRomaniaDateParts().dateStr);
console.log('Current Romania time:', getRomaniaDateParts().timeStr);

const eventMs = getRomaniaDateTimeMs('2026-08-16', '19:00');
console.log('Event Ms:', eventMs, 'Formatted in Romania:', formatRomania(eventMs, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}));
