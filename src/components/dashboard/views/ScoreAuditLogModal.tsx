import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Search, RefreshCw, X, ArrowUpRight, ArrowDownRight, RotateCcw, Lock, UserX, UserPlus, Key } from 'lucide-react';
import { fetchScoreAuditLogs, ScoreAuditLog } from '../../../utils/supabaseService';

interface ScoreAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function ScoreAuditLogModal({ isOpen, onClose, isAdmin }: ScoreAuditLogModalProps) {
  const [logs, setLogs] = useState<ScoreAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'DELETE' | 'CREATE' | 'PASSWORD' | 'SCORE'>('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchScoreAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadLogs();
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase().trim();
    const act = (log.action || '').toUpperCase();

    if (selectedCategory === 'DELETE' && act !== 'MEMBER_DELETE') return false;
    if (selectedCategory === 'CREATE' && act !== 'MEMBER_CREATE') return false;
    if (selectedCategory === 'PASSWORD' && act !== 'PASSWORD_CHANGE') return false;
    if (selectedCategory === 'SCORE' && !['ADDED', 'SUBTRACTED', 'REVERTED'].includes(act)) return false;

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
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white text-slate-900 border border-slate-300 rounded-3xl shadow-2xl overflow-hidden z-[201] score-audit-modal"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header Bar */}
          <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <ShieldAlert size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight text-white" style={{ color: '#ffffff' }}>
                    🛡️ Registru Audit General — Trezorerie & Admin
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-300 flex items-center gap-1 shadow-xs">
                    <Lock size={10} /> Control Permanent
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 font-semibold" style={{ color: '#cbd5e1' }}>
                  Jurnal oficial ne-ștergibil cu absolut toate acțiunile (Ștergeri, Adăugări, Schimbări Parolă, Punctaje).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadLogs}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-50 border border-slate-700"
                title="Reîmprospătează Registru Audit"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                aria-label="Închide"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Category Filter Chips & Search bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Caută după admin, membru sau motiv..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
                />
              </div>

              <div className="text-xs text-slate-700 font-bold">
                Afișate: <strong className="text-amber-700 font-black">{filteredLogs.length}</strong> din {logs.length} acțiuni înregistrate
              </div>
            </div>

            {/* Filter Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {[
                { id: 'ALL', label: 'Toate Activitățile' },
                { id: 'DELETE', label: 'Ștergeri Membri' },
                { id: 'CREATE', label: 'Adăugări Membri' },
                { id: 'PASSWORD', label: 'Schimbări Parolă' },
                { id: 'SCORE', label: 'Ajustări Punctaj' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white border-slate-900 font-black shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-100/60">
            {loading ? (
              <div className="text-center py-16 text-slate-700 text-sm font-semibold flex flex-col items-center gap-2">
                <RefreshCw size={24} className="animate-spin text-amber-600" />
                Se încarcă jurnalul de audit din baza de date...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm italic font-semibold">
                Nicio înregistrare de audit găsită conform căutării sau categoriei selectate.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-2xl bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-900">
                  <thead className="bg-slate-200/80 text-slate-800 font-black uppercase tracking-wider border-b border-slate-300">
                    <tr>
                      <th className="py-3 px-4">Dată & Oră</th>
                      <th className="py-3 px-4">Admin / Cont</th>
                      <th className="py-3 px-4">Membru Vizat</th>
                      <th className="py-3 px-4">Tip Acțiune</th>
                      <th className="py-3 px-4">Motiv / Detalii</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredLogs.map(log => {
                      const act = (log.action || '').toUpperCase();
                      const isPositive = log.points ? log.points > 0 : false;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString('ro-RO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              <span className="text-slate-900 font-bold">{log.adminName}</span>
                              {log.adminUsername && (
                                <span className="text-[10px] font-mono text-slate-500">(@{log.adminUsername})</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                            {log.targetMemberName || '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {act === 'MEMBER_DELETE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs bg-rose-100 text-rose-900 border border-rose-300">
                                <UserX size={12} /> ȘTERGERE MEMBRU
                              </span>
                            ) : act === 'MEMBER_CREATE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs bg-sky-100 text-sky-900 border border-sky-300">
                                <UserPlus size={12} /> MEMBRU NOU
                              </span>
                            ) : act === 'PASSWORD_CHANGE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs bg-purple-100 text-purple-900 border border-purple-300">
                                <Key size={12} /> PAROLĂ SCHIMBATĂ
                              </span>
                            ) : act === 'REVERTED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs bg-amber-100 text-amber-900 border border-amber-300">
                                <RotateCcw size={12} /> REVERT ({log.points} pct)
                              </span>
                            ) : isPositive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <ArrowUpRight size={12} /> +{log.points} pct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-xs bg-rose-100 text-rose-900 border border-rose-300">
                                <ArrowDownRight size={12} /> {log.points} pct
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-semibold">
                            {log.reason}
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
          <div className="p-3.5 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-700 font-bold text-center flex items-center justify-center gap-2 shrink-0">
            <Lock size={12} className="text-amber-600 shrink-0" />
            <span>
              Acest registru este protejat și permanent. Înregistrările nu pot fi modificate sau șterse de niciun utilizator.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
