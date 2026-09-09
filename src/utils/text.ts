/**
 * Utilitar Centralizat pentru Normalizarea Textului și a Diacriticelor în Limba Română.
 * Asigură căutări fluide, tolerante la accente și diacritice (ă, â, î, ș, ț).
 */
export function normalizeDiacritics(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
