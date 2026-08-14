import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Search, RefreshCw, X, ArrowUpRight, ArrowDownRight, RotateCcw, Lock, UserX, UserPlus, Key } from 'lucide-react';
import { fetchScoreAuditLogs, ScoreAuditLog } from '../../../utils/supabaseService';

interface ScoreAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function ScoreAuditLogModal({ isOpen, onClose }: ScoreAuditLogModalProps) {
  const [logs, setLogs] = useState<ScoreAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'SCORE' | 'PAYMENT' | 'MEMBER' | 'ABSENCE' | 'PROJECT' | 'SUGGESTION' | 'KUDOS'>('ALL');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchScoreAuditLogs()
        .then(data => setLogs(data))
        .catch(err => console.error("Could not fetch score audit logs:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase().trim();
    const act = (log.action || '').toUpperCase();

    if (selectedCategory === 'SCORE' && !['ADDED', 'SUBTRACTED', 'REVERTED'].includes(act)) return false;
    if (selectedCategory === 'PAYMENT' && !act.includes('PAYMENT')) return false;
    if (selectedCategory === 'MEMBER' && !(act.startsWith('MEMBER_') || act === 'PASSWORD_CHANGE' || act.includes('ROLE') || act.includes('PROFILE'))) return false;
    if (selectedCategory === 'ABSENCE' && !(act.startsWith('ABSENCE') || act.includes('ATTENDANCE') || act.includes('MOTIV'))) return false;
    if (selectedCategory === 'PROJECT' && !(act.startsWith('PROJECT') || act.includes('PROPOSAL'))) return false;
    if (selectedCategory === 'SUGGESTION' && !act.startsWith('SUGGESTION')) return false;
    if (selectedCategory === 'KUDOS' && !act.startsWith('KUDOS')) return false;

    if (!q) return true;
    return (
      (log.adminName && log.adminName.toLowerCase().includes(q)) ||
      (log.adminUsername && log.adminUsername.toLowerCase().includes(q)) ||
      (log.targetMemberName && log.targetMemberName.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q))
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md font-anthropic">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative w-full max-w-5xl lg:max-w-6xl max-h-[90vh] flex flex-col bg-white dark:bg-[#161B22] text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl overflow-hidden z-[201] score-audit-modal font-anthropic"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header Bar */}
          <div className="p-4 sm:p-5 bg-slate-900 dark:bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 text-white font-anthropic">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-[2px] bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <ShieldAlert size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap font-title">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Jurnal Audit — Conducere Executivă
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[2px] bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider font-data">
                    <Lock size={12} /> Legal & Imutabil
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium font-anthropic mt-0.5">
                  Evidență exhaustivă în timp real pentru orice operațiune din platformă.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-[2px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Category Filter Chips & Search bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0 font-anthropic">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Caută după admin, membru sau motiv..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 shadow-xs font-anthropic"
                />
              </div>

              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-bold font-data">
                Afișate: <strong className="text-amber-700 dark:text-amber-400 font-black">{filteredLogs.length}</strong> din {logs.length} acțiuni înregistrate
              </div>
            </div>

            {/* Filter Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 font-title">
              {[
                { id: 'ALL', label: 'Toate Activitățile' },
                { id: 'SCORE', label: 'Punctaje & Penalizări' },
                { id: 'PAYMENT', label: 'Cotizații & Plăți' },
                { id: 'MEMBER', label: 'Gestiune Membri' },
                { id: 'ABSENCE', label: 'Învoiri & Prezențe' },
                { id: 'PROJECT', label: 'Propuneri Proiecte' },
                { id: 'SUGGESTION', label: 'Casetă Sugestii' },
                { id: 'KUDOS', label: 'Kudos & Aprecieri' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all border cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-100/60 dark:bg-slate-950 font-anthropic">
            {loading ? (
              <div className="text-center py-16 text-slate-700 dark:text-slate-300 text-sm font-semibold flex flex-col items-center gap-2">
                <RefreshCw size={22} className="animate-spin text-amber-600 dark:text-amber-400" />
                Se încarcă jurnalul de audit din baza de date...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-xs sm:text-sm italic font-semibold">
                Nicio înregistrare de audit găsită conform căutării sau categoriei selectate.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 dark:border-slate-800 rounded-[2px] bg-white dark:bg-[#161B22] shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  <thead className="bg-slate-200/80 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-black uppercase tracking-wider border-b border-slate-300 dark:border-slate-800 font-title">
                    <tr>
                      <th className="py-3 px-3.5">Dată & Oră</th>
                      <th className="py-3 px-3.5">Admin / Cont</th>
                      <th className="py-3 px-3.5">Membru Vizat</th>
                      <th className="py-3 px-3.5">Tip Acțiune</th>
                      <th className="py-3 px-3.5">Motiv / Detalii</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#161B22]">
                    {filteredLogs.map(log => {
                      const act = (log.action || '').toUpperCase();
                      const isPositive = log.points ? log.points > 0 : false;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-3.5 font-data text-xs text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString('ro-RO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap font-title">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-[2px] bg-amber-500 shrink-0" />
                              <span className="text-slate-900 dark:text-white font-bold">{log.adminName}</span>
                              {log.adminUsername && (
                                <span className="text-xs font-data text-slate-500 dark:text-slate-400">(@{log.adminUsername})</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap font-title">
                            {log.targetMemberName || '—'}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-title">
                            {act === 'MEMBER_DELETE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <UserX size={13} /> ȘTERGERE MEMBRU
                              </span>
                            ) : act === 'MEMBER_CREATE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                                <UserPlus size={13} /> MEMBRU NOU
                              </span>
                            ) : act === 'PASSWORD_CHANGE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-purple-100 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                <Key size={13} /> PAROLĂ SCHIMBATĂ
                              </span>
                            ) : act === 'REVERTED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <RotateCcw size={13} /> REVERT ({log.points} pct)
                              </span>
                            ) : act.includes('PAYMENT') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-data">
                                COTIZAȚIE ({log.points} RON)
                              </span>
                            ) : act.startsWith('ABSENCE') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-blue-100 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                ÎNVOIRE
                              </span>
                            ) : act.startsWith('PROJECT') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                PROIECT NOU
                              </span>
                            ) : act.startsWith('SUGGESTION') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-violet-100 dark:bg-violet-950/50 text-violet-900 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
                                SUGESTIE
                              </span>
                            ) : act.startsWith('KUDOS') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-pink-100 dark:bg-pink-950/50 text-pink-900 dark:text-pink-300 border border-pink-300 dark:border-pink-800">
                                KUDOS
                              </span>
                            ) : isPositive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <ArrowUpRight size={13} /> +{log.points} pct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-black text-xs uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <ArrowDownRight size={13} /> {log.points} pct
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-900 dark:text-slate-100 font-medium font-anthropic min-w-[280px] whitespace-normal break-words leading-relaxed text-xs sm:text-sm">
                            {log.reason || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-bold text-center flex items-center justify-center gap-2 shrink-0 font-anthropic">
            <Lock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Accesul la acest registru de audit este securizat criptografic și disponibil exclusiv membrilor din conducerea executivă. Jurnal permanent & ne-ștergibil.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
