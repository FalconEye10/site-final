import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Eraser, Check } from 'lucide-react';
import { TreasuryPayment, processTreasuryPayment } from '../../utils/supabaseService';
import { getTargetMonthForPayment, generateSmartTransactionId } from '../../utils/finance';
import { toast } from '../ui/Toast';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

interface PaymentModalProps {
  memberId: string;
  memberName: string;
  totalPaid: number;
  joinDateStr?: string;
  currentUserObj?: any;
  onClose: () => void;
  /** Receives the authoritative post-write values from the transaction, not a client-guessed estimate. */
  onSuccess: (newTotalPaid: number, newStatus: string) => void;
}

const SignatureCanvas = ({ title, onSign }: { title: string; onSign: (b64: string | null) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const exportSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) {
      onSign(null);
      return;
    }

    try {
      // Export as crisp 400x140 PNG image
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 400;
      offCanvas.height = 140;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;

      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, 400, 140);
      offCtx.drawImage(canvas, 0, 0, 400, 140);

      const base64 = offCanvas.toDataURL('image/png');
      onSign(base64);
    } catch (err) {
      console.error('Error exporting signature:', err);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      console.debug('Pointer capture not supported:', err);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    isDrawingRef.current = true;
    hasDrawnRef.current = true;
    setHasSignature(true);

    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Desenează un punct imediat la click/tap
    ctx.beginPath();
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      if (canvasRef.current && canvasRef.current.hasPointerCapture(e.pointerId)) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      console.debug('Pointer capture release error:', err);
    }
    exportSignature();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();

    isDrawingRef.current = false;
    hasDrawnRef.current = false;
    setHasSignature(false);
    onSign(null);
  };

  return (
    <div className="flex flex-col items-center w-full font-anthropic">
      <div className="flex justify-between items-center w-full mb-1">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 font-title">{title}</label>
          {hasSignature && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-title">
              <Check size={12} className="stroke-[3]" /> Semnat
            </span>
          )}
        </div>
        {hasSignature && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors cursor-pointer font-title font-semibold"
          >
            <Eraser size={12} /> Șterge
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-[2px] bg-white w-full max-w-[400px] h-[140px] touch-none cursor-crosshair select-none hover:border-slate-400 dark:hover:border-slate-500 transition-colors shadow-inner"
      />
    </div>
  );
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  memberId,
  memberName,
  totalPaid,
  joinDateStr,
  currentUserObj,
  onClose,
  onSuccess
}) => {
  const [memberSig, setMemberSig] = useState<string | null>(null);
  const [treasurerSig, setTreasurerSig] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useBodyScrollLock(true);

  const targetMonth = getTargetMonthForPayment(joinDateStr, totalPaid);
  const transactionId = generateSmartTransactionId(memberName, new Date());

  const handleSubmit = async () => {
    if (!memberSig || !treasurerSig) {
      toast.error('Ambele semnături sunt obligatorii pentru finalizarea tranzacției.');
      return;
    }

    const treasurerName =
      currentUserObj?.name ||
      currentUserObj?.nickname ||
      (currentUserObj?.username ? `@${currentUserObj.username}` : 'Trezorerie');
    const treasurerId = currentUserObj?.id;
    const treasurerUsername = currentUserObj?.username;

    setIsSubmitting(true);
    try {
      const paymentDoc: TreasuryPayment = {
        id: transactionId,
        memberId,
        memberName,
        amount: 15, // STRICT: mereu 15 RON
        month: targetMonth,
        date: new Date().toISOString(),
        memberSignature: memberSig,
        treasurerSignature: treasurerSig,
        recordedBy: treasurerName,
        treasurerId: treasurerId,
        treasurerUsername: treasurerUsername
      };

      const result = await processTreasuryPayment(memberId, paymentDoc);
      toast.success(`Cotizația pentru ${targetMonth} a fost înregistrată cu succes!`);
      onSuccess(result.newTotalPaid, result.newStatus);
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Eroare la procesarea plății');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2.5 sm:p-4 font-anthropic">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 sm:p-7 shadow-2xl h-[90vh] max-h-[640px] flex flex-col font-anthropic z-10 overflow-hidden"
      >
        <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-white">
              Încasare Cotizație
            </h2>
            <p className="text-xs text-slate-500 font-data">Tranzacție securizată • ID: {transactionId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[2px] transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="overflow-y-auto overscroll-contain flex-1 min-h-0 pr-1 -mr-1 scrollbar-thin touch-pan-y space-y-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-[2px] p-3.5 flex flex-col items-center font-anthropic">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1 font-title">
              Cotizație Acoperită
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 font-title">
              {targetMonth}
            </span>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2px] px-4 py-1 shadow-xs flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-data">
                15 RON
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 font-anthropic">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p>
                Conform regulamentului, plățile se fac strict per lună (15 RON). Sumele în avans sau parțiale nu sunt
                permise.
              </p>
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
