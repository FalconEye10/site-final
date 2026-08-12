import { useState, useEffect, useMemo } from 'react';
import { 
  Users2, Plus, Trash2, Search, Check, Sparkles, FolderKanban, 
  UserCheck, Shield, AlertCircle, Save
} from 'lucide-react';
import { supabase } from '../../../supabase';
import { toast } from '../../ui/Toast';

interface Committee {
  id: string;
  name: string;
  description: string;
  coordinatorId: string | null;
  members: string[];
  hours: number;
}

interface RepartizareViewProps {
  isAdmin: boolean;
  members: any[];
  currentUserId?: string;
}

export function RepartizareView({ isAdmin, members }: RepartizareViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('Toate');

  // Fetch projects from events table
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('type', 'project')
        .order('date', { ascending: false });

      if (error) throw error;
      const projects = data || [];
      setEvents(projects);

      if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].id);
      }
    } catch (err) {
      console.error('Error fetching project events:', err);
      toast.error('Eroare la încărcarea proiectelor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel('repartizare_events_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentProject = useMemo(() => {
    return events.find(p => p.id === selectedProjectId) || null;
  }, [events, selectedProjectId]);

  // Load committees of selected project
  useEffect(() => {
    if (!currentProject) {
      setCommittees([]);
      return;
    }

    const rawCommittees = currentProject.committees || {};
    const commList: Committee[] = Object.entries(rawCommittees).map(([id, c]: [string, any]) => ({
      id,
      name: c.name || '',
      description: c.description || '',
      coordinatorId: c.coordinatorId || null,
      members: Array.isArray(c.members) ? c.members : [],
      hours: Number(c.hours) || 1,
    }));

    setCommittees(commList);
  }, [currentProject]);

  // All skill tags available across members
  const allSkills = useMemo(() => {
    const skillSet = new Set<string>();
    members.forEach(m => {
      if (Array.isArray(m.skills)) {
        m.skills.forEach((s: string) => skillSet.add(s));
      }
    });
    return Array.from(skillSet);
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const nameMatch = (m.name || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        (m.nickname || '').toLowerCase().includes(memberSearchQuery.toLowerCase());
      
      const skillMatch = selectedSkillFilter === 'Toate' || 
                         (Array.isArray(m.skills) && m.skills.includes(selectedSkillFilter));
      
      return nameMatch && skillMatch;
    });
  }, [members, memberSearchQuery, selectedSkillFilter]);

  // Statistics for the selected project
  const projectStats = useMemo(() => {
    const totalMembersAssignedSet = new Set<string>();
    committees.forEach(c => {
      c.members.forEach(mId => totalMembersAssignedSet.add(mId));
      if (c.coordinatorId) totalMembersAssignedSet.add(c.coordinatorId);
    });

    const unassignedCount = Math.max(0, members.length - totalMembersAssignedSet.size);

    return {
      assignedCount: totalMembersAssignedSet.size,
      unassignedCount,
      totalCommittees: committees.length
    };
  }, [committees, members]);

  // Handle adding a new committee
  const handleAddCommittee = () => {
    const newId = `comm_${Date.now()}`;
    const newComm: Committee = {
      id: newId,
      name: 'Comitet Nou',
      description: '',
      coordinatorId: null,
      members: [],
      hours: 2,
    };
    setCommittees(prev => [...prev, newComm]);
  };

  // Handle removing a committee
  const handleRemoveCommittee = (commId: string) => {
    setCommittees(prev => prev.filter(c => c.id !== commId));
  };

  // Handle updating fields of a committee
  const handleUpdateCommittee = (commId: string, field: keyof Committee, value: any) => {
    setCommittees(prev => prev.map(c => c.id === commId ? { ...c, [field]: value } : c));
  };

  // Toggle member assignment to a committee
  const handleToggleMember = (commId: string, memberId: string) => {
    setCommittees(prev => prev.map(c => {
      if (c.id !== commId) return c;
      const isMember = c.members.includes(memberId);
      const updatedMembers = isMember
        ? c.members.filter(id => id !== memberId)
        : [...c.members, memberId];
      return { ...c, members: updatedMembers };
    }));
  };

  // Save changes to Supabase
  const handleSave = async () => {
    if (!selectedProjectId || !currentProject) return;

    // Validation
    const hasEmptyName = committees.some(c => !c.name.trim());
    if (hasEmptyName) {
      toast.error('Fiecare comitet trebuie să aibă un nume completat.');
      return;
    }

    setIsSaving(true);
    try {
      const committeesRecord: Record<string, any> = {};
      committees.forEach(c => {
        committeesRecord[c.id] = {
          name: c.name.trim(),
          description: c.description.trim(),
          coordinatorId: c.coordinatorId || null,
          members: c.members,
          hours: Number(c.hours) || 1,
        };
      });

      const { error } = await supabase
        .from('events')
        .update({ committees: committeesRecord })
        .eq('id', selectedProjectId);

      if (error) throw error;

      toast.success('Repartizarea pe comitete a fost salvată cu succes! ✓');
      // Refetch to align state
      fetchProjects();
    } catch (err) {
      console.error('Error saving committees allocation:', err);
      toast.error('Eroare la salvarea repartizării pe comitete.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto font-data pb-12">
      {/* Header Banner */}
      <div className="adm-glass p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="adm-accent-bar" />
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <Users2 className="text-indigo-500" size={28} />
            Repartizare pe Comitete
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-['Manrope']">
            Gestionează distribuirea voluntarilor pe proiecte și departamente de lucru dedicate.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedProjectId}
            className="ios26-btn px-6 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-500/20"
          >
            <Save size={16} />
            {isSaving ? 'Se salvează...' : 'SALVEAZĂ REPARTIZAREA'}
          </button>
        )}
      </div>

      {/* Project Selector bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <FolderKanban size={16} className="text-indigo-600" />
            Selectează Proiectul:
          </label>

          {events.length === 0 ? (
            <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              Nu există proiecte create în Calendar. Adaugă mai întâi un eveniment de tip proiect.
            </span>
          ) : (
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors w-full sm:w-80"
            >
              {events.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.date})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Selected Project Summary Bar */}
        {currentProject && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3">
              <FolderKanban size={20} className="text-indigo-600 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase text-indigo-500">Comitete Active</div>
                <div className="text-base font-black text-indigo-900 dark:text-indigo-200">{projectStats.totalCommittees} departamente</div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-3">
              <UserCheck size={20} className="text-emerald-600 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase text-emerald-500">Membri Repartizați</div>
                <div className="text-base font-black text-emerald-900 dark:text-emerald-200">{projectStats.assignedCount} voluntari</div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/50 flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase text-amber-500">Nerepartizați la acest proiect</div>
                <div className="text-base font-black text-amber-900 dark:text-amber-200">{projectStats.unassignedCount} voluntari</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Flexibility Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-xs font-bold font-['Manrope']">
            <strong>Repartizare 100% Flexibilă & Editabilă</strong>: Poți muta oricând voluntarii între comitete sau îi poți scoate/adăuga cu 1 click dacă intervin schimbări în program sau disponibilitate.
          </span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleAddCommittee}
            className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <Plus size={14} /> + Comitet Nou
          </button>
        )}
      </div>

      {/* Main Content Layout (Grid: Committees on Left, Members List on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Committees of the project (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users2 size={16} className="text-indigo-600" />
              Comitetele Proiectului
            </h3>

            {isAdmin && (
              <button
                type="button"
                onClick={handleAddCommittee}
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> ADAUGĂ COMITET
              </button>
            )}
          </div>

          {committees.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl space-y-3">
              <Users2 size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-500">
                Nu a fost creat niciun comitet de lucru pentru acest proiect.
              </p>
              {isAdmin && (
                <button
                  onClick={handleAddCommittee}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  Adaugă Primul Comitet
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {committees.map((comm) => (
                <div 
                  key={comm.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 relative group"
                >
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCommittee(comm.id)}
                      className="absolute top-5 right-5 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                      title="Șterge comitetul"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Committee Header Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pr-8">
                    <div className="sm:col-span-8">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nume Departament / Comitet</label>
                      <input
                        type="text"
                        value={comm.name}
                        onChange={e => handleUpdateCommittee(comm.id, 'name', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="Ex: Logistică & Decor, Imagine Publică..."
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-80 font-['Manrope']"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Ore Voluntariat</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={comm.hours}
                          onChange={e => handleUpdateCommittee(comm.id, 'hours', parseFloat(e.target.value) || 0)}
                          disabled={!isAdmin}
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-80 pr-10 font-mono"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">ore</span>
                      </div>
                    </div>
                  </div>

                  {/* Coordinator & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                        <Shield size={12} className="text-amber-500" />
                        Șef Comitet / Coordonator
                      </label>
                      <select
                        value={comm.coordinatorId || ''}
                        onChange={e => handleUpdateCommittee(comm.id, 'coordinatorId', e.target.value || null)}
                        disabled={!isAdmin}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-80"
                      >
                        <option value="">-- Fără Coordonator Desemnat --</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.nickname ? `(@${m.nickname})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descriere & Sarcini</label>
                      <input
                        type="text"
                        value={comm.description}
                        onChange={e => handleUpdateCommittee(comm.id, 'description', e.target.value)}
                        disabled={!isAdmin}
                        placeholder="Ex: Achiziționare materiale, amenajare sală..."
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-80 font-['Manrope']"
                      />
                    </div>
                  </div>

                  {/* Assigned Members Badges */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Membri Repartizați ({comm.members.length})
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50/80 dark:bg-slate-850 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 min-h-[50px]">
                      {comm.members.length === 0 ? (
                        <span className="text-xs text-slate-400 italic flex items-center gap-1.5 py-1">
                          Niciun membru repartizat în acest comitet. Selectează din lista din dreapta pentru a adăuga.
                        </span>
                      ) : (
                        comm.members.map(memberId => {
                          const member = members.find(m => m.id === memberId);
                          const isCoordinator = comm.coordinatorId === memberId;

                          return (
                            <span 
                              key={memberId}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isCoordinator 
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300' 
                                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 shadow-xs'
                              }`}
                            >
                              {(member?.avatar || member?.photo_url || member?.photoUrl) ? (
                                <img
                                  src={member.avatar || member.photo_url || member.photoUrl}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                                />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 uppercase">
                                  {member?.name ? member.name.charAt(0) : '?'}
                                </span>
                              )}
                              <span>{member?.name || 'Membru'}</span>
                              {isCoordinator && (
                                <span className="text-[9px] font-black bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase">Șef</span>
                              )}

                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleMember(comm.id, memberId)}
                                  className="ml-1 text-slate-400 hover:text-rose-600 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                                  title="Elimină din comitet"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Member Selection & Skills helper (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 sticky top-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Membri Club & Abilități
            </h3>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Caută voluntar..."
                value={memberSearchQuery}
                onChange={e => setMemberSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Skill Filter Chips */}
            {allSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedSkillFilter('Toate')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                    selectedSkillFilter === 'Toate'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Toate Skill-urile
                </button>
                {allSkills.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setSelectedSkillFilter(skill)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      selectedSkillFilter === skill
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            )}

            {/* Members Quick Allocation List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredMembers.map(m => {
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/80 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {(m.avatar || m.photo_url || m.photoUrl) ? (
                          <img
                            src={m.avatar || m.photo_url || m.photoUrl}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                            {m.name ? m.name.charAt(0) : '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {m.name}
                          </span>
                          {m.nickname && (
                            <span className="text-[10px] text-slate-400 font-medium block">
                              @{m.nickname}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member skills */}
                    {Array.isArray(m.skills) && m.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.skills.map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Committee Toggle Action Buttons */}
                    {isAdmin && committees.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap gap-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 self-center mr-1">Repartizează în:</span>
                        {committees.map(comm => {
                          const isInComm = comm.members.includes(m.id);
                          return (
                            <button
                              key={comm.id}
                              type="button"
                              onClick={() => handleToggleMember(comm.id, m.id)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                                isInComm
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-indigo-400'
                              }`}
                            >
                              {isInComm && <Check size={10} />}
                              <span>{comm.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  Nu a fost găsit niciun membru conform căutării.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
