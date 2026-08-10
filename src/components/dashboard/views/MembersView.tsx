import { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Search, Filter, Mail, Edit2, Trash2, Activity, Clock, Star, FileSpreadsheet
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
  
  const [selectedMember, setSelectedMember] = useState<any | null>(
    initialSelectedMemberId ? members.find(m => m.id === initialSelectedMemberId) || null : null
  );

  // Deep-link: dacă drawer-ul e cerut prin `initialSelectedMemberId` dar `members`
  // încă nu s-a încărcat la montare, `find` întoarce undefined. Rezolvăm o singură
  // dată când lista sosește, fără să redeschidem drawer-ul după ce userul îl închide.
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



  // Filters & Sorting
  const processedMembers = useMemo(() => {
    const filtered = members.filter(m => {
      const mName = m.name || '';
      const mEmail = m.email || '';
      const rawRole = (m.role || '').toLowerCase();
      const rawStatus = (m.status || '').toLowerCase();
      
      // Board member is role === 'admin', otherwise standard member
      const isBoardMember = rawRole === 'admin';
      const mRole = isBoardMember ? 'Board' : 'Voluntar';

      const matchesSearch = mName.toLowerCase().includes(searchTerm.toLowerCase()) || mEmail.toLowerCase().includes(searchTerm.toLowerCase());
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
    <div className="space-y-8">
      {/* 1. Header & Statistici */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Membri', value: totalMembri.toString(), change: 'Înregistrați în total', icon: Users, color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-t-blue-600' },
          { label: 'Membri Activi', value: membriActivi.toString(), change: 'Egal cu total membri momentan', icon: Activity, color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-t-emerald-600' },
          { label: 'Membri Noi', value: membriNoi.toString(), change: 'Înregistrați luna aceasta', icon: UserPlus, color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-t-purple-600' },
          { label: 'Rată Retenție', value: `${rataRetentie}%`, change: 'Raport active/total conturi', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-t-amber-500' }
        ].map((stat, i) => {
          const cardStyle = [
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-blue-600",
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-emerald-600",
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-purple-600",
            "rounded-2xl border-2 border-slate-200 bg-white shadow-md border-t-4 border-t-amber-500"
          ][i];
          
          return (
            <div key={i} className={`p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg font-anthropic ${cardStyle}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center font-bold`}>
                  <stat.icon size={20} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">{stat.label}</span>
              </div>
              <div className="text-4xl md:text-5xl font-extrabold mb-1 text-slate-900 tracking-tight">{stat.value}</div>
              <div className="text-xs font-bold text-slate-500 font-['Manrope']">{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* 2. Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg flex flex-col md:flex-row gap-3 justify-between items-center font-anthropic">
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent/40 group-focus-within:text-brand-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Caută membru..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-[15px] focus:outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/15 focus:bg-white transition-all font-['Manrope']"
            />
          </div>
          
          <div className="relative hidden md:flex items-center gap-2">
            <Filter className="text-brand-accent/40" size={16} />
            <select 
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value);
                if (e.target.value === 'Board') {
                  setSelectedStatus('Toți');
                }
              }}
              className="px-3.5 py-2 bg-white border border-brand-muted/8 rounded-xl text-sm focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
            >
              <option value="Toți">Toate Rolurile</option>
              <option value="Board">Board</option>
              <option value="Voluntar">Voluntar</option>
            </select>

            {selectedRole !== 'Board' && (
              <select 
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3.5 py-2 bg-white border border-brand-muted/8 rounded-xl text-sm focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
              >
                <option value="Toți">Orice Status</option>
                <option value="ACTIV">ACTIV</option>
                <option value="PASIV">PASIV</option>
              </select>
            )}

            <select 
              value={selectedDebtFilter}
              onChange={e => setSelectedDebtFilter(e.target.value)}
              className="px-3.5 py-2 bg-white border border-brand-muted/8 rounded-xl text-sm focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-wider text-amber-750 hover:bg-slate-50 transition-all"
            >
              <option value="Toți">Orice Balanță</option>
              <option value="Restanțieri">Restanțieri</option>
              <option value="La Zi">La Zi (Fără Datorii)</option>
            </select>

            <select 
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="px-3.5 py-2 bg-white border border-brand-muted/8 rounded-xl text-sm focus:outline-none appearance-none cursor-pointer font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
            >
              <option value="Implicit">Sortare Implicită</option>
              <option value="Datorie">Cea Mai Mare Datorie</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {isAdmin && (
            <button 
              onClick={handleExportExcel}
              className="w-full md:w-auto px-4 py-2 text-sm md:text-[15px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
              title="Descarcă foaie de calcul Excel cu toți membrii"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" /> EXPORTĂ EXCEL
            </button>
          )}

          {isAdmin && (
            <button 
              onClick={onAddMemberClick}
              className="ios26-btn w-full md:w-auto px-5 py-2 text-sm md:text-[15px] font-semibold flex items-center justify-center gap-2"
            >
              <UserPlus size={16} /> MEMBRU NOU
            </button>
          )}
        </div>
      </div>

      {/* 3. Lista Membri (Table) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-xl font-anthropic overflow-hidden">
        <div className="overflow-x-auto p-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-sm text-slate-700 dark:text-slate-300">Membru</TableHead>
                <TableHead className="font-bold text-sm text-slate-700 dark:text-slate-300">Rată Prezență</TableHead>
                <TableHead className="font-bold text-sm text-slate-700 dark:text-slate-300">Rol</TableHead>
                <TableHead className="font-bold text-sm text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="font-bold text-sm text-slate-700 dark:text-slate-300">Balanță</TableHead>
                <TableHead className="font-bold text-sm text-slate-700 dark:text-slate-300 text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedMembers.map((m) => {
                const debt = calculateDebt(m.joinDate, m.totalPaid || 0);
                const isClear = debt === 0;

                return (
                  <TableRow 
                    key={m.id}
                    className={`cursor-pointer group ${m.status === 'passive' ? 'opacity-70' : ''}`}
                    onClick={() => setSelectedMember(m)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {m.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          {isClear && (
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-sm p-0.5" title="Membru Exemplar (La zi)">
                              <Star className="fill-emerald-400 text-emerald-400" size={12} />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-base text-brand-accent dark:text-cyan-400">{m.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const presences = m.presences || 0;
                        const excused = m.excusedAbsences || 0;
                        const unexcused = m.unexcusedAbsences || 0;
                        const { rate, barColorClass, colorClass, percentage } = calculateQualification(presences, excused, unexcused, m.status);
                        
                        // Extract text color from colorClass
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 font-extrabold text-xs md:text-sm tracking-wider shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                          {m.boardPosition.toUpperCase()}
                        </span>
                      ) : m.status === 'passive' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 font-extrabold text-xs md:text-sm tracking-wider shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          PASIV
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs md:text-sm tracking-wider shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                      {/* Hover Actions */}
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button 
                            className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-full transition-colors"
                            onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}
                            title="Editează"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                            onClick={(e) => { e.stopPropagation(); window.location.href=`mailto:${m.email}`; }}
                            title="Trimite Email"
                          >
                            <Mail size={16} />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            onClick={(e) => { e.stopPropagation(); setSelectedMember(m); }}
                            title="Setări Critice"
                          >
                            <Trash2 size={16} />
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
