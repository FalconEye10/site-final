import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Search, RefreshCw, UserX, UserPlus, Key, ArrowUpRight, 
  ArrowDownRight, RotateCcw, Lock, Eye, FileSpreadsheet, Activity, X,
  ShieldCheck
} from 'lucide-react';
import { fetchScoreAuditLogs, ScoreAuditLog } from '../../../utils/supabaseService';
import { downloadXlsx } from '../../../utils/xlsx';
import { toast } from '../../ui/Toast';

interface MasterAuditViewProps {
  currentUserObj?: any;
  isAdmin?: boolean;
  members?: any[];
}

export function MasterAuditView({ currentUserObj }: MasterAuditViewProps) {
  const [logs, setLogs] = useState<ScoreAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'DELETE' | 'CREATE' | 'PASSWORD' | 'SCORE' | 'PAYMENT'>('ALL');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [inspectedLog, setInspectedLog] = useState<ScoreAuditLog | null>(null);

  // Check Master Authorization: Stefan Stan or Trezorier
  const isMasterAuthorized = useMemo(() => {
    if (!currentUserObj) return false;
    const username = (currentUserObj.username || '').toLowerCase().trim();
    const name = (currentUserObj.name || '').toLowerCase().trim();
    const boardPos = (currentUserObj.boardPosition || '').toLowerCase().trim();
    return (
      username === 'stan.stefan' ||
      name.includes('stefan stan') ||
      name.includes('stan stefan') ||
      boardPos.includes('trezorier') ||
      username === 'admin'
    );
  }, [currentUserObj]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchScoreAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      toast.error("Eroare la încărcarea jurnalului de audit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Distinct Admins for filter dropdown
  const uniqueAdmins = useMemo(() => {
    const adminSet = new Set<string>();
    logs.forEach(l => {
      if (l.adminName) adminSet.add(l.adminName);
    });
    return Array.from(adminSet);
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    return logs.filter(log => {
      const q = search.toLowerCase().trim();
      const act = (log.action || '').toUpperCase();

      // Category filter
      if (selectedCategory === 'DELETE' && act !== 'MEMBER_DELETE') return false;
      if (selectedCategory === 'CREATE' && act !== 'MEMBER_CREATE') return false;
      if (selectedCategory === 'PASSWORD' && act !== 'PASSWORD_CHANGE') return false;
      if (selectedCategory === 'SCORE' && !['ADDED', 'SUBTRACTED', 'REVERTED'].includes(act)) return false;
      if (selectedCategory === 'PAYMENT' && !act.includes('PAYMENT')) return false;

      // Admin filter
      if (selectedAdmin !== 'ALL' && log.adminName !== selectedAdmin) return false;

      // Time Range filter
      if (selectedTimeRange !== 'ALL') {
        const logTime = new Date(log.createdAt).getTime();
        if (selectedTimeRange === 'TODAY' && now - logTime > oneDay) return false;
        if (selectedTimeRange === 'WEEK' && now - logTime > oneDay * 7) return false;
        if (selectedTimeRange === 'MONTH' && now - logTime > oneDay * 30) return false;
      }

      // Search Query
      if (!q) return true;
      return (
        (log.adminName && log.adminName.toLowerCase().includes(q)) ||
        (log.adminUsername && log.adminUsername.toLowerCase().includes(q)) ||
        (log.targetMemberName && log.targetMemberName.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.id && log.id.toLowerCase().includes(q))
      );
    });
  }, [logs, search, selectedCategory, selectedAdmin, selectedTimeRange]);

  // Statistics calculation
  const stats = useMemo(() => {
    let deleteCount = 0;
    let createCount = 0;
    let passwordCount = 0;
    let scoreCount = 0;
    let paymentCount = 0;

    logs.forEach(l => {
      const act = (l.action || '').toUpperCase();
      if (act === 'MEMBER_DELETE') deleteCount++;
      else if (act === 'MEMBER_CREATE') createCount++;
      else if (act === 'PASSWORD_CHANGE') passwordCount++;
      else if (['ADDED', 'SUBTRACTED', 'REVERTED'].includes(act)) scoreCount++;
      else if (act.includes('PAYMENT')) paymentCount++;
    });

    return {
      total: logs.length,
      deleteCount,
      createCount,
      passwordCount,
      scoreCount,
      paymentCount
    };
  }, [logs]);

  // Export Audit Logs to XLSX
  const handleExportXLSX = () => {
    if (filteredLogs.length === 0) {
      toast.error("Nu există înregistrări de exportat.");
      return;
    }

    const rows = filteredLogs.map((l, index) => [
      index + 1,
      l.id,
      new Date(l.createdAt).toLocaleString('ro-RO'),
      l.adminName || 'Admin',
      l.adminUsername ? `@${l.adminUsername}` : '—',
      l.targetMemberName || '—',
      l.targetMemberId || '—',
      l.action,
      l.points || 0,
      l.reason || '—'
    ]);

    downloadXlsx(`Registru_Audit_Master_Stefan_Stan_${new Date().toISOString().split('T')[0]}`, [
      {
        name: 'Registru Audit Master',
        header: [
          'Nr. Crt',
          'ID Înregistrare',
          'Dată & Oră',
          'Admin Responsabil',
          'Username Admin',
          'Membru Vizat',
          'ID Membru',
          'Tip Acțiune',
          'Puncte',
          'Motiv / Justificare'
        ],
        rows,
        widths: [8, 25, 20, 22, 18, 22, 12, 18, 10, 40]
      }
    ]);

    toast.success("Registrul de audit a fost exportat cu succes în format Excel!");
  };

  // If not authorized as Trezorier / Stefan Stan
  if (!isMasterAuthorized) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center font-data">
        <div className="bg-white border border-slate-300 rounded-3xl p-10 shadow-xl space-y-4">
          <div className="w-16 h-16 bg-rose-100 border border-rose-300 rounded-2xl flex items-center justify-center mx-auto text-rose-700">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 font-title">Acces Restricționat — Trezorerie Master</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Acest modul conține registrul master complet de securitate și este rezervat exclusiv <strong>Trezorierului (Ștefan Stan)</strong>.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-mono font-bold text-slate-700">
              Cont curent: @{currentUserObj?.username || 'vizitator'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-data score-audit-modal">
      {/* 1. Header & Master Status Banner */}
      <div className="bg-white border border-slate-300 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-800">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-title">
                  🛡️ Master Audit Log — Panou Trezorerie
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 border border-amber-300 shadow-xs">
                  <ShieldCheck size={13} /> Ștefan Stan (Master Access)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Registrul oficial permanent și imutabil al tuturor operațiunilor administrative (Ștergeri, Adăugări, Modificări Parolă, Punctaje, Plăți).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 shadow-xs transition-colors disabled:opacity-50"
            title="Reîmprospătează datele"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-amber-600' : ''} />
            <span>Reîmprospătează</span>
          </button>

          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/15 transition-colors"
          >
            <FileSpreadsheet size={15} className="text-emerald-400" />
            <span>Exportă Raport Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
            <span>Total Evenimente</span>
            <Activity size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-title">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Înregistrări în sistem</div>
        </div>

        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Ștergeri Membri</span>
            <UserX size={16} className="text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 font-title">{stats.deleteCount}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Acțiuni ireversibile</div>
        </div>

        <div className="bg-white border border-sky-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-sky-700 text-xs font-bold">
            <span>Membri Înregistrați</span>
            <UserPlus size={16} className="text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-800 font-title">{stats.createCount}</div>
          <div className="text-[11px] text-sky-600/80 mt-0.5">Conturi create noi</div>
        </div>

        <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
            <span>Schimbări Parolă</span>
            <Key size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-800 font-title">{stats.passwordCount}</div>
          <div className="text-[11px] text-purple-600/80 mt-0.5">Editări securitate</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Punctaje & Revert</span>
            <ArrowUpRight size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800 font-title">{stats.scoreCount}</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Acordări / Anulări</div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white border border-slate-300 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Caută după admin, membru, motiv sau ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Controls: Admin Selector & Time Range */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Admin Filter */}
            <select
              value={selectedAdmin}
              onChange={e => setSelectedAdmin(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">👤 Toți Administratorii ({uniqueAdmins.length})</option>
              {uniqueAdmins.map(admin => (
                <option key={admin} value={admin}>
                  {admin}
                </option>
              ))}
            </select>

            {/* Time Range Filter */}
            <select
              value={selectedTimeRange}
              onChange={e => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">📅 Toate perioadele</option>
              <option value="TODAY">Astăzi (ultimele 24h)</option>
              <option value="WEEK">Ultimele 7 zile</option>
              <option value="MONTH">Ultima lună</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tabel
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cronologie
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-200">
          {[
            { id: 'ALL', label: 'Toate Acțiunile', count: stats.total },
            { id: 'DELETE', label: 'Ștergeri Membri', count: stats.deleteCount },
            { id: 'CREATE', label: 'Adăugări Membri', count: stats.createCount },
            { id: 'PASSWORD', label: 'Schimbări Parolă', count: stats.passwordCount },
            { id: 'SCORE', label: 'Punctaje & Revert', count: stats.scoreCount },
            { id: 'PAYMENT', label: 'Plăți Cotizație', count: stats.paymentCount },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategory === cat.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table or Timeline Display */}
      {loading ? (
        <div className="bg-white border border-slate-300 rounded-3xl p-16 text-center text-slate-700 font-semibold flex flex-col items-center gap-3 shadow-sm">
          <RefreshCw size={28} className="animate-spin text-amber-600" />
          <span>Se sincronizează datele de audit master din Supabase...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-300 rounded-3xl p-16 text-center text-slate-500 font-semibold shadow-sm">
          Nicio înregistrare găsită conform filtrelor sau căutării selectate.
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-slate-300 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-900 font-data">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-3.5 px-4">Dată & Oră</th>
                  <th className="py-3.5 px-4">Admin Responsabil</th>
                  <th className="py-3.5 px-4">Membru Vizat</th>
                  <th className="py-3.5 px-4">Tip Acțiune</th>
                  <th className="py-3.5 px-4">Motiv / Justificare</th>
                  <th className="py-3.5 px-4 text-right">Detalii</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLogs.map(log => {
                  const act = (log.action || '').toUpperCase();
                  const isPositive = log.points ? log.points > 0 : false;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('ro-RO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      {/* Admin Info */}
                      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center">
                            {(log.adminName || 'A')[0]}
                          </div>
                          <div>
                            <div className="text-slate-900 font-bold">{log.adminName || 'Admin'}</div>
                            {log.adminUsername && (
                              <div className="text-[10px] font-mono text-slate-500 font-normal">@{log.adminUsername}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Target Member */}
                      <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                        <div>
                          <span className="text-slate-900 font-bold">{log.targetMemberName || '—'}</span>
                          {log.targetMemberId && (
                            <span className="ml-1.5 text-[10px] font-mono text-slate-500">[{log.targetMemberId}]</span>
                          )}
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {act === 'MEMBER_DELETE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs bg-rose-100 text-rose-900 border border-rose-300 shadow-xs">
                            <UserX size={13} /> ȘTERGERE MEMBRU
                          </span>
                        ) : act === 'MEMBER_CREATE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs bg-sky-100 text-sky-900 border border-sky-300 shadow-xs">
                            <UserPlus size={13} /> MEMBRU NOU
                          </span>
                        ) : act === 'PASSWORD_CHANGE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs bg-purple-100 text-purple-900 border border-purple-300 shadow-xs">
                            <Key size={13} /> PAROLĂ SCHIMBATĂ
                          </span>
                        ) : act === 'REVERTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                            <RotateCcw size={13} /> REVERT ({log.points} pct)
                          </span>
                        ) : act.includes('PAYMENT') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-xs">
                            <Activity size={13} /> COTIZAȚIE
                          </span>
                        ) : isPositive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                            <ArrowUpRight size={13} /> +{log.points} pct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs bg-rose-100 text-rose-900 border border-rose-300 shadow-xs">
                            <ArrowDownRight size={13} /> {log.points} pct
                          </span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold max-w-xs md:max-w-md truncate" title={log.reason}>
                        {log.reason}
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setInspectedLog(log)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
                          title="Inspectează detaliile evenimentului"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Timeline Feed View */
        <div className="space-y-3">
          {filteredLogs.map(log => {
            const act = (log.action || '').toUpperCase();

            return (
              <div
                key={log.id}
                className="bg-white border border-slate-300 rounded-2xl p-4.5 shadow-xs hover:border-slate-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${
                    act === 'MEMBER_DELETE' ? 'bg-rose-100 text-rose-700 border border-rose-300' :
                    act === 'MEMBER_CREATE' ? 'bg-sky-100 text-sky-700 border border-sky-300' :
                    act === 'PASSWORD_CHANGE' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                    act === 'REVERTED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {act === 'MEMBER_DELETE' && <UserX size={20} />}
                    {act === 'MEMBER_CREATE' && <UserPlus size={20} />}
                    {act === 'PASSWORD_CHANGE' && <Key size={20} />}
                    {act === 'REVERTED' && <RotateCcw size={20} />}
                    {act !== 'MEMBER_DELETE' && act !== 'MEMBER_CREATE' && act !== 'PASSWORD_CHANGE' && act !== 'REVERTED' && <Activity size={20} />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">{log.adminName}</span>
                      {log.adminUsername && (
                        <span className="text-xs font-mono text-slate-500 font-semibold">(@{log.adminUsername})</span>
                      )}
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-xs font-mono text-slate-600 font-semibold">
                        {new Date(log.createdAt).toLocaleString('ro-RO')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-bold">
                      {log.reason}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                      <span>Membru vizat: <strong className="text-slate-800">{log.targetMemberName || '—'}</strong></span>
                      {log.targetMemberId && <span>[{log.targetMemberId}]</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setInspectedLog(log)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Eye size={13} /> Inspectează
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Inspection Modal */}
      <AnimatePresence>
        {inspectedLog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md font-data">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setInspectedLog(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="relative w-full max-w-lg bg-white border border-slate-300 rounded-3xl shadow-2xl overflow-hidden z-[201] text-slate-900"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={20} className="text-amber-400" />
                  <h3 className="font-black text-base text-white font-title">
                    Detalii Înregistrare Audit Master
                  </h3>
                </div>
                <button
                  onClick={() => setInspectedLog(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-data">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ID Înregistrare</div>
                    <div className="font-mono font-bold text-slate-900 break-all">{inspectedLog.id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dată & Oră Exactă</div>
                    <div className="font-mono font-bold text-slate-900">
                      {new Date(inspectedLog.createdAt).toLocaleString('ro-RO')}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Administrator Responsabil</div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-black text-slate-900">{inspectedLog.adminName || 'Admin'}</span>
                    {inspectedLog.adminUsername && (
                      <span className="font-mono text-slate-600">@{inspectedLog.adminUsername}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Membru Vizat</div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-black text-slate-900">{inspectedLog.targetMemberName || '—'}</span>
                    {inspectedLog.targetMemberId && (
                      <span className="font-mono text-slate-600">ID: {inspectedLog.targetMemberId}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Motiv & Justificare Completă</div>
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-slate-900 font-bold leading-relaxed">
                    {inspectedLog.reason}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setInspectedLog(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                  >
                    Închide Fereastra
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
