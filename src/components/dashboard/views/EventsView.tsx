import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, MapPin, Plus, Edit2, Trash2, X, Lock
} from 'lucide-react';
import { EventData, fetchEvents, saveEvent, deleteEvent, saveAbsenceRequest, applyMemberScoreAdjustment } from '../../../utils/supabaseService';
import { toast } from '../../ui/Toast';

const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface EventsViewProps {
  isAdmin: boolean;
  members?: any[];
  currentUserId?: string;
  onUpdateMember?: (updatedMember: any) => void;
}

export function EventsView({ isAdmin, members = [], currentUserId, onUpdateMember }: EventsViewProps) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeViewTab, setActiveViewTab] = useState<'upcoming' | 'history'>('upcoming');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  // Absence Requests
  const [requestingAbsenceFor, setRequestingAbsenceFor] = useState<EventData | null>(null);
  const [absenceReason, setAbsenceReason] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hour, setHour] = useState('18');
  const [minute, setMinute] = useState('00');
  // Proiecte: fereastra de timp planificată (de la - până la), folosită ca durată implicită pe departament.
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endHour, setEndHour] = useState('20');
  const [endMinute, setEndMinute] = useState('00');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'meeting' | 'project' | 'social' | 'other'>('meeting');
  const [description, setDescription] = useState('');

  // Working Committees editing state
  const [formCommittees, setFormCommittees] = useState<{
    id: string;
    name: string;
    description: string;
    coordinatorId: string | null;
    members: string[];
    hours: number;
  }[]>([]);

  // State for member searching in each committee card
  const [memberSearchQueries, setMemberSearchQueries] = useState<Record<string, string>>({});

  /** Durata planificată a proiectului (de la - până la), în ore. Servește ca punct de plecare pe departament. */
  const computePlannedDurationHours = () => {
    const start = new Date(`${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`).getTime();
    const end = new Date(`${endDate}T${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
    return Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10;
  };

  const handleAddCommittee = () => {
    const newId = `com_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setFormCommittees(prev => [...prev, {
      id: newId,
      name: '',
      description: '',
      coordinatorId: null,
      members: [],
      hours: computePlannedDurationHours()
    }]);
  };

  const handleRemoveCommittee = (id: string) => {
    setFormCommittees(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCommitteeField = (id: string, field: string, value: any) => {
    setFormCommittees(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value };
        if (field === 'members') {
          if (c.coordinatorId && !value.includes(c.coordinatorId)) {
            updated.coordinatorId = null;
          }
        }
        return updated;
      }
      return c;
    }));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      toast.error('Eroare la încărcarea evenimentelor.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setHour('18');
    setMinute('00');
    setEndDate(new Date().toISOString().split('T')[0]);
    setEndHour('20');
    setEndMinute('00');
    setLocation('');
    setType('meeting');
    setDescription('');
    setFormCommittees([]);
    setMemberSearchQueries({});
    setIsModalOpen(true);
  };

  const openEditModal = (e: EventData) => {
    setEditingEvent(e);
    setTitle(e.title);
    setDate(e.date);
    const [h, m] = e.time.split(':');
    setHour(h || '18');
    setMinute(m || '00');
    setEndDate(e.endDate || e.date);
    const [eh, em] = (e.endTime || e.time).split(':');
    setEndHour(eh || '20');
    setEndMinute(em || '00');
    setLocation(e.location || '');
    setType(e.type);
    setDescription(e.description || '');
    if (e.committees) {
      const list = Object.entries(e.committees).map(([id, data]) => ({
        id,
        name: data.name,
        description: data.description,
        coordinatorId: data.coordinatorId || null,
        members: data.members || [],
        hours: data.hours ?? 1
      }));
      setFormCommittees(list);
    } else {
      setFormCommittees([]);
    }
    setMemberSearchQueries({});
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Ești sigur că vrei să ștergi acest eveniment?')) {
      try {
        await deleteEvent(id);
        toast.success('Evenimentul a fost șters cu succes!');
        loadEvents();
      } catch (err) {
        toast.error('Eroare la ștergerea evenimentului.');
      }
    }
  };

  const handleFinalize = async (event: EventData) => {
    if (event.type === 'meeting') {
      // Meetings: duration is time elapsed since the scheduled start, uniform for everyone present.
      const eventStart = new Date(`${event.date}T${event.time}`).getTime();
      const durationHours = Math.max(1.0, Math.round(((Date.now() - eventStart) / (1000 * 60 * 60)) * 10) / 10);

      if (!window.confirm(`Ești sigur că vrei să finalizezi prezența pentru "${event.title}"? Durata calculată: ${durationHours} ore. Această acțiune va adăuga orele și punctele membrilor și este permanentă.`)) {
        return;
      }

      try {
        const affectedMembers = members.filter(member => (event.rsvps?.[member.id] || 'none') === 'present');
        // 2 puncte per oră de voluntariat, uniform pe tot site-ul.
        const pointsToAdd = Math.round(durationHours * 2);

        for (const member of affectedMembers) {
          const newAdjustment = {
            id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            points: pointsToAdd,
            reason: `Prezență Ședință (${durationHours}h): ${event.title}`,
            date: new Date().toISOString(),
            adminName: 'Admin'
          };

          const updatedMember = {
            ...member,
            stats: {
              ...member.stats,
              hours: (member.stats?.hours || 0) + durationHours,
            },
            score: (member.score || 0) + pointsToAdd,
            scoreAdjustments: [...(member.scoreAdjustments || []), newAdjustment]
          };

          // Scriere atomică (increment + arrayUnion) — dacă doi admini finalizează
          // sau se suprapune cu o altă ajustare, punctele/orele se adună, nu se pierd.
          await applyMemberScoreAdjustment(member.id, pointsToAdd, newAdjustment, { hoursDelta: durationHours });
          if (onUpdateMember) onUpdateMember(updatedMember);
        }

        await saveEvent({ ...event, attendanceClosed: true });
        toast.success('Prezența a fost finalizată cu succes!');
        loadEvents();
      } catch (err) {
        console.error(err);
        toast.error('Eroare la finalizarea prezenței.');
      }
      return;
    }

    if (event.type === 'project') {
      // Projects: each department (committee) has its own hours — a member's
      // credit is the sum of the hours of every committee they belong to,
      // not one uniform duration for the whole project.
      const committees = event.committees ? Object.values(event.committees) : [];
      const fallbackHours = event.endDate && event.endTime
        ? Math.max(1, Math.round(
            ((new Date(`${event.endDate}T${event.endTime}`).getTime() - new Date(`${event.date}T${event.time}`).getTime()) / (1000 * 60 * 60)) * 10
          ) / 10)
        : 1;

      // A member can sit in more than one committee — collect one credit line
      // per committee membership so the audit trail names the department.
      const creditsByMember = new Map<string, { committeeName: string; hours: number }[]>();
      committees.forEach(com => {
        const hours = Number.isFinite(com.hours) && (com.hours as number) > 0 ? (com.hours as number) : fallbackHours;
        (com.members || []).forEach(id => {
          const list = creditsByMember.get(id) || [];
          list.push({ committeeName: com.name || 'Departament', hours });
          creditsByMember.set(id, list);
        });
      });

      if (creditsByMember.size === 0) {
        toast.error('Nu există niciun voluntar repartizat pe departamente pentru acest proiect.');
        return;
      }

      const summary = committees.map(com => `${com.name}: ${com.hours ?? fallbackHours}h`).join(' · ');
      if (!window.confirm(`Ești sigur că vrei să finalizezi activitatea pentru "${event.title}"?\nOre pe departament — ${summary}\nAceastă acțiune va adăuga orele și punctele membrilor și este permanentă.`)) {
        return;
      }

      try {
        const affectedMembers = members.filter(member => creditsByMember.has(member.id));

        for (const member of affectedMembers) {
          const credits = creditsByMember.get(member.id) || [];
          const totalHours = credits.reduce((sum, c) => sum + c.hours, 0);

          const newAdjustments = credits.map(credit => ({
            id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            // 2 puncte per oră de voluntariat, uniform pe tot site-ul.
            points: Math.round(credit.hours * 2),
            reason: `${credit.committeeName} (${credit.hours}h): ${event.title}`,
            date: new Date().toISOString(),
            adminName: 'Admin'
          }));
          const totalPoints = newAdjustments.reduce((sum, a) => sum + a.points, 0);

          const updatedMember = {
            ...member,
            stats: {
              ...member.stats,
              hours: (member.stats?.hours || 0) + totalHours,
              projects: (member.stats?.projects || 0) + 1
            },
            score: (member.score || 0) + totalPoints,
            scoreAdjustments: [...(member.scoreAdjustments || []), ...newAdjustments]
          };

          // Scriere atomică (increment + arrayUnion) pentru scor, ore și proiecte.
          await applyMemberScoreAdjustment(member.id, totalPoints, newAdjustments, { hoursDelta: totalHours, projectsDelta: 1 });
          if (onUpdateMember) {
            onUpdateMember(updatedMember);
          }
        }

        await saveEvent({ ...event, attendanceClosed: true });
        toast.success('Prezența și activitatea au fost finalizate cu succes!');
        loadEvents();
      } catch (err) {
        console.error(err);
        toast.error('Eroare la finalizarea prezenței/activității.');
      }
    }
  };

  const handleAbsenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingAbsenceFor || !currentUserId || !absenceReason.trim()) return;

    try {
      await saveAbsenceRequest({
        id: `abs_${Date.now()}`,
        eventId: requestingAbsenceFor.id,
        memberId: currentUserId,
        reason: absenceReason.trim(),
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      toast.success('Cererea de învoire a fost trimisă cu succes!');
      setRequestingAbsenceFor(null);
      setAbsenceReason('');
    } catch (err) {
      toast.error('Eroare la trimiterea cererii.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Titlul evenimentului este obligatoriu.');
      return;
    }

    if (!date) {
      toast.error('Data evenimentului este obligatorie.');
      return;
    }

    const [yr, mo, dy] = date.split('-').map(Number);
    const hr = parseInt(hour, 10);
    const min = parseInt(minute, 10);
    const selectedDateTime = new Date(yr, mo - 1, dy, hr, min).getTime();
    
    if (selectedDateTime < Date.now()) {
      toast.error('Nu poți programa un eveniment în trecut (înainte de data și ora curentă).');
      return;
    }

    const hasEmptyName = formCommittees.some(c => !c.name.trim());
    if (hasEmptyName) {
      toast.error('Numele fiecărui comitet este obligatoriu.');
      return;
    }

    if (type === 'project') {
      const startMs = selectedDateTime;
      const endMs = new Date(`${endDate}T${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`).getTime();
      if (!endDate || !Number.isFinite(endMs) || endMs <= startMs) {
        toast.error('Ora de final trebuie să fie după ora de început a proiectului.');
        return;
      }
      const hasInvalidHours = formCommittees.some(c => !Number.isFinite(c.hours) || c.hours <= 0);
      if (hasInvalidHours) {
        toast.error('Fiecare departament trebuie să aibă un număr de ore mai mare decât 0.');
        return;
      }
    }

    const committeesRecord: Record<string, {
      name: string;
      description: string;
      coordinatorId: string | null;
      members: string[];
      hours: number;
    }> = {};

    formCommittees.forEach(c => {
      committeesRecord[c.id] = {
        name: c.name.trim(),
        description: c.description.trim(),
        coordinatorId: c.coordinatorId || null,
        members: c.members,
        hours: Number.isFinite(c.hours) && c.hours > 0 ? c.hours : 1
      };
    });

    const newEvent: EventData = {
      id: editingEvent ? editingEvent.id : `evt_${Date.now()}`,
      title: title.trim(),
      date,
      time: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
      ...(type === 'project' ? {
        endDate,
        endTime: `${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`,
      } : {}),
      location: location.trim(),
      type,
      description: description.trim(),
      rsvps: editingEvent ? editingEvent.rsvps : {},
      committees: committeesRecord
    };

    try {
      await saveEvent(newEvent);
      toast.success(editingEvent ? 'Eveniment actualizat cu succes!' : 'Eveniment creat cu succes!');
      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      toast.error('Eroare la salvarea evenimentului.');
    }
  };

  // Calculate the current month and the next 2 months
  const nowObj = new Date();
  const monthsToShow: string[] = [];
  for (let i = 0; i < 3; i++) {
    const tempDate = new Date(nowObj.getFullYear(), nowObj.getMonth() + i, 1);
    const monthYear = new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(tempDate).toUpperCase();
    monthsToShow.push(monthYear);
  }

  // Pre-populate groupedEvents with the 3 months in order if upcoming
  const groupedEvents: Record<string, EventData[]> = {};
  if (activeViewTab === 'upcoming') {
    monthsToShow.forEach(m => {
      groupedEvents[m] = [];
    });
  }

  const filteredEventsForTab = activeViewTab === 'upcoming'
    ? events.filter(e => !e.attendanceClosed)
    : events.filter(e => e.attendanceClosed);

  filteredEventsForTab.forEach(ev => {
    const d = new Date(`${ev.date}T12:00:00`); // force noon to avoid tz issues
    const monthYear = new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(d).toUpperCase();
    
    if (activeViewTab === 'upcoming') {
      if (monthsToShow.includes(monthYear)) {
        groupedEvents[monthYear].push(ev);
      }
    } else {
      if (!groupedEvents[monthYear]) {
        groupedEvents[monthYear] = [];
      }
      groupedEvents[monthYear].push(ev);
    }
  });

  // Calculate Next Event
  const now = Date.now();
  const futureEvents = events.filter(e => !e.attendanceClosed && new Date(`${e.date}T${e.time}`).getTime() >= now);
  const nextEvent = futureEvents.length > 0 ? futureEvents[0] : null;

  let nextEventDaysRemaining = 0;
  if (nextEvent) {
    // timestamp-ul în milisecunde pentru miezul nopții din ziua evenimentului programat.
    const eventMidnight = new Date(`${nextEvent.date}T00:00:00`).getTime();
    const currentTimestamp = Date.now();
    const msInDay = 86400000;
    nextEventDaysRemaining = Math.max(0, Math.ceil((eventMidnight - currentTimestamp) / msInDay));
  }

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'meeting': return 'bg-amber-400';
      case 'project': return 'bg-sky-400';
      case 'social': return 'bg-rose-400';
      default: return 'bg-slate-600';
    }
  };
  
  const getTypeText = (t: string) => {
    switch (t) {
      case 'meeting': return 'Întâlnire';
      case 'project': return 'Proiect';
      case 'social': return 'Eveniment';
      default: return 'Altele';
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Action Bar & Next Action Widget */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Next Action Widget */}
        <div className="flex-1 bg-white border border-brand-muted/10 rounded-t-[3.5rem] rounded-b-xl p-6 shadow-xl relative overflow-hidden font-anthropic">
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-brand-primary/10 blur-[40px] rounded-full pointer-events-none" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2 relative z-10 font-anthropicSerif">
            <Clock size={16} /> Proxima Acțiune
          </h3>
          
          <div className="relative z-10">
            {nextEvent ? (
              <div className="flex items-center gap-6">
                <div className="text-center min-w-[80px]">
                  <div className="text-5xl font-black tracking-tighter text-brand-accent leading-none mb-1">
                    {nextEventDaysRemaining}
                  </div>
                  <div className="text-xs font-bold uppercase text-brand-primary">Zile</div>
                </div>
                <div className="w-px h-16 bg-brand-accent/10" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${getTypeColor(nextEvent.type)}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {getTypeText(nextEvent.type)}
                    </span>
                  </div>
                  <h4 className="text-xl font-anthropicSerif font-semibold text-slate-800 mb-1">{nextEvent.title}</h4>
                  <div className="text-sm font-semibold text-brand-accent/70 flex items-center gap-2">
                    {new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(nextEvent.date))} la {nextEvent.time}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-brand-accent/40 font-semibold py-4">Nu există evenimente viitoare programate.</div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {isAdmin && (
          <div className="flex items-end shrink-0">
            <button 
              onClick={openAddModal}
              className="ios26-btn px-6 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-3 w-full md:w-auto justify-center"
            >
              <Plus size={20} /> Eveniment Nou
            </button>
          </div>
        )}
      </div>
      {/* View Tabs */}
      <div className="flex gap-4 border-b border-brand-muted/5 pb-1">
        <button 
          onClick={() => setActiveViewTab('upcoming')}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeViewTab === 'upcoming' ? 'bg-brand-primary/20 text-brand-accent shadow-sm' : 'text-brand-accent/65 hover:bg-black/5'}`}
        >
          Evenimente Planificate
        </button>
        <button 
          onClick={() => setActiveViewTab('history')}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeViewTab === 'history' ? 'bg-brand-primary/20 text-brand-accent shadow-sm' : 'text-brand-accent/65 hover:bg-black/5'}`}
        >
          Istoric / Arhivă
        </button>
      </div>
      {/* Events List Grouped by Month */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-brand-muted/5 shadow-sm text-brand-accent/40 font-semibold">
          Niciun eveniment înregistrat.
        </div>
      ) : (
        <div className="space-y-10 relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-8 bottom-0 w-px bg-brand-accent/10 hidden md:block z-0" />
          
          {Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
            <div key={monthYear} className="relative z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-brand-accent/50 mb-6 bg-transparent inline-block md:ml-12">
                {monthYear}
              </h3>
              
              <div className="space-y-4 md:ml-12">
                {monthEvents.length === 0 ? (
                  <div className="bg-white rounded-none border-2 border-dashed border-slate-350 p-6 text-brand-accent/40 text-center font-semibold text-xs">
                    Nu sunt evenimente planificate în această lună.
                  </div>
                ) : (
                  monthEvents.map((event, eventIdx) => {
                    const cardStyle = eventIdx % 2 === 0
                      ? "bg-white border-2 border-slate-900 rounded-none shadow-[6px_6px_0px_#0F172A] hover:shadow-[10px_10px_0px_#0F172A]"
                      : "bg-[#FAF9F5]/80 border border-brand-muted/10 rounded-[2.5rem_0.5rem_2.5rem_0.5rem] shadow-lg hover:scale-[1.01]";
                    
                    return (
                      <div 
                        key={event.id}
                        className={`p-5 md:p-6 transition-all duration-300 group flex flex-col md:flex-row gap-6 relative font-anthropic ${cardStyle}`}
                      >
                    {/* Timeline dot */}
                    <div className="absolute -left-[54px] top-8 w-4 h-4 rounded-full border-4 border-white shadow-sm hidden md:block" style={{ backgroundColor: 'var(--color, #28FAFC)' }} />

                    {/* Date/Time Left Column */}
                    <div className="md:w-32 shrink-0">
                      <div className="text-brand-accent/60 text-xs font-bold uppercase mb-1">
                        {new Intl.DateTimeFormat('ro-RO', { weekday: 'short' }).format(new Date(event.date))}
                      </div>
                      <div className="text-3xl font-black text-brand-accent leading-none mb-2">
                        {new Date(event.date).getDate()}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-brand-primary">
                        <Clock size={14} /> {event.time}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${getTypeColor(event.type)}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent/60">
                              {getTypeText(event.type)}
                            </span>
                          </div>
                          <h4 className="text-lg font-anthropicSerif font-semibold text-slate-800 mb-2">{event.title}</h4>
                          
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-brand-accent/60 text-sm font-medium mb-3">
                              <MapPin size={14} /> {event.location}
                            </div>
                          )}

                          {event.type === 'project' && event.endDate && event.endTime && (
                            <div className="flex items-center gap-1.5 text-brand-accent/60 text-sm font-medium mb-3">
                              <Clock size={14} /> Până la {new Date(event.endDate).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}, {event.endTime}
                            </div>
                          )}

                          {event.description && (
                            <p className="text-sm text-brand-accent/70 leading-relaxed font-['Manrope'] mb-4 whitespace-pre-line">
                              {event.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {/* Dummy RSVPs visual for now */}
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300" />
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-400" />
                            </div>
                            <span className="text-xs font-semibold text-brand-accent/40 ml-2">
                              {Object.keys(event.rsvps || {}).length} participanți (în curând)
                            </span>
                          </div>

                          {/* Working Committees section */}
                          {event.committees && Object.keys(event.committees).length > 0 && (
                            <div className="mt-5 border-t border-brand-muted/5 pt-4 space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-brand-accent/60">Comitete de Lucru</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(event.committees).map(([comId, com]) => {
                                  const isMyCommittee = currentUserId && com.members?.includes(currentUserId);
                                  return (
                                    <div 
                                      key={comId}
                                      className={`p-4 rounded-xl border transition-all ${
                                        isMyCommittee 
                                          ? 'border-brand-primary bg-brand-primary/5 shadow-sm relative' 
                                          : 'border-brand-muted/5 bg-[#FAF9F5]'
                                      }`}
                                    >
                                      {isMyCommittee && (
                                        <span className="absolute top-3 right-3 bg-brand-primary text-brand-accent font-bold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                          Comitetul Tău
                                        </span>
                                      )}
                                      
                                      <div className="flex items-center gap-2 mb-1 pr-16">
                                        <h6 className="font-bold text-sm text-brand-accent">{com.name}</h6>
                                        {Number.isFinite(com.hours) && (com.hours as number) > 0 && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-accent/5 text-brand-accent/60 shrink-0">
                                            {com.hours}h
                                          </span>
                                        )}
                                      </div>
                                      {com.description && (
                                        <p className="text-xs text-brand-accent/60 leading-relaxed mb-3">{com.description}</p>
                                      )}
                                      
                                      {/* Members inside committee card */}
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-brand-accent/40 block">Membri:</span>
                                        <div className="flex flex-wrap gap-2">
                                          {com.members && com.members.length > 0 ? (
                                            com.members.map(memberId => {
                                              const mObj = members?.find(m => m.id === memberId);
                                              const isCoordinator = com.coordinatorId === memberId;
                                              return (
                                                <div 
                                                  key={memberId} 
                                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold bg-white border border-brand-muted/5 shadow-sm`}
                                                >
                                                  <img 
                                                    src={mObj?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mObj?.name || 'User')}`} 
                                                    alt={mObj?.name || 'Membru'} 
                                                    className="w-4 h-4 rounded-full" 
                                                  />
                                                  <span className="text-brand-accent/80">{mObj?.name || 'Membru'}</span>
                                                  {isCoordinator && (
                                                    <span className="bg-brand-primary text-brand-accent font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-full">
                                                      Responsabil
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <span className="text-xs text-brand-accent/40 italic">Fără membri</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Admin Controls */}
                        {isAdmin && (
                          <div className="flex items-center gap-2 shrink-0 self-start">
                            {event.attendanceClosed ? (
                              <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                <Lock size={12} /> Finalizat
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleFinalize(event)}
                                className="px-4 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors border border-rose-200/50 flex items-center gap-1 shadow-sm"
                                title="Finalizează prezența definitiv"
                              >
                                <Lock size={12} /> Finalizează
                              </button>
                            )}
                            <button 
                              onClick={() => openEditModal(event)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-accent/5 text-brand-accent/60 hover:bg-brand-primary hover:text-brand-accent transition-all duration-300"
                              title="Editează"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(event.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-accent/5 text-brand-accent/60 hover:bg-red-500 hover:text-white transition-all duration-300"
                              title="Șterge"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                        {/* Member Controls */}
                        {!isAdmin && event.type === 'meeting' && !event.attendanceClosed && currentUserId && new Date(`${event.date}T${event.time}`).getTime() > Date.now() && (
                          <div className="flex gap-2 shrink-0 self-start">
                            <button
                              onClick={() => setRequestingAbsenceFor(event)}
                              className="px-4 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold text-xs border border-orange-200/50 shadow-sm transition-colors"
                            >
                              Cere Învoire
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-accent/60 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 overflow-y-auto overflow-x-hidden max-h-[92vh] scrollbar-thin"
            >
              <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/30 blur-[60px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-center mb-6 relative z-10 border-b border-brand-muted/5 pb-4">
                <h2 className="text-2xl font-bold text-brand-accent">
                  {editingEvent ? 'Editează Eveniment' : 'Eveniment Nou'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#FAF9F5] rounded-full transition-colors active:scale-90">
                  <X size={20} />
                </button>
              </div>
              
              <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Titlu Eveniment (Obligatoriu)</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                    placeholder="Ex: Întâlnire Proiect Camena" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Data (Obligatorie)</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Ora (Format 24h)</label>
                    <div className="flex gap-2">
                      <select 
                        value={hour}
                        onChange={e => setHour(e.target.value)}
                        className="flex-1 px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope'] appearance-none"
                      >
                        {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="flex items-center font-bold text-brand-accent/40">:</span>
                      <select 
                        value={minute}
                        onChange={e => setMinute(e.target.value)}
                        className="flex-1 px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope'] appearance-none"
                      >
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Project planned window (De la - Până la) */}
                {type === 'project' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-sky-50/50 border border-sky-100 rounded-xl">
                    <div className="md:col-span-2 -mt-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                        Durata Proiectului · folosită pentru orele de voluntariat
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Până la data</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        required={type === 'project'}
                        className="w-full px-4 py-3 bg-white border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Până la ora</label>
                      <div className="flex gap-2">
                        <select
                          value={endHour}
                          onChange={e => setEndHour(e.target.value)}
                          className="flex-1 px-4 py-3 bg-white border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope'] appearance-none"
                        >
                          {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="flex items-center font-bold text-brand-accent/40">:</span>
                        <select
                          value={endMinute}
                          onChange={e => setEndMinute(e.target.value)}
                          className="flex-1 px-4 py-3 bg-white border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope'] appearance-none"
                        >
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="md:col-span-2 text-[11px] font-semibold text-sky-700/80">
                      Durată totală planificată: {computePlannedDurationHours()} ore. Fiecare departament poate avea propriul număr de ore mai jos.
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Locație (Opțională)</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope']" 
                    placeholder="Ex: Sediul Central sau Online - Zoom" 
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Tip Eveniment</label>
                  <select 
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope'] appearance-none"
                  >
                    <option value="meeting">Întâlnire</option>
                    <option value="project">Proiect / Acțiune</option>
                    <option value="social">Eveniment</option>
                    <option value="other">Altele</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Descriere (Opțională)</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary transition-colors font-['Manrope'] resize-none" 
                    placeholder="Detalii suplimentare, agenda discuției..." 
                  />
                </div>

                {/* Working Committees Section */}
                {type === 'project' && (
                  <div className="border-t border-brand-muted/5 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent/70">Comitete de Lucru</h3>
                      <button
                        type="button"
                        onClick={handleAddCommittee}
                        className="text-xs font-bold uppercase tracking-wider text-brand-primary hover:text-brand-primary/80 border border-brand-primary/30 hover:border-brand-primary/50 px-4 py-1.5 rounded-full bg-brand-primary/5 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Plus size={14} /> Adaugă Comitet
                      </button>
                    </div>

                    {formCommittees.length === 0 ? (
                      <p className="text-xs text-brand-accent/40 italic py-2.5 text-center bg-[#FAF9F5] rounded-xl border border-dashed border-brand-muted/10">
                        Nu a fost adăugat niciun comitet. Apasă butonul de mai sus pentru a crea unul.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {formCommittees.map((c) => (
                          <div key={c.id} className="relative p-5 bg-[#FAF9F5] border border-brand-muted/10 rounded-2xl space-y-3 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleRemoveCommittee(c.id)}
                              className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-full transition-colors"
                              title="Elimină Comitet"
                            >
                              <Trash2 size={16} />
                            </button>

                            <div className="pr-8 space-y-3">
                              {/* Committee Name */}
                              <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1">Nume Comitet (Obligatoriu)</label>
                                <input
                                  type="text"
                                  value={c.name}
                                  onChange={e => handleUpdateCommitteeField(c.id, 'name', e.target.value)}
                                  required
                                  placeholder="Ex: Logistică, Decor, Sponsori..."
                                  className="w-full px-3 py-2 bg-white border border-brand-muted/10 rounded-lg text-xs focus:outline-none focus:border-brand-primary transition-colors"
                                />
                              </div>

                              {/* Committee Description */}
                              <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1">Descriere Comitet (Opțională)</label>
                                <textarea
                                  value={c.description}
                                  onChange={e => handleUpdateCommitteeField(c.id, 'description', e.target.value)}
                                  rows={2}
                                  placeholder="Sarcini specifice, agenda..."
                                  className="w-full px-3 py-2 bg-white border border-brand-muted/10 rounded-lg text-xs focus:outline-none focus:border-brand-primary transition-colors resize-none"
                                />
                              </div>

                              {/* Committee Hours — independent per department, not the overall project duration */}
                              <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1">
                                  Ore Voluntariat (acest departament)
                                </label>
                                <input
                                  type="number"
                                  min="0.5"
                                  step="0.5"
                                  value={c.hours}
                                  onChange={e => handleUpdateCommitteeField(c.id, 'hours', parseFloat(e.target.value) || 0)}
                                  required
                                  placeholder="Ex: 4"
                                  className="w-full px-3 py-2 bg-white border border-brand-muted/10 rounded-lg text-xs focus:outline-none focus:border-brand-primary transition-colors"
                                />
                                <p className="text-[9px] text-brand-accent/40 mt-1">
                                  Fiecare membru din acest comitet primește exact aceste ore la finalizare — diferit de la un departament la altul.
                                </p>
                              </div>

                              {/* Committee Members Multi-Select Dropdown */}
                              <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1">Membri Comitet</label>
                                <div className="border border-brand-muted/10 rounded-xl p-3 bg-white space-y-3">
                                  {/* Selected members badges */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {c.members.length === 0 ? (
                                      <span className="text-[11px] text-brand-accent/40 italic">Niciun membru selectat</span>
                                    ) : (
                                      c.members.map(memberId => {
                                        const mObj = members?.find(m => m.id === memberId);
                                        return (
                                          <span key={memberId} className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-accent border border-brand-primary/30 text-xs font-semibold px-2.5 py-1 rounded-full">
                                            {mObj?.name || memberId}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedMembers = c.members.filter(id => id !== memberId);
                                                handleUpdateCommitteeField(c.id, 'members', updatedMembers);
                                              }}
                                              className="hover:text-red-500 font-bold ml-1 text-[10px] w-3.5 h-3.5 flex items-center justify-center rounded-full bg-brand-accent/5"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Search input */}
                                  <div className="pt-1">
                                    <input
                                      type="text"
                                      placeholder="Caută membru..."
                                      value={memberSearchQueries[c.id] || ''}
                                      onChange={e => setMemberSearchQueries(prev => ({ ...prev, [c.id]: e.target.value }))}
                                      className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-brand-muted/10 rounded-lg text-xs focus:outline-none focus:border-brand-primary font-['Manrope']"
                                    />
                                  </div>

                                  {/* Scrollable checklist of members */}
                                  <div className="h-32 overflow-y-auto border-t border-brand-muted/5 pt-2 space-y-1 scrollbar-thin">
                                    {members
                                      ?.filter(m => {
                                        const q = (memberSearchQueries[c.id] || '').toLowerCase();
                                        return m.name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q);
                                      })
                                      .map(m => {
                                        const isSelected = c.members.includes(m.id);
                                        return (
                                          <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                              const updatedMembers = isSelected
                                                ? c.members.filter(id => id !== m.id)
                                                : [...c.members, m.id];
                                              handleUpdateCommitteeField(c.id, 'members', updatedMembers);
                                            }}
                                            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-all ${
                                              isSelected
                                                ? 'bg-brand-primary/10 border border-brand-primary/40 text-brand-accent'
                                                : 'hover:bg-brand-accent/5 border border-transparent text-brand-accent/70'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <img
                                                src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                                                alt={m.name}
                                                className="w-5 h-5 rounded-full"
                                              />
                                              <span>{m.name}</span>
                                            </div>
                                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>

                              {/* Coordinator Selector (Single Select populated STRICTLY with selected members) */}
                              <div>
                                <label className="block text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1">Coordonator (Șef Comitet) - Opțional</label>
                                <div className="relative">
                                  <select
                                    value={c.coordinatorId || ''}
                                    onChange={e => handleUpdateCommitteeField(c.id, 'coordinatorId', e.target.value || null)}
                                    className="w-full px-3 py-2 bg-white border border-brand-muted/10 rounded-lg text-xs focus:outline-none focus:border-brand-primary transition-colors font-['Manrope'] appearance-none"
                                  >
                                    <option value="">Niciunul / Fără Coordonator</option>
                                    {c.members.map(memberId => {
                                      const mObj = members?.find(m => m.id === memberId);
                                      return (
                                        <option key={memberId} value={memberId}>
                                          {mObj?.name || memberId}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-accent/40 text-[10px]">▼</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6">
                  <button type="submit" className="w-full ios26-btn py-4 font-bold uppercase tracking-wider text-sm">
                    {editingEvent ? 'Salvează Modificările' : 'Creează Eveniment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Absence Member Modal */}
      <AnimatePresence>
        {requestingAbsenceFor && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-accent/60 backdrop-blur-md"
              onClick={() => setRequestingAbsenceFor(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-brand-accent">Cere Învoire</h3>
                <button onClick={() => setRequestingAbsenceFor(null)} className="p-1 hover:bg-[#FAF9F5] rounded-full">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-brand-accent/60 font-semibold mb-6">
                Te rugăm să motivezi absența pentru <span className="font-bold text-brand-accent">{requestingAbsenceFor.title}</span>. Cererea va fi analizată de administratori.
              </p>
              
              <form onSubmit={handleAbsenceSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Motiv Învoire</label>
                  <textarea 
                    required
                    rows={4}
                    value={absenceReason}
                    onChange={e => setAbsenceReason(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-brand-muted/10 rounded-xl text-sm focus:outline-none focus:border-brand-primary resize-none"
                    placeholder="Scrie aici motivul absenței..."
                  />
                </div>
                <button type="submit" className="w-full btn-stitch-theme py-3 text-xs font-bold uppercase tracking-wider">
                  Trimite Cererea
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
