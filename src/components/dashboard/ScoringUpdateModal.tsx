import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Trophy, Clock, CheckCircle2, Award, 
  HeartHandshake, EyeOff, X, ShieldCheck, History, 
  Layers, ArrowRight
} from 'lucide-react';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';
import { APP_VERSION, VERSION_HISTORY } from '../../version';

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
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'scoring'>('current');

  if (!isOpen) return null;

  const memberName = currentUser?.name || currentUser?.nickname || 'Voluntar';
  const latestRelease = VERSION_HISTORY[0] || {
    version: APP_VERSION,
    type: 'patch' as const,
    description: 'Actualizări de performanță și securitate.',
    timestamp: '2026-09-09'
  };

  const getBadgeForType = (type: 'major' | 'minor' | 'patch') => {
    switch (type) {
      case 'major':
        return {
          label: 'Lansare Majoră',
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500'
        };
      case 'minor':
        return {
          label: 'Funcționalitate / Optimizare',
          bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
          dot: 'bg-sky-500'
        };
      case 'patch':
      default:
        return {
          label: 'Corecție & Securitate',
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500'
        };
    }
  };

  const latestBadge = getBadgeForType(latestRelease.type);

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
                <h2 className="text-xl sm:text-2xl font-black font-anthropicSerif leading-tight tracking-tight text-white flex items-center gap-2">
                  <span>Ce este nou în v{APP_VERSION}</span>
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

          {/* Subtabs Selector */}
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/15 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'current'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-950/20 text-white/80 hover:bg-slate-950/30 hover:text-white'
              }`}
            >
              <Sparkles size={13} />
              <span>Noutăți v{APP_VERSION}</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-950/20 text-white/80 hover:bg-slate-950/30 hover:text-white'
              }`}
            >
              <History size={13} />
              <span>Istoric Versiuni</span>
            </button>

            <button
              onClick={() => setActiveTab('scoring')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'scoring'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-950/20 text-white/80 hover:bg-slate-950/30 hover:text-white'
              }`}
            >
              <Award size={13} />
              <span>Regulament Clasament</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7 space-y-6 text-slate-800 dark:text-slate-200 text-sm leading-relaxed touch-pan-y scrollbar-thin"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'current' && (
              <motion.div
                key="current"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Friendly Greeting & Introduction */}
                <div className="p-4 sm:p-5 rounded-[2px] bg-amber-50/80 dark:bg-amber-950/25 border border-amber-300/60 dark:border-amber-700/40 text-slate-800 dark:text-slate-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 font-title text-sm sm:text-base">
                    <HeartHandshake size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Salutare, {memberName}!</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    Platforma <strong>Interact Camena</strong> a fost actualizată la versiunea <strong>v{APP_VERSION}</strong>. Iată îmbunătățirile aduse pentru o experiență mai rapidă, sigură și plăcută:
                  </p>
                </div>

                {/* Latest Release Spotlight Card */}
                <div className="p-5 rounded-[2px] bg-slate-50 dark:bg-[#141A28] border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base sm:text-lg font-black font-data text-slate-900 dark:text-white">
                        v{latestRelease.version}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[10px] sm:text-xs font-bold font-title uppercase tracking-wider border ${latestBadge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${latestBadge.dot}`} />
                        {latestBadge.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold font-data text-slate-400 dark:text-slate-500">
                      {latestRelease.timestamp}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {latestRelease.description}
                  </p>

                  <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-title">
                    <ShieldCheck size={16} />
                    <span>Sistem verificat și validat pe toate dispozitivele active.</span>
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="p-4 rounded-[2px] bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Layers size={15} className="text-amber-500 shrink-0" />
                    <span>Vrei să consulți versiunile anterioare sau regulamentul?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline font-title cursor-pointer flex items-center gap-1"
                    >
                      <span>Istoric complet</span>
                      <ArrowRight size={12} />
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      onClick={() => setActiveTab('scoring')}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline font-title cursor-pointer flex items-center gap-1"
                    >
                      <span>Regulament</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title flex items-center gap-2">
                    <History size={16} className="text-amber-500" />
                    <span>Jurnal Versiuni Recente (Changelog)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 font-data">
                    SemVer vX.Y.Z
                  </span>
                </div>

                <div className="space-y-3">
                  {VERSION_HISTORY.slice(0, 6).map((item) => {
                    const badge = getBadgeForType(item.type);
                    const isCurrent = item.version === APP_VERSION;
                    return (
                      <div
                        key={item.version}
                        className={`p-3.5 sm:p-4 rounded-[2px] border transition-all ${
                          isCurrent
                            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-400/50 dark:border-amber-400/40 shadow-xs'
                            : 'bg-slate-50 dark:bg-[#141A28] border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-data text-sm text-slate-900 dark:text-white">
                              v{item.version}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-[2px] bg-amber-500 text-slate-950 text-[10px] font-bold font-title uppercase">
                                Activ
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-[2px] text-[10px] font-bold font-title uppercase border ${badge.bg}`}>
                              <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium font-data text-slate-400 dark:text-slate-500">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'scoring' && (
              <motion.div
                key="scoring"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 font-title flex items-center gap-2">
                    <Award size={16} className="text-amber-500" />
                    <span>Principii & Noul Sistem de Clasament:</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card 1: Anonimizare Puncte */}
                    <div className="p-4 rounded-[2px] bg-slate-50 dark:bg-[#141A28] border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-title text-xs sm:text-sm">
                        <div className="w-7 h-7 rounded-[2px] bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
                          <EyeOff size={15} />
                        </div>
                        <span>Focus pe Locul în Clasament</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                        Punctajele numerice sunt confidențiale. În clasament îți vezi direct <strong>locul oficial</strong> și recunoașterea binemeritată, fără presiunea cifrelor.
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
                        La fiecare ciclu de 2 luni (ex: Ian–Feb, Mar–Apr), clasamentul activ pornește proaspăt de la 0. Fiecare voluntar are mereu șanse egale!
                      </p>
                    </div>

                    {/* Card 3: Evidență Permanentă */}
                    <div className="p-4 rounded-[2px] bg-slate-50 dark:bg-[#141A28] border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold font-title text-xs sm:text-sm">
                        <div className="w-7 h-7 rounded-[2px] bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                          <Trophy size={15} />
                        </div>
                        <span>Recunoașterea Activității</span>
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
                        Orele tale dedicate cauzelor nobile, prezența la evenimente și aprecierile (Kudos) rămân la loc de cinste în profilul tău.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-[2px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Voluntariatul la <strong>Interact Camena</strong> înseamnă spirit de echipă, prietenie și impact real în comunitate!
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Confirmation CTA */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#070A0F] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-anthropic">
            Versiune platformă: <strong className="font-data">v{APP_VERSION}</strong>
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
