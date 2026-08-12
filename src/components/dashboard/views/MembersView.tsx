import { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Users, UserPlus, Search, Filter, Mail, Edit2, Trash2, Activity, Clock, Star, 
  FileSpreadsheet, X, LayoutGrid, Table as TableIcon, ChevronRight, RotateCcw, ChevronDown
} from 'lucide-react';

import { MemberDrawer } from '../../members/MemberDrawer';
import { calculateDebt, calculateQualification } from '../../../utils/finance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { downloadXlsx } from '../../../utils/xlsx';

interface MembersViewProps {
  members: any[];
  onUpdateMember: (updatedMember: any) => void;
  isAdmin: boolean;
  onAddMemberClick: () => void;
  initialSearchTerm?: string;
  initialSelectedMemberId?: string;
}

export function MembersView({
  members,
  onUpdateMember,
  isAdmin,
  onAddMemberClick,
  initialSearchTerm,
  initialSelectedMemberId
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

  // Filters & Sorting logic
  const processedMembers = useMemo(() => {
    const filtered = members.filter(m => {
      const mName = m.name || '';
      const mEmail = m.email || '';
      const rawRole = (m.role || '').toLowerCase();
      const rawStatus = (m.status || '').toLowerCase();
      
      const isBoardMember = rawRole === 'admin';
      const mRole = isBoardMember ? 'Board' : 'Voluntar';

      const matchesSearch = mName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            mEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (m.nickname || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'Toți' || mRole === selectedRole;
      
      let matchesStatus = true;
      if (selectedStatus !== 'Toți') {
        if (selectedStatus === 'ACTIV') {
          matchesStatus = rawStatus === 'active';
        } else if (selectedStatus === 'PASIV') {
          matchesStatus = rawStatus === 'passive';
        }
      }
      
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
    const total = members.length;
    const active = total;
    
    const now = new Date();
    const newMembers = members.filter(m => {
      if (!m.joinDate) return false;
      const d = new Date(m.joinDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const inactiveOrSuspended = members.filter(m => {
      const s = (m.status || '').toLowerCase();
      return s === 'inactive' || s === 'inactiv' || s === 'suspended' || s === 'suspendat';
    }).length;
    const retention = total > 0 ? Math.round(((total - inactiveOrSuspended) / total) * 100) : 100;

    return { totalMembri: total, membriActivi: active, membriNoi: newMembers, rataRetentie: retention };
  }, [members]);

  const handleExportExcel = () => {
    const rows = members.map(m => {
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { label: 'Total Membri', value: totalMembri.toString(), change: 'Înregistrați în total', icon: Users, color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-t-blue-600' },
          { label: 'Membri Activi', value: membriActivi.toString(), change: 'Total membri activi', icon: Activity, color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-t-emerald-600' },
          { label: 'Membri Noi', value: membriNoi.toString(), change: 'Înscriși luna aceasta', icon: UserPlus, color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-t-purple-600' },
          { label: 'Rată Retenție', value: `${rataRetentie}%`, change: 'Raport conturi active', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-t-amber-500' }
        ].map((stat, i) => {
          const cardStyle = [
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-blue-600",
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-emerald-600",
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-purple-600",
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-amber-500"
          ][i];
          
          return (
            <div key={i} className={`p-3.5 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${cardStyle}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center font-bold shrink-0`}>
                  <stat.icon size={18} />
                </div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-600 truncate ml-1 text-right">{stat.label}</span>
              </div>
              <div className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-0.5 sm:mb-1 text-slate-900 tracking-tight">{stat.value}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 font-['Manrope'] truncate">{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* 2. Toolbar Adaptiv (Desktop, Tableta & Telefon) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-lg flex flex-col gap-3 font-anthropic">
        {/* Top Toolbar Row */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          
          {/* Search + View Toggle + Mobile Filter Trigger */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative group flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent/40 group-focus-within:text-brand-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Caută membru..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-[15px] focus:outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all font-['Manrope']"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  title="Șterge căutarea"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile Filter Sheet Trigger */}
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                activeFiltersCount > 0 || isMobileFilterOpen
                  ? 'bg-brand-primary text-brand-accent border-brand-accent/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter size={15} />
              <span>Filtre</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-accent text-white text-[10px] flex items-center justify-center font-bold ml-0.5">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${isMobileFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* View Mode Switcher (Tabel vs Carduri) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vizualizare Tabel"
              >
                <TableIcon size={16} />
                <span className="hidden sm:inline text-[11px]">Tabel</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vizualizare Carduri"
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline text-[11px]">Carduri</span>
              </button>
            </div>
          </div>

          {/* Desktop Filter Dropdowns (Inline) */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <Filter className="text-brand-accent/40 shrink-0" size={16} />
            <select 
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value);
                if (e.target.value === 'Board') {
                  setSelectedStatus('Toți');
                }
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none cursor-pointer font-bold uppercase tracking-wider hover:bg-slate-100 transition-all text-slate-800"
            >
              <option value="Toți">Toate Rolurile</option>
              <option value="Board">Board</option>
              <option value="Voluntar">Voluntar</option>
            </select>

            {selectedRole !== 'Board' && (
              <select 
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none cursor-pointer font-bold uppercase tracking-wider hover:bg-slate-100 transition-all text-slate-800"
              >
                <option value="Toți">Orice Status</option>
                <option value="ACTIV">ACTIV</option>
                <option value="PASIV">PASIV</option>
              </select>
            )}

            <select 
              value={selectedDebtFilter}
              onChange={e => setSelectedDebtFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none cursor-pointer font-bold uppercase tracking-wider text-amber-700 hover:bg-slate-100 transition-all"
            >
              <option value="Toți">Orice Balanță</option>
              <option value="Restanțieri">Restanțieri</option>
              <option value="La Zi">La Zi (0 Datorii)</option>
            </select>

            <select 
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none cursor-pointer font-bold uppercase tracking-wider hover:bg-slate-100 transition-all text-slate-800"
            >
              <option value="Implicit">Sortare Nume</option>
              <option value="Datorie">Cea Mai Mare Datorie</option>
            </select>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                title="Resetează toate filtrele"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>

          {/* Action Buttons (Export + Add Member) */}
          <div className="grid grid-cols-2 md:flex md:items-center gap-2 w-full md:w-auto">
            {isAdmin && (
              <button 
                onClick={handleExportExcel}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                title="Descarcă foaie de calcul Excel cu toți membrii"
              >
                <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                <span className="truncate">EXPORTĂ</span>
              </button>
            )}

            {isAdmin && (
              <button 
                onClick={onAddMemberClick}
                className="ios26-btn px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <UserPlus size={15} className="shrink-0" />
                <span className="truncate">MEMBRU NOU</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips for Touch / Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1">Filtre Rapide:</span>
          {[
            { label: 'Toți', active: selectedRole === 'Toți' && selectedDebtFilter === 'Toți' && selectedStatus === 'Toți', onClick: () => { setSelectedRole('Toți'); setSelectedDebtFilter('Toți'); setSelectedStatus('Toți'); } },
            { label: 'Board', active: selectedRole === 'Board', onClick: () => { setSelectedRole('Board'); setSelectedStatus('Toți'); } },
            { label: 'Voluntari', active: selectedRole === 'Voluntar', onClick: () => setSelectedRole('Voluntar') },
            { label: 'Restanțieri', active: selectedDebtFilter === 'Restanțieri', onClick: () => setSelectedDebtFilter('Restanțieri') },
            { label: 'La Zi (Fără Datorii)', active: selectedDebtFilter === 'La Zi', onClick: () => setSelectedDebtFilter('La Zi') },
            { label: 'Activi', active: selectedStatus === 'ACTIV', onClick: () => { setSelectedRole('Toți'); setSelectedStatus('ACTIV'); } },
            { label: 'Pasivi', active: selectedStatus === 'PASIV', onClick: () => { setSelectedRole('Toți'); setSelectedStatus('PASIV'); } },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={chip.onClick}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                chip.active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Mobile Expandable Filter Sheet */}
        <AnimatePresence>
          {isMobileFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-hidden"
            >
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Rol</label>
                <select 
                  value={selectedRole}
                  onChange={e => {
                    setSelectedRole(e.target.value);
                    if (e.target.value === 'Board') setSelectedStatus('Toți');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  <option value="Toți">Toate Rolurile</option>
                  <option value="Board">Board</option>
                  <option value="Voluntar">Voluntar</option>
                </select>
              </div>

              {selectedRole !== 'Board' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Status</label>
                  <select 
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-800"
                  >
                    <option value="Toți">Orice Status</option>
                    <option value="ACTIV">ACTIV</option>
                    <option value="PASIV">PASIV</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Balanță Cotizații</label>
                <select 
                  value={selectedDebtFilter}
                  onChange={e => setSelectedDebtFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-750"
                >
                  <option value="Toți">Orice Balanță</option>
                  <option value="Restanțieri">Restanțieri</option>
                  <option value="La Zi">La Zi (Fără Datorii)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Sortare</label>
                <select 
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  <option value="Implicit">Sortare Implicită (Nume)</option>
                  <option value="Datorie">Cea Mai Mare Datorie</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex justify-between items-center pt-2">
                <span className="text-xs font-semibold text-slate-500">
                  {processedMembers.length} membri găsiți
                </span>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={13} /> Resetează Filtrele
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Lista Membri: Card View (Ideal pe Mobil) sau Table View (Cu Scroll Orizontal Fluid) */}
      {viewMode === 'cards' ? (
        /* --- CARD VIEW --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {processedMembers.map((m) => {
            const debt = calculateDebt(m.joinDate, m.totalPaid || 0);
            const isClear = debt === 0;
            const presences = m.presences || 0;
            const excused = m.excusedAbsences || 0;
            const unexcused = m.unexcusedAbsences || 0;
            const { rate, barColorClass, colorClass, percentage } = calculateQualification(presences, excused, unexcused, m.status);
            const textColorClass = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-brand-accent';

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-md hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  m.status === 'passive' ? 'opacity-75' : ''
                }`}
              >
                {/* Card Top: Avatar, Name, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-brand-accent text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {m.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      {isClear && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-sm p-0.5" title="Membru Exemplar (La zi)">
                          <Star className="fill-emerald-400 text-emerald-400" size={12} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-base text-slate-900 truncate">{m.name}</h4>
                      {m.nickname && (
                        <span className="text-xs text-slate-500 font-medium truncate block">@{m.nickname}</span>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {m.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase">
                            BOARD
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-black uppercase">
                            VOLUNTAR
                          </span>
                        )}

                        {m.role === 'admin' && m.boardPosition ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-black uppercase">
                            {m.boardPosition}
                          </span>
                        ) : m.status === 'passive' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase">
                            PASIV
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase">
                            ACTIV
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-slate-400 shrink-0 mt-1" />
                </div>

                {/* Card Middle: Attendance & Financial Balance */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Prezență</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-black ${textColorClass}`}>{rate}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{presences}P / {unexcused}A</span>
                    </div>
                    {m.status !== 'passive' && (
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                        <div className={`h-full ${barColorClass}`} style={{ width: `${percentage}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Cotizații</span>
                    <div className={`text-sm font-black truncate ${isClear ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isClear ? '0 RON' : `${debt} RON`}
                    </div>
                    <span className={`text-[10px] font-bold uppercase mt-0.5 inline-block ${isClear ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isClear ? 'La zi' : 'Restanță'}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button 
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}
                    >
                      <Edit2 size={13} /> Editează
                    </button>
                    <button 
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      onClick={(e) => { e.stopPropagation(); window.location.href=`mailto:${m.email}`; }}
                      title="Trimite Email"
                    >
                      <Mail size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {processedMembers.length === 0 && (
            <div className="col-span-full p-12 text-center text-slate-500 font-semibold bg-white rounded-3xl border border-slate-200">
              Nu a fost găsit niciun membru conform filtrelor selectate.
            </div>
          )}
        </div>
      ) : (
        /* --- TABLE VIEW (Scroll Orizontal Fluid & Min-Width) --- */
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-2.5 sm:p-4 md:p-5 shadow-xl font-anthropic overflow-hidden">
          
          {/* Subtle Mobile Scroll Cue */}
          <div className="md:hidden flex items-center justify-between px-2.5 py-1.5 mb-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-500">
            <span>👉 Glisează orizontal pentru toate coloanele</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">6 coloane</span>
          </div>

          <div className="overflow-x-auto touch-pan-x w-full -webkit-overflow-scrolling-touch scrollbar-thin">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[200px]">Membru</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[130px]">Rată Prezență</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[110px]">Rol</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[140px]">Status</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-w-[140px]">Balanță</TableHead>
                  <TableHead className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-right min-w-[100px]">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedMembers.map((m) => {
                  const debt = calculateDebt(m.joinDate, m.totalPaid || 0);
                  const isClear = debt === 0;

                  return (
                    <TableRow 
                      key={m.id}
                      className={`cursor-pointer group hover:bg-slate-50/80 transition-colors ${m.status === 'passive' ? 'opacity-70' : ''}`}
                      onClick={() => setSelectedMember(m)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm group-hover:scale-105 transition-transform">
                              {m.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            {isClear && (
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-sm p-0.5" title="Membru Exemplar (La zi)">
                                <Star className="fill-emerald-400 text-emerald-400" size={12} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-sm sm:text-base text-brand-accent dark:text-cyan-400 block truncate">{m.name}</span>
                            {m.nickname && <span className="text-xs text-slate-500 font-medium block">@{m.nickname}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const presences = m.presences || 0;
                          const excused = m.excusedAbsences || 0;
                          const unexcused = m.unexcusedAbsences || 0;
                          const { rate, barColorClass, colorClass, percentage } = calculateQualification(presences, excused, unexcused, m.status);
                          const textColorClass = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-brand-accent';
                          
                          return (
                            <div className="flex items-center gap-3 cursor-help" title={`Prezenți: ${presences} | Absenți: ${unexcused} | Motivați: ${excused}`}>
                              <div className={`w-12 text-right text-sm md:text-base font-black ${textColorClass}`}>
                                {rate}
                              </div>
                              {m.status !== 'passive' && (
                                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner hidden md:block">
                                  <div className={`h-full transition-all ${barColorClass}`} style={{ width: `${percentage}%` }} />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {m.role === 'admin' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-indigo-100 bg-indigo-50/60 text-indigo-700 text-xs md:text-sm font-bold tracking-wide shadow-sm">
                            BOARD
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-sky-100 bg-sky-50/60 text-sky-700 text-xs md:text-sm font-bold tracking-wide shadow-sm">
                            VOLUNTAR
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.role === 'admin' && m.boardPosition ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 font-extrabold text-xs md:text-sm tracking-wider shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0"></span>
                            <span className="truncate">{m.boardPosition.toUpperCase()}</span>
                          </span>
                        ) : m.status === 'passive' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 font-extrabold text-xs md:text-sm tracking-wider shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                            PASIV
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs md:text-sm tracking-wider shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            ACTIV
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`font-bold text-sm md:text-base font-['Manrope'] flex items-center gap-2 ${isClear ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isClear ? '0 RON - Achitat' : `${debt} RON`}
                          {!isClear && <span className="text-xs uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-bold">Restanță</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Always visible on mobile/tablet, hover on desktop */}
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1 sm:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                            <button 
                              className="p-1.5 sm:p-2 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                              onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}
                              title="Editează profilul"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              className="p-1.5 sm:p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={(e) => { e.stopPropagation(); window.location.href=`mailto:${m.email}`; }}
                              title="Trimite Email"
                            >
                              <Mail size={15} />
                            </button>
                            <button 
                              className="p-1.5 sm:p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}
                              title="Setări Membru"
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
              <div className="p-10 text-center text-slate-500 font-semibold">
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
