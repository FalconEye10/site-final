import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, Clock, CheckCircle2, Award, HeartHandshake, EyeOff, X } from 'lucide-react';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

interface ScoringUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export const ScoringUpdateModal: React.FC<ScoringUpdateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const memberName = currentUser?.name || currentUser?.nickname || 'Voluntar';

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md font-anthropic">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0E131F] border border-amber-400/40 dark:border-amber-400/30 rounded-[2px] shadow-2xl overflow-hidden font-anthropic my-auto"
      >
        {/* Top Glowing Header Strip */}
        <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-[2px] bg-slate-950/25 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                <Sparkles size={24} className="text-amber-200" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] bg-slate-950/30 text-amber-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider font-title mb-1 border border-white/10">
                  <span>📢 Comunicat Oficial & Update Log</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-anthropicSerif leading-tight tracking-tight text-white">
                  Noul Sistem de Clasament & Punctaje
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-[2px] bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
              title="Închide"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-6 text-slate-800 dark:text-slate-200 text-sm leading-relaxed touch-pan-y scrollbar-thin"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Friendly Greeting & Introduction */}
          <div className="p-4 sm:p-5 rounded-[2px] bg-amber-50/80 dark:bg-amber-950/25 border border-amber-300/60 dark:border-amber-700/40 text-slate-800 dark:text-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 font-title text-sm sm:text-base">
              <HeartHandshake size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Salutare, {memberName}!</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Pentru că ne dorim ca atmosfera din clubul nostru să fie mereu una armonioasă, unită și motivantă, am adus câteva îmbunătățiri importante modului în care funcționează clasamentul.
            </p>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Mulți dintre voi ați simțit pe bună dreptate că afișarea publică a numerelor exacte crea uneori comparații neplăcute, tensiuni sau neînțelegeri. Voluntariatul la <strong>Interact Camena</strong> înseamnă <em>spirit de echipă, prietenie și impact real în comunitate</em> — nu o goană după cifre brute.
            </p>
          </div>

          {/* Key Changes Showcase (Grid) */}
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 font-title flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <span>Cum funcționează noul sistem:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {/* Card 1: Anonimizare Puncte & Clasament Oficial */}
              <div className="p-4 rounded-[2px] bg-slate-50 dark:bg-[#141A28] border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-title text-xs sm:text-sm">
                  <div className="w-7 h-7 rounded-[2px] bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                    <EyeOff size={15} />
                  </div>
                  <span>Focus pe Locul în Clasament</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                  Punctajele numerice sunt acum confidențiale. În clasament îți vezi direct <strong>locul oficial</strong> (ex: #1, Podiumul, Top Contribuitori) și recunoașterea binemeritată, fără presiunea cifrelor.
                </p>
              </div>

              {/* Card 2: Ciclul Bilunar */}
              <div className="p-4 rounded-[2px] bg-slate-50 dark:bg-[#141A28] border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-title text-xs sm:text-sm">
                  <div className="w-7 h-7 rounded-[2px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <Clock size={15} />
                  </div>
                  <span>Restart la Fiecare 2 Luni</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                  La începutul fiecărui ciclu de 2 luni (ex: Ian–Feb, Mar–Apr etc.), clasamentul activ pornește proaspăt de la 0. Astfel, fiecare voluntar are mereu șanse egale să ajungă pe primul loc!
                </p>
              </div>

              {/* Card 3: Evidență Permanentă */}
              <div className="p-4 rounded-[2px] bg-slate-50 dark:bg-[#141A28] border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-title text-xs sm:text-sm">
                  <div className="w-7 h-7 rounded-[2px] bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <Trophy size={15} />
                  </div>
                  <span>Recunoașterea Întregii Activități</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                  Nicio contribuție nu se pierde. Totalul tău acumulat de la intrarea în club rămâne păstrat în evidența permanentă a comunității.
                </p>
              </div>

              {/* Card 4: Ore de Voluntariat & Prezență */}
              <div className="p-4 rounded-[2px] bg-slate-50 dark:bg-[#141A28] border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-title text-xs sm:text-sm">
                  <div className="w-7 h-7 rounded-[2px] bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Sparkles size={15} />
                  </div>
                  <span>Ore de Voluntariat & Proiecte</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                  Orele tale dedicate cauzelor nobile, prezența la evenimente și aprecierile (Kudos) primite de la colegi rămân la loc de cinste în profilul tău.
                </p>
              </div>
            </div>
          </div>

          {/* Motivational Footer Note */}
          <div className="flex items-center gap-3 p-3.5 rounded-[2px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Vă mulțumim din suflet pentru dăruire și pentru energia pe care o aduceți în fiecare proiect <strong>Interact Camena</strong>!
            </span>
          </div>
        </div>

        {/* Footer Confirmation CTA */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#070A0F] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-anthropic">
            Versiune platformă: <strong>v8.2.8</strong>
          </span>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-[2px] bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xs font-title cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Am înțeles & Mergi la Dashboard</span>
            <span>→</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
