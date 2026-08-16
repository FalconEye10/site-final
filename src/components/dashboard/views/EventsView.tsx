import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, MapPin, Plus, Edit2, Trash2, X, Lock
} from 'lucide-react';
import { EventData, fetchEvents, saveEvent, deleteEvent, saveAbsenceRequest, applyMemberScoreAdjustment } from '../../../utils/supabaseService';
import { 
  getRomaniaTodayString, 
  getRomaniaTimeNow, 
  formatRomaniaDate, 
  formatRomaniaMonthYear, 
  getRomaniaDateTimeMs, 
  getRomaniaDateParts 
} from '../../../utils/romaniaTime';
import { toast } from '../../ui/Toast';
import { triggerEventPushNotification, triggerAdminAbsenceRequestNotification } from '../../../utils/pushNotifications';

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

  // Form states with strict Romania Time defaults
  const initialRomTime = getRomaniaTimeNow();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => getRomaniaTodayString());
  const [hour, setHour] = useState(() => initialRomTime.nextHour);
  const [minute, setMinute] = useState('00');
  // Proiecte: fereastra de timp planificată (de la - până la)
  const [endDate, setEndDate] = useState(() => getRomaniaTodayString());
  const [endHour, setEndHour] = useState(() => initialRomTime.nextEndHour);
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

  /** Durata planificată a proiectului (de la - până la), în ore. Respectă fusul orar al României. */
  const computePlannedDurationHours = () => {
    const start = getRomaniaDateTimeMs(date, `${hour}:${minute}`);
    const end = getRomaniaDateTimeMs(endDate, `${endHour}:${endMinute}`);
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

  // Shifts editing state
  const [isShiftBased, setIsShiftBased] = useState(false);
  const [formShifts, setFormShifts] = useState<{
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    hours: number;
    maxVolunteers: number;
    assignedMembers: string[];
  }[]>([]);

  // State for member searching in each shift card
  const [shiftSearchQueries, setShiftSearchQueries] = useState<Record<string, string>>({});

  const handleAddShift = () => {
    const newId = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const shiftCount = formShifts.length + 1;
    setFormShifts(prev => [...prev, {
      id: newId,
      name: `Tura ${shiftCount}`,
      date: date || new Date().toISOString().split('T')[0],
      startTime: `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
      endTime: `${endHour.padStart(2, '0')}:${endMinute.padStart(2, '0')}`,
      hours: computePlannedDurationHours(),
      maxVolunteers: 6,
      assignedMembers: []
    }]);
  };

  const handleRemoveShift = (shiftId: string) => {
    setFormShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  const handleUpdateShiftField = (shiftId: string, field: string, value: any) => {
    setFormShifts(prev => prev.map(s => {
      if (s.id === shiftId) {
        const updated = { ...s, [field]: value };
        if (field === 'startTime' || field === 'endTime') {
          const st = field === 'startTime' ? value : s.startTime;
          const et = field === 'endTime' ? value : s.endTime;
          const [sh, sm] = (st || '10:00').split(':').map(Number);
          const [eh, em] = (et || '14:00').split(':').map(Number);
          const duration = Math.max(0.5, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
          updated.hours = Math.round(duration * 10) / 10;
        }
        return updated;
      }
      return s;
    }));
  };

  const handleToggleShiftMember = (shiftId: string, memberId: string) => {
    setFormShifts(prev => prev.map(s => {
      if (s.id === shiftId) {
        const exists = s.assignedMembers.includes(memberId);
        const assignedMembers = exists
          ? s.assignedMembers.filter(id => id !== memberId)
          : [...s.assignedMembers, memberId];
        return { ...s, assignedMembers };
      }
      return s;
    }));
  };

  const handleVolunteerShiftSignUp = async (event: EventData, shiftId: string) => {
    if (!currentUserId) {
      toast.error('Trebuie să fii conectat pentru a te înscrie pe tură.');
      return;
    }
    const shifts = event.shifts || [];
    const targetShift = shifts.find(s => s.id === shiftId);
    if (!targetShift) return;

    const isAlreadyAssigned = targetShift.assignedMembers.includes(currentUserId);

    if (!isAlreadyAssigned && targetShift.assignedMembers.length >= targetShift.maxVolunteers) {
      toast.error('Această tură a atins capacitatea maximă de voluntari.');
      return;
    }

    const updatedShifts = shifts.map(s => {
      if (s.id === shiftId) {
        return {
          ...s,
          assignedMembers: isAlreadyAssigned
            ? s.assignedMembers.filter(id => id !== currentUserId)
            : [...s.assignedMembers, currentUserId]
        };
      }
      return s;
    });

    const updatedEvent: EventData = {
      ...event,
      shifts: updatedShifts
    };

    try {
      await saveEvent(updatedEvent);
      setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e));
      toast.success(isAlreadyAssigned ? 'Te-ai retras de pe această tură.' : 'Te-ai înscris cu succes pe această tură!');
    } catch (err) {
      console.error(err);
      toast.error('Eroare la actualizarea turei.');
    }
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
    const today = new Date();
    const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const nextHour = (today.getHours() + 1) % 24;
    const nextEndHour = (nextHour + 2) % 24;
    const defaultHourStr = String(nextHour).padStart(2, '0');
    const defaultEndHourStr = String(nextEndHour).padStart(2, '0');

    setEditingEvent(null);
    setTitle('');
    setDate(localDateStr);
    setHour(defaultHourStr);
    setMinute('00');
    setEndDate(localDateStr);
    setEndHour(defaultEndHourStr);
    setEndMinute('00');
    setLocation('');
    setType('meeting');
    setDescription('');
    setIsShiftBased(false);
    setFormShifts([]);
    setFormCommittees([]);
    setMemberSearchQueries({});
    setShiftSearchQueries({});
    setIsModalOpen(true);
  };

  const openEditModal = (e: EventData) => {
    setEditingEvent(e);
    setTitle(e.title);
    setDate(e.date);
    const [h, m] = (e.time || '18:00').split(':');
    setHour(h || '18');
    setMinute(m || '00');
    setEndDate(e.endDate || e.date);
    const [eh, em] = (e.endTime || e.time || '20:00').split(':');
    setEndHour(eh || '20');
    setEndMinute(em || '00');
    setLocation(e.location || '');
    setType(e.type);
    setDescription(e.description || '');
    setIsShiftBased(e.isShiftBased || false);
    setFormShifts(e.shifts || []);
    if (e.committees) {
      const list = Object.entries(e.committees)
        .filter(([id]) => id !== '__shiftsMeta')
        .map(([id, data]) => ({
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
    setShiftSearchQueries({});
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
        const affectedMembers = members.filter(member => member.role !== 'admin' && (event.rsvps?.[member.id] || 'none') === 'present');
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
        const affectedMembers = members.filter(member => member.role !== 'admin' && creditsByMember.has(member.id));

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
      const memberObj = members.find(m => m.id === currentUserId);
      const memberName = memberObj?.name || 'Un voluntar';
      triggerAdminAbsenceRequestNotification(memberName, absenceReason.trim());
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

    if (isShiftBased) {
      if (formShifts.length === 0) {
        toast.error('Adaugă cel puțin o tură pentru evenimentul pe ture.');
        return;
      }
      const hasEmptyShiftName = formShifts.some(s => !s.name.trim());
      if (hasEmptyShiftName) {
        toast.error('Numele fiecărei ture este obligatoriu.');
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
      isShiftBased,
      shifts: isShiftBased ? formShifts : [],
      committees: committeesRecord
    };

    try {
      await saveEvent(newEvent);
      if (!editingEvent) {
        triggerEventPushNotification(newEvent);
      }
      toast.success(editingEvent ? 'Eveniment actualizat cu succes!' : 'Eveniment creat cu succes!');
      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      toast.error('Eroare la salvarea evenimentului.');
    }
  };

  // Calculate the current month and the next 2 months in Romania Time
  const romNowParts = getRomaniaDateParts();
  const monthsToShow: string[] = [];
  for (let i = 0; i < 3; i++) {
    const tempDate = new Date(Date.UTC(romNowParts.year, romNowParts.month - 1 + i, 1, 12, 0, 0));
    const monthYear = formatRomaniaMonthYear(tempDate);
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

  const sortedEventsForTab = [...filteredEventsForTab].sort((a, b) => {
    const tA = getRomaniaDateTimeMs(a.date, a.time);
    const tB = getRomaniaDateTimeMs(b.date, b.time);
    return activeViewTab === 'upcoming' ? tA - tB : tB - tA;
  });

  sortedEventsForTab.forEach(ev => {
    const monthYear = formatRomaniaMonthYear(ev.date);
    if (!groupedEvents[monthYear]) {
      groupedEvents[monthYear] = [];
    }
    groupedEvents[monthYear].push(ev);
  });

  // Calculate Next Event based on Romania Time
  const nowMs = Date.now();
  const futureEvents = events.filter(e => !e.attendanceClosed && getRomaniaDateTimeMs(e.date, e.time) >= nowMs);
  const nextEvent = futureEvents.length > 0 ? futureEvents[0] : null;

  let nextEventDaysRemaining = 0;
  if (nextEvent) {
    const eventMidnightMs = getRomaniaDateTimeMs(nextEvent.date, '00:00');
    const todayMidnightMs = getRomaniaDateTimeMs(getRomaniaTodayString(), '00:00');
    const msInDay = 86400000;
    nextEventDaysRemaining = Math.max(0, Math.round((eventMidnightMs - todayMidnightMs) / msInDay));
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
    <div className="space-y-6 relative font-anthropic">
      {/* Action Bar & Next Action Widget */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch font-anthropic">
        
        {/* Next Action Widget */}
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[2px] p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col justify-between font-anthropic">
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800 font-title">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600 dark:text-indigo-400" /> Proxima Acțiune
            </h3>
            {nextEvent && (
              <span className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider ${getTypeColor(nextEvent.type)} text-slate-900 font-title`}>
                {getTypeText(nextEvent.type)}
              </span>
            )}
          </div>
          
          <div>
            {nextEvent ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="text-center sm:text-left bg-slate-50 dark:bg-slate-800/80 p-4 rounded-[2px] border border-slate-200/70 dark:border-slate-700/60 min-w-[110px] shrink-0">
                  <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1 font-data">
                    {nextEventDaysRemaining}
                  </div>
                  <div className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 font-title">Zile Rămase</div>
                </div>
                
                <div className="space-y-1.5 flex-1 font-anthropic">
                  <h4 className="text-lg sm:text-xl font-bold font-title text-slate-900 dark:text-white leading-snug">{nextEvent.title}</h4>
                  <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-3.5 gap-y-1">
                    <span>📅 {formatRomaniaDate(nextEvent.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <span>⏰ {nextEvent.time}</span>
                    {nextEvent.location && <span>📍 {nextEvent.location}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 font-medium py-3 text-center text-sm">Nu există evenimente viitoare programate.</div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {isAdmin && (
          <div className="flex items-center shrink-0">
            <button 
              onClick={openAddModal}
              className="btn-civic-primary px-5 py-3.5 text-xs sm:text-sm font-bold font-title uppercase tracking-wider flex items-center gap-2 w-full lg:w-auto justify-center shadow-xs cursor-pointer"
            >
              <Plus size={16} /> Creează Eveniment Nou
            </button>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 font-title">
        <button 
          type="button"
          onClick={() => setActiveViewTab('upcoming')}
          className={`px-4 py-2.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
            activeViewTab === 'upcoming' 
              ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 border border-slate-900 dark:border-sky-500' 
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Evenimente Planificate
        </button>
        <button 
          type="button"
          onClick={() => setActiveViewTab('history')}
          className={`px-4 py-2.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
            activeViewTab === 'history' 
              ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 border border-slate-900 dark:border-sky-500' 
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Istoric / Arhivă
        </button>
      </div>

      {/* Events List Grouped by Month */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-[2px] animate-spin"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 shadow-xs text-slate-400 font-medium text-sm font-anthropic">
          Niciun eveniment înregistrat în această secțiune.
        </div>
      ) : (
        <div className="space-y-8 font-anthropic">
          {Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
            <div key={monthYear} className="space-y-4">
              <div className="flex items-center gap-3 font-title">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-[2px] border border-slate-200/80 dark:border-slate-700">
                  📅 {monthYear}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:border-slate-800" />
              </div>
              
              <div className="space-y-4">
                {monthEvents.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[2px] border border-dashed border-slate-200 dark:border-slate-800 p-5 text-slate-400 text-center font-medium text-sm font-anthropic">
                    Nu sunt evenimente planificate în această lună.
                  </div>
                ) : (
                  monthEvents.map((event) => {
                    return (
                      <div 
                        key={event.id}
                        className="bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4 font-anthropic"
                      >
                        {/* Event Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-start gap-3.5">
                            {/* Date Badge Box */}
                            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-3 rounded-[2px] text-center min-w-[85px] shrink-0 font-title">
                              <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-0.5">
                                {formatRomaniaDate(event.date, { weekday: 'short' })}
                              </div>
                              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none font-data">
                                {getRomaniaDateParts(event.date).day}
                              </div>
                              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-data">
                                {event.time}
                              </div>
                            </div>

                            {/* Title & Metadata */}
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2 font-title">
                                <span className={`px-2.5 py-0.5 rounded-[2px] text-xs font-bold uppercase tracking-wider ${getTypeColor(event.type)} text-slate-900`}>
                                  {getTypeText(event.type)}
                                </span>
                                {event.isShiftBased && (
                                  <span className="px-2.5 py-0.5 rounded-[2px] text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 font-data">
                                    Pe Ture ({event.shifts?.length || 0})
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base sm:text-lg font-bold font-title text-slate-900 dark:text-white">{event.title}</h4>
                              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 font-anthropic">
                                {event.location && <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {event.location}</span>}
                                {event.type === 'project' && event.endDate && event.endTime && (
                                  <span className="flex items-center gap-1 font-data">
                                    <Clock size={14} className="text-slate-400" /> Până la {formatRomaniaDate(event.endDate, { day: '2-digit', month: 'short' })}, {event.endTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-title">
                            {isAdmin && (
                              <>
                                {event.attendanceClosed ? (
                                  <span className="px-3 py-1.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                                    <Lock size={14} /> Sesiune Închisă
                                  </span>
                                ) : (
                                  <button 
                                    onClick={() => handleFinalize(event)}
                                    className="px-3.5 py-1.5 rounded-[2px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors border border-rose-200 flex items-center gap-1.5 shadow-xs cursor-pointer uppercase tracking-wider"
                                    title="Finalizează prezența"
                                  >
                                    <Lock size={14} /> Finalizează
                                  </button>
                                )}
                                <button 
                                  onClick={() => openEditModal(event)}
                                  className="p-2 rounded-[2px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                                  title="Editează"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(event.id)}
                                  className="p-2 rounded-[2px] bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 transition-all cursor-pointer"
                                  title="Șterge"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}

                            {!isAdmin && event.type === 'meeting' && !event.attendanceClosed && currentUserId && new Date(`${event.date}T${event.time}`).getTime() > Date.now() && (
                              <button
                                onClick={() => setRequestingAbsenceFor(event)}
                                className="px-3.5 py-1.5 rounded-[2px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 shadow-xs transition-colors cursor-pointer uppercase tracking-wider"
                              >
                                Cere Învoire
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Event Description if any */}
                        {event.description && (
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-anthropic whitespace-pre-line bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-[2px] border border-slate-100 dark:border-slate-800">
                            {event.description}
                          </p>
                        )}

                        {/* Shifts Section for Multi-Shift Projects/Events */}
                        {event.isShiftBased && event.shifts && event.shifts.length > 0 && (
                          <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-[2px] p-4 sm:p-5 space-y-3.5 font-anthropic">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-purple-200/50 dark:border-purple-800/40 font-title">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-[2px] bg-purple-600" />
                                <h5 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">
                                  Ture de Voluntariat ({event.shifts.length} Ture Configurate)
                                </h5>
                              </div>
                              <span className="text-xs font-medium text-purple-800 dark:text-purple-300">
                                Înscrie-te la tura în care ești disponibil
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-anthropic">
                              {event.shifts.map((shift) => {
                                const isAssigned = currentUserId && shift.assignedMembers?.includes(currentUserId);
                                const enrolledCount = shift.assignedMembers?.length || 0;
                                const maxCount = shift.maxVolunteers || 6;
                                const isFull = enrolledCount >= maxCount;
                                const capacityPercent = Math.min(100, Math.round((enrolledCount / maxCount) * 100));

                                return (
                                  <div
                                    key={shift.id}
                                    className={`p-4 rounded-[2px] border transition-all space-y-3 ${
                                      isAssigned
                                        ? 'bg-white dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-900 border-purple-200/70 dark:border-purple-900/40 hover:border-purple-300 shadow-xs'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3 font-anthropic">
                                      <div>
                                        <div className="flex items-center gap-2 font-title">
                                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{shift.name}</span>
                                          {isAssigned && (
                                            <span className="px-2 py-0.5 rounded-[2px] bg-purple-600 text-white font-bold text-[10px] uppercase tracking-wider">
                                              Tura Ta
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 font-data">
                                          <span>📅 {formatRomaniaDate(shift.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                          <span>·</span>
                                          <span>⏰ {shift.startTime} - {shift.endTime}</span>
                                          <span>·</span>
                                          <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-[2px]">
                                            +{shift.hours} ore
                                          </span>
                                        </div>
                                      </div>

                                      {/* Action Button for Volunteer */}
                                      {!isAdmin && !event.attendanceClosed && currentUserId && (
                                        <button
                                          type="button"
                                          onClick={() => handleVolunteerShiftSignUp(event, shift.id)}
                                          className={`px-3.5 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer shrink-0 font-title ${
                                            isAssigned
                                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                              : isFull
                                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                                          }`}
                                          disabled={!isAssigned && isFull}
                                        >
                                          {isAssigned ? 'Renunță' : isFull ? 'Tură Plină' : 'Înscrie-te'}
                                        </button>
                                      )}
                                    </div>

                                    {/* Capacity Meter */}
                                    <div className="space-y-1.5 pt-0.5 font-anthropic">
                                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 font-data">
                                        <span>Grad ocupare:</span>
                                        <span className={`font-bold ${isFull ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                                          {enrolledCount} / {maxCount} voluntari
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-[2px] overflow-hidden">
                                        <div
                                          className={`h-full rounded-[2px] transition-all ${
                                            isFull ? 'bg-rose-500' : capacityPercent > 70 ? 'bg-amber-500' : 'bg-purple-600'
                                          }`}
                                          style={{ width: `${capacityPercent}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Assigned Volunteers Chips */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 font-title">
                                      <span className="text-xs font-bold uppercase text-slate-400 mr-0.5">Echipa:</span>
                                      {shift.assignedMembers && shift.assignedMembers.length > 0 ? (
                                        shift.assignedMembers.map(mId => {
                                          const mObj = members?.find(m => m.id === mId);
                                          return (
                                            <div
                                              key={mId}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
                                            >
                                              <img
                                                src={mObj?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mObj?.name || 'User')}`}
                                                alt={mObj?.name || 'User'}
                                                className="w-4 h-4 rounded-[2px] object-cover"
                                              />
                                              <span>{mObj?.name?.split(' ')[0] || mId}</span>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <span className="text-xs text-slate-400 italic">0 voluntari înscriși</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Working Committees section */}
                        {event.committees && Object.keys(event.committees).length > 0 && (
                          <div className="bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 rounded-[2px] p-4 sm:p-5 space-y-3.5 font-anthropic">
                            <h5 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-200/60 dark:border-slate-800 font-title">
                              Comitete de Lucru
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-anthropic">
                              {Object.entries(event.committees).map(([comId, com]) => {
                                const isMyCommittee = currentUserId && com.members?.includes(currentUserId);
                                return (
                                  <div 
                                    key={comId}
                                    className={`p-4 rounded-[2px] border transition-all space-y-3 ${
                                      isMyCommittee 
                                        ? 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-xs' 
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 font-title">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{com.name}</span>
                                          {isMyCommittee && (
                                            <span className="px-2 py-0.5 rounded-[2px] bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider">
                                              Comitetul Tău
                                            </span>
                                          )}
                                        </div>
                                        <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-data">
                                          +{com.hours} ore / membru
                                        </span>
                                      </div>
                                    </div>

                                    {com.description && (
                                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-anthropic italic">{com.description}</p>
                                    )}

                                    {/* Committee Members */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 font-title">
                                      <span className="text-xs font-bold uppercase text-slate-400 mr-0.5">Echipa:</span>
                                      {com.members && com.members.length > 0 ? (
                                        com.members.map(mId => {
                                          const mObj = members?.find(m => m.id === mId);
                                          const isCoord = com.coordinatorId === mId;
                                          return (
                                            <div
                                              key={mId}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                            >
                                              <img
                                                src={mObj?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mObj?.name || 'User')}`}
                                                alt={mObj?.name || 'User'}
                                                className="w-4 h-4 rounded-[2px] object-cover"
                                              />
                                              <span>{mObj?.name?.split(' ')[0] || mId}</span>
                                              {isCoord && <span className="bg-amber-100 text-amber-900 font-bold text-[9px] uppercase px-1.5 py-0.5 rounded-[2px]">Coord</span>}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <span className="text-xs text-slate-400 italic">0 membri</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
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
          <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain p-2 sm:p-4 flex min-h-full items-start sm:items-center justify-center font-anthropic">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] shadow-2xl p-4 sm:p-7 max-h-[calc(100dvh-1rem)] sm:max-h-[88vh] flex flex-col my-auto touch-pan-y font-anthropic"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <h2 className="text-lg sm:text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-white">
                  {editingEvent ? 'Editează Eveniment' : 'Eveniment Nou'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-[2px] transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              
              <form className="space-y-4 overflow-y-auto overscroll-contain flex-1 pr-1 -mr-1 scrollbar-thin touch-pan-y font-anthropic" style={{ WebkitOverflowScrolling: 'touch' }} onSubmit={handleSubmit}>
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                    Titlu Eveniment (Obligatoriu)
                  </label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-anthropic" 
                    placeholder="Ex: Întâlnire Proiect Camena" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Data (Obligatorie)
                    </label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={e => {
                        const newDate = e.target.value;
                        setDate(newDate);
                        if (!endDate || endDate < newDate) {
                          setEndDate(newDate);
                        }
                      }}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-anthropic" 
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                      Ora (Format 24h)
                    </label>
                    <div className="flex gap-2 font-data">
                      <select 
                        value={hour}
                        onChange={e => setHour(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => (
                          <option key={h} value={h} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{h}</option>
                        ))}
                      </select>
                      <span className="flex items-center font-bold text-slate-400 text-base">:</span>
                      <select 
                        value={minute}
                        onChange={e => setMinute(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      >
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                          <option key={m} value={m} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Project planned window (De la - Până la) */}
                {type === 'project' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-[2px]">
                    <div className="md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200 font-title">
                        Durata Proiectului · folosită pentru orele de voluntariat
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Până la data</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        required={type === 'project'}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-anthropic"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Până la ora</label>
                      <div className="flex gap-2 font-data">
                        <select
                          value={endHour}
                          onChange={e => setEndHour(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => (
                            <option key={h} value={h} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{h}</option>
                          ))}
                        </select>
                        <span className="flex items-center font-bold text-slate-400 text-base">:</span>
                        <select
                          value={endMinute}
                          onChange={e => setEndMinute(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                            <option key={m} value={m} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="md:col-span-2 text-xs font-bold text-sky-800 dark:text-sky-300 font-data">
                      Durată totală planificată: {computePlannedDurationHours()} ore. Fiecare departament poate avea propriul număr de ore mai jos.
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                    Locație (Opțională)
                  </label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-anthropic" 
                    placeholder="Ex: Sediul Central sau Online - Zoom" 
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                    Tip Eveniment
                  </label>
                  <select 
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-anthropic cursor-pointer"
                  >
                    <option value="meeting" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Întâlnire</option>
                    <option value="project" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Proiect / Acțiune</option>
                    <option value="social" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Eveniment</option>
                    <option value="other" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Altele</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                    Descriere (Opțională)
                  </label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-anthropic resize-none" 
                    placeholder="Detalii suplimentare, agenda discuției..." 
                  />
                </div>

                {/* Shifts Organization Section */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3.5 font-anthropic">
                  <div className={`p-4 rounded-[2px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isShiftBased
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-700 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                  }`}>
                    <div className="pr-2 space-y-1">
                      <div className="flex items-center gap-2 font-title">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Organizare pe Ture de Voluntariat (Shifts)
                        </span>
                        <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase tracking-wider shadow-xs ${
                          isShiftBased
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 dark:bg-slate-700 text-white'
                        }`}>
                          {isShiftBased ? '● ON / ACTIVAT' : '○ OFF / DEZACTIVAT'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Activează pentru evenimente cu mai multe zile sau intervale orare diferite. Voluntarii aleg tura dorită, iar la prezențe vor fi evaluați doar cei repartizați.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !isShiftBased;
                        setIsShiftBased(next);
                        if (next && formShifts.length === 0) {
                          handleAddShift();
                        }
                      }}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-[2px] border p-0.5 transition-colors duration-200 ease-in-out focus:outline-none shadow-xs ${
                        isShiftBased
                          ? 'bg-emerald-600 border-emerald-700'
                          : 'bg-slate-900 dark:bg-slate-700 border-slate-950 dark:border-slate-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5.5 w-6 rounded-[2px] bg-white shadow-xs transform transition duration-200 ease-in-out ${
                          isShiftBased ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {isShiftBased && (
                    <div className="space-y-3 pt-1.5 font-anthropic">
                      <div className="flex items-center justify-between font-title">
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" />
                          Ture de Voluntariat Configurate ({formShifts.length})
                        </span>
                        <button
                          type="button"
                          onClick={handleAddShift}
                          className="text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 px-3.5 py-1.5 rounded-[2px] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Plus size={14} /> + Adaugă Tură
                        </button>
                      </div>

                      {formShifts.length === 0 ? (
                        <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 italic py-3 text-center bg-emerald-50/50 dark:bg-emerald-950/30 rounded-[2px] border border-dashed border-emerald-300 dark:border-emerald-800">
                          Apasă butonul <strong>"+ Adaugă Tură"</strong> de mai sus pentru a configura prima tură.
                        </p>
                      ) : (
                        <div className="space-y-3.5">
                          {formShifts.map((shift, sIdx) => (
                            <div key={shift.id} className="p-4 bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-[2px] space-y-3.5 relative shadow-xs">
                              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5 font-title">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-[2px]">
                                  Configurare Tură #{sIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveShift(shift.id)}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-[2px] transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                                  title="Elimină Tura"
                                >
                                  <Trash2 size={14} /> Elimină
                                </button>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                                  Nume Tură (Obligatoriu)
                                </label>
                                <input
                                  type="text"
                                  value={shift.name}
                                  onChange={e => handleUpdateShiftField(shift.id, 'name', e.target.value)}
                                  required={isShiftBased}
                                  placeholder="Ex: Tura 1 - Vineri După-amiază"
                                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-anthropic"
                                />
                              </div>

                              {/* Row 1: Data & Capacitate Maxima */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                                    Data Turei
                                  </label>
                                  <input
                                    type="date"
                                    value={shift.date}
                                    onChange={e => handleUpdateShiftField(shift.id, 'date', e.target.value)}
                                    required={isShiftBased}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-anthropic"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                                    Capacitate Maximă (Voluntari)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={shift.maxVolunteers}
                                    onChange={e => handleUpdateShiftField(shift.id, 'maxVolunteers', parseInt(e.target.value, 10) || 1)}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-data"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Interval Orar (De la -> Pana la) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                                    De la Ora (Început Tură)
                                  </label>
                                  <input
                                    type="time"
                                    value={shift.startTime}
                                    onChange={e => handleUpdateShiftField(shift.id, 'startTime', e.target.value)}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-data"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                                    Până la Ora (Sfârșit Tură)
                                  </label>
                                  <input
                                    type="time"
                                    value={shift.endTime}
                                    onChange={e => handleUpdateShiftField(shift.id, 'endTime', e.target.value)}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-data"
                                  />
                                </div>
                              </div>

                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 p-3 rounded-[2px] border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-anthropic">
                                <span>Durată calculată: <strong className="text-emerald-600 dark:text-emerald-400 font-data">{shift.hours} ore</strong> de voluntariat / membru</span>
                                <span>Voluntari înscriși: <strong className="text-emerald-600 dark:text-emerald-400 font-data">{shift.assignedMembers.length}</strong> / {shift.maxVolunteers}</span>
                              </div>

                              {/* Member Assignment checklist */}
                              <div className="space-y-1.5 font-anthropic">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title">
                                  Repartizare Membri (Opțional - voluntarii se pot înscrie și direct din lista de evenimente)
                                </label>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-[2px] p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
                                  <div className="flex flex-wrap gap-1.5 font-title">
                                    {shift.assignedMembers.length === 0 ? (
                                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">Niciun voluntar selectat manual</span>
                                    ) : (
                                      shift.assignedMembers.map(mId => {
                                        const mObj = members?.find(m => m.id === mId);
                                        return (
                                          <span key={mId} className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 text-xs font-bold px-2.5 py-1 rounded-[2px] border border-purple-200 dark:border-purple-800 shadow-xs">
                                            {mObj?.name || mId}
                                            <button
                                              type="button"
                                              onClick={() => handleToggleShiftMember(shift.id, mId)}
                                              className="hover:text-red-600 dark:hover:text-red-400 font-bold ml-1 cursor-pointer text-sm"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        );
                                      })
                                    )}
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="Caută voluntar pentru această tură..."
                                    value={shiftSearchQueries[shift.id] || ''}
                                    onChange={e => setShiftSearchQueries(prev => ({ ...prev, [shift.id]: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-anthropic"
                                  />

                                  <div className="max-h-36 overflow-y-auto border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1 scrollbar-thin">
                                    {members
                                      ?.filter(m => m.role !== 'admin')
                                      .filter(m => {
                                        const q = (shiftSearchQueries[shift.id] || '').toLowerCase();
                                        return m.name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q);
                                      })
                                      .map(m => {
                                        const isSelected = shift.assignedMembers.includes(m.id);
                                        return (
                                          <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => handleToggleShiftMember(shift.id, m.id)}
                                            className={`w-full flex items-center justify-between p-2 rounded-[2px] text-xs sm:text-sm font-medium transition-colors cursor-pointer font-anthropic ${
                                              isSelected
                                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-800'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            <span className="flex items-center gap-2">
                                              <img
                                                src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                                                alt=""
                                                className="w-4 h-4 rounded-[2px]"
                                              />
                                              {m.name}
                                            </span>
                                            {isSelected ? (
                                              <span className="text-purple-700 dark:text-purple-300 font-bold font-title text-xs">✓ Înscris</span>
                                            ) : (
                                              <span className="text-slate-400 dark:text-slate-500 font-medium font-title text-xs">+ Înscrie</span>
                                            )}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Working Committees Section */}
                {type === 'project' && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3.5 font-anthropic">
                    <div className="flex items-center justify-between font-title">
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Comitete de Lucru</h3>
                      <button
                        type="button"
                        onClick={handleAddCommittee}
                        className="text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 px-3.5 py-1.5 rounded-[2px] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus size={14} /> Adaugă Comitet
                      </button>
                    </div>

                    {formCommittees.length === 0 ? (
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic py-3 text-center bg-slate-50 dark:bg-slate-800/60 rounded-[2px] border border-dashed border-slate-300 dark:border-slate-700">
                        Nu a fost adăugat niciun comitet. Apasă butonul de mai sus pentru a crea unul.
                      </p>
                    ) : (
                      <div className="space-y-3.5 font-anthropic">
                        {formCommittees.map((c) => (
                          <div key={c.id} className="relative p-4 bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-[2px] space-y-3.5 shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleRemoveCommittee(c.id)}
                              className="absolute top-3.5 right-3.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 p-1.5 rounded-[2px] transition-colors cursor-pointer"
                              title="Elimină Comitet"
                            >
                              <Trash2 size={16} />
                            </button>

                            <div className="pr-6 space-y-3.5">
                              {/* Committee Name */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Nume Comitet (Obligatoriu)</label>
                                <input
                                  type="text"
                                  value={c.name}
                                  onChange={e => handleUpdateCommitteeField(c.id, 'name', e.target.value)}
                                  required
                                  placeholder="Ex: Logistică, Decor, Sponsori..."
                                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-anthropic"
                                />
                              </div>

                              {/* Committee Description */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Descriere Comitet (Opțională)</label>
                                <textarea
                                  value={c.description}
                                  onChange={e => handleUpdateCommitteeField(c.id, 'description', e.target.value)}
                                  rows={2}
                                  placeholder="Sarcini specifice, agenda..."
                                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-anthropic"
                                />
                              </div>

                              {/* Committee Hours */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
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
                                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-data"
                                />
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                  Fiecare membru din acest comitet primește exact aceste ore la finalizare.
                                </p>
                              </div>

                              {/* Committee Members Multi-Select Dropdown */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Membri Comitet</label>
                                <div className="border border-slate-200 dark:border-slate-700 rounded-[2px] p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5 font-anthropic">
                                  {/* Selected members badges */}
                                  <div className="flex flex-wrap gap-1.5 font-title">
                                    {c.members.length === 0 ? (
                                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">Niciun membru selectat</span>
                                    ) : (
                                      c.members.map(memberId => {
                                        const mObj = members?.find(m => m.id === memberId);
                                        return (
                                          <span key={memberId} className="inline-flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 text-xs font-bold px-2.5 py-1 rounded-[2px] border border-indigo-200 dark:border-indigo-800 shadow-xs">
                                            {mObj?.name || memberId}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedMembers = c.members.filter(id => id !== memberId);
                                                handleUpdateCommitteeField(c.id, 'members', updatedMembers);
                                              }}
                                              className="hover:text-red-600 dark:hover:text-red-400 font-bold ml-1 text-sm cursor-pointer"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        );
                                      })
                                    )}
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="Caută membru..."
                                    value={memberSearchQueries[c.id] || ''}
                                    onChange={e => setMemberSearchQueries(prev => ({ ...prev, [c.id]: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2px] text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-anthropic"
                                  />

                                  {/* Scrollable checklist of members */}
                                  <div className="max-h-36 overflow-y-auto border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1 scrollbar-thin">
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
                                            className={`w-full flex items-center justify-between p-2 rounded-[2px] text-xs sm:text-sm font-medium transition-all cursor-pointer font-anthropic ${
                                              isSelected
                                                ? 'bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <img
                                                src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                                                alt={m.name}
                                                className="w-4 h-4 rounded-[2px]"
                                              />
                                              <span>{m.name}</span>
                                            </div>
                                            {isSelected && <span className="text-indigo-600 dark:text-indigo-400 font-bold font-title text-xs">✓</span>}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>

                              {/* Coordinator Selector */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">
                                  Coordonator (Șef Comitet) - Opțional
                                </label>
                                <div className="relative font-anthropic">
                                  <select
                                    value={c.coordinatorId || ''}
                                    onChange={e => handleUpdateCommitteeField(c.id, 'coordinatorId', e.target.value || null)}
                                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-anthropic cursor-pointer"
                                  >
                                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Niciunul / Fără Coordonator</option>
                                    {c.members.map(memberId => {
                                      const mObj = members?.find(m => m.id === memberId);
                                      return (
                                        <option key={memberId} value={memberId} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                          {mObj?.name || memberId}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 pb-1 sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-10 font-title shrink-0">
                  <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2px] font-bold uppercase tracking-wider text-xs sm:text-sm shadow-xs cursor-pointer">
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
          <div className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain p-3 sm:p-4 flex min-h-full items-center justify-center font-anthropic">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setRequestingAbsenceFor(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2px] shadow-2xl p-5 sm:p-6 font-anthropic border border-slate-200 dark:border-slate-800 my-auto touch-pan-y max-h-[90dvh] overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex justify-between items-start mb-3.5 font-title">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Cere Învoire</h3>
                <button onClick={() => setRequestingAbsenceFor(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-[2px] cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mb-4 font-anthropic leading-relaxed">
                Te rugăm să motivezi absența pentru <span className="font-bold text-slate-900 dark:text-white">{requestingAbsenceFor.title}</span>. Cererea va fi analizată de administratori.
              </p>
              
              <form onSubmit={handleAbsenceSubmit} className="space-y-3.5 font-anthropic">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 font-title">Motiv Învoire</label>
                  <textarea 
                    required
                    rows={4}
                    value={absenceReason}
                    onChange={e => setAbsenceReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] text-sm focus:outline-none focus:border-indigo-500 resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-anthropic"
                    placeholder="Scrie aici motivul absenței..."
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-[2px] text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xs cursor-pointer font-title">
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
