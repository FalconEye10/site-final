import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Eraser } from 'lucide-react';
import { TreasuryPayment, processTreasuryPayment } from '../../utils/supabaseService';
import { getTargetMonthForPayment, generateSmartTransactionId } from '../../utils/finance';
import { toast } from '../ui/Toast';

interface PaymentModalProps {
  memberId: string;
  memberName: string;
  totalPaid: number;
  joinDateStr?: string;
  onClose: () => void;
  /** Receives the authoritative post-write values from the transaction, not a client-guessed estimate. */
  onSuccess: (newTotalPaid: number, newStatus: string) => void;
}

const SignatureCanvas = ({ title, onSign }: { title: string, onSign: (b64: string | null) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff'; // White background for JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000'; // Black ink
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSignature(true);
    draw(e);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
      // Compress and export immediately on mouse up
      exportCompressed();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setHasSignature(false);
    onSign(null);
  };

  const exportCompressed = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an offscreen canvas to resize to 300x100
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 300;
    offCanvas.height = 100;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    // Draw white background
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, 300, 100);

    // Draw the original canvas scaled down
    offCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 300, 100);

    // Convert to grayscale
    const imgData = offCtx.getImageData(0, 0, 300, 100);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = avg;     // red
      data[i + 1] = avg; // green
      data[i + 2] = avg; // blue
      // Alpha remains unchanged
    }
    offCtx.putImageData(imgData, 0, 0);

    // Export as ultra-compressed JPEG (0.3 quality)
    const base64 = offCanvas.toDataURL('image/jpeg', 0.3);
    onSign(base64);
  };

  return (
    <div className="flex flex-col items-center w-full font-anthropic">
      <div className="flex justify-between items-center w-full mb-1">
        <label className="text-xs font-bold text-slate-700 font-title">{title}</label>
        {hasSignature && (
          <button type="button" onClick={clear} className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors cursor-pointer font-title">
            <Eraser size={12} /> Șterge
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        onMouseDown={startDrawing}
        onMouseUp={endDrawing}
        onMouseOut={endDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={endDrawing}
        onTouchMove={draw}
        className="border-2 border-dashed border-slate-300 rounded-[2px] bg-white w-full max-w-[400px] h-[150px] touch-none cursor-crosshair hover:border-slate-400 transition-colors"
      />
    </div>
  );
};

export const PaymentModal: React.FC<PaymentModalProps> = ({ memberId, memberName, totalPaid, joinDateStr, onClose, onSuccess }) => {
  const [memberSig, setMemberSig] = useState<string | null>(null);
  const [treasurerSig, setTreasurerSig] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetMonth = getTargetMonthForPayment(joinDateStr, totalPaid);
  const transactionId = generateSmartTransactionId(memberName, new Date());

  const handleSubmit = async () => {
    if (!memberSig || !treasurerSig) {
      toast.error("Ambele semnături sunt obligatorii pentru tranzacție.");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentDoc: TreasuryPayment = {
        id: transactionId,
        memberId,
        memberName,
        amount: 15, // STRICT: mereu 15
        month: targetMonth,
        date: new Date().toISOString(),
        memberSignature: memberSig,
        treasurerSignature: treasurerSig,
      };

      const result = await processTreasuryPayment(memberId, paymentDoc);
      toast.success(`Cotizația pentru ${targetMonth} a fost înregistrată!`);
      // Update UI with the authoritative values from the transaction
      onSuccess(result.newTotalPaid, result.newStatus);
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Eroare la procesarea plății");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto overscroll-contain p-2.5 sm:p-4 flex min-h-full items-start sm:items-center justify-center font-anthropic">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 sm:p-7 shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[88vh] flex flex-col my-auto touch-pan-y font-anthropic"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-white">Încasare Cotizație</h2>
            <p className="text-xs text-slate-500 font-data">Tranzacție securizată • ID: {transactionId}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[2px] transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 pr-1 -mr-1 scrollbar-thin touch-pan-y space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-[2px] p-3.5 flex flex-col items-center font-anthropic">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1 font-title">Cotizație Acoperită</span>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 font-title">{targetMonth}</span>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2px] px-4 py-1 shadow-xs flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-data">15 RON</span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 font-anthropic">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p>Conform regulamentului, plățile se fac strict per lună (15 RON). Sumele în avans sau parțiale nu sunt permise.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <SignatureCanvas title={`Semnătură Membru: ${memberName}`} onSign={setMemberSig} />
            <SignatureCanvas title="Semnătură Trezorier" onSign={setTreasurerSig} />
          </div>
        </div>

        <div className="pt-3 pb-1 sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 z-10">
          <button
            onClick={handleSubmit}
            disabled={!memberSig || !treasurerSig || isSubmitting}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-[2px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 font-title cursor-pointer shadow-xs"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Se procesează tranzacția...</span>
            ) : (
              <>
                <CheckCircle size={16} /> Confirmă Încasarea (15 RON)
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
