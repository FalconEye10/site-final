import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Award, Crown, ChevronRight, History, Star, Rocket, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabase';
import { computeMemberMilestones } from '../../utils/milestones';
import { isBoardMember } from '../../utils/permissions';

interface VolunteerSpotlightCardProps {
  members: any[];
  currentUserId?: string;
  isAdmin?: boolean;
  onNavigateToLeaderboard?: () => void;
}

export const VolunteerSpotlightCard: React.FC<VolunteerSpotlightCardProps> = ({
  members,
  isAdmin = false,
  onNavigateToLeaderboard,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [kudosCounts, setKudosCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadKudos() {
      try {
        const { data, error } = await supabase.from('kudos').select('*');
        if (!error && data) {
          const map: Record<string, number> = {};
          data.forEach((k: any) => {
            const targetId = k.toId || k.to_id || k.recipient_id;
            const targetName = k.toName || k.to_name || k.recipient_name;
            if (targetId) map[targetId] = (map[targetId] || 0) + 1;
            if (targetName) map[targetName.toLowerCase()] = (map[targetName.toLowerCase()] || 0) + 1;
          });
          setKudosCounts(map);
        }
      } catch (err) {
        console.error('Error fetching kudos counts in Spotlight:', err);
      }
    }
    loadKudos();
  }, []);

  // Bi-Monthly Period Calculation (Every 2 Months)
  const biMonthlyPeriod = useMemo(() => {
    const d = new Date();
    const month = d.getMonth(); // 0 - 11
    const year = d.getFullYear();
    const biMonthIndex = Math.floor(month / 2); // 0 - 5

    const periodNames = [
      'Ianuarie – Februarie',
      'Martie – Aprilie',
      'Mai – Iunie',
      'Iulie – August',
      'Septembrie – Octombrie',
      'Noiembrie – Decembrie'
    ];

    return {
      index: biMonthIndex,
      name: `${periodNames[biMonthIndex]} ${year}`,
      months: [biMonthIndex * 2, biMonthIndex * 2 + 1],
      year
    };
  }, []);

  // 1. Calculate Bi-Monthly Winner & Rich Stats
  const spotlightWinner = useMemo(() => {
    let topMember: any = null;
    let maxScore = -1;

    members.forEach(m => {
      if (m.role?.toLowerCase() === 'admin' || isBoardMember(m)) return;

      const adjustments = Array.isArray(m.scoreAdjustments) ? m.scoreAdjustments : [];
      const pointsInPeriod = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (biMonthlyPeriod.months.includes(d.getMonth()) && d.getFullYear() === biMonthlyPeriod.year) {
          return sum + (Number(adj.points) || 0);
        }
        return sum;
      }, 0);

      const totalPresences = Number(m.presences || 0);
      const effectiveScore = pointsInPeriod > 0 ? pointsInPeriod : (totalPresences > 0 ? totalPresences : 0);

      if (effectiveScore > maxScore && effectiveScore > 0) {
        maxScore = effectiveScore;
        
        // Calculated Real Statistics
        const hoursCalculated = Number(m.stats?.hours ?? m.hours ?? (m.presences ? m.presences * 2 : 0));

        const memberKudosByToId = m.id ? (kudosCounts[m.id] || 0) : 0;
        const memberKudosByName = m.name ? (kudosCounts[m.name.toLowerCase()] || 0) : 0;
        const kudosCount = Math.max(memberKudosByToId, memberKudosByName, Array.isArray(m.kudos) ? m.kudos.length : 0);

        const projectsCount = Number(m.stats?.projects ?? m.projects ?? (m.presences ? Math.floor(m.presences / 2) : 0));

        const presences = Math.max(0, Number(m.presences || 0));
        const unexcused = Math.max(0, Number(m.unexcusedAbsences || 0));
        const totalEvents = presences + unexcused;
        const attendanceRate = totalEvents > 0
          ? Math.round((presences / totalEvents) * 100)
          : (presences > 0 ? 100 : 0);

        topMember = {
          ...m,
          biMonthlyScore: pointsInPeriod,
          isPresencesFallback: pointsInPeriod <= 0,
          hoursCalculated,
          kudosCount,
          projectsCount,
          attendanceRate,
        };
      }
    });

    return topMember;
  }, [members, biMonthlyPeriod, kudosCounts]);

  // 2. Dynamic Real & Automatic Milestones
  const crazyMilestones = useMemo(() => {
    if (!spotlightWinner) return [];

    const { unlockedMilestones } = computeMemberMilestones(spotlightWinner, spotlightWinner.kudosCount);

    if (unlockedMilestones.length > 0) {
      return unlockedMilestones.slice(0, 4).map(m => ({
        emoji: m.icon,
        color: m.color || 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40',
        title: m.title,
        desc: m.desc,
        badge: m.badge
      }));
    }

    // Fallback if none unlocked yet: show real metrics
    return [
      {
        emoji: '⚡',
        color: 'from-[#28FAFC]/20 to-blue-500/20 text-[#28FAFC] border-[#28FAFC]/40',
        title: 'Punctaj Ediție',
        desc: `A acumulat ${spotlightWinner.biMonthlyScore} puncte în această ediție.`,
        badge: 'SCOR REAL'
      },
      {
        emoji: '🔥',
        color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40',
        title: 'Rată de Prezență',
        desc: `Rată de prezență de ${spotlightWinner.attendanceRate}% la activitățile clubului.`,
        badge: 'PREZENȚĂ'
      },
      {
        emoji: '🌱',
        color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/40',
        title: 'Ore Voluntariat',
        desc: `${spotlightWinner.hoursCalculated} ore de implicare validate.`,
        badge: 'ORE REALE'
      },
      {
        emoji: '❤️',
        color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/40',
        title: 'Aprecieri Comunitate',
        desc: `${spotlightWinner.kudosCount} aprecieri primite în platformă.`,
        badge: 'KUDOS'
      }
    ];
  }, [spotlightWinner]);

  // 3. Hall of Fame (Past Bi-Monthly Champions calculated from real data)
  const hallOfFame = useMemo(() => {
    const periods = [
      'Ianuarie – Februarie',
      'Martie – Aprilie',
      'Mai – Iunie',
      'Iulie – August',
      'Septembrie – Octombrie',
      'Noiembrie – Decembrie'
    ];

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curBiMonthIndex = Math.floor(curMonth / 2);

    const pastPeriods = [];
    for (let offset = 1; offset <= 3; offset++) {
      let bIndex = curBiMonthIndex - offset;
      let y = curYear;
      while (bIndex < 0) {
        bIndex += 6;
        y -= 1;
      }
      pastPeriods.push({
        index: bIndex,
        label: `${periods[bIndex]} ${y}`,
        months: [bIndex * 2, bIndex * 2 + 1],
        year: y
      });
    }

    return pastPeriods.map(p => {
      let topPastMember: any = null;
      let maxPastScore = -1;

      members.forEach(m => {
        if (m.role?.toLowerCase() === 'admin' || isBoardMember(m)) return;

        const adjustments = Array.isArray(m.scoreAdjustments) ? m.scoreAdjustments : [];
        const score = adjustments.reduce((sum: number, adj: any) => {
          if (!adj.date) return sum;
          const d = new Date(adj.date);
          if (p.months.includes(d.getMonth()) && d.getFullYear() === p.year) {
            return sum + (Number(adj.points) || 0);
          }
          return sum;
        }, 0);

        if (score > maxPastScore && score > 0) {
          maxPastScore = score;
          topPastMember = { ...m, periodScore: score };
        }
      });

      if (topPastMember) {
        return {
          period: p.label,
          name: topPastMember.name || topPastMember.nickname,
          achievement: isAdmin
            ? `${topPastMember.periodScore} puncte acumulate`
            : `Câștigător Ediție • Activitate Exemplară`,
          badge: '👑 Locul 1',
          hasData: true
        };
      }

      return {
        period: p.label,
        name: 'N/A',
        achievement: 'Fără date înregistrate în această perioadă',
        badge: '⚪ N/A',
        hasData: false
      };
    });
  }, [members, isAdmin]);

  if (!spotlightWinner) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-[2px] bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-600/10 border border-amber-500/30 p-6 md:p-8 backdrop-blur-md shadow-xs font-anthropic">
      {/* Top Header & Bi-Monthly Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10 border-b border-amber-500/20 pb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-xs font-bold uppercase tracking-wider font-title">
          <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
          <span>Voluntarul Lunii • {biMonthlyPeriod.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMilestones(v => !v)}
            className="px-3.5 py-1.5 rounded-[2px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 font-title cursor-pointer"
          >
            <Rocket size={15} className="text-amber-600 dark:text-amber-400" />
            <span>{showMilestones ? 'Ascunde Milestone-uri' : 'Milestone-uri Speciale'}</span>
          </button>
        </div>
      </div>

      {/* Row 1: Profile Avatar & Details + Action Buttons */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 w-full">
        {/* Left: Trophy Avatar & Member Details */}
        <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[2px] bg-amber-400 p-0.5 shadow-xs border border-amber-500/30">
              <div className="w-full h-full rounded-[2px] bg-slate-900 flex items-center justify-center text-white text-2xl sm:text-3xl font-black uppercase overflow-hidden relative font-title">
                {spotlightWinner.photo_url || spotlightWinner.avatar ? (
                  <img
                    src={spotlightWinner.photo_url || spotlightWinner.avatar}
                    alt={spotlightWinner.name}
                    className="w-full h-full object-cover rounded-[2px]"
                  />
                ) : (
                  <span>{(spotlightWinner.name || spotlightWinner.nickname || 'V').charAt(0)}</span>
                )}
              </div>
            </div>
            {/* Crown */}
            <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs border border-white dark:border-slate-900">
              <Crown size={15} className="fill-slate-950" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-title truncate max-w-full">
              {spotlightWinner.name || spotlightWinner.nickname}
            </h3>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 font-title">
          {onNavigateToLeaderboard && (
            <button
              onClick={onNavigateToLeaderboard}
              className="px-3.5 py-2.5 rounded-[2px] bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trophy size={14} className="text-amber-500" />
              <span>Clasament</span>
              <ChevronRight size={14} />
            </button>
          )}

          <button
            onClick={() => setShowHistory(v => !v)}
            title="Galeria Campionilor Bimensuali"
            className="px-3.5 py-2.5 rounded-[2px] bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <History size={14} className="text-slate-400" />
            <span>Istoric</span>
          </button>
        </div>
      </div>

      {/* Row 2: Full-Width 4-Column Statistics Grid (Zero Overlap Guaranteed) */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full mt-5 pt-5 border-t border-amber-500/20">
        {/* Metric 1: Points / Rank */}
        <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-[2px] bg-white/80 dark:bg-slate-900/80 border border-amber-400/30 text-center shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 leading-none font-data">
            {isAdmin ? (spotlightWinner.biMonthlyScore > 0 ? `+${spotlightWinner.biMonthlyScore}` : spotlightWinner.biMonthlyScore) : '👑 #1'}
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-2 flex items-center justify-center gap-1.5 font-title whitespace-nowrap">
            <Trophy size={13} className="shrink-0 text-amber-500" />
            <span>{isAdmin ? 'Puncte 2 Luni' : 'Lider Ediție'}</span>
          </div>
        </div>

        {/* Metric 2: Ore Voluntariat */}
        <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-[2px] bg-white/80 dark:bg-slate-900/80 border border-amber-400/30 text-center shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none font-data">
            {spotlightWinner.hoursCalculated}h
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-2 flex items-center justify-center gap-1.5 font-title whitespace-nowrap">
            <Clock size={13} className="shrink-0 text-sky-500" />
            <span>Ore Voluntariat</span>
          </div>
        </div>

        {/* Metric 3: Prezență */}
        <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-[2px] bg-white/80 dark:bg-slate-900/80 border border-amber-400/30 text-center shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none font-data">
            {spotlightWinner.attendanceRate}%
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-2 flex items-center justify-center gap-1.5 font-title whitespace-nowrap">
            <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
            <span>Prezență</span>
          </div>
        </div>

        {/* Metric 4: Kudos */}
        <div className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-[2px] bg-white/80 dark:bg-slate-900/80 border border-amber-400/30 text-center shadow-xs">
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 leading-none font-data">
            {spotlightWinner.kudosCount}
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-2 flex items-center justify-center gap-1.5 font-title whitespace-nowrap">
            <Star size={13} className="shrink-0 text-purple-500" />
            <span>Kudos</span>
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
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest flex items-center gap-1.5 font-title">
                <Rocket size={15} className="text-amber-500" /> Milestone-uri Speciale
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-anthropic">Insigne & Recorduri</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {crazyMilestones.map((m: any, idx: number) => {
                const IconComponent = m.icon;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-[2px] bg-gradient-to-br ${m.color} border flex flex-col justify-between backdrop-blur-md shadow-xs`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        {m.emoji ? (
                          <span className="text-2xl">{m.emoji}</span>
                        ) : IconComponent ? (
                          <IconComponent size={20} />
                        ) : (
                          <span className="text-2xl">🏆</span>
                        )}
                        <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-white/40 dark:bg-black/30 font-title">
                          {m.badge}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mb-1 font-title">{m.title}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 leading-snug font-anthropic">{m.desc}</div>
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
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest flex items-center gap-1.5 font-title">
                <Award size={16} /> Istoric Câștigători Bimensuali
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-anthropic">Ediții Anterioare</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {hallOfFame.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-[2px] border flex flex-col justify-between transition-all ${
                    item.hasData
                      ? 'bg-white/80 dark:bg-slate-900/60 border-amber-400/30 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase font-title">{item.period}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] font-title ${
                      item.hasData
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                  <div className={`text-sm sm:text-base font-black font-title ${item.hasData ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-anthropic">
                    {item.achievement}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
