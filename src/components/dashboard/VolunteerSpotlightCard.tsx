import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Star, Award, Heart, Crown, ChevronRight, History, PartyPopper } from 'lucide-react';
import { toast } from '../ui/Toast';

interface VolunteerSpotlightCardProps {
  members: any[];
  currentUserId?: string;
  onNavigateToLeaderboard?: () => void;
  onSendKudos?: (targetMemberId: string) => void;
}

export const VolunteerSpotlightCard: React.FC<VolunteerSpotlightCardProps> = ({
  members,
  currentUserId,
  onNavigateToLeaderboard,
  onSendKudos,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [congratsSent, setCongratsSent] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);

  const now = new Date();
  const currentMonthName = now.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Calculate Monthly Winner
  const monthlySpotlight = useMemo(() => {
    let topMember: any = null;
    let maxPoints = -1;

    members.forEach(m => {
      if (m.role?.toLowerCase() === 'admin') return;

      const adjustments = m.scoreAdjustments || [];
      const pointsThisMonth = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          return sum + (adj.points || 0);
        }
        return sum;
      }, 0);

      // Total weight: monthly points + presences
      const effectiveScore = pointsThisMonth > 0 ? pointsThisMonth : (m.presences || 0);

      if (effectiveScore > maxPoints && effectiveScore > 0) {
        maxPoints = effectiveScore;
        topMember = {
          ...m,
          monthlyPoints: pointsThisMonth > 0 ? pointsThisMonth : m.presences,
          isPresencesFallback: pointsThisMonth <= 0,
        };
      }
    });

    return topMember;
  }, [members, currentMonth, currentYear]);

  // 2. Hall of fame mock records (recent milestones)
  const hallOfFame = useMemo(() => {
    return [
      { month: 'Iulie 2025', name: 'Maria Dumitrescu', achievement: 'Lider de Proiect Târg Caritabil', badge: '👑 Ambasador' },
      { month: 'Iunie 2025', name: 'Andrei Popescu', achievement: 'Record 100% Prezență & 45 Puncte', badge: '🌟 Senior' },
      { month: 'Mai 2025', name: 'Elena Radu', achievement: 'Inițiator Campanie Donare Sânge', badge: '🌱 Activ' },
    ];
  }, []);

  const handleCelebrate = () => {
    if (!monthlySpotlight) return;
    setShowConfetti(true);
    setCongratsSent(prev => ({ ...prev, [monthlySpotlight.id]: true }));
    toast.success(`Ai trimis felicitări către ${monthlySpotlight.name || monthlySpotlight.nickname || 'voluntar'}! 🎉`);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  if (!monthlySpotlight) {
    return null;
  }

  const isSelf = currentUserId && (monthlySpotlight.id === currentUserId || monthlySpotlight.username?.toLowerCase() === currentUserId.toLowerCase());

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-600/10 border border-amber-500/30 p-6 md:p-8 backdrop-blur-md shadow-xl font-['Hanken_Grotesk']">
      {/* Decorative Ambient Aura */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Confetti Animation Effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-amber-500/10 backdrop-blur-xs"
          >
            <div className="text-center">
              <span className="text-6xl animate-bounce block">🎉✨👑</span>
              <span className="text-sm font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mt-2 block">
                Felicitări transmise!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Trophy Avatar & Member Info */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full rounded-[22px] bg-slate-900 flex items-center justify-center text-white text-3xl font-black uppercase overflow-hidden relative">
                {monthlySpotlight.photo_url || monthlySpotlight.avatar ? (
                  <img
                    src={monthlySpotlight.photo_url || monthlySpotlight.avatar}
                    alt={monthlySpotlight.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(monthlySpotlight.name || monthlySpotlight.nickname || 'V').charAt(0)}</span>
                )}
              </div>
            </div>
            {/* Floating Golden Crown */}
            <motion.div
              animate={{ y: [0, -4, 0], rotate: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -top-3.5 -right-2.5 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900"
            >
              <Crown size={18} className="fill-slate-950" />
            </motion.div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles size={13} className="text-amber-500 animate-spin" />
              <span>Voluntarul Lunii • {currentMonthName}</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {monthlySpotlight.name || monthlySpotlight.nickname}
            </h3>

            <p className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1 font-['Manrope']">
              {monthlySpotlight.role || 'Voluntar Activ'} • {monthlySpotlight.city || 'Piatra Neamț'}
            </p>
          </div>
        </div>

        {/* Center: Achievement Metrics */}
        <div className="flex items-center gap-3 bg-white/70 dark:bg-white/5 border border-amber-400/30 rounded-2xl p-3.5 px-5 shadow-sm">
          <div className="text-center pr-4 border-r border-amber-300/40 dark:border-white/10">
            <div className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {monthlySpotlight.monthlyPoints || monthlySpotlight.presences || 0}
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              {monthlySpotlight.isPresencesFallback ? 'Prezențe Totale' : 'Puncte Lună'}
            </div>
          </div>
          <div className="text-center pl-2">
            <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none">
              {monthlySpotlight.qualification || 'Excelent'}
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              Calificativ Activ
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap lg:flex-col items-center gap-2.5 w-full lg:w-auto">
          {!isSelf && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCelebrate}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                congratsSent[monthlySpotlight.id]
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20'
              }`}
            >
              <PartyPopper size={16} />
              <span>{congratsSent[monthlySpotlight.id] ? 'Felicitat! ✓' : 'Trimite Felicitări! 🎉'}</span>
            </motion.button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onNavigateToLeaderboard && (
              <button
                onClick={onNavigateToLeaderboard}
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trophy size={14} className="text-amber-500" />
                <span>Vezi Clasament</span>
                <ChevronRight size={14} />
              </button>
            )}

            <button
              onClick={() => setShowHistory(v => !v)}
              title="Galeria Campionilor (Hall of Fame)"
              className="px-3.5 py-2 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <History size={14} className="text-slate-400" />
              <span>Istoric</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hall of Fame Dropdown Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 pt-6 border-t border-amber-500/20 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                <Award size={14} /> Galeria Campionilor (Hall of Fame)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Edițiile anterioare</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hallOfFame.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-amber-400/20 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">{item.month}</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.badge}</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{item.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{item.achievement}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
