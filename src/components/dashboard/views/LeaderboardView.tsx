import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, TrendingUp, Search, ChevronLeft, ChevronRight, Plus, Minus, History, X } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { applyMemberScoreAdjustment } from '../../../utils/supabaseService';
import { toast } from '../../ui/Toast';

interface LeaderboardViewProps {
  members: any[];
  isAdmin?: boolean;
  onUpdateMember?: (member: any) => void;
}

export function LeaderboardView({ members, isAdmin = false, onUpdateMember }: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Score Adjustment Modal state
  const [scoreModalMember, setScoreModalMember] = useState<any | null>(null);
  const [scoreAdjustValue, setScoreAdjustValue] = useState('');
  const [scoreAdjustReason, setScoreAdjustReason] = useState('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  // History Modal state
  const [historyModalMember, setHistoryModalMember] = useState<any | null>(null);

  // Calculate the current quarter dynamically
  const { quarter, startMonth, endMonth, currentYear } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-11
    const q = Math.floor(curMonth / 3) + 1; // 1, 2, 3, 4
    return {
      quarter: q,
      startMonth: (q - 1) * 3,
      endMonth: (q - 1) * 3 + 2,
      currentYear: curYear
    };
  }, []);

  // 1. Sort all members by quarterly score descending
  const sortedMembers = useMemo(() => {
    return [...members]
      .filter(m => m.role?.toLowerCase() !== 'admin') // exclude admins from leaderboard
      .map(m => {
        const adjustments = m.scoreAdjustments || [];
        const quarterScore = adjustments.reduce((sum: number, adj: any) => {
          if (!adj.date) return sum;
          const d = new Date(adj.date);
          if (
            d.getFullYear() === currentYear &&
            d.getMonth() >= startMonth &&
            d.getMonth() <= endMonth
          ) {
            return sum + (adj.points || 0);
          }
          return sum;
        }, 0);
        return { ...m, quarterScore };
      })
      .sort((a, b) => b.quarterScore - a.quarterScore);
  }, [members, currentYear, startMonth, endMonth]);

  const top3 = sortedMembers.slice(0, 3);
  
  // 2. Voluntarul Lunii (based on current month)
  const voluntarulLunii = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const curYear = now.getFullYear();

    let maxPoints = -1;
    let winner: any = null;

    members.forEach(m => {
      if (m.role?.toLowerCase() === 'admin') return;
      const adjustments = m.scoreAdjustments || [];
      const pointsThisMonth = adjustments.reduce((sum: number, adj: any) => {
        const d = new Date(adj.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === curYear) {
          return sum + (adj.points || 0);
        }
        return sum;
      }, 0);

      if (pointsThisMonth > maxPoints && pointsThisMonth > 0) {
        maxPoints = pointsThisMonth;
        winner = { ...m, monthlyPoints: pointsThisMonth };
      }
    });

    return winner;
  }, [members]);

  // 3. Cea Mai Mare Evoluție (Diferența dintre trimestrul curent și trimestrul anterior, exclude top 3)
  const { prevQuarter, prevStartMonth, prevEndMonth, prevYear } = useMemo(() => {
    let pq = quarter - 1;
    let py = currentYear;
    if (pq === 0) {
      pq = 4;
      py = currentYear - 1;
    }
    return {
      prevQuarter: pq,
      prevStartMonth: (pq - 1) * 3,
      prevEndMonth: (pq - 1) * 3 + 2,
      prevYear: py
    };
  }, [quarter, currentYear]);

  const ceaMaiMareEvolutie = useMemo(() => {
    let maxDiff = -999999;
    let winner: any = null;

    const top3Ids = top3.map(m => m.id);

    members.forEach(m => {
      if (m.role?.toLowerCase() === 'admin' || top3Ids.includes(m.id)) return;
      const adjustments = m.scoreAdjustments || [];

      // Current Quarter Score
      const quarterScore = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (
          d.getFullYear() === currentYear &&
          d.getMonth() >= startMonth &&
          d.getMonth() <= endMonth
        ) {
          return sum + (adj.points || 0);
        }
        return sum;
      }, 0);

      // Previous Quarter Score
      const prevQuarterScore = adjustments.reduce((sum: number, adj: any) => {
        if (!adj.date) return sum;
        const d = new Date(adj.date);
        if (
          d.getFullYear() === prevYear &&
          d.getMonth() >= prevStartMonth &&
          d.getMonth() <= prevEndMonth
        ) {
          return sum + (adj.points || 0);
        }
        return sum;
      }, 0);

      const evolution = quarterScore - prevQuarterScore;

      // We only spotlight positive evolution (growth)
      if (evolution > maxDiff && evolution > 0) {
        maxDiff = evolution;
        winner = { ...m, evolution };
      }
    });

    return winner;
  }, [members, top3, currentYear, startMonth, endMonth, prevYear, prevStartMonth, prevEndMonth]);

  // 4. Pagination & Search
  const filteredList = sortedMembers.filter(m => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (m.name || '').toLowerCase().includes(query);
    const nicknameMatch = (m.nickname || '').toLowerCase().includes(query);
    const roleMatch = (m.role || '').toLowerCase().includes(query);
    return nameMatch || nicknameMatch || roleMatch;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedMembers = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdjustScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreModalMember) return;
    const val = parseInt(scoreAdjustValue, 10);
    if (isNaN(val) || val === 0) return toast.error('Introdu o valoare numerică diferită de zero.');
    if (!scoreAdjustReason.trim()) return toast.error('Motivul este obligatoriu.');

    // Read the freshest copy from the live members list to avoid stale scores.
    const liveMember = members.find(m => m.id === scoreModalMember.id) || scoreModalMember;

    const newAdjustment = {
      id: `adj_${Date.now()}`,
      points: val,
      reason: scoreAdjustReason.trim(),
      date: new Date().toISOString(),
      adminName: 'Admin'
    };

    // No floor at 0 — scores are allowed to go negative.
    const newScore = (liveMember.score || 0) + val;

    const updatedMember = {
      ...liveMember,
      score: newScore,
      scoreAdjustments: [...(liveMember.scoreAdjustments || []), newAdjustment]
    };

    setIsSubmittingScore(true);
    try {
      // Ajustare atomică (increment + arrayUnion) — nu suprascrie tot documentul.
      await applyMemberScoreAdjustment(liveMember.id, val, newAdjustment);
      onUpdateMember?.(updatedMember);
      setScoreModalMember(null);
      setScoreAdjustValue('');
      setScoreAdjustReason('');
      toast.success(val > 0 ? `+${val} puncte acordate!` : `${val} puncte scăzute.`);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la ajustarea scorului.');
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // Always resolve the history modal against the live members list so it
  // reflects the latest adjustments (e.g. right after adjusting a score).
  const liveHistoryMember = historyModalMember
    ? members.find(m => m.id === historyModalMember.id) || historyModalMember
    : null;

  const sortedHistory = useMemo(() => {
    if (!liveHistoryMember) return [];
    return [...(liveHistoryMember.scoreAdjustments || [])].sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
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
    <div className="space-y-8">
      {/* BENTO GRID */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* PODIUM TRIMESTRIAL (col-span-2) */}
        <motion.div variants={itemVariants} className="md:col-span-2 admin-card bg-white border border-brand-muted/10 rounded-t-[3.5rem] rounded-b-xl shadow-xl font-anthropic">
          <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-brand-primary/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-brand-muted/10 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <Trophy className="text-amber-400" size={28} />
            <h2 className="text-xl font-anthropicSerif font-semibold text-slate-800">Podium Trimestrial (Q{quarter} {currentYear})</h2>
          </div>

          <div className="flex items-end justify-center gap-4 sm:gap-8 h-56 relative z-10">
            {/* Rank 2 - Silver */}
            {top3[1] && (
              <div className="flex flex-col items-center w-1/3">
                <div className="relative mb-2 flex flex-col items-center">
                  <img
                    src={top3[1].avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(top3[1].nickname || top3[1].name)}&background=94a3b8&color=0F172A`}
                    className="w-12 h-12 rounded-full border-2 border-slate-400 object-cover shadow-[0_0_10px_rgba(148,163,184,0.3)]"
                    alt={top3[1].nickname || top3[1].name}
                  />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 truncate w-full text-center">
                  {top3[1].nickname || top3[1].name}
                </div>
                <div className="w-16 h-24 bg-slate-100 rounded-t-2xl border-t-2 border-slate-400 flex flex-col items-center justify-start pt-3 shadow-sm">
                  <span className="text-2xl font-black text-slate-400">2</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">{top3[1].quarterScore || 0} pts</span>
                </div>
              </div>
            )}
            {/* Rank 1 - Gold */}
            {top3[0] && (
              <div className="flex flex-col items-center w-1/3 z-10">
                <div className="relative mb-2 flex flex-col items-center">
                  <Medal className="text-amber-400 absolute -top-5 z-20 animate-bounce" size={24} />
                  <img
                    src={top3[0].avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(top3[0].nickname || top3[0].name)}&background=fbbf24&color=0F172A`}
                    className="w-14 h-14 rounded-full border-2 border-amber-400 object-cover shadow-[0_0_15px_rgba(251,191,36,0.5)] z-10"
                    alt={top3[0].nickname || top3[0].name}
                  />
                </div>
                <div className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-2 truncate w-full text-center">
                  {top3[0].nickname || top3[0].name}
                </div>
                <div className="w-20 h-32 bg-amber-50 rounded-t-2xl border-t-4 border-amber-400 flex flex-col items-center justify-start pt-4 shadow-md">
                  <span className="text-3xl font-black text-amber-500">1</span>
                  <span className="text-xs font-bold text-amber-600 mt-1">{top3[0].quarterScore || 0} pts</span>
                </div>
              </div>
            )}
            {/* Rank 3 - Bronze */}
            {top3[2] && (
              <div className="flex flex-col items-center w-1/3">
                <div className="relative mb-2 flex flex-col items-center">
                  <img
                    src={top3[2].avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(top3[2].nickname || top3[2].name)}&background=b45309&color=0F172A`}
                    className="w-12 h-12 rounded-full border-2 border-amber-700 object-cover shadow-[0_0_10px_rgba(180,83,9,0.3)]"
                    alt={top3[2].nickname || top3[2].name}
                  />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2 truncate w-full text-center">
                  {top3[2].nickname || top3[2].name}
                </div>
                <div className="w-16 h-20 bg-amber-900/10 rounded-t-2xl border-t-2 border-amber-700 flex flex-col items-center justify-start pt-2 shadow-sm">
                  <span className="text-2xl font-black text-amber-700">3</span>
                  <span className="text-[10px] font-bold text-amber-800 mt-1">{top3[2].quarterScore || 0} pts</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* VOLUNTARUL LUNII & EVOLUTIE */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <motion.div variants={itemVariants} className="flex-1 bg-amber-50/50 border-4 border-slate-900 rounded-none p-6 shadow-[6px_6px_0px_#0F172A] relative overflow-hidden flex flex-col justify-between font-anthropic">
            <div className="flex items-center gap-2 text-brand-accent mb-4">
              <Star className="text-amber-600" size={20} />
              <h3 className="font-anthropicSerif font-semibold text-sm uppercase tracking-wider text-slate-800">Voluntarul Lunii</h3>
            </div>
            {voluntarulLunii ? (
              <div className="flex items-center gap-4">
                <img
                  src={voluntarulLunii.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(voluntarulLunii.nickname || voluntarulLunii.name)}&background=001f26&color=FAF9F5`}
                  className="w-12 h-12 rounded-full border border-emerald-500/30 object-cover"
                  alt=""
                />
                <div>
                  <div className="text-xl font-black text-brand-accent leading-tight mb-1">{voluntarulLunii.nickname || voluntarulLunii.name}</div>
                  <div className="text-emerald-700 font-bold text-sm">+{voluntarulLunii.monthlyPoints} puncte luna aceasta</div>
                </div>
              </div>
            ) : (
              <div className="text-brand-accent/50 text-sm font-semibold">Nu sunt date suficiente luna aceasta.</div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="flex-1 bg-indigo-50/10 border border-indigo-200 rounded-[3rem_0.5rem_3rem_0.5rem] p-6 shadow-lg flex flex-col justify-between font-anthropic">
            <div className="flex items-center gap-2 text-brand-accent mb-4">
              <TrendingUp className="text-indigo-500" size={20} />
              <h3 className="font-anthropicSerif font-semibold text-sm uppercase tracking-wider text-slate-800">Cea Mai Mare Evoluție</h3>
            </div>
            {ceaMaiMareEvolutie ? (
              <div className="flex items-center gap-4">
                <img
                  src={ceaMaiMareEvolutie.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ceaMaiMareEvolutie.nickname || ceaMaiMareEvolutie.name)}&background=001f26&color=FAF9F5`}
                  className="w-10 h-10 rounded-full border border-indigo-500/20 object-cover"
                  alt=""
                />
                <div>
                  <div className="text-lg font-bold text-brand-accent leading-tight mb-1">{ceaMaiMareEvolutie.nickname || ceaMaiMareEvolutie.name}</div>
                  <div className="text-indigo-600 font-bold text-xs uppercase tracking-wider">+{ceaMaiMareEvolutie.evolution} puncte (vs. Q{prevQuarter})</div>
                </div>
              </div>
            ) : (
              <div className="text-brand-accent/50 text-sm font-semibold">Nu sunt date suficiente.</div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* FULL LEADERBOARD TABLE */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="admin-card rounded-none border border-slate-200 bg-white p-8 shadow-xl font-anthropic"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-anthropicSerif font-semibold text-slate-800">Clasament Trimestrial (Q{quarter} {currentYear})</h2>
          <div className="relative group w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent/40 group-focus-within:text-brand-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Caută voluntar..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all font-['Manrope']"
            />
          </div>
        </div>

        <div className="overflow-x-auto p-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Rang</TableHead>
                <TableHead>Membru</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Punctaj Trimestrial</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map((m, idx) => {
                const globalRank = (currentPage - 1) * itemsPerPage + idx + 1;
                const scoreValue = m.quarterScore || 0;
                return (
                  <TableRow key={m.id} className="group">
                    <TableCell className="text-center font-bold text-slate-400">#{globalRank}</TableCell>
                    <TableCell className="font-bold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nickname || m.name)}&background=0f172a&color=f8fafc`}
                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 dark:bg-transparent object-cover"
                          alt=""
                        />
                        <span>{m.nickname || m.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="neutral">{m.role}</Badge></TableCell>
                    <TableCell className={`text-right font-black font-['Manrope'] text-lg ${scoreValue < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {scoreValue}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setHistoryModalMember(m)}
                          title="Istoric puncte"
                          className="p-1.5 border border-brand-muted/10 rounded-lg hover:bg-brand-accent/5 text-brand-accent/60 hover:text-brand-accent transition-all"
                        >
                          <History size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setScoreModalMember(m); setScoreAdjustValue(''); setScoreAdjustReason(''); }}
                            className="px-2 py-1.5 bg-brand-accent/5 hover:bg-brand-accent/10 text-brand-accent rounded-lg text-[10px] font-bold transition-colors border border-brand-accent/10"
                          >
                            Ajustează
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 font-semibold h-24">Niciun membru găsit.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-brand-muted/5 pt-6">
            <span className="text-xs font-bold text-brand-accent/40 uppercase tracking-wider">Pagina {currentPage} din {totalPages}</span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 border border-brand-muted/10 rounded-lg hover:bg-brand-accent/5 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 border border-brand-muted/10 rounded-lg hover:bg-brand-accent/5 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Score Adjustment Modal */}
      <AnimatePresence>
        {scoreModalMember && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-accent/60 backdrop-blur-md"
              onClick={() => !isSubmittingScore && setScoreModalMember(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] p-8 z-[121] border border-brand-muted/10"
              style={{ background: 'var(--adm-panel)' }}
            >
              <div className="mb-6 flex items-center gap-3">
                <img
                  src={scoreModalMember.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(scoreModalMember.nickname || scoreModalMember.name)}&background=0f172a&color=f8fafc`}
                  className="w-10 h-10 rounded-full border border-brand-muted/10 object-cover"
                  alt=""
                />
                <div>
                  <h3 className="font-bold text-lg text-brand-accent leading-tight">Ajustare Punctaj</h3>
                  <p className="text-xs opacity-60 font-bold">{scoreModalMember.nickname || scoreModalMember.name}</p>
                </div>
              </div>

              <form onSubmit={handleAdjustScore} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                    Puncte (folosește minus pentru scădere, ex: -3)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreAdjustValue(v => String((parseInt(v, 10) || 0) - 1))}
                      className="p-3 rounded-xl border border-brand-muted/10 hover:bg-rose-50 text-rose-600 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={scoreAdjustValue}
                      onChange={e => setScoreAdjustValue(e.target.value)}
                      required
                      placeholder="0"
                      className="w-full text-center px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm font-bold focus:outline-none focus:border-brand-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setScoreAdjustValue(v => String((parseInt(v, 10) || 0) + 1))}
                      className="p-3 rounded-xl border border-brand-muted/10 hover:bg-emerald-50 text-emerald-600 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Motiv / Justificare</label>
                  <input
                    type="text"
                    value={scoreAdjustReason}
                    onChange={e => setScoreAdjustReason(e.target.value)}
                    required
                    placeholder="Ex: Implicare excepțională / Absență nemotivată"
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setScoreModalMember(null)}
                    disabled={isSubmittingScore}
                    className="flex-1 py-2.5 btn-stitch-secondary text-xs font-bold disabled:opacity-50"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingScore}
                    className="flex-1 py-2.5 btn-stitch-theme text-xs font-bold disabled:opacity-50"
                  >
                    {isSubmittingScore ? 'Se salvează...' : 'Salvează'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Score History Modal */}
      <AnimatePresence>
        {liveHistoryMember && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-accent/60 backdrop-blur-md"
              onClick={() => setHistoryModalMember(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md max-h-[80vh] flex flex-col rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] p-8 z-[121] border border-brand-muted/10"
              style={{ background: 'var(--adm-panel)' }}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={liveHistoryMember.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(liveHistoryMember.nickname || liveHistoryMember.name)}&background=0f172a&color=f8fafc`}
                    className="w-10 h-10 rounded-full border border-brand-muted/10 object-cover"
                    alt=""
                  />
                  <div>
                    <h3 className="font-bold text-lg text-brand-accent leading-tight">Istoric Punctaj</h3>
                    <p className="text-xs opacity-60 font-bold">{liveHistoryMember.nickname || liveHistoryMember.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalMember(null)}
                  className="p-2 rounded-full hover:bg-brand-accent/5 text-brand-accent/50 hover:text-brand-accent transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto pr-1 space-y-2 flex-1">
                {sortedHistory.length === 0 ? (
                  <div className="text-center text-brand-accent/40 text-sm font-semibold py-10">
                    Niciun punctaj ajustat încă pentru acest membru.
                  </div>
                ) : (
                  sortedHistory.map((adj: any) => (
                    <div
                      key={adj.id}
                      className="flex items-start justify-between gap-3 bg-white border border-brand-muted/5 rounded-2xl p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 break-words">{adj.reason || 'Fără motiv specificat'}</p>
                        <p className="text-[11px] text-brand-accent/40 font-bold mt-1">
                          {new Date(adj.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {adj.adminName ? ` · ${adj.adminName}` : ''}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 font-black font-['Manrope'] text-sm px-2.5 py-1 rounded-full ${
                          adj.points > 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {adj.points > 0 ? `+${adj.points}` : adj.points}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

