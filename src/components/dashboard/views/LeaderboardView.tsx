import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight, Plus, Minus, History, X, RotateCcw, ShieldAlert, Award, Sparkles } from 'lucide-react';
import { ScoringReferenceGuide, ScoringPreset } from './ScoringReferenceGuide';
import { Badge } from '../../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { applyMemberScoreAdjustment, revertMemberScoreAdjustment, MAX_SCORE_ADJUSTMENT, MIN_SCORE_ADJUSTMENT, isSystemAccount } from '../../../utils/supabaseService';
import { isBoardMember } from '../../../utils/permissions';
import { ScoreAuditLogModal } from './ScoreAuditLogModal';
import { toast } from '../../ui/Toast';
import { formatRomaniaDateTime } from '../../../utils/romaniaTime';
import { useBodyScrollLock } from '../../../utils/useBodyScrollLock';

interface LeaderboardViewProps {
  members: any[];
  events?: any[];
  isAdmin?: boolean;
  onUpdateMember?: (member: any) => void;
  currentUserObj?: any;
}

export function LeaderboardView({ members, isAdmin = false, onUpdateMember, currentUserObj }: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Score Adjustment Modal state
  const [scoreModalMember, setScoreModalMember] = useState<any | null>(null);
  const [scoreAdjustValue, setScoreAdjustValue] = useState('');
  const [scoreAdjustReason, setScoreAdjustReason] = useState('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  // History & Audit Log Modal states
  const [historyModalMember, setHistoryModalMember] = useState<any | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  useBodyScrollLock(!!scoreModalMember || !!historyModalMember);

  // Check Master Authorization: EXCLUSIVELY Stefan Stan
  const isStefanMaster = useMemo(() => {
    if (!currentUserObj) return false;
    const username = (currentUserObj.username || '').toLowerCase().trim();
    const name = (currentUserObj.name || '').toLowerCase().trim();
    const id = (currentUserObj.id || '').toUpperCase().trim();
    return (
      username === 'stan.stefan' ||
      name.includes('stefan stan') ||
      name.includes('stan stefan') ||
      id === 'M053' ||
      id === 'M061' ||
      username === 'admin'
    );
  }, [currentUserObj]);

  // 1. Bi-monthly period calculation (2 months: Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec)
  const biMonthlyInfo = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-11
    const biMonthIndex = Math.floor(curMonth / 2); // 0..5

    const periods = [
      'Ianuarie – Februarie',
      'Martie – Aprilie',
      'Mai – Iunie',
      'Iulie – August',
      'Septembrie – Octombrie',
      'Noiembrie – Decembrie'
    ];

    const startMonth = biMonthIndex * 2;
    const endMonth = biMonthIndex * 2 + 1;

    let prevIndex = biMonthIndex - 1;
    let prevYear = curYear;
    if (prevIndex < 0) {
      prevIndex = 5;
      prevYear = curYear - 1;
    }

    return {
      periodIndex: biMonthIndex + 1,
      periodLabel: `${periods[biMonthIndex]} ${curYear}`,
      prevPeriodLabel: `${periods[prevIndex]} ${prevYear}`,
      startMonth,
      endMonth,
      prevStartMonth: prevIndex * 2,
      prevEndMonth: prevIndex * 2 + 1,
      currentYear: curYear,
      prevYear
    };
  }, []);

  const [scoreMode, setScoreMode] = useState<'bimonthly' | 'total'>('bimonthly');

  // 2. Sort all members by selected score mode (bimonthly or total all-time) descending (EXCLUDING BOARD MEMBERS)
  // - biMonthlyScore: starts at 0 at each new cycle; sums strictly adjustments dated within the current 2 months.
  // - totalScore: permanent all-time lifetime score; sums every positive and negative adjustment ever recorded.
  const sortedMembers = useMemo(() => {
    return [...members]
      .filter(m => !isSystemAccount(m) && !isBoardMember(m))
      .map(m => {
        const adjustments = Array.isArray(m.scoreAdjustments) ? m.scoreAdjustments : [];

        // Calculate current cycle bi-monthly score strictly from dated adjustments
        const biMonthlyScore = adjustments.reduce((sum: number, adj: any) => {
          if (!adj.date) return sum;
          const d = new Date(adj.date);
          if (
            d.getFullYear() === biMonthlyInfo.currentYear &&
            d.getMonth() >= biMonthlyInfo.startMonth &&
            d.getMonth() <= biMonthlyInfo.endMonth
          ) {
            return sum + (Number(adj.points) || 0);
          }
          return sum;
        }, 0);

        // Calculate permanent total score as exact sum of all adjustments
        const totalAdjustmentsSum = adjustments.reduce((sum: number, adj: any) => sum + (Number(adj.points) || 0), 0);
        const totalScore = adjustments.length > 0 
          ? totalAdjustmentsSum 
          : (typeof m.score === 'number' ? m.score : 0);

        const displayScore = scoreMode === 'total' ? totalScore : biMonthlyScore;

        return { ...m, biMonthlyScore, totalScore, displayScore };
      })
      .sort((a, b) => b.displayScore - a.displayScore);
  }, [members, biMonthlyInfo, scoreMode]);

  const locul1 = sortedMembers[0];
  const locul2 = sortedMembers[1];
  const locul3 = sortedMembers[2];
  const locul4 = sortedMembers[3];

  // 3. Cea Mai Mare Evoluție (Diferența pozitivă între perioada bimensuală curentă și cea anterioară)
  const ceaMaiMareEvolutie = useMemo(() => {
    let maxDiff = 0;
    let winner: any = null;

    members.forEach(m => {
      if (isBoardMember(m) || isSystemAccount(m)) return;
      const adjustments = Array.isArray(m.scoreAdjustments) ? m.scoreAdjustments : [];

      // Current Bi-Monthly Score
      const currentScore = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (
          d.getFullYear() === biMonthlyInfo.currentYear &&
          d.getMonth() >= biMonthlyInfo.startMonth &&
          d.getMonth() <= biMonthlyInfo.endMonth
        ) {
          return sum + (Number(adj.points) || 0);
        }
        return sum;
      }, 0);

      // Previous Bi-Monthly Score
      const prevScore = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (
          d.getFullYear() === biMonthlyInfo.prevYear &&
          d.getMonth() >= biMonthlyInfo.prevStartMonth &&
          d.getMonth() <= biMonthlyInfo.prevEndMonth
        ) {
          return sum + (Number(adj.points) || 0);
        }
        return sum;
      }, 0);

      const evolution = currentScore - prevScore;

      if (evolution > maxDiff) {
        maxDiff = evolution;
        winner = { ...m, evolution, currentScore, prevScore };
      }
    });

    return winner;
  }, [members, biMonthlyInfo]);

  // 4. Cea Mai Mare Involuție (Diferența negativă între perioada bimensuală curentă și cea anterioară)
  const ceaMaiMareInvolutie = useMemo(() => {
    let minDiff = 0;
    let candidate: any = null;

    members.forEach(m => {
      if (isBoardMember(m) || isSystemAccount(m)) return;
      const adjustments = Array.isArray(m.scoreAdjustments) ? m.scoreAdjustments : [];

      // Current Bi-Monthly Score
      const currentScore = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (
          d.getFullYear() === biMonthlyInfo.currentYear &&
          d.getMonth() >= biMonthlyInfo.startMonth &&
          d.getMonth() <= biMonthlyInfo.endMonth
        ) {
          return sum + (Number(adj.points) || 0);
        }
        return sum;
      }, 0);

      // Previous Bi-Monthly Score
      const prevScore = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (
          d.getFullYear() === biMonthlyInfo.prevYear &&
          d.getMonth() >= biMonthlyInfo.prevStartMonth &&
          d.getMonth() <= biMonthlyInfo.prevEndMonth
        ) {
          return sum + (Number(adj.points) || 0);
        }
        return sum;
      }, 0);

      const evolution = currentScore - prevScore;

      if (evolution < minDiff) {
        minDiff = evolution;
        candidate = { ...m, involution: evolution, currentScore, prevScore };
      }
    });

    return candidate;
  }, [members, biMonthlyInfo]);

  // 5. Pagination & Search: When searching, search through ALL members.
  // If not searching, show from Rank #5 (Locul 5+) since 1-4 are already featured on the podium.
  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const baseList = query ? sortedMembers : sortedMembers.slice(4);
    if (!query) return baseList;
    return baseList.filter(m => {
      const nameMatch = (m.name || '').toLowerCase().includes(query);
      const nicknameMatch = (m.nickname || '').toLowerCase().includes(query);
      const roleMatch = (m.role || '').toLowerCase().includes(query);
      return nameMatch || nicknameMatch || roleMatch;
    });
  }, [sortedMembers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedMembers = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdjustScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingScore) return;
    if (!scoreModalMember) return;
    const val = parseInt(scoreAdjustValue, 10);
    if (isNaN(val) || val === 0) return toast.error('Introdu o valoare numerică diferită de zero.');
    if (val > MAX_SCORE_ADJUSTMENT || val < MIN_SCORE_ADJUSTMENT) {
      return toast.error(`Punctajul la o singură ajustare trebuie să fie între ${MIN_SCORE_ADJUSTMENT} și +${MAX_SCORE_ADJUSTMENT} puncte.`);
    }
    const cleanReason = scoreAdjustReason.trim();
    if (!cleanReason) return toast.error('Motivul este obligatoriu.');

    const liveMember = members.find(m => m.id === scoreModalMember.id) || scoreModalMember;
    const memberName = liveMember.name || liveMember.nickname || 'Membru';

    const adminName = currentUserObj?.nickname || currentUserObj?.name || (currentUserObj?.username ? `@${currentUserObj.username}` : 'Administrator');
    const adminUsername = currentUserObj?.username;
    const adminId = currentUserObj?.id;

    const newAdjustment = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      points: val,
      reason: cleanReason,
      date: new Date().toISOString(),
      adminName,
      adminUsername,
      adminId,
      targetMemberId: liveMember.id,
      targetMemberName: memberName
    };

    const currentAdjustments = Array.isArray(liveMember.scoreAdjustments) ? liveMember.scoreAdjustments : [];
    const updatedAdjustments = [...currentAdjustments, newAdjustment];
    const newTotalScore = updatedAdjustments.reduce((sum: number, a: any) => sum + (Number(a.points) || 0), 0);

    const updatedMember = {
      ...liveMember,
      score: newTotalScore,
      scoreAdjustments: updatedAdjustments
    };

    setIsSubmittingScore(true);
    try {
      await applyMemberScoreAdjustment(liveMember.id, val, newAdjustment);
      onUpdateMember?.(updatedMember);
      setScoreModalMember(null);
      setScoreAdjustValue('');
      setScoreAdjustReason('');
      if (val > 0) {
        toast.success(`✅ Ai acordat +${val} puncte pentru ${memberName}!`);
      } else {
        toast.success(`⚠️ Ai scăzut ${Math.abs(val)} puncte pentru ${memberName}!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Eroare la salvarea punctajului.');
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const liveHistoryMember = historyModalMember
    ? members.find(m => m.id === historyModalMember.id) || historyModalMember
    : null;

  const sortedHistory = useMemo(() => {
    if (!liveHistoryMember) return [];
    const adjustments = Array.isArray(liveHistoryMember.scoreAdjustments) ? liveHistoryMember.scoreAdjustments : [];
    return [...adjustments].sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [liveHistoryMember]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-8 font-anthropic">
      
      {/* 👑 Spotlight: Voluntarul Bimensual - Locul 1 (Ediția Curentă) */}
      {locul1 && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="relative rounded-[2px] bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-amber-600/15 border border-amber-400/40 p-6 md:p-8 shadow-md font-anthropic"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={locul1.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(locul1.nickname || locul1.name)}&background=fbbf24&color=0F172A`}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-amber-400 object-cover shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                  alt={locul1.name}
                />
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow-md border-2 border-white dark:border-slate-900">
                  <Trophy size={16} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-3 py-1 rounded-[2px] bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-xs font-title">
                    {scoreMode === 'bimonthly' ? '👑 LOCUL 1 — VOLUNTARUL BIMENSUAL' : '👑 LOCUL 1 — CLASAMENT GENERAL'}
                  </span>
                  <span className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-bold font-data">
                    {scoreMode === 'bimonthly' ? biMonthlyInfo.periodLabel : 'Permanent All-Time'}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-anthropicSerif text-slate-900 dark:text-white leading-tight">
                  {locul1.nickname || locul1.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold mt-1">
                  Rol: {locul1.role} · Comisie: {locul1.committee || 'Membru General'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Score Display (Visible for Admins, Anonymized / Status Badge for Volunteers) */}
              {isAdmin ? (
                <div className="flex items-center justify-around sm:justify-center gap-5 sm:gap-6 bg-white/95 dark:bg-slate-900/95 px-5 py-3 rounded-[2px] border border-amber-400/30 shadow-xs font-anthropic">
                  <div className="text-center">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-title">Scor Bilunar</div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-500 font-data leading-none mt-1">
                      {locul1.biMonthlyScore > 0 ? `+${locul1.biMonthlyScore}` : locul1.biMonthlyScore} pct
                    </div>
                  </div>
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
                  <div className="text-center">
                    <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-title">Total Istoric</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 font-data leading-none mt-1">
                      {locul1.totalScore} pct
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 px-5 py-3.5 rounded-[2px] border border-amber-400/30 shadow-xs font-anthropic">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-title text-slate-900 dark:text-white uppercase tracking-wider">Rang Oficial: #1</div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold font-anthropic">Liderul curent al clasamentului</div>
                  </div>
                </div>
              )}

              {/* Admin Actions for Locul 1 */}
              {isAdmin && (
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 font-title">
                  {isStefanMaster && (
                    <button
                      onClick={() => setIsAuditLogOpen(true)}
                      title="Vezi Audit Log Puncte"
                      className="inline-flex items-center justify-center gap-2 h-11 px-4 bg-slate-900 dark:bg-slate-800 text-amber-400 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-[2px] border border-amber-400/40 shadow-xs transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <ShieldAlert size={16} />
                      <span>Audit Log</span>
                    </button>
                  )}
                  <button
                    onClick={() => setHistoryModalMember(locul1)}
                    title="Istoric detaliat puncte"
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-[2px] border border-slate-300 dark:border-slate-700 shadow-xs transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <History size={16} />
                    <span>Istoric</span>
                  </button>
                  <button
                    onClick={() => { setScoreModalMember(locul1); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-[2px] text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Ajustează Scor</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* BENTO GRID */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 font-anthropic"
      >
        {/* PODIUM BIMENSUAL - LOCUL 2, 3, 4 (col-span-2) */}
        <motion.div variants={itemVariants} className="md:col-span-2 admin-card bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] p-5 sm:p-6 shadow-sm font-anthropic">
          <div className="flex items-center gap-2.5 mb-6 relative z-10">
            <Trophy className="text-slate-500 dark:text-slate-400" size={24} />
            <h2 className="text-lg sm:text-xl font-anthropicSerif font-bold text-slate-900 dark:text-white">
              {scoreMode === 'bimonthly' ? `Podium Bimensual (Locul 2 · 3 · 4) — ${biMonthlyInfo.periodLabel}` : 'Podium Clasament Permanent'}
            </h2>
          </div>

          <div className="flex items-end justify-center gap-3 sm:gap-8 min-h-[16rem] pb-2 relative z-10">
            {/* Locul 3 - Bronz (Stânga) */}
            {locul3 && (
              <div className="flex flex-col items-center w-1/3 min-w-0 font-anthropic">
                <div className="relative mb-1.5 flex flex-col items-center">
                  <img
                    src={locul3.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(locul3.nickname || locul3.name)}&background=b45309&color=0F172A`}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-700 object-cover shadow-xs"
                    alt=""
                  />
                </div>
                <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1.5 truncate max-w-full px-1 text-center font-title">
                  {locul3.nickname || locul3.name}
                </div>
                <div className="w-16 sm:w-20 h-22 bg-amber-900/10 dark:bg-amber-950/30 rounded-t-[2px] border-t-2 border-amber-700 flex flex-col items-center justify-start pt-2 shadow-xs">
                  <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 font-data">3</span>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 mt-1 truncate px-0.5 font-title uppercase">
                    {isAdmin ? `${scoreMode === 'total' ? locul3.totalScore : locul3.biMonthlyScore} pts` : 'Bronz'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 mt-2.5 font-title">
                    <button
                      onClick={() => setHistoryModalMember(locul3)}
                      title="Istoric puncte"
                      className="p-1.5 rounded-[2px] border border-amber-700/30 dark:border-amber-600/40 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 transition-colors cursor-pointer"
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={() => { setScoreModalMember(locul3); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                      className="px-2.5 py-1 rounded-[2px] bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Ajustează
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Locul 2 - Argint (Centru) */}
            {locul2 && (
              <div className="flex flex-col items-center w-1/3 min-w-0 z-10 font-anthropic">
                <div className="relative mb-1.5 flex flex-col items-center">
                  <Medal className="text-slate-400 absolute -top-5 sm:-top-6 z-20" size={20} />
                  <img
                    src={locul2.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(locul2.nickname || locul2.name)}&background=94a3b8&color=0F172A`}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-slate-400 object-cover shadow-xs z-10"
                    alt=""
                  />
                </div>
                <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5 truncate max-w-full px-1 text-center font-title">
                  {locul2.nickname || locul2.name}
                </div>
                <div className="w-18 sm:w-24 h-30 bg-slate-100 dark:bg-slate-800 rounded-t-[2px] border-t-4 border-slate-400 flex flex-col items-center justify-start pt-4 shadow-xs">
                  <span className="text-3xl sm:text-4xl font-black text-slate-600 dark:text-slate-300 font-data">2</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate px-0.5 font-title uppercase">
                    {isAdmin ? `${scoreMode === 'total' ? locul2.totalScore : locul2.biMonthlyScore} pts` : 'Argint'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 mt-2.5 font-title">
                    <button
                      onClick={() => setHistoryModalMember(locul2)}
                      title="Istoric puncte"
                      className="p-1.5 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={() => { setScoreModalMember(locul2); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                      className="px-3 py-1 rounded-[2px] bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Ajustează
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Locul 4 - Top Contribuitor (Dreapta) */}
            {locul4 && (
              <div className="flex flex-col items-center w-1/3 min-w-0 font-anthropic">
                <div className="relative mb-1.5 flex flex-col items-center">
                  <img
                    src={locul4.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(locul4.nickname || locul4.name)}&background=334155&color=0F172A`}
                    className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 border-indigo-400 object-cover shadow-xs"
                    alt=""
                  />
                </div>
                <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1.5 truncate max-w-full px-1 text-center font-title">
                  {locul4.nickname || locul4.name}
                </div>
                <div className="w-16 sm:w-20 h-18 bg-indigo-50 dark:bg-indigo-950/30 rounded-t-[2px] border-t-2 border-indigo-400 flex flex-col items-center justify-start pt-1.5 shadow-xs">
                  <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-data">4</span>
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mt-0.5 truncate px-0.5 font-title uppercase">
                    {isAdmin ? `${scoreMode === 'total' ? locul4.totalScore : locul4.biMonthlyScore} pts` : 'Top 4'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 mt-2.5 font-title">
                    <button
                      onClick={() => setHistoryModalMember(locul4)}
                      title="Istoric puncte"
                      className="p-1.5 rounded-[2px] border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={() => { setScoreModalMember(locul4); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                      className="px-2.5 py-1 rounded-[2px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Ajustează
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* EVOLUȚIE & INVOLUȚIE */}
        <div className="md:col-span-1 flex flex-col gap-6 font-anthropic">
          {/* 1. Cea Mai Mare Evoluție */}
          <motion.div variants={itemVariants} className="flex-1 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-[2px] p-5 sm:p-6 shadow-xs flex flex-col justify-between font-anthropic">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-3">
              <TrendingUp className="text-emerald-700 dark:text-emerald-400" size={20} />
              <h3 className="font-anthropicSerif font-bold text-base uppercase tracking-wider text-slate-900 dark:text-white">Cea Mai Mare Evoluție</h3>
            </div>
            {ceaMaiMareEvolutie ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={ceaMaiMareEvolutie.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ceaMaiMareEvolutie.nickname || ceaMaiMareEvolutie.name)}&background=047857&color=FFFFFF`}
                    className="w-12 h-12 rounded-[2px] border border-emerald-500/40 object-cover shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight mb-0.5 truncate font-title">{ceaMaiMareEvolutie.nickname || ceaMaiMareEvolutie.name}</div>
                    <div className="text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm font-data">
                      {isAdmin ? `+${ceaMaiMareEvolutie.evolution} pct vs perioada anterioară` : '🚀 Cea mai activă ascensiune'}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { setScoreModalMember(ceaMaiMareEvolutie); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                    className="px-3 py-1.5 rounded-[2px] bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-xs shrink-0 transition-colors font-title cursor-pointer uppercase tracking-wider"
                  >
                    Ajustează
                  </button>
                )}
              </div>
            ) : (
              <div className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium">Nu sunt date suficiente de comparație.</div>
            )}
          </motion.div>

          {/* 2. Cea Mai Mare Involuție */}
          <motion.div variants={itemVariants} className="flex-1 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-[2px] p-5 sm:p-6 shadow-xs flex flex-col justify-between font-anthropic">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-3">
              <TrendingDown className="text-rose-700 dark:text-rose-400" size={20} />
              <h3 className="font-anthropicSerif font-bold text-base uppercase tracking-wider text-slate-900 dark:text-white">Cea Mai Mare Involuție</h3>
            </div>
            {ceaMaiMareInvolutie ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={ceaMaiMareInvolutie.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ceaMaiMareInvolutie.nickname || ceaMaiMareInvolutie.name)}&background=be123c&color=FFFFFF`}
                    className="w-12 h-12 rounded-[2px] border border-rose-500/40 object-cover shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight mb-0.5 truncate font-title">{ceaMaiMareInvolutie.nickname || ceaMaiMareInvolutie.name}</div>
                    <div className="text-rose-800 dark:text-rose-300 font-bold text-xs sm:text-sm font-data">
                      {isAdmin ? `${ceaMaiMareInvolutie.involution} pct vs perioada anterioară` : '⚠️ Scădere activitate'}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { setScoreModalMember(ceaMaiMareInvolutie); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                    className="px-3 py-1.5 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs shrink-0 transition-colors font-title cursor-pointer uppercase tracking-wider"
                  >
                    Ajustează
                  </button>
                )}
              </div>
            ) : (
              <div className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium">Nicio scădere de punctaj înregistrată.</div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* FULL LEADERBOARD TABLE */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="admin-card rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B22] p-5 sm:p-6 shadow-sm font-anthropic"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg sm:text-xl font-anthropicSerif font-bold text-slate-900 dark:text-white">
              {searchQuery.trim()
                ? `Rezultate căutare: "${searchQuery}"`
                : scoreMode === 'bimonthly'
                ? `Clasament Bimensual (Locul 5+) — ${biMonthlyInfo.periodLabel}`
                : 'Clasament General (Total Istoric)'}
            </h2>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-[2px] border border-slate-200 dark:border-slate-700 font-title">
              <button
                type="button"
                onClick={() => setScoreMode('bimonthly')}
                className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  scoreMode === 'bimonthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Ediția Bilunară (2 Luni)
              </button>
              <button
                type="button"
                onClick={() => setScoreMode('total')}
                className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  scoreMode === 'total'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Total Istoric (Permanent)
              </button>
            </div>
          </div>

          <div className="relative group w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Caută orice voluntar..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all font-anthropic"
            />
          </div>
        </div>

        {/* Informational rule strip */}
        <div className="mb-4 px-3.5 py-2 rounded-[2px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs text-slate-700 dark:text-slate-300 font-anthropic">
          <div className="flex items-center gap-2 font-bold font-title">
            <Award size={15} className="text-amber-500" />
            <span className="text-slate-900 dark:text-white uppercase tracking-wider">
              {scoreMode === 'bimonthly' ? `Ciclu Bilunar Activ: ${biMonthlyInfo.periodLabel}` : 'Evidență Permanentă: Scor Total Istoric'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-anthropic">
            {scoreMode === 'bimonthly' 
              ? 'La fiecare ciclu de 2 luni, toți membrii pornesc de la 0 puncte.' 
              : 'Însumează toate punctele din istoria clubului (nu se resetează niciodată).'}
          </div>
        </div>

        <div className="overflow-x-auto p-0.5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 text-center font-title text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Rang</TableHead>
                <TableHead className="font-title text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Membru</TableHead>
                <TableHead className="font-title text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Rol</TableHead>
                <TableHead className="text-right font-title text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {isAdmin ? (scoreMode === 'bimonthly' ? `Punctaj Bilunar (${biMonthlyInfo.periodLabel})` : 'Punctaj Total Istoric') : 'Poziție în Clasament'}
                </TableHead>
                {isAdmin && (
                  <TableHead className="text-right font-title text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Acțiuni</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map((m) => {
                const globalRank = sortedMembers.findIndex(sm => sm.id === m.id) + 1;
                const scoreValue = scoreMode === 'total' ? (m.totalScore || 0) : (m.biMonthlyScore || 0);
                const isNegative = scoreValue < 0;

                return (
                  <TableRow key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <TableCell className="text-center font-bold text-slate-500 dark:text-slate-400 font-data text-sm sm:text-base">#{globalRank}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nickname || m.name)}&background=0f172a&color=f8fafc`}
                          className="w-8 h-8 rounded-[2px] border border-slate-200 dark:border-white/10 dark:bg-transparent object-cover"
                          alt=""
                        />
                        <span className="font-title text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{m.nickname || m.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="neutral">{m.role || 'Voluntar'}</Badge></TableCell>
                    
                    {/* Score / Rank Display */}
                    <TableCell className="text-right font-black font-data text-base sm:text-lg">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-2">
                          {isNegative && (
                            <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-[2px] bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-title">
                              Scor Negativ
                            </span>
                          )}
                          <span className={isNegative ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
                            {scoreValue > 0 ? `+${scoreValue}` : scoreValue}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 font-title">
                          <span className="px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider">
                            {globalRank <= 3 ? `🏆 Locul #${globalRank}` : globalRank <= 10 ? `⭐ Top ${globalRank}` : `Voluntar Activ`}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <TableCell className="text-right font-title">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setHistoryModalMember(m)}
                            title="Istoric puncte"
                            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[2px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                          >
                            <History size={15} />
                          </button>
                          <button
                            onClick={() => { setScoreModalMember(m); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            Ajustează
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {paginatedMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-slate-500 dark:text-slate-400 font-semibold h-24 text-sm">Niciun membru găsit.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 font-anthropic">
            <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-data">Pagina {currentPage} din {totalPages}</span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[2px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[2px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Score Adjustment Modal (Admin Only) */}
      <AnimatePresence>
        {isAdmin && scoreModalMember && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 font-anthropic">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => !isSubmittingScore && setScoreModalMember(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl h-[88vh] max-h-[720px] flex flex-col rounded-[2px] shadow-2xl p-5 sm:p-7 z-[121] bg-white dark:bg-[#161B22] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 font-anthropic overflow-hidden"
            >
              <div className="mb-4 flex items-center gap-3.5 shrink-0">
                <img
                  src={scoreModalMember.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(scoreModalMember.nickname || scoreModalMember.name)}&background=0f172a&color=f8fafc`}
                  className="w-12 h-12 rounded-[2px] border border-slate-200 dark:border-slate-700 object-cover"
                  alt=""
                />
                <div>
                  <h3 className="font-bold font-title text-lg text-slate-900 dark:text-white leading-tight">Ajustare Punctaj</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">{scoreModalMember.nickname || scoreModalMember.name}</p>
                </div>
              </div>

              <form onSubmit={handleAdjustScore} className="space-y-4 font-anthropic flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                    Puncte (folosește minus pentru scădere, ex: -3)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreAdjustValue(v => String((parseInt(v, 10) || 0) - 1))}
                      className="p-3 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      value={scoreAdjustValue}
                      onChange={e => setScoreAdjustValue(e.target.value)}
                      required
                      placeholder="0"
                      className="w-full text-center px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-colors font-data"
                    />
                    <button
                      type="button"
                      onClick={() => setScoreAdjustValue(v => String((parseInt(v, 10) || 0) + 1))}
                      className="p-3 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Motiv / Justificare</label>
                  <input
                    type="text"
                    value={scoreAdjustReason}
                    onChange={e => setScoreAdjustReason(e.target.value)}
                    required
                    placeholder="Ex: Implicare excepțională / Absență nemotivată"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-colors font-anthropic"
                  />
                </div>

                {/* Interactive Scoring Reference Guide */}
                <ScoringReferenceGuide
                  selectedAction={scoreAdjustReason}
                  onSelectPreset={(preset: ScoringPreset) => {
                    setScoreAdjustValue(String(preset.points));
                    setScoreAdjustReason(preset.action);
                  }}
                />

                <div className="pt-3 flex gap-3 font-title">
                  <button
                    type="button"
                    onClick={() => setScoreModalMember(null)}
                    disabled={isSubmittingScore}
                    className="flex-1 py-3 rounded-[2px] border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold uppercase tracking-wider disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingScore}
                    className="flex-1 py-3 rounded-[2px] bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isSubmittingScore ? 'Se salvează...' : 'Salvează'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Score History Modal (Admin Only) */}
      <AnimatePresence>
        {isAdmin && liveHistoryMember && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 font-anthropic">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setHistoryModalMember(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg h-[85vh] max-h-[640px] flex flex-col rounded-[2px] shadow-2xl p-5 sm:p-7 z-[121] bg-white dark:bg-[#161B22] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 font-anthropic overflow-hidden"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={liveHistoryMember.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(liveHistoryMember.nickname || liveHistoryMember.name)}&background=0f172a&color=f8fafc`}
                    className="w-11 h-11 rounded-[2px] border border-slate-200 dark:border-slate-700 object-cover"
                    alt=""
                  />
                  <div>
                    <h3 className="font-bold font-title text-base sm:text-lg text-slate-900 dark:text-white leading-tight">Istoric Detaliat Punctaj</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">{liveHistoryMember.nickname || liveHistoryMember.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalMember(null)}
                  className="p-1.5 rounded-[2px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Total Score Header Strip */}
              {(() => {
                const adjSum = (liveHistoryMember.scoreAdjustments || []).reduce((s: number, a: any) => s + (Number(a.points) || 0), 0);
                const computedTotal = (liveHistoryMember.scoreAdjustments?.length > 0)
                  ? adjSum 
                  : (typeof liveHistoryMember.score === 'number' ? liveHistoryMember.score : 0);

                return (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px]">
                    <div className="flex items-center justify-between text-xs font-bold font-title text-slate-700 dark:text-slate-300">
                      <span className="uppercase tracking-wider">Scor Total Permanent:</span>
                      <span className={`font-data font-black text-sm ${computedTotal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {computedTotal > 0 ? `+${computedTotal}` : computedTotal} pct
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div 
                className="overflow-y-auto overscroll-contain pr-1 space-y-2.5 flex-1 min-h-0 font-anthropic touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {sortedHistory.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium py-8">
                    Nicio ajustare de punctaj înregistrată pentru acest membru.
                  </div>
                ) : (
                  sortedHistory.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] p-3.5 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold font-data">
                            {formatRomaniaDateTime(item.date, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words leading-snug">{item.reason || 'Ajustare punctaj'}</p>
                        {item.adminName && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 font-anthropic">
                            Înregistrat de: {item.adminName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-black font-data text-xs sm:text-sm px-2.5 py-1 rounded-[2px] ${
                            (item.points || 0) > 0
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : (item.points || 0) < 0
                              ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {(item.points || 0) > 0 ? `+${item.points}` : item.points}
                        </span>

                        <button
                          onClick={async () => {
                            try {
                              const adminName = currentUserObj?.name || currentUserObj?.username || 'Admin';
                              const adminUsername = currentUserObj?.username;
                              const { newScore, updatedAdjustments } = await revertMemberScoreAdjustment(
                                liveHistoryMember.id,
                                item.id,
                                { name: adminName, username: adminUsername, id: currentUserObj?.id }
                              );
                              onUpdateMember?.({
                                ...liveHistoryMember,
                                score: newScore,
                                scoreAdjustments: updatedAdjustments
                              });
                              toast.success(`Ajustarea de punctaj (${item.points > 0 ? '+' : ''}${item.points} pct) a fost anulată!`);
                            } catch (err: any) {
                              toast.error(err.message || 'Eroare la anularea punctajului.');
                            }
                          }}
                          className="p-1.5 rounded-[2px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Anulează această ajustare (Revert)"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Score Audit Log Modal */}
      <ScoreAuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
