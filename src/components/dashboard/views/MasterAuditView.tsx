import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Search, RefreshCw, UserX, UserPlus, Key, ArrowUpRight, 
  ArrowDownRight, RotateCcw, Lock, Eye, FileSpreadsheet, Activity, X,
  ShieldCheck, Lightbulb, MessageSquare, Heart, Calendar, UserCheck
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
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'SCORE' | 'PAYMENT' | 'MEMBER' | 'ABSENCE' | 'PROJECT' | 'SUGGESTION' | 'KUDOS'>('ALL');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [inspectedLog, setInspectedLog] = useState<ScoreAuditLog | null>(null);

  // Check Master Authorization: EXCLUSIVELY Stefan Stan
  const isMasterAuthorized = useMemo(() => {
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
      if (selectedCategory === 'SCORE' && !['ADDED', 'SUBTRACTED', 'REVERTED'].includes(act)) return false;
      if (selectedCategory === 'PAYMENT' && !act.includes('PAYMENT')) return false;
      if (selectedCategory === 'MEMBER' && !(act.startsWith('MEMBER_') || act === 'PASSWORD_CHANGE' || act.includes('ROLE') || act.includes('PROFILE'))) return false;
      if (selectedCategory === 'ABSENCE' && !(act.startsWith('ABSENCE') || act.includes('ATTENDANCE') || act.includes('MOTIV'))) return false;
      if (selectedCategory === 'PROJECT' && !(act.startsWith('PROJECT') || act.includes('PROPOSAL'))) return false;
      if (selectedCategory === 'SUGGESTION' && !act.startsWith('SUGGESTION')) return false;
      if (selectedCategory === 'KUDOS' && !act.startsWith('KUDOS')) return false;

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
    let scoreCount = 0;
    let paymentCount = 0;
    let memberCount = 0;
    let absenceCount = 0;
    let projectCount = 0;
    let suggestionCount = 0;
    let kudosCount = 0;

    logs.forEach(l => {
      const act = (l.action || '').toUpperCase();
      if (['ADDED', 'SUBTRACTED', 'REVERTED'].includes(act)) scoreCount++;
      else if (act.includes('PAYMENT')) paymentCount++;
      else if (act.startsWith('MEMBER_') || act === 'PASSWORD_CHANGE' || act.includes('ROLE') || act.includes('PROFILE')) memberCount++;
      else if (act.startsWith('ABSENCE') || act.includes('ATTENDANCE') || act.includes('MOTIV')) absenceCount++;
      else if (act.startsWith('PROJECT') || act.includes('PROPOSAL')) projectCount++;
      else if (act.startsWith('SUGGESTION')) suggestionCount++;
      else if (act.startsWith('KUDOS')) kudosCount++;
    });

    return {
      total: logs.length,
      scoreCount,
      paymentCount,
      memberCount,
      absenceCount,
      projectCount,
      suggestionCount,
      kudosCount
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

    downloadXlsx(`Registru_Audit_Master_${new Date().toISOString().split('T')[0]}`, [
      {
        name: 'Registru Audit Master',
        header: [
          'Nr. Crt',
          'ID Înregistrare',
          'Dată & Oră',
          'Admin / Autor',
          'Username Admin',
          'Membru Vizat',
          'ID Membru',
          'Tip Acțiune',
          'Puncte / Valoare',
          'Motiv / Justificare'
        ],
        rows,
        widths: [8, 25, 20, 22, 18, 22, 12, 18, 12, 40]
      }
    ]);

    toast.success("Registrul de audit master a fost exportat cu succes în format Excel!");
  };

  // If not authorized as Trezorier / Stefan Stan
  if (!isMasterAuthorized) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-xs space-y-3 font-anthropic">
        <div className="w-12 h-12 rounded-[2px] bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 mx-auto flex items-center justify-center">
          <Lock size={24} />
        </div>
        <h2 className="text-xl font-bold font-title text-slate-900 dark:text-white">Acces Restricționat la Registrul de Audit</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Jurnalul Master de Audit este un registru legal și securizat disponibil exclusiv membrilor autorizați din conducerea clubului.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-anthropic">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-[2px] text-amber-800 dark:text-amber-300 shrink-0">
            <ShieldAlert size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black font-title text-slate-900 dark:text-white">
                Jurnal Master de Audit & Guvernanță
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[2px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold font-data uppercase tracking-wider">
                <ShieldCheck size={12} /> Criptat & Ne-ștergibil
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Monitorizare 360° a tuturor evenimentelor din platformă (Punctaje, Cotizații, Membri, Învoiri, Proiecte, Sugestii, Kudos).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 font-title">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-3.5 py-2 rounded-[2px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700 disabled:opacity-50 cursor-pointer"
            title="Reîmprospătează datele de audit"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sincronizează</span>
          </button>
          <button
            onClick={handleExportXLSX}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-2 rounded-[2px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-anthropic">
        <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Total Evenimente</div>
          <div className="text-2xl font-black font-data text-slate-900 dark:text-white mt-1">{stats.total}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Înregistrate în sistem</div>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Punctaje & Penalizări</div>
          <div className="text-2xl font-black font-data text-amber-700 dark:text-amber-400 mt-1">{stats.scoreCount}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ajustări și revert-uri</div>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Cotizații Încasate</div>
          <div className="text-2xl font-black font-data text-emerald-700 dark:text-emerald-400 mt-1">{stats.paymentCount}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Chitanțe electronice</div>
        </div>

        <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Gestiune Membri</div>
          <div className="text-2xl font-black font-data text-indigo-700 dark:text-indigo-400 mt-1">{stats.memberCount}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Adăugări / Ștergeri / Parole</div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 sm:p-5 shadow-xs space-y-3.5 font-anthropic">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 font-anthropic">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Caută după admin, membru, motiv sau ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-950 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap font-title">
            <select
              value={selectedAdmin}
              onChange={e => setSelectedAdmin(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">👤 Toți Administratorii ({uniqueAdmins.length})</option>
              {uniqueAdmins.map(admin => (
                <option key={admin} value={admin}>
                  {admin}
                </option>
              ))}
            </select>

            <select
              value={selectedTimeRange}
              onChange={e => setSelectedTimeRange(e.target.value as any)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">📅 Toate perioadele</option>
              <option value="TODAY">Astăzi (ultimele 24h)</option>
              <option value="WEEK">Ultimele 7 zile</option>
              <option value="MONTH">Ultima lună</option>
            </select>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-[2px] border border-slate-300 dark:border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tabel
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'timeline' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cronologie
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1.5 border-t border-slate-200 dark:border-slate-800 font-title">
          {[
            { id: 'ALL', label: 'Toate Acțiunile', count: stats.total },
            { id: 'SCORE', label: 'Punctaje & Penalizări', count: stats.scoreCount },
            { id: 'PAYMENT', label: 'Cotizații & Plăți', count: stats.paymentCount },
            { id: 'MEMBER', label: 'Gestiune Membri', count: stats.memberCount },
            { id: 'ABSENCE', label: 'Învoiri & Prezențe', count: stats.absenceCount },
            { id: 'PROJECT', label: 'Proiecte & Bugete', count: stats.projectCount },
            { id: 'SUGGESTION', label: 'Casetă Sugestii', count: stats.suggestionCount },
            { id: 'KUDOS', label: 'Kudos & Aprecieri', count: stats.kudosCount },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-[2px] font-data ${
                selectedCategory === cat.id ? 'bg-slate-700 dark:bg-amber-600 text-white dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table or Timeline Display */}
      {loading ? (
        <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-12 text-center text-slate-700 dark:text-slate-300 font-medium flex flex-col items-center gap-2 shadow-xs text-xs sm:text-sm font-anthropic">
          <RefreshCw size={24} className="animate-spin text-amber-600 dark:text-amber-400" />
          <span>Se sincronizează datele de audit master...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-12 text-center text-slate-500 dark:text-slate-400 font-medium shadow-xs text-xs sm:text-sm font-anthropic">
          Nicio înregistrare găsită.
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-xs overflow-hidden font-anthropic">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-anthropic">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider border-b border-slate-300 dark:border-slate-800 font-title text-xs">
                <tr>
                  <th className="py-3 px-3.5">Dată & Oră</th>
                  <th className="py-3 px-3.5">Admin / Autor</th>
                  <th className="py-3 px-3.5">Membru Vizat</th>
                  <th className="py-3 px-3.5">Tip Acțiune</th>
                  <th className="py-3 px-3.5">Motiv / Justificare</th>
                  <th className="py-3 px-3.5 text-right">Detalii</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#161B22] font-anthropic">
                {filteredLogs.map(log => {
                  const act = (log.action || '').toUpperCase();
                  const isPositive = log.points ? log.points > 0 : false;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-3.5 font-data text-xs text-slate-600 dark:text-slate-400">{new Date(log.createdAt).toLocaleString('ro-RO')}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white font-title">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-[2px] bg-amber-500 shrink-0" />
                          <span className="text-slate-900 dark:text-white font-bold">{log.adminName || 'Admin'}</span>
                          {log.adminUsername && (
                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-data">(@{log.adminUsername})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">{log.targetMemberName || '—'}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-title">
                        {act === 'MEMBER_DELETE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs">
                            <UserX size={13} /> ȘTERGERE MEMBRU
                          </span>
                        ) : act === 'MEMBER_CREATE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-xs">
                            <UserPlus size={13} /> MEMBRU NOU
                          </span>
                        ) : act === 'PASSWORD_CHANGE' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-purple-100 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-xs">
                            <Key size={13} /> PAROLĂ SCHIMBATĂ
                          </span>
                        ) : act.includes('PROFILE') || act.includes('ROLE') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-xs">
                            <UserCheck size={13} /> EDITARE PROFIL
                          </span>
                        ) : act === 'REVERTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs font-data">
                            <RotateCcw size={13} /> REVERT ({log.points} pct)
                          </span>
                        ) : act.includes('PAYMENT') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs font-data">
                            <Activity size={13} /> COTIZAȚIE ({log.points} RON)
                          </span>
                        ) : act.startsWith('ABSENCE') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-blue-100 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-xs">
                            <Calendar size={13} /> ÎNVOIRE
                          </span>
                        ) : act.startsWith('PROJECT') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
                            <Lightbulb size={13} /> PROIECT NOU
                          </span>
                        ) : act.startsWith('SUGGESTION') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-violet-100 dark:bg-violet-950/50 text-violet-900 dark:text-violet-300 border border-violet-300 dark:border-violet-800 shadow-xs">
                            <MessageSquare size={13} /> SUGESTIE
                          </span>
                        ) : act.startsWith('KUDOS') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-pink-100 dark:bg-pink-950/50 text-pink-900 dark:text-pink-300 border border-pink-300 dark:border-pink-800 shadow-xs">
                            <Heart size={13} /> KUDOS
                          </span>
                        ) : isPositive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs font-data">
                            <ArrowUpRight size={13} /> +{log.points} pct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-bold text-xs uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs font-data">
                            <ArrowDownRight size={13} /> {log.points} pct
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 dark:text-slate-100">{log.reason || '—'}</td>
                      <td className="py-3 px-3.5 text-right">
                        <button onClick={() => setInspectedLog(log)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-[2px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"><Eye size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3 font-anthropic">
          {filteredLogs.map(log => {
            const act = (log.action || '').toUpperCase();
            return (
              <div key={log.id} className="bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] p-4 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-[2px] ${
                    act === 'MEMBER_DELETE' ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800' :
                    act === 'MEMBER_CREATE' ? 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800' :
                    act === 'PASSWORD_CHANGE' ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800' :
                    act === 'REVERTED' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                    act.startsWith('PROJECT') ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                    act.startsWith('SUGGESTION') ? 'bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-800' :
                    act.startsWith('KUDOS') ? 'bg-pink-100 dark:bg-pink-950/50 text-pink-800 dark:text-pink-300 border border-pink-300 dark:border-pink-800' :
                    'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}>
                    {act === 'MEMBER_DELETE' && <UserX size={18} />}
                    {act === 'MEMBER_CREATE' && <UserPlus size={18} />}
                    {act === 'PASSWORD_CHANGE' && <Key size={18} />}
                    {act === 'REVERTED' && <RotateCcw size={18} />}
                    {act.startsWith('PROJECT') && <Lightbulb size={18} />}
                    {act.startsWith('SUGGESTION') && <MessageSquare size={18} />}
                    {act.startsWith('KUDOS') && <Heart size={18} />}
                    {!['MEMBER_DELETE', 'MEMBER_CREATE', 'PASSWORD_CHANGE', 'REVERTED'].includes(act) && !act.startsWith('PROJECT') && !act.startsWith('SUGGESTION') && !act.startsWith('KUDOS') && <Activity size={18} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-title flex items-center gap-1.5 flex-wrap">
                      <span>{log.adminName || 'Admin'}</span>
                      {log.adminUsername && (
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-data">(@{log.adminUsername})</span>
                      )}
                      <span className="text-slate-400 font-normal">•</span> 
                      <span className="text-xs font-data text-slate-500 dark:text-slate-400">{new Date(log.createdAt).toLocaleString('ro-RO')}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-0.5">{log.reason}</div>
                  </div>
                </div>
                <button onClick={() => setInspectedLog(log)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-[2px] text-xs font-bold hover:bg-slate-200 cursor-pointer">Inspectează</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Inspection Modal */}
      <AnimatePresence>
        {inspectedLog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm font-anthropic">
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
              className="relative w-full max-w-lg bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl overflow-hidden z-[201] text-slate-900 dark:text-slate-100 font-anthropic"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 font-title">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={20} className="text-amber-400" />
                  <h3 className="font-bold text-base text-white">
                    Detalii Înregistrare Audit Master
                  </h3>
                </div>
                <button
                  onClick={() => setInspectedLog(null)}
                  className="p-1.5 rounded-[2px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm font-anthropic">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-[2px] border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">ID Înregistrare</div>
                    <div className="font-data font-bold text-slate-900 dark:text-white break-all text-xs sm:text-sm mt-0.5">{inspectedLog.id}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Dată & Oră Exactă</div>
                    <div className="font-data font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5">
                      {new Date(inspectedLog.createdAt).toLocaleString('ro-RO')}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Administrator Responsabil</div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 flex items-center justify-between font-title">
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{inspectedLog.adminName || 'Admin'}</span>
                    {inspectedLog.adminUsername && (
                      <span className="font-data text-slate-600 dark:text-slate-400 text-xs">@{inspectedLog.adminUsername}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Membru Vizat</div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 flex items-center justify-between font-title">
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{inspectedLog.targetMemberName || '—'}</span>
                    {inspectedLog.targetMemberId && (
                      <span className="font-data text-slate-600 dark:text-slate-400 text-xs">ID: {inspectedLog.targetMemberId}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Motiv & Justificare Completă</div>
                  <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-[2px] border border-amber-200 dark:border-amber-800/60 text-slate-900 dark:text-slate-100 font-medium leading-relaxed font-anthropic text-xs sm:text-sm">
                    {inspectedLog.reason}
                  </div>
                </div>

                <div className="pt-2 font-title">
                  <button
                    onClick={() => setInspectedLog(null)}
                    className="w-full py-3 rounded-[2px] bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer"
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
