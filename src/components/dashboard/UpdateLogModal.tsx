import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, History, CheckCircle2, Search, 
  X, ArrowRight, ShieldCheck, Zap, Calendar, Filter
} from 'lucide-react';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';
import { APP_VERSION, VERSION_HISTORY } from '../../version';
import { normalizeDiacritics } from '../../utils/text';

interface UpdateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  initialTab?: 'current' | 'all';
}

export const UpdateLogModal: React.FC<UpdateLogModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialTab = 'current'
}) => {
  useBodyScrollLock(isOpen);
  const [activeTab, setActiveTab] = useState<'current' | 'all'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'major' | 'minor' | 'patch'>('all');

  // Reset tab when reopened with initialTab
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      setSelectedTypeFilter('all');
    }
  }, [isOpen, initialTab]);

  const latestRelease = VERSION_HISTORY[0] || {
    version: APP_VERSION,
    type: 'patch' as const,
    description: 'Actualizări de performanță, stabilitate și securitate.',
    timestamp: '2026-09-14'
  };

  const getBadgeForType = (type: 'major' | 'minor' | 'patch') => {
    switch (type) {
      case 'major':
        return {
          label: 'Lansare Majoră',
          bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
          dot: 'bg-purple-500'
        };
      case 'minor':
        return {
          label: 'Funcționalitate / Îmbunătățire',
          bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
          dot: 'bg-sky-500'
        };
      case 'patch':
      default:
        return {
          label: 'Corecție & Securitate',
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500'
        };
    }
  };

  const filteredHistory = useMemo(() => {
    const q = normalizeDiacritics(searchQuery);
    return VERSION_HISTORY.filter(item => {
      // Type filter
      if (selectedTypeFilter !== 'all' && item.type !== selectedTypeFilter) {
        return false;
      }
      // Search query
      if (!q) return true;
      const matchVersion = normalizeDiacritics(item.version).includes(q);
      const matchDesc = normalizeDiacritics(item.description).includes(q);
      const matchDate = normalizeDiacritics(item.timestamp).includes(q);
      return matchVersion || matchDesc || matchDate;
    });
  }, [searchQuery, selectedTypeFilter]);

  if (!isOpen) return null;

  const memberName = currentUser?.name || currentUser?.nickname || 'Voluntar';
  const latestBadge = getBadgeForType(latestRelease.type);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md font-anthropic">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 18 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0E131F] border border-emerald-400/40 dark:border-emerald-400/30 rounded-[4px] shadow-2xl overflow-hidden font-anthropic my-auto"
      >
        {/* Top Glowing Header Strip */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white shrink-0 border-b border-emerald-500/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[2px] bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                <Sparkles size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold font-anthropicSerif text-white tracking-tight">
                    Jurnal Actualizări Platformă
                  </h2>
                  <span className="text-[11px] font-bold font-data px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    v{APP_VERSION}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5 font-anthropic">
                  Bună, <span className="font-semibold text-white">{memberName}</span>! Află ce s-a schimbat pe platforma clubului.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-[2px] transition-colors cursor-pointer"
              title="Închide fereastra"
              aria-label="Închide"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'current'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-950/20 text-white/80 hover:bg-slate-950/30 hover:text-white'
              }`}
            >
              <Sparkles size={13} className={activeTab === 'current' ? 'text-emerald-600' : 'text-emerald-400'} />
              <span>Ce este nou (v{latestRelease.version})</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-slate-950/20 text-white/80 hover:bg-slate-950/30 hover:text-white'
              }`}
            >
              <History size={13} />
              <span>Toate Versiunile ({VERSION_HISTORY.length})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-slate-800 dark:text-slate-200 text-sm leading-relaxed touch-pan-y scrollbar-thin"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'current' && (
              <motion.div
                key="current"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {/* Release Card */}
                <div className="p-4 sm:p-5 rounded-[2px] bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold font-data text-emerald-900 dark:text-emerald-200">
                        Versiunea v{latestRelease.version}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold font-title uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${latestBadge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${latestBadge.dot}`} />
                        {latestBadge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-data">
                      <Calendar size={13} />
                      <span>{latestRelease.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed font-anthropic">
                    {latestRelease.description}
                  </p>
                </div>

                {/* Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider font-title mb-1.5">
                      <ShieldCheck size={16} />
                      <span>Stabilitate & Securitate</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                      Datele și acțiunile din platformă sunt sincronizate în mod securizat și rezilient între toate dispozitivele.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-[2px] border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider font-title mb-1.5">
                      <Zap size={16} />
                      <span>Performanță 0ms</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                      Navigare fluidă, actualizări silențioase în timp real și interfață optimizată pentru Android, iOS și PC.
                    </p>
                  </div>
                </div>

                {/* Direct link to all versions */}
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('all')}
                    className="w-full py-2.5 px-4 rounded-[2px] border border-slate-200 dark:border-slate-800 hover:border-emerald-400/50 dark:hover:border-emerald-500/50 bg-white dark:bg-[#121826] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <History size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      <span>Vrei să vezi istoricul complet al lansărilor anterioare?</span>
                    </span>
                    <span className="flex items-center gap-1 font-data text-emerald-600 dark:text-emerald-400">
                      Toate versiunile <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'all' && (
              <motion.div
                key="all"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* Search & Filter Header */}
                <div className="space-y-2.5 pb-2">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Caută după versiune (ex: 9.1) sau cuvinte cheie..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors font-anthropic"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
                      <Filter size={11} /> Filtru:
                    </span>
                    {[
                      { key: 'all', label: `Toate (${VERSION_HISTORY.length})` },
                      { key: 'major', label: 'Majore' },
                      { key: 'minor', label: 'Funcționalități' },
                      { key: 'patch', label: 'Corecții' }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setSelectedTypeFilter(f.key as any)}
                        className={`text-[11px] font-bold font-title px-2.5 py-1 rounded-[2px] transition-all cursor-pointer ${
                          selectedTypeFilter === f.key
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Changelog List */}
                <div className="space-y-3 pt-1">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                      Nicio versiune găsită conform filtrului aplicat.
                    </div>
                  ) : (
                    filteredHistory.map((item) => {
                      const badge = getBadgeForType(item.type);
                      const isCurrent = item.version === APP_VERSION;
                      return (
                        <div
                          key={item.version}
                          className={`p-3.5 sm:p-4 rounded-[2px] border transition-all ${
                            isCurrent
                              ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-400/50 dark:border-emerald-400/40 shadow-xs'
                              : 'bg-slate-50/70 dark:bg-[#141A28] border-slate-200 dark:border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold font-data text-xs sm:text-sm text-slate-900 dark:text-white">
                                v{item.version}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold font-title uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-emerald-500 text-white">
                                  Versiunea Activă Acum
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold font-title uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] border ${badge.bg}`}>
                                <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-[11px] font-data text-slate-500 dark:text-slate-400">
                              {item.timestamp}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-anthropic">
                            {item.description}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Action Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {activeTab === 'all' ? (
              <button
                onClick={() => setActiveTab('current')}
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-title"
              >
                ← Înapoi la Noutăți
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('all')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors cursor-pointer flex items-center gap-1 font-title"
              >
                <History size={13} /> Istoric complet
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold font-title tracking-wide transition-all shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 size={15} />
            <span>Am înțeles & Continuă</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
