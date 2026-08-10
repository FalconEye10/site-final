import { useRef, useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onClearCallback?: () => void;
  heightClass?: string;
  widthClass?: string;
}

export function SignaturePad({ onSave, onClearCallback, heightClass, widthClass }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const dpr = window.devicePixelRatio || 1;
          
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          
          ctx.resetTransform();
          ctx.scale(dpr, dpr);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          
          ctx.strokeStyle = '#001f26';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Redimensionarea pânzei îi șterge conținutul (semantica <canvas>).
          // Resetăm starea și anunțăm părintele, altfel ar rămâne cu o semnătură
          // veche invizibilă pe care userul crede că a înlocuit-o.
          setIsEmpty(true);
          onSave('');
        }
      }
    });
    
    resizeObserver.observe(canvas);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Auto-save on interaction end
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSave(''); // Clear the saved string
    if (onClearCallback) onClearCallback();
  };

  return (
    <div className={`relative border border-brand-muted/10 rounded-2xl overflow-hidden bg-[#FAF9F5] ${widthClass || 'w-full'}`}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={`${widthClass || 'w-full'} ${heightClass || 'h-24'} touch-none cursor-crosshair block`}
      />
      <button 
        type="button"
        onClick={clear}
        disabled={isEmpty}
        className="absolute top-2 right-2 p-2 bg-white rounded-lg border border-brand-muted/5 shadow-sm text-xs font-bold text-brand-accent/60 hover:text-brand-accent disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        <RefreshCcw size={12} /> Curăță
      </button>
      {isEmpty && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-brand-accent/20 font-bold uppercase tracking-widest text-xs">
          Semnează Aici
        </div>
      )}
    </div>
  );
}
