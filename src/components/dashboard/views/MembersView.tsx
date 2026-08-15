import { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Users, UserPlus, Search, Filter, Edit2, Trash2, Activity, Clock, Star, 
  FileSpreadsheet, X, LayoutGrid, Table as TableIcon, ChevronRight, RotateCcw, ChevronDown, AlertCircle
} from 'lucide-react';

import { MemberDrawer } from '../../members/MemberDrawer';
import { AnimatedCounter } from '../../ui/AnimatedCounter';
import { calculateDebt, calculateQualification } from '../../../utils/finance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { downloadXlsx } from '../../../utils/xlsx';
import { deleteMemberFromDB, logScoreAudit, isSystemAccount } from '../../../utils/supabaseService';
import { toast } from '../../ui/Toast';

interface MembersViewProps {
  members: any[];
  onUpdateMember: (updatedMember: any) => void;
  isAdmin: boolean;
  onAddMemberClick: () => void;
  initialSearchTerm?: string;
  initialSelectedMemberId?: string;
  currentUserObj?: any;
}

export function MembersView({
  members,
  onUpdateMember,
  isAdmin,
  onAddMemberClick,
  initialSearchTerm,
  initialSelectedMemberId,
  currentUserObj
}: MembersViewProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedRole, setSelectedRole] = useState('Toți');
  const [selectedStatus, setSelectedStatus] = useState('Toți');
  const [selectedDebtFilter, setSelectedDebtFilter] = useState('Toți'); // 'Toți', 'Restanțieri', 'La Zi'
  const [sortOrder, setSortOrder] = useState('Implicit'); // 'Implicit', 'Datorie'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState<any | null>(
    initialSelectedMemberId ? members.find(m => m.id === initialSelectedMemberId) || null : null
  );

  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeletingMember(true);
    try {
      const adminName = currentUserObj?.name || currentUserObj?.username || 'Admin';
      const adminUsername = currentUserObj?.username;

      await logScoreAudit({
        adminId: currentUserObj?.id,
        adminName,
        adminUsername,
        targetMemberId: memberToDelete.id,
        targetMemberName: memberToDelete.name,
        action: 'MEMBER_DELETE',
        reason: `ȘTERGERE MEMBRU: Definitiv din baza de date ${memberToDelete.name} (ID: ${memberToDelete.id})`
      });

      await deleteMemberFromDB(memberToDelete.id);
      toast.success(`Membrul ${memberToDelete.name} a fost șters cu succes.`);
      if (selectedMember?.id === memberToDelete.id) {
        setSelectedMember(null);
      }
      setMemberToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la ștergerea membrului.');
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Deep-link resolution for initial member drawer
  const resolvedInitialMember = useRef(false);
  useEffect(() => {
    if (resolvedInitialMember.current || !initialSelectedMemberId) return;
    const found = members.find(m => m.id === initialSelectedMemberId);
    if (found) {
      setSelectedMember(found);
      resolvedInitialMember.current = true;
    }
  }, [members, initialSelectedMemberId]);

  const handleUpdateMember = (updatedMember: any) => {
    onUpdateMember(updatedMember);
    setSelectedMember(updatedMember);
  };

  // Count active non-default filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedRole !== 'Toți') count++;
    if (selectedStatus !== 'Toți') count++;
    if (selectedDebtFilter !== 'Toți') count++;
    if (sortOrder !== 'Implicit') count++;
    return count;
  }, [selectedRole, selectedStatus, selectedDebtFilter, sortOrder]);

  const handleResetFilters = () => {
    setSelectedRole('Toți');
    setSelectedStatus('Toți');
    setSelectedDebtFilter('Toți');
    setSortOrder('Implicit');
    setSearchTerm('');
  };

  // Filters & Sorting logic (Excludes technical system accounts)
  const processedMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = members.filter(m => {
      if (isSystemAccount(m)) {
        return false;
      }

      const mName = m.name || '';
      const mEmail = m.email || '';
      const rawRole = (m.role || '').toLowerCase();
      const rawStatus = (m.status || 'active').toLowerCase();
      
      const isBoardMember = rawRole === 'admin' || (m.boardPosition && m.boardPosition.trim().length > 0);
      const mRole = isBoardMember ? 'Board' : 'Voluntar';

      const matchesSearch = !q || 
                            mName.toLowerCase().includes(q) || 
                            mEmail.toLowerCase().includes(q) ||
                            (m.nickname || '').toLowerCase().includes(q) ||
                            (m.username || '').toLowerCase().includes(q) ||
                            (m.phone || '').toLowerCase().includes(q);

      const matchesRole = selectedRole === 'Toți' || mRole === selectedRole;
      
      // Status Activitate: 'ACTIV' = toți voluntarii activi (inclusiv restanțieri), 'PASIV' = doar cei pasivi
      const isPassive = rawStatus === 'passive' || rawStatus === 'pasiv';
      const isActive = !isPassive;

      let matchesStatus = true;
      if (selectedStatus === 'ACTIV') {
        matchesStatus = isActive;
      } else if (selectedStatus === 'PASIV') {
        matchesStatus = isPassive;
      }
      
      // Balanță Cotizații: 'Restanțieri' = datorie > 0, 'La Zi' = datorie === 0
      let matchesDebt = true;
      const debt = calculateDebt(m.joinDate, m.totalPaid || 0);
      if (selectedDebtFilter === 'Restanțieri') matchesDebt = debt > 0;
      if (selectedDebtFilter === 'La Zi') matchesDebt = debt === 0;

      return matchesSearch && matchesRole && matchesStatus && matchesDebt;
    });

    if (sortOrder === 'Implicit') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOrder === 'Datorie') {
      filtered.sort((a, b) => calculateDebt(b.joinDate, b.totalPaid || 0) - calculateDebt(a.joinDate, a.totalPaid || 0));
    }

    return filtered;
  }, [members, searchTerm, selectedRole, selectedStatus, selectedDebtFilter, sortOrder]);

  const { totalMembri, membriActivi, membriNoi, rataRetentie } = useMemo(() => {
    const validMembers = members.filter(m => !isSystemAccount(m));
    const total = validMembers.length;
    const active = validMembers.filter(m => {
      const s = (m.status || '').toLowerCase();
      return s !== 'passive' && s !== 'pasiv';
    }).length;
    
    const now = new Date();
    const newMembers = validMembers.filter(m => {
      if (!m.joinDate) return false;
      const d = new Date(m.joinDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const passiveCount = validMembers.filter(m => {
      const s = (m.status || '').toLowerCase();
      return s === 'passive' || s === 'pasiv';
    }).length;
    const retention = total > 0 ? Math.round(((total - passiveCount) / total) * 100) : 100;

    return { totalMembri: total, membriActivi: active, membriNoi: newMembers, rataRetentie: retention };
  }, [members]);

  const handleExportExcel = () => {
    const validMembers = members.filter(m => m.username?.toLowerCase() !== 'admin' && m.name?.toLowerCase() !== 'admin');
    const rows = validMembers.map(m => {
      const debt = calculateDebt(m.joinDate, m.totalPaid || 0);
      const qual = calculateQualification(m.presences || 0, m.excusedAbsences || 0, m.unexcusedAbsences || 0, m.status);
      return [
        m.id || '',
        m.name || '',
        m.username || '',
        m.role === 'admin' ? 'Board' : 'Voluntar',
        m.boardPosition || '—',
        m.email || '',
        m.phone || '',
        m.joinDate || '',
        m.attendanceRate || qual.rate || '100%',
        Number(m.totalPaid || 0),
        debt,
        m.status || 'activ',
        m.qualification || qual.qualification
      ];
    });

    const totalDatorii = members.reduce((acc, m) => acc + calculateDebt(m.joinDate, m.totalPaid || 0), 0);
    const totalIncasat = members.reduce((acc, m) => acc + Number(m.totalPaid || 0), 0);

    const sheets = [
      {
        name: 'Evidență Membri & Cotizații',
        header: [
          'ID',
          'Nume și Prenume',
          'Username',
          'Rol',
          'Funcție Board',
          'Email',
          'Telefon',
          'Data Înscrierii',
          'Rată Prezență',
          'Total Plătit (RON)',
          'Datorie Curentă (RON)',
          'Status Cont',
          'Calificare'
        ],
        widths: [10, 26, 20, 14, 20, 28, 16, 16, 15, 18, 20, 14, 16],
        rows
      },
      {
        name: 'Sumar Executiv Club',
        header: ['Indicator', 'Valoare'],
        widths: [32, 22],
        rows: [
          ['Total Membri Înregistrați', members.length],
          ['Membri Activi', membriActivi],
          ['Total Încasări Cotizații (RON)', totalIncasat],
          ['Total Restanțe de Încasat (RON)', totalDatorii],
          ['Rată Retenție', `${rataRetentie}%`],
          ['Data Generării', new Date().toLocaleDateString('ro-RO')]
        ]
      }
    ];

    downloadXlsx(`Raport_Membri_Interact_Camena_${new Date().toISOString().slice(0, 10)}.xlsx`, sheets);
  };

  return (
    <div className="space-y-6 md:space-y-8 font-anthropic">
      {/* 1. Header & Statistici (Compact 2x2 on mobile, 4 columns on lg) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 font-anthropic">
        {[
          { label: 'Total Membri', numValue: totalMembri, suffix: '', change: 'Înregistrați în total', icon: Users, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/50', border: 'border-t-blue-600' },
          { label: 'Membri Activi', numValue: membriActivi, suffix: '', change: 'Total membri activi', icon: Activity, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/50', border: 'border-t-emerald-600' },
          { label: 'Membri Noi', numValue: membriNoi, suffix: '', change: 'Înscriși luna aceasta', icon: UserPlus, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950/50', border: 'border-t-purple-600' },
          { label: 'Rată Retenție', numValue: rataRetentie, suffix: '%', change: 'Raport conturi active', icon: Clock, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50', border: 'border-t-amber-500' }
        ].map((stat, i) => {
          const cardStyle = [
            "rounded-[2px] border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs border-t-4 border-t-blue-600",
            "rounded-[2px] border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs border-t-4 border-t-emerald-600",
            "rounded-[2px] border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs border-t-4 border-t-purple-600",
            "rounded-[2px] border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs border-t-4 border-t-amber-500"
          ][i];
          
          return (
            <div key={i} className={`p-4 sm:p-5 transition-all duration-300 hover:shadow-sm ${cardStyle}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-[2px] ${stat.bg} ${stat.color} flex items-center justify-center font-bold shrink-0`}>
                  <stat.icon size={20} />
                </div>
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate ml-1 text-right font-title">{stat.label}</span>
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1 text-slate-900 dark:text-white tracking-tight font-data">
                <AnimatedCounter value={stat.numValue} suffix={stat.suffix} />
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 font-anthropic truncate">{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* 2. Toolbar Adaptiv & Filtre (Design Curat & Responsive) */}
      <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-4 font-anthropic">
        
        {/* Row 1: Search + View Toggles + Action Buttons */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Căutare Principală */}
          <div className="relative group flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-slate-100 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Caută membru după nume, poreclă, username, telefon sau email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 focus:bg-white dark:focus:bg-slate-800 transition-all font-anthropic"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="Șterge căutarea"
                >
                  <X size={15} />
                </button>
              )}
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-data hidden sm:inline">
                {processedMembers.length} {processedMembers.length === 1 ? 'membru' : 'membri'}
              </span>
            </div>
          </div>

          {/* Action Group: View Toggle + Filter Toggle (on small screens) + Export + New Member */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end font-title">
            
            {/* View Mode Toggle (Tabel vs Carduri) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-[2px] border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-[2px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Vizualizare Tabel"
              >
                <TableIcon size={15} />
                <span className="hidden sm:inline uppercase tracking-wider">Tabel</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-[2px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Vizualizare Carduri"
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline uppercase tracking-wider">Carduri</span>
              </button>
            </div>

            {/* Mobile / Tablet Filter Toggle Button */}
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-[2px] border text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                activeFiltersCount > 0 || isMobileFilterOpen
                  ? 'bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 border-slate-900 dark:border-sky-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Filter size={15} />
              <span>Filtre</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] flex items-center justify-center font-bold font-data">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${isMobileFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Export Excel Button */}
            {isAdmin && (
              <button 
                onClick={handleExportExcel}
                className="px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 rounded-[2px] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer uppercase tracking-wider shrink-0"
                title="Descarcă foaie de calcul Excel cu toți membrii"
              >
                <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">EXPORTĂ</span>
              </button>
            )}

            {/* Add Member Button */}
            {isAdmin && (
              <button 
                onClick={onAddMemberClick}
                className="btn-civic-primary px-3.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer uppercase tracking-wider shrink-0"
              >
                <UserPlus size={15} className="shrink-0" />
                <span>MEMBRU NOU</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filter Controls & Sort Options (Responsive Grid) */}
        <div className={`${isMobileFilterOpen ? 'block' : 'hidden lg:block'} pt-3 border-t border-slate-100 dark:border-slate-800`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-title">
            
            {/* Filter 1: Rol */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Rol Membru
              </label>
              <select 
                value={selectedRole}
                onChange={e => {
                  setSelectedRole(e.target.value);
                  if (e.target.value === 'Board') {
                    setSelectedStatus('Toți');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 cursor-pointer"
              >
                <option value="Toți">Toate Rolurile (Board & Voluntari)</option>
                <option value="Board">Doar Membri Board</option>
                <option value="Voluntar">Doar Voluntari</option>
              </select>
            </div>

            {/* Filter 2: Status */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status Activitate
              </label>
              <select 
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                disabled={selectedRole === 'Board'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Toți">Orice Status (Activi & Pasivi)</option>
                <option value="ACTIV">Doar Membri Activi</option>
                <option value="PASIV">Doar Membri Pasivi</option>
              </select>
            </div>

            {/* Filter 3: Balanță / Cotizații */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Balanță Cotizații
              </label>
              <select 
                value={selectedDebtFilter}
                onChange={e => setSelectedDebtFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 cursor-pointer"
              >
                <option value="Toți">Orice Balanță</option>
                <option value="Restanțieri">Restanțieri (Cu Datorii)</option>
                <option value="La Zi">La Zi (0 RON Restanță)</option>
              </select>
            </div>

            {/* Filter 4: Sortare & Reset */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ordonare
                </label>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Resetează ({activeFiltersCount})
                  </button>
                )}
              </div>
              <select 
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 cursor-pointer"
              >
                <option value="Implicit">Alfabetic după Nume (A-Z)</option>
                <option value="Datorie">După Datorie Descrescător</option>
              </select>
            </div>

          </div>
        </div>

        {/* Row 3: Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800 max-w-full font-title">
          <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider shrink-0 mr-1">
            Filtre Rapide:
          </span>
          {[
            { label: `Toți (${totalMembri})`, active: selectedRole === 'Toți' && selectedDebtFilter === 'Toți' && selectedStatus === 'Toți', onClick: () => { setSelectedRole('Toți'); setSelectedDebtFilter('Toți'); setSelectedStatus('Toți'); } },
            { label: '👑 Board', active: selectedRole === 'Board', onClick: () => { setSelectedRole('Board'); setSelectedStatus('Toți'); } },
            { label: '🤝 Voluntari', active: selectedRole === 'Voluntar', onClick: () => setSelectedRole('Voluntar') },
            { label: '⚠️ Restanțieri', active: selectedDebtFilter === 'Restanțieri', onClick: () => setSelectedDebtFilter('Restanțieri') },
            { label: '✨ La Zi', active: selectedDebtFilter === 'La Zi', onClick: () => setSelectedDebtFilter('La Zi') },
            { label: '🟢 Activi', active: selectedStatus === 'ACTIV', onClick: () => { setSelectedRole('Toți'); setSelectedStatus('ACTIV'); } },
            { label: '⚪ Pasivi', active: selectedStatus === 'PASIV', onClick: () => { setSelectedRole('Toți'); setSelectedStatus('PASIV'); } },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={chip.onClick}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                chip.active
                  ? 'bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

      </div>

      {/* 3. Lista Membri: Card View (Ideal pe Mobil) sau Table View (Cu Scroll Orizontal Fluid) */}
      {viewMode === 'cards' ? (
        /* --- CARD VIEW --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 font-anthropic">
          {processedMembers.map((m) => {
            const debt = calculateDebt(m.joinDate, m.totalPaid || 0);
            const isClear = debt === 0;
            const presences = m.presences || 0;
            const excused = m.excusedAbsences || 0;
            const unexcused = m.unexcusedAbsences || 0;
            const { rate, barColorClass, colorClass, percentage } = calculateQualification(presences, excused, unexcused, m.status, m.role);
            const textColorClass = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-slate-900 dark:text-white';

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={`bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between gap-3.5 relative ${
                  m.status === 'passive' ? 'opacity-75' : ''
                }`}
              >
                {/* Card Top: Avatar, Name, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      {(m.avatar || m.photo_url || m.photoUrl) ? (
                        <img
                          src={m.avatar || m.photo_url || m.photoUrl}
                          alt={m.name}
                          loading="lazy"
                          className="w-12 h-12 rounded-[2px] object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-[2px] bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center font-bold text-base shadow-xs">
                          {m.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                      )}
                      {isClear && (
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-[2px] shadow-xs p-0.5" title="Membru Exemplar (La zi)">
                          <Star className="fill-emerald-400 text-emerald-400" size={13} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white truncate font-title">{m.name}</h4>
                      {m.nickname && (
                        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate block font-data">@{m.nickname}</span>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap font-title">
                        {m.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded-[2px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase">
                            BOARD
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-[2px] bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase">
                            VOLUNTAR
                          </span>
                        )}

                        {m.role === 'admin' && m.boardPosition ? (
                          <span className="px-2 py-0.5 rounded-[2px] bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase">
                            {m.boardPosition}
                          </span>
                        ) : m.status === 'passive' ? (
                          <span className="px-2 py-0.5 rounded-[2px] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase">
                            PASIV
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase">
                            ACTIV
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-slate-400 shrink-0 mt-1" />
                </div>

                {/* Card Middle: Attendance & Financial Balance */}
                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-[2px] border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 font-title">Prezență</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold font-data ${textColorClass}`}>{rate}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold font-data">{presences}P / {unexcused}A</span>
                    </div>
                    {m.status !== 'passive' && (
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-[2px] overflow-hidden mt-1.5">
                        <div className={`h-full rounded-[2px] ${barColorClass}`} style={{ width: `${percentage}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-[2px] border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-0.5 font-title">Cotizații</span>
                    <div className={`text-sm font-bold truncate font-data ${isClear ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isClear ? '0 RON' : `${debt} RON`}
                    </div>
                    <span className={`text-xs font-bold uppercase mt-0.5 inline-block font-title ${isClear ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isClear ? 'La zi' : 'Restanță'}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 font-title">
                    <button 
                      className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                      onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}
                    >
                      <Edit2 size={13} /> Editează
                    </button>
                    <button 
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-[2px] transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setMemberToDelete(m); }}
                      title="Șterge Membru"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {processedMembers.length === 0 && (
            <div className="col-span-full p-10 text-center text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 font-anthropic">
              Nu a fost găsit niciun membru conform filtrelor selectate.
            </div>
          )}
        </div>
      ) : (
        /* --- TABLE VIEW (Scroll Orizontal Fluid & Min-Width) --- */
        <div className="rounded-[2px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-5 shadow-xs font-anthropic overflow-hidden">
          
          {/* Subtle Mobile Scroll Cue */}
          <div className="md:hidden flex items-center justify-between px-3 py-1.5 mb-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] text-xs font-semibold text-slate-500 dark:text-slate-400 font-title">
            <span>👉 Glisează orizontal pentru toate coloanele</span>
            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-[2px] font-data font-bold">6 coloane</span>
          </div>

          <div className="overflow-x-auto touch-pan-x w-full -webkit-overflow-scrolling-touch scrollbar-thin">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[220px] font-title uppercase tracking-wider">Membru</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[140px] font-title uppercase tracking-wider">Rată Prezență</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[120px] font-title uppercase tracking-wider">Rol</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[140px] font-title uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[150px] font-title uppercase tracking-wider">Balanță</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-right min-w-[110px] font-title uppercase tracking-wider">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedMembers.map((m) => {
                  const debt = calculateDebt(m.joinDate, m.totalPaid || 0);
                  const isClear = debt === 0;

                  return (
                    <TableRow 
                      key={m.id}
                      className={`cursor-pointer group hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${m.status === 'passive' ? 'opacity-70' : ''}`}
                      onClick={() => setSelectedMember(m)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3.5 py-1">
                          <div className="relative shrink-0">
                            {(m.avatar || m.photo_url || m.photoUrl) ? (
                              <img
                                src={m.avatar || m.photo_url || m.photoUrl}
                                alt={m.name}
                                loading="lazy"
                                className="w-10 h-10 rounded-[2px] object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-[2px] bg-slate-900 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center font-bold text-sm shadow-xs">
                                {m.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                            )}
                            {isClear && (
                              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-[2px] shadow-xs p-0.5" title="Membru Exemplar (La zi)">
                                <Star className="fill-emerald-400 text-emerald-400" size={11} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm sm:text-base font-title">
                              <span>{m.name}</span>
                            </div>
                            {m.nickname && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-data">
                                @{m.nickname}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const presences = m.presences || 0;
                          const excused = m.excusedAbsences || 0;
                          const unexcused = m.unexcusedAbsences || 0;
                          const { rate, barColorClass, colorClass, percentage } = calculateQualification(presences, excused, unexcused, m.status, m.role);
                          
                          return (
                            <div className="flex items-center gap-2">
                              <div className={`font-bold text-sm font-data ${colorClass}`}>{rate}</div>
                              {m.status !== 'passive' && (
                                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-[2px] overflow-hidden hidden md:block">
                                  <div className={`h-full rounded-[2px] ${barColorClass}`} style={{ width: `${percentage}%` }} />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {m.role === 'admin' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] border border-indigo-100 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide shadow-xs font-title uppercase">
                            {m.boardPosition ? m.boardPosition : 'BOARD'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] border border-sky-100 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold tracking-wide shadow-xs font-title uppercase">
                            VOLUNTAR
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.status === 'passive' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[2px] bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs tracking-wider shadow-xs font-title uppercase">
                            <span className="w-1.5 h-1.5 rounded-[2px] bg-amber-500 shrink-0"></span>
                            PASIV
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[2px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs tracking-wider shadow-xs font-title uppercase">
                            <span className="w-1.5 h-1.5 rounded-[2px] bg-emerald-500 shrink-0"></span>
                            ACTIV
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`font-bold text-sm font-data flex items-center gap-2 ${isClear ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isClear ? '0 RON - Achitat' : `${debt} RON`}
                          {!isClear && <span className="text-xs uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-[2px] font-bold font-title">Restanță</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Always visible on mobile/tablet, hover on desktop */}
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 font-title">
                            <button 
                              className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-[2px] transition-colors cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}
                              title="Editează profilul"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-[2px] transition-colors cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); setMemberToDelete(m); }}
                              title="Șterge Membru"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {processedMembers.length === 0 && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-semibold text-sm font-anthropic">
                Nu a fost găsit niciun membru conform filtrelor selectate.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Slide-Over Profile Drawer */}
      <AnimatePresence>
        {selectedMember && (
          <MemberDrawer 
            member={selectedMember} 
            onClose={() => setSelectedMember(null)}
            onUpdateMember={handleUpdateMember}
            isAdmin={isAdmin}
            currentUserObj={currentUserObj}
          />
        )}
      </AnimatePresence>

      {/* 5. Confirmation Modal for Member Deletion */}
      <AnimatePresence>
        {memberToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-anthropic">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#161B22] border border-slate-300 dark:border-slate-800 rounded-[2px] shadow-2xl p-5 z-[201] text-slate-900 dark:text-slate-100 space-y-3.5 font-anthropic"
            >
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <AlertCircle size={20} />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white font-title">Confirmare Ștergere Membru</h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-anthropic">
                Ești sigur că dorești să ștergi definitiv membrul <strong className="text-slate-900 dark:text-white font-bold">{memberToDelete.name}</strong>
                {memberToDelete.email && <> (<span className="text-slate-500 dark:text-slate-400 font-data">{memberToDelete.email}</span>)</>}
                {memberToDelete.role === 'admin' && <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-bold font-title">[BOARD]</span>}
                ? Această acțiune va elimina contul din sistem și este ireversibilă.
              </p>

              <div className="flex gap-2.5 pt-1.5 font-title">
                <button
                  onClick={() => setMemberToDelete(null)}
                  className="flex-1 py-2 rounded-[2px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeletingMember}
                  className="flex-1 py-2 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  {isDeletingMember ? 'Se șterge...' : 'Șterge Definitiv'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
