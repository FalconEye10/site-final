import { uploadFile } from '../../../../utils/supabaseService';

export interface ProcessedReceipt {
  receiptImage: string; // Base64 compressed fallback
  documentUrl: string; // Storage URL or file label
  sizeKb: number;
}

/**
 * Resizes image to max 1200px and compresses to JPEG at 0.75 quality (~60-85KB).
 */
export async function compressReceiptImage(file: File): Promise<{ base64: string; blob: Blob; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);

        const quality = 0.75;
        const base64 = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          blob => {
            if (blob) {
              const sizeKb = Math.round(blob.size / 1024);
              resolve({ base64, blob, sizeKb });
            } else {
              const approxSizeKb = Math.round((base64.length * 3) / 4 / 1024);
              resolve({ base64, blob: new Blob([base64]), sizeKb: approxSizeKb });
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Handles full receipt processing:
 * 1. Compresses via canvas to max 1200px jpeg at 0.75.
 * 2. Attempts Supabase Storage upload to 'receipts' bucket.
 * 3. Transparently falls back to base64 if storage is unavailable.
 */
export async function processReceiptFile(file: File): Promise<ProcessedReceipt> {
  const { base64, blob, sizeKb } = await compressReceiptImage(file);
  let documentUrl = '';

  try {
    const cleanFileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const { publicUrl, error: uploadErr } = await uploadFile('receipts', cleanFileName, blob);
    if (!uploadErr && publicUrl) {
      documentUrl = publicUrl;
    }
  } catch (err) {
    console.warn('[receiptUtils] Supabase Storage upload fallback to base64:', err);
  }

  return {
    receiptImage: base64,
    documentUrl: documentUrl || file.name,
    sizeKb,
  };
}
