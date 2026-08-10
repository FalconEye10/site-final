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
    <div className="flex flex-col items-center w-full">
      <div className="flex justify-between items-center w-full mb-1">
        <label className="text-sm font-semibold text-brand-accent/70">{title}</label>
        {hasSignature && (
          <button type="button" onClick={clear} className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors">
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
        className="border-2 border-dashed border-brand-muted/20 rounded-xl bg-white w-full max-w-[400px] h-[150px] touch-none cursor-crosshair hover:border-brand-primary/50 transition-colors"
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
        treasurerSignature: treasurerSig
      };

      const { newTotalPaid, newStatus } = await processTreasuryPayment(memberId, paymentDoc);
      toast.success(`Cotizația pentru ${targetMonth} a fost încasată cu succes!`);
      onSuccess(newTotalPaid, newStatus);
    } catch (err) {
      console.error(err);
      toast.error("Eroare la procesarea plății. Încearcă din nou.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-brand-accent/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl p-8 overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-4">
          <button onClick={onClose} className="p-2 hover:bg-brand-accent/5 rounded-full transition-all">
            <X size={20} className="text-brand-accent/40" />
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-brand-accent">Încasare Cotizație</h2>
          <p className="text-sm opacity-60 font-medium">Tranzacție securizată • ID: {transactionId}</p>
        </div>

        <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-2xl p-4 mb-6 flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider font-bold text-brand-accent/60 mb-1">Cotizație Acoperită</span>
          <span className="text-xl font-bold text-brand-accent mb-2">{targetMonth}</span>
          <div className="bg-white rounded-xl px-6 py-2 shadow-sm flex items-center gap-2">
            <span className="text-3xl font-black text-emerald-600">15 RON</span>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-brand-accent/70">
            <AlertTriangle size={14} className="text-brand-primary shrink-0 mt-0.5" />
            <p>Conform regulamentului, plățile se fac strict per lună (15 RON). Sumele în avans sau parțiale nu sunt permise.</p>
          </div>
        </div>

        <div className="space-y-6">
          <SignatureCanvas title={`Semnătură Membru: ${memberName}`} onSign={setMemberSig} />
          <SignatureCanvas title="Semnătură Trezorier" onSign={setTreasurerSig} />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!memberSig || !treasurerSig || isSubmitting}
          className="w-full mt-8 btn-stitch-primary py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="animate-pulse">Se procesează tranzacția...</span>
          ) : (
            <>
              <CheckCircle size={20} /> Confirmă Încasarea (15 RON)
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};
