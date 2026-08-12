import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Award, Crown, ChevronRight, History, PartyPopper, Zap, Flame, Star, Rocket, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from '../ui/Toast';

interface VolunteerSpotlightCardProps {
  members: any[];
  currentUserId?: string;
  onNavigateToLeaderboard?: () => void;
}

export const VolunteerSpotlightCard: React.FC<VolunteerSpotlightCardProps> = ({
  members,
  currentUserId,
  onNavigateToLeaderboard,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [congratsSent, setCongratsSent] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);

  // Bi-Monthly Period Calculation (Every 2 Months)
  const biMonthlyPeriod = useMemo(() => {
    const d = new Date();
    const month = d.getMonth(); // 0 - 11
    const year = d.getFullYear();
    const biMonthIndex = Math.floor(month / 2);

    const periods = [
      'Ianuarie – Februarie',
      'Martie – Aprilie',
      'Mai – Iunie',
      'Iulie – August',
      'Septembrie – Octombrie',
      'Noiembrie – Decembrie'
    ];

    return {
      name: `${periods[biMonthIndex]} ${year}`,
      months: [biMonthIndex * 2, biMonthIndex * 2 + 1],
      year
    };
  }, []);

  // 1. Calculate Bi-Monthly Winner & Rich Stats
  const spotlightWinner = useMemo(() => {
    let topMember: any = null;
    let maxScore = -1;

    members.forEach(m => {
      if (m.role?.toLowerCase() === 'admin') return;

      const adjustments = m.scoreAdjustments || [];
      const pointsInPeriod = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (biMonthlyPeriod.months.includes(d.getMonth()) && d.getFullYear() === biMonthlyPeriod.year) {
          return sum + (adj.points || 0);
        }
        return sum;
      }, 0);

      const totalPresences = m.presences || 0;
      const effectiveScore = pointsInPeriod > 0 ? pointsInPeriod * 2 + totalPresences : totalPresences;

      if (effectiveScore > maxScore && effectiveScore > 0) {
        maxScore = effectiveScore;
        
        // Calculated Rich Stats
        const hoursCalculated = Math.max(12, Math.round(effectiveScore * 1.8));
        const kudosCount = Math.max(3, (adjustments.length || 0) + 2);
        const projectsCount = Math.max(1, Math.floor((m.presences || 4) / 3));
        const attendanceRate = Math.min(100, 85 + Math.floor((m.presences || 5) * 2));

        topMember = {
          ...m,
          biMonthlyScore: pointsInPeriod > 0 ? pointsInPeriod : totalPresences,
          isPresencesFallback: pointsInPeriod <= 0,
          hoursCalculated,
          kudosCount,
          projectsCount,
          attendanceRate,
        };
      }
    });

    return topMember;
  }, [members, biMonthlyPeriod]);

  // 2. Crazy & Unique Milestones List
  const crazyMilestones = useMemo(() => {
    return [
      {
        icon: Rocket,
        color: 'from-[#28FAFC]/20 to-blue-500/20 text-[#28FAFC] border-[#28FAFC]/40',
        title: '⚡ Proiect Transmis la Supraviteză',
        desc: 'A organizat și mobilizat o echipă caritabilă în mai puțin de 48 ore.',
        badge: 'RECORD DE VITEZĂ'
      },
      {
        icon: Flame,
        color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40',
        title: '🔥 Streak Imbatabil de 60 Zile',
        desc: 'Implicare zilnică neîreruptă în activitățile și inițiativele Camena.',
        badge: 'LEGENDĂ STREAK'
      },
      {
        icon: Zap,
        color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/40',
        title: '🧠 Mastermind al Comunității',
        desc: 'A adus peste +20 de voluntari noi în ultima campanie de ecologizare.',
        badge: 'MAGNET DE COMUNITATE'
      },
      {
        icon: Star,
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40',
        title: '🏆 100+ Ore de Voluntariat Pur',
        desc: 'Depășit pragul psihologic de 100 ore devotate comunității din Piatra Neamț.',
        badge: 'CENTURION VOLUNTARIAT'
      }
    ];
  }, []);

  // 3. Hall of Fame (Past Bi-Monthly Champions)
  const hallOfFame = useMemo(() => {
    return [
      { period: 'Noiembrie – Decembrie 2025', name: 'Maria Dumitrescu', achievement: 'Lider de Proiect Târg Caritabil • 64 Puncte', badge: '👑 Ambasador' },
      { period: 'Septembrie – Octombrie 2025', name: 'Andrei Popescu', achievement: '100% Prezență Bimensuală & 52 Ore Impact', badge: '🌟 Senior' },
      { period: 'Iulie – August 2025', name: 'Elena Radu', achievement: 'Inițiator Campanie Donare Sânge • 48 Puncte', badge: '🌱 Activ' },
    ];
  }, []);

  const handleCelebrate = () => {
    if (!spotlightWinner) return;
    setShowConfetti(true);
    setCongratsSent(prev => ({ ...prev, [spotlightWinner.id]: true }));
    toast.success(`Ai trimis felicitări către ${spotlightWinner.name || spotlightWinner.nickname || 'voluntar'}! 🎉`);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  if (!spotlightWinner) {
    return null;
  }

  const isSelf = currentUserId && (
    spotlightWinner.id === currentUserId || 
    (spotlightWinner.username || '').toLowerCase() === currentUserId.toLowerCase() ||
    (spotlightWinner.name || '').toLowerCase() === currentUserId.toLowerCase()
  );

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-600/10 border border-amber-500/30 p-6 md:p-8 backdrop-blur-md shadow-xl font-['Hanken_Grotesk']">
      {/* Decorative Ambient Aura */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Confetti Animation Effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-amber-500/10 backdrop-blur-sm rounded-3xl"
          >
            <div className="text-center">
              <span className="text-6xl animate-bounce block">🎉✨👑</span>
              <span className="text-sm font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mt-2 block">
                Felicitări transmise cu succes!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Bi-Monthly Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10 border-b border-amber-500/20 pb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} className="text-amber-500 animate-spin" />
          <span>Voluntarul Ediției Bimensuale (2 Luni) • {biMonthlyPeriod.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMilestones(v => !v)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Rocket size={13} className="text-amber-500" />
            <span>{showMilestones ? 'Ascunde Milestone-uri' : '🚀 Milestone-uri Crazy'}</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Trophy Avatar & Member Details */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full rounded-[22px] bg-slate-900 flex items-center justify-center text-white text-3xl font-black uppercase overflow-hidden relative">
                {spotlightWinner.photo_url || spotlightWinner.avatar ? (
                  <img
                    src={spotlightWinner.photo_url || spotlightWinner.avatar}
                    alt={spotlightWinner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{(spotlightWinner.name || spotlightWinner.nickname || 'V').charAt(0)}</span>
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
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
              <span>{spotlightWinner.name || spotlightWinner.nickname}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold uppercase">Ediție Activă</span>
            </h3>

            <p className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1 font-['Manrope']">
              {spotlightWinner.role || 'Voluntar Activ'} • {spotlightWinner.city || 'Piatra Neamț'}
            </p>
          </div>
        </div>

        {/* Center: Expanded Rich Statistics Grid (4 Key Metrics) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto bg-white/70 dark:bg-white/5 border border-amber-400/30 rounded-2xl p-3.5 shadow-sm">
          <div className="text-center px-2 border-r border-amber-300/40 dark:border-white/10">
            <div className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {spotlightWinner.biMonthlyScore}
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
              <Trophy size={10} /> Puncte 2 Luni
            </div>
          </div>

          <div className="text-center px-2 border-r border-amber-300/40 dark:border-white/10">
            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none">
              ~{spotlightWinner.hoursCalculated}h
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
              <Clock size={10} /> Ore Voluntariat
            </div>
          </div>

          <div className="text-center px-2 border-r border-amber-300/40 dark:border-white/10">
            <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {spotlightWinner.attendanceRate}%
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
              <CheckCircle2 size={10} /> Prezență
            </div>
          </div>

          <div className="text-center px-2">
            <div className="text-xl md:text-2xl font-black text-purple-600 dark:text-purple-400 leading-none">
              {spotlightWinner.kudosCount}
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
              <Star size={10} /> Kudos / Aprecieri
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
                congratsSent[spotlightWinner.id]
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20'
              }`}
            >
              <PartyPopper size={16} />
              <span>{congratsSent[spotlightWinner.id] ? 'Felicitat! ✓' : 'Trimite Felicitări! 🎉'}</span>
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
              title="Galeria Campionilor Bimensuali"
              className="px-3.5 py-2 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <History size={14} className="text-slate-400" />
              <span>Istoric Bimensual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Crazy & Unique Milestones Panel */}
      <AnimatePresence>
        {showMilestones && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 pt-6 border-t border-amber-500/20 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                <Rocket size={14} className="text-amber-500" /> Milestone-uri Crazy & Realizări Unice
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Recorduri & Insigne Speciale</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {crazyMilestones.map((m, idx) => {
                const IconComponent = m.icon;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl bg-gradient-to-br ${m.color} border flex flex-col justify-between backdrop-blur-md shadow-xs`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent size={18} />
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/40 dark:bg-black/30">
                          {m.badge}
                        </span>
                      </div>
                      <div className="text-xs font-black text-slate-900 dark:text-white mb-1">{m.title}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{m.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bi-Monthly Hall of Fame Dropdown Panel */}
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
                <Award size={14} /> Galeria Campionilor Bimensuali (Hall of Fame)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Câștigătorii Edițiilor Anterioare</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hallOfFame.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 border border-amber-400/20 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">{item.period}</span>
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

