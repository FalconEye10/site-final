import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabase';

export interface ExportMemberData {
  id: string;
  name: string;
  role: string;
  status: string;
}

export interface PDFGenerationOptions {
  month: string;
  year: number | string;
  members: ExportMemberData[];
}

/** Elimina diacriticele din orice string */
function n(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalizare string pentru cautari/potriviri insensibile la diacritice si majuscule */
function normalizeStr(s: string | undefined | null): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/** Compresie Base64 → JPEG 30% via Canvas (folosit la stocare) */
export async function compressBase64Image(base64Str: string | undefined): Promise<string> {
  if (!base64Str) return '';
  const src = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.3));
      } catch { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

/**
 * Elimina fundalul alb/deschis dintr-o semnatura si returneaza PNG cu transparenta curata.
 * Redimensioneaza la 300px latime inainte de procesare.
 */
async function signatureToPng(base64Str: string): Promise<string> {
  if (!base64Str) return '';
  const src = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const TARGET_W = 300;
        const ratio    = img.height / (img.width || TARGET_W);
        const W = TARGET_W;
        const H = Math.max(1, Math.round(W * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        // 1. Desenăm fundalul alb explicit (acoperă canvasuri transparente)
        // Astfel, algoritmul de eliminare fundal funcționează identic
        // indiferent dacă sursa era JPEG (fundal alb implicit) sau PNG transparent
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, W, H);

        // 2. Desenăm semnătura peste fundalul alb
        ctx.drawImage(img, 0, 0, W, H);
        const imgData = ctx.getImageData(0, 0, W, H);
        const d = imgData.data;

        // 3. Eliminăm pixelii albi/foarte deschisi → transparent
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Eliminam pixelii albi sau foarte deschisi (fond paza/canvas/compresie) -> transparent
          if (r > 190 && g > 190 && b > 190) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

/** Incarca imagine URL → { base64, pxW, pxH } */
async function loadImageData(url: string): Promise<{ base64: string; pxW: number; pxH: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({ base64: canvas.toDataURL('image/jpeg', 0.9), pxW: img.width, pxH: img.height });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Incarca font TTF de la URL → base64 (pentru jsPDF addFont) */
async function loadFontBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK)
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    return btoa(binary);
  } catch { return null; }
}

/** Generarea documentului PDF de trezorerie */
export async function generateTreasuryPDF({ month, year, members }: PDFGenerationOptions) {
  try {
    console.log('[PDF] Start generare pentru:', month, year);

    // 1. Preluam si sortam toti membrii din lista
    const activeCotizanti = members.filter(m => m && m.name && m.name.trim() !== '');
    activeCotizanti.sort((a, b) => a.name.localeCompare(b.name, 'ro'));
    console.log('[PDF] Membri totali inclusi:', activeCotizanti.length);

    // Lunile fara diacritice
    const monthString = n(`${month} ${year}`);

    const tableData: string[][] = [];

    // 2. Preluam toate platile din Supabase
    let allPayments: any[] = [];
    try {
      const { data, error } = await supabase.from('payments').select('*');
      if (error) throw error;
      allPayments = data || [];
    } catch (e) {
      console.warn('[PDF] Eroare la preluarea plăților:', e);
    }

    const targetMonthNorm = normalizeStr(`${month} ${year}`);
    const targetMonthOnly = normalizeStr(month);

    for (let i = 0; i < activeCotizanti.length; i++) {
      const member = activeCotizanti[i];
      let memberSig = '', treasSig = '';

      const memIdNorm = normalizeStr(member.id);
      const memNameNorm = normalizeStr(member.name);

      const matchedPayment = allPayments.find(p => {
        if (p.status === 'Anulat') return false;
        const pMemId = normalizeStr(p.memberId);
        const pMemName = normalizeStr(p.memberName);
        const pMonth = normalizeStr(p.month);

        const isMemberMatch = (pMemId && pMemId === memIdNorm) || (pMemName && pMemName === memNameNorm);
        const isMonthMatch = pMonth === targetMonthNorm || pMonth.includes(targetMonthOnly);

        return isMemberMatch && isMonthMatch;
      });

      if (matchedPayment) {
        memberSig = matchedPayment.memberSignature || matchedPayment.signatureMemberBase64 || matchedPayment.memberSig || matchedPayment.signature || '';
        treasSig  = matchedPayment.treasurerSignature || matchedPayment.signatureTreasurerBase64 || matchedPayment.treasurerSig || '';
      }

      tableData.push([
        (i + 1).toString(),
        n(member.name),
        '15 RON',
        // signatureToPng: PNG transparent (fara fundal alb)
        memberSig ? await signatureToPng(memberSig) : '',
        treasSig  ? await signatureToPng(treasSig)  : '',
      ]);
    }

    // 3. Cream documentul jsPDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth  = doc.internal.pageSize.getWidth();  // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const MARGIN = 15; // mm

    // 4. Incarcam fontul Manrope (Google Fonts GitHub – CORS deschis, TTF)
    const GH = 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/static/';
    let FONT      = 'helvetica';
    let FONT_BOLD = 'helvetica';
    const [regB64, boldB64] = await Promise.all([
      loadFontBase64(GH + 'Manrope-Regular.ttf'),
      loadFontBase64(GH + 'Manrope-Bold.ttf'),
    ]);
    if (regB64) {
      doc.addFileToVFS('Manrope-Regular.ttf', regB64);
      doc.addFont('Manrope-Regular.ttf', 'Manrope', 'normal');
      FONT = 'Manrope';
    }
    if (boldB64) {
      doc.addFileToVFS('Manrope-Bold.ttf', boldB64);
      doc.addFont('Manrope-Bold.ttf', 'Manrope', 'bold');
      FONT_BOLD = 'Manrope';
    }

    // 5. Incarcam logo-ul din public/img.jpeg
    const logoData = await loadImageData(window.location.origin + '/img.jpeg');
    let logoBase64 = '', logoPdfW = 0;
    const LOGO_H1 = 32, LOGO_H2 = 24;
    if (logoData) {
      logoBase64 = logoData.base64;
      logoPdfW   = (logoData.pxW / logoData.pxH) * LOGO_H1;
    }

    // 6. Helper antet + subsol
    // Apelat DOAR din bucla finala (o singura data per pagina, cu totalPages corect)
    const drawHeaderFooter = (pageNum: number, totalPgs: number) => {

      if (pageNum === 1) {
        // Logo stanga-sus
        if (logoBase64 && logoPdfW > 0) {
          try { doc.addImage(logoBase64, 'JPEG', MARGIN, 4, logoPdfW, LOGO_H1); } catch { /* ignore */ }
        }
        // Titlu: Manrope Bold, tracking larg, uppercase
        doc.setTextColor(21, 62, 108);
        doc.setFont(FONT_BOLD, 'bold');
        doc.setFontSize(17);
        doc.text('TABEL COTIZATII', pageWidth / 2, 18, { align: 'center' });
        // Subtitlu: Manrope Regular, discret
        doc.setTextColor(100, 100, 115);
        doc.setFont(FONT, 'normal');
        doc.setFontSize(10);
        doc.text(`Luna: ${monthString}`, pageWidth / 2, 27, { align: 'center' });
        // Linie separator bleumarin subtila
        doc.setDrawColor(21, 62, 108);
        doc.setLineWidth(0.4);
        doc.line(MARGIN, 39, pageWidth - MARGIN, 39);

      } else {
        // Pagini 2+
        if (logoBase64 && logoPdfW > 0) {
          const w2 = (logoPdfW / LOGO_H1) * LOGO_H2;
          try { doc.addImage(logoBase64, 'JPEG', MARGIN, 3, w2, LOGO_H2); } catch { /* ignore */ }
        }
        doc.setTextColor(21, 62, 108);
        doc.setFont(FONT_BOLD, 'bold');
        doc.setFontSize(9);
        doc.text(`TABEL COTIZATII – ${monthString}  |  pag. ${pageNum} / ${totalPgs}`,
          pageWidth / 2, 15, { align: 'center' });
        doc.setDrawColor(21, 62, 108);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, 30, pageWidth - MARGIN, 30);
      }

      // Subsol
      doc.setDrawColor(21, 62, 108);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, pageHeight - 20, pageWidth - MARGIN, pageHeight - 20);
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      doc.text('Interact Piatra Neamt Camena',     MARGIN,          pageHeight - 14);
      doc.text(`Pagina ${pageNum} din ${totalPgs}`, pageWidth / 2,  pageHeight - 14, { align: 'center' });
      doc.text('Trezorier Sef: Stan Rares Stefan',  pageWidth - MARGIN, pageHeight - 14, { align: 'right' });
      doc.setTextColor(140, 140, 150);
      doc.setFontSize(6.5);
      doc.text(`ID: COTIZ-${month.toUpperCase()}-${year}`, pageWidth / 2, pageHeight - 9, { align: 'center' });
    };

    // 6. Tabel principal
    // A4 landscape: 297mm - 2x15mm margini = 267mm latime utila
    // Coloane: 12 + 89 + 28 + 69 + 69 = 267mm exact â†’ fara tableWidth (ar interferi cu pozitionarea)
    autoTable(doc, {
      startY: 43,
      margin: {
        top: 33,
        bottom: 26,
        left: MARGIN,
        right: MARGIN,
      },
      // NB: NU setam tableWidth â€“ coloanele sumeaza la 267mm si marginile sunt simetrice
      rowPageBreak: 'avoid',
      head: [['NR.', 'NUME SI PRENUME', 'COTIZATIE', 'SEMNATURA COTIZANT', 'SEMNATURA TREZORIER']],
      body: tableData,
      theme: 'grid',
      showHead: 'everyPage',
      styles: {
        font: FONT,
        fontSize: 9,
        textColor: [0, 0, 0],
        lineColor: [21, 62, 108],
        lineWidth: 0.15,
        minCellHeight: 16,
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [21, 62, 108],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 10,
        fontSize: 8,
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: 12,  halign: 'center', fontSize: 9,  font: FONT_BOLD },
        1: { cellWidth: 89,  halign: 'left',   fontSize: 11, font: FONT },
        2: { cellWidth: 28,  halign: 'center', fontStyle: 'bold', fontSize: 9, font: FONT_BOLD },
        3: { cellWidth: 69,  halign: 'center' },
        4: { cellWidth: 69,  halign: 'center' },
      },
      didParseCell: (data) => {
        // Centram toate celulele din header
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
          data.cell.styles.valign = 'middle';
        }
        // Celulele de semnatura: fundal alb si text gol
        if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
          data.cell.text = [];
          // Setam fillColor alb direct in autoTable â†’ evita overdraw-ul pe borduri
          data.cell.styles.fillColor = [255, 255, 255];
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
          const { x, y, width: w, height: h } = data.cell;
          const pngImg = tableData[data.row.index]?.[data.column.index];
          if (pngImg) {
            try {
              // Incadram semnatura in TOT chenarul disponibil (se intinde pe toata suprafata celulei)
              // Padding minim de 0.5mm pentru a nu suprapune liniile de bordura ale tabelului
              const PAD_X = 0.5; // mm
              const PAD_Y = 0.5; // mm
              const fw = Math.max(1, w - PAD_X * 2);
              const fh = Math.max(1, h - PAD_Y * 2);
              const dx = x + PAD_X;
              const dy = y + PAD_Y;
              doc.addImage(pngImg, 'PNG', dx, dy, fw, fh);
            } catch { /* ignore */ }
          }
        }
      },
    });

    // 7. Caseta de validare trezorier
    const lastY = (doc as any).lastAutoTable.finalY;
    let boxY = lastY + 12;
    if (boxY + 42 > pageHeight - 26) { doc.addPage(); boxY = 40; }
    const boxX = MARGIN, boxW = 95;

    doc.setFillColor(21, 62, 108);
    doc.rect(boxX, boxY, boxW, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(FONT_BOLD, 'bold'); doc.setFontSize(8);
    doc.text('SEMNATURA DIGITALA', boxX + boxW / 2, boxY + 6, { align: 'center' });

    doc.setFillColor(245, 248, 252);
    doc.setDrawColor(21, 62, 108); doc.setLineWidth(0.3);
    doc.rect(boxX, boxY + 9, boxW, 30, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont(FONT_BOLD, 'bold'); doc.setFontSize(8);
    doc.text('Trezorier Sef: Stan Rares Stefan', boxX + boxW / 2, boxY + 15, { align: 'center' });
    doc.setFont(FONT, 'normal'); doc.setFontSize(7.5);
    doc.text(`ID: COTIZ-${month.toUpperCase()}-${year}`, boxX + boxW / 2, boxY + 21, { align: 'center' });
    doc.text('[ ......................................... ]', boxX + boxW / 2, boxY + 28, { align: 'center' });
    doc.text('Data: _____ / _____ / 2026', boxX + boxW / 2, boxY + 35, { align: 'center' });

    // 8. Antet + subsol â€“ o singura desenare cu totalPages corect
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawHeaderFooter(i, totalPages);
    }

    // 9. Salvare
    doc.save(`Raport_Trezorerie_${month}_${year}.pdf`);
    console.log('[PDF] Generat cu succes! Pagini:', totalPages);
  } catch (err) {
    console.error('[PDF] EROARE CRITICA:', err);
    throw err;
  }
}

