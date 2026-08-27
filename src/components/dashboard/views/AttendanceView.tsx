import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, Clock, ChevronDown, Lock, Loader2, MessageSquare, 
  Search, RotateCcw, Check, X, Archive, UserCheck, UserX, AlertCircle, 
  Award, Info, Unlock, Calendar 
} from 'lucide-react';
import { 
  EventData, AbsenceRequest, fetchAbsenceRequests, saveAbsenceRequest, 
  deleteAbsenceRequest, recordAttendance, fetchEvents, saveEvent, 
  applyMemberScoreAdjustment, isSystemAccount, logScoreAudit 
} from '../../../utils/supabaseService';
import { toast } from '../../ui/Toast';
import { triggerAbsencePushNotification } from '../../../utils/pushNotifications';
import { Badge } from '../../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { useBodyScrollLock } from '../../../utils/useBodyScrollLock';

interface AttendanceViewProps {
  members: any[];
  onUpdateMember: (updatedMember: any) => void;
  isAdmin: boolean;
  currentUserId?: string;
  currentUserObj?: any;
  preselectedEventId?: string;
}

const MemberAttendanceView = ({ member, events, currentUserId, preselectedEventId }: { member: any, events: EventData[], currentUserId: string, preselectedEventId?: string }) => {
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  if (member?.role === 'admin') {
    return (
      <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] p-5 sm:p-6 shadow-sm space-y-6 font-anthropic">
        <h2 className="text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-white">Situație Prezențe</h2>
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-[2px] text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded-[2px] bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200 font-bold text-xs uppercase font-title">Statut Board / Admin</span>
            <span className="font-bold text-sm font-title">Exonerat de la evidența prezențelor</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-anthropic">
            Ca membru în Board-ul de conducere sau Administrator, activitatea ta este orientată pe decizii de guvernanță și organizare. Nu ești contorizat pentru rata de prezență, absențe sau ore de voluntariat competitive.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (preselectedEventId) {
      setSelectedEventId(preselectedEventId);
    }
  }, [preselectedEventId]);

  useEffect(() => {
    async function load() {
      try {
        const allReqs = await fetchAbsenceRequests();
        setRequests(allReqs.filter(r => r.memberId === currentUserId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (e) {
        toast.error('Eroare la încărcarea cererilor.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUserId]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !reason.trim()) return;

    try {
      const newReq: AbsenceRequest = {
        id: `req_${Date.now()}`,
        eventId: selectedEventId,
        memberId: currentUserId,
        memberName: member?.name || 'Membru',
        reason,
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      await saveAbsenceRequest(newReq);
      setRequests(prev => [newReq, ...prev]);
      setSelectedEventId('');
      setReason('');
      toast.success('Cererea a fost trimisă cu succes!');
    } catch (err) {
      toast.error('Eroare la trimiterea cererii.');
    }
  };

  const handleCancelPendingRequest = async (reqId: string) => {
    try {
      await deleteAbsenceRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
      toast.success('Cererea ta de învoire a fost anulată.');
    } catch (e) {
      toast.error('Eroare la anularea cererii.');
    }
  };

  const eligibleEvents = events.filter(ev => ev.type === 'meeting' && !ev.attendanceClosed).filter(ev => {
    const rsvp = ev.rsvps?.[currentUserId] || 'none';
    return rsvp !== 'present' && rsvp !== 'excused';
  });

  return (
    <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] p-5 sm:p-6 shadow-sm font-anthropic">
      <h2 className="text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-white mb-6">Situație Prezențe</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-[2px] border border-sky-200 dark:border-sky-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1 font-title">Prezențe</div>
          <div className="text-2xl font-bold font-data text-sky-800 dark:text-sky-300">{member?.presences || 0}</div>
        </div>
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-[2px] border border-emerald-200 dark:border-emerald-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1 font-title">Învoiri</div>
          <div className="text-2xl font-bold font-data text-emerald-800 dark:text-emerald-300">{member?.excusedAbsences || 0}</div>
        </div>
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-[2px] border border-rose-200 dark:border-rose-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1 font-title">Absențe Nemotivate</div>
          <div className="text-2xl font-bold font-data text-rose-800 dark:text-rose-300">{member?.unexcusedAbsences || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-4">Trimite Cerere de Învoire</h3>
          <form onSubmit={handleSubmitRequest} className="space-y-4 font-anthropic">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Alege Evenimentul</label>
              <select 
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic cursor-pointer"
                required
              >
                <option value="">-- Selectează Eveniment Activ --</option>
                {eligibleEvents.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title} ({new Date(ev.date).toLocaleDateString('ro-RO')})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 font-title">Motivul Absenței</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 h-24 resize-none font-anthropic"
                placeholder="Ex: Sunt plecat din localitate pentru un concurs școlar..."
                required
              />
            </div>
            <button type="submit" className="w-full py-2.5 btn-civic-primary text-xs font-title uppercase tracking-wider cursor-pointer">
              Trimite Cererea Oficială
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-base font-bold font-anthropicSerif text-slate-900 dark:text-slate-100 mb-4">Istoric Cereri</h3>
          {loading ? (
            <p className="text-xs text-slate-500 font-anthropic">Se încarcă...</p>
          ) : requests.length === 0 ? (
            <p className="text-xs text-slate-500 italic font-anthropic">Nu ai trimis nicio cerere.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {requests.map(req => {
                const ev = events.find(e => e.id === req.eventId);
                return (
                  <div key={req.id} className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[2px] font-anthropic">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 font-title">{ev?.title || 'Eveniment Necunoscut'}</div>
                      <Badge 
                        variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}
                      >
                        {req.status === 'approved' ? 'Aprobat' : req.status === 'rejected' ? 'Respins' : 'În Așteptare'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-[2px] font-anthropic">{req.reason}</p>
                    {req.status === 'rejected' && req.rejectReason && (
                      <div className="mt-2.5 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-[2px]">
                        <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 mb-0.5 font-title">Motiv Respingere:</p>
                        <p className="text-xs text-rose-700 dark:text-rose-400 italic font-anthropic">{req.rejectReason}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-data">
                      <span>Trimis: {new Date(req.timestamp).toLocaleDateString('ro-RO')}</span>
                      {req.reviewedBy && (
                        <span className="text-slate-500 dark:text-slate-400 font-semibold font-title">
                          {req.status === 'approved' ? 'Aprobat de: ' : 'Gestionat de: '}
                          <strong className="text-slate-800 dark:text-slate-200">{req.reviewedBy}</strong>
                        </span>
                      )}
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelPendingRequest(req.id)}
                          className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer font-title"
                        >
                          <RotateCcw size={12} /> Anulează Cererea
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function AttendanceView({ members, onUpdateMember, isAdmin, currentUserId, currentUserObj, preselectedEventId }: AttendanceViewProps) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [viewMode, setViewMode] = useState<'active' | 'archive'>('active');
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'present' | 'excused' | 'absent'>('all');
  const [archiveSearch, setArchiveSearch] = useState('');

  const [activeTab, setActiveTab] = useState<'attendance' | 'requests'>('attendance');
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [rejectingReq, setRejectingReq] = useState<AbsenceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [eventDurationInput, setEventDurationInput] = useState('2');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappSearchTerm, setWhatsappSearchTerm] = useState('');
  const [isExcusingWhatsapp, setIsExcusingWhatsapp] = useState(false);

  useBodyScrollLock(showWhatsappModal || showFinalizeModal || !!rejectingReq);

  // Filter meetings into active vs archived
  const activeMeetings = useMemo(() => {
    return events.filter(e => e.type === 'meeting' && !e.attendanceClosed);
  }, [events]);

  const archivedMeetings = useMemo(() => {
    return events.filter(e => e.type === 'meeting' && e.attendanceClosed);
  }, [events]);

  // Load events
  useEffect(() => {
    async function load() {
      try {
        const evs = await fetchEvents();
        evs.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
        setEvents(evs);
      } catch (err) {
        toast.error('Eroare la încărcarea evenimentelor.');
      } finally {
        setLoadingEvents(false);
      }
    }
    load();
  }, []);

  // Preselected event handling & smart initial selection
  useEffect(() => {
    if (preselectedEventId && events.length > 0) {
      const match = events.find(e => e.id === preselectedEventId);
      if (match) {
        setSelectedEvent(match);
        if (match.attendanceClosed) {
          setViewMode('archive');
        } else {
          setViewMode('active');
        }
        return;
      }
    }

    if (!selectedEvent && events.length > 0) {
      if (activeMeetings.length > 0) {
        setSelectedEvent(activeMeetings[0]);
        setViewMode('active');
      } else if (archivedMeetings.length > 0) {
        setSelectedEvent(archivedMeetings[0]);
        setViewMode('archive');
      }
    }
  }, [preselectedEventId, events, activeMeetings, archivedMeetings]);

  // Switch between Active and Archive modes
  const handleSwitchViewMode = (mode: 'active' | 'archive') => {
    setViewMode(mode);
    if (mode === 'active') {
      if (!selectedEvent || selectedEvent.attendanceClosed) {
        setSelectedEvent(activeMeetings[0] || null);
      }
      setActiveTab('attendance');
    } else {
      if (!selectedEvent || !selectedEvent.attendanceClosed) {
        setSelectedEvent(archivedMeetings[0] || null);
      }
    }
  };

  // Load requests when an event is selected
  useEffect(() => {
    if (!selectedEvent) return;
    loadRequests(selectedEvent.id);
  }, [selectedEvent?.id]);

  const loadRequests = async (eventId: string) => {
    setLoadingRequests(true);
    try {
      const data = await fetchAbsenceRequests(eventId);
      setRequests(data);
    } catch (err) {
      toast.error('Eroare la încărcarea cererilor de învoire.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleQuickWhatsappExcuse = async (memberId: string) => {
    if (!selectedEvent) {
      toast.error('Selectează mai întâi un eveniment.');
      return;
    }
    if (selectedEvent.attendanceClosed) {
      toast.error('Sesiunea de prezență este închisă.');
      return;
    }

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const adminActorName = currentUserObj?.name || currentUserObj?.nickname || (currentUserObj?.username ? `@${currentUserObj.username}` : (isAdmin ? 'Board / Conducere' : 'Sistem'));
    const adminActorId = currentUserObj?.id;
    const adminActorUsername = currentUserObj?.username;

    setIsExcusingWhatsapp(true);
    try {
      const whatsappReq: AbsenceRequest = {
        id: `req_wa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        eventId: selectedEvent.id,
        memberId: member.id,
        memberName: member.name,
        reason: `Confirmat pe WhatsApp (Motivat de ${adminActorName})`,
        status: 'approved',
        timestamp: new Date().toISOString(),
        reviewedBy: adminActorName,
        reviewedById: adminActorId,
        reviewedByUsername: adminActorUsername,
        reviewedAt: new Date().toISOString()
      };
      await saveAbsenceRequest(whatsappReq);
      setRequests(prev => [whatsappReq, ...prev]);

      const currentPresence = selectedEvent.rsvps?.[member.id] || 'none';
      let newPresences = member.presences || 0;
      let newExcused = member.excusedAbsences || 0;
      let newUnexcused = member.unexcusedAbsences || 0;

      if (selectedEvent.type === 'meeting') {
        if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
        if (currentPresence === 'excused') newExcused = Math.max(0, newExcused - 1);
        if (currentPresence === 'unexcused' || currentPresence === 'absent') newUnexcused = Math.max(0, newUnexcused - 1);
        newExcused += 1;
      }

      const updatedStats = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
      const deltas = {
        presencesDelta: newPresences - (member.presences || 0),
        excusedDelta: newExcused - (member.excusedAbsences || 0),
        unexcusedDelta: newUnexcused - (member.unexcusedAbsences || 0),
      };
      await recordAttendance(selectedEvent.id, member.id, 'excused', deltas);

      await logScoreAudit({
        id: `audit_${whatsappReq.id}`,
        adminId: adminActorId,
        adminName: adminActorName,
        adminUsername: adminActorUsername,
        targetMemberId: member.id,
        targetMemberName: member.name,
        action: 'ABSENCE_APPROVED',
        points: 0,
        reason: `Motivare WhatsApp acordată de ${adminActorName} pentru "${selectedEvent.title}"`
      });

      const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [member.id]: 'excused' } };
      setSelectedEvent(updatedEvent);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      onUpdateMember({ ...member, ...updatedStats });

      triggerAbsencePushNotification('approved', member.id, `Motivat direct via WhatsApp de către ${adminActorName}`);
      toast.success(`✅ Absența lui ${member.name} a fost motivată via WhatsApp de ${adminActorName}!`);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la motivarea prin WhatsApp.');
    } finally {
      setIsExcusingWhatsapp(false);
    }
  };

  const handleOpenFinalizeModal = () => {
    if (!selectedEvent) return;

    if (!selectedEvent.attendanceClosed) {
      const activeMembers = members.filter(m => !isSystemAccount(m) && m.role !== 'admin');
      const unassignedCount = activeMembers.filter(m => (selectedEvent.rsvps?.[m.id] || 'none') === 'none').length;
      if (unassignedCount > 0) {
        toast.error(`Nu poți finaliza: ${unassignedCount} membri repartizați au status nespecificat.`);
        return;
      }
    } else {
      handleReopenAttendance();
      return;
    }

    setEventDurationInput('2');
    setShowFinalizeModal(true);
  };

  const handleReopenAttendance = async () => {
    if (!selectedEvent) return;
    const updatedEvent = { ...selectedEvent, attendanceClosed: false };
    try {
      await saveEvent(updatedEvent);
      setSelectedEvent(updatedEvent);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      setViewMode('active');
      toast.success('Prezența a fost redeschisă și mutată în secțiunea Sesiuni Active!');
    } catch (err) {
      toast.error('Eroare la redeschiderea prezenței.');
    }
  };

  const handleConfirmFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || isFinalizing) return;

    const fallbackHours = parseFloat(eventDurationInput) || 2;
    if (fallbackHours <= 0) {
      toast.error('Te rugăm să introduci o durată validă în ore (ex: 2.5).');
      return;
    }

    setIsFinalizing(true);
    try {
      const activeMembers = members.filter(m => !isSystemAccount(m) && m.role !== 'admin');
      const presentMembers = activeMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'present');

      for (const member of presentMembers) {
        const pointsToAdd = Math.round(fallbackHours * 2);
        const adminActorName = currentUserObj?.name || currentUserObj?.nickname || (currentUserObj?.username ? `@${currentUserObj.username}` : (isAdmin ? 'Admin' : 'Sistem'));
        const adminActorId = currentUserObj?.id;
        const adminActorUsername = currentUserObj?.username;

        const newAdjustment = {
          id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          points: pointsToAdd,
          reason: `Prezență (${fallbackHours}h): ${selectedEvent.title}`,
          date: new Date().toISOString(),
          adminId: adminActorId,
          adminName: adminActorName,
          adminUsername: adminActorUsername
        };

        const updatedMember = {
          ...member,
          stats: {
            ...member.stats,
            hours: (member.stats?.hours || 0) + fallbackHours,
            projects: (member.stats?.projects || 0) + 1
          },
          score: (member.score || 0) + pointsToAdd,
          scoreAdjustments: [...(member.scoreAdjustments || []), newAdjustment]
        };

        await applyMemberScoreAdjustment(member.id, pointsToAdd, newAdjustment, { hoursDelta: fallbackHours, projectsDelta: 1 });
        if (onUpdateMember) {
          onUpdateMember(updatedMember);
        }
      }

      const updatedEvent = { 
        ...selectedEvent, 
        attendanceClosed: true,
        durationHours: fallbackHours 
      };
      await saveEvent(updatedEvent);
      setSelectedEvent(updatedEvent);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      setShowFinalizeModal(false);
      setViewMode('archive');
      toast.success(`✅ Prezență finalizată și salvată în Arhivă! S-au acordat orele și punctele pentru cei ${presentMembers.length} membri prezenți.`);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la finalizarea prezenței și adăugarea orelor.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleApproveRequest = async (req: AbsenceRequest) => {
    if (selectedEvent?.attendanceClosed) {
      toast.error('Sesiunea este finalizată. Redeschideți prezența pentru a gestiona cererile.');
      return;
    }

    const adminActorName = currentUserObj?.name || currentUserObj?.nickname || (currentUserObj?.username ? `@${currentUserObj.username}` : (isAdmin ? 'Board / Conducere' : 'Sistem'));
    const adminActorId = currentUserObj?.id;
    const adminActorUsername = currentUserObj?.username;

    try {
      const updated: AbsenceRequest = { 
        ...req, 
        status: 'approved' as const, 
        reviewedBy: adminActorName,
        reviewedById: adminActorId,
        reviewedByUsername: adminActorUsername,
        reviewedAt: new Date().toISOString() 
      };
      await saveAbsenceRequest(updated);
      setRequests(prev => prev.map(r => r.id === req.id ? updated : r));

      const member = members.find(m => m.id === req.memberId);
      if (member && selectedEvent) {
        const currentPresence = selectedEvent.rsvps?.[member.id] || 'none';
        if (currentPresence !== 'excused') {
          let newPresences = member.presences || 0;
          let newExcused = member.excusedAbsences || 0;
          let newUnexcused = member.unexcusedAbsences || 0;

          if (selectedEvent.type === 'meeting') {
            if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
            if (currentPresence === 'excused') newExcused = Math.max(0, newExcused - 1);
            if (currentPresence === 'unexcused' || currentPresence === 'absent') newUnexcused = Math.max(0, newUnexcused - 1);
            newExcused += 1;
          } else {
            if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
          }

          const updatedStats = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
          const deltas = {
            presencesDelta: newPresences - (member.presences || 0),
            excusedDelta: newExcused - (member.excusedAbsences || 0),
            unexcusedDelta: newUnexcused - (member.unexcusedAbsences || 0),
          };
          await recordAttendance(selectedEvent.id, member.id, 'excused', deltas);
          
          const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [member.id]: 'excused' } };
          setSelectedEvent(updatedEvent);
          setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
          onUpdateMember({ ...member, ...updatedStats });
        }
      }

      await logScoreAudit({
        id: `audit_app_${req.id}_${Date.now()}`,
        adminId: adminActorId,
        adminName: adminActorName,
        adminUsername: adminActorUsername,
        targetMemberId: req.memberId,
        targetMemberName: member?.name || req.memberName || 'Membru',
        action: 'ABSENCE_APPROVED',
        points: 0,
        reason: `Învoire aprobată de ${adminActorName} pentru "${selectedEvent?.title || 'Eveniment'}" (Motiv membru: "${req.reason}")`
      });

      triggerAbsencePushNotification('approved', req.memberId, req.reason);
      toast.success(`Cererea a fost aprobată de ${adminActorName}.`);
    } catch (err) {
      toast.error('Eroare la aprobare.');
    }
  };

  const handleRejectRequest = (req: AbsenceRequest) => {
    if (selectedEvent?.attendanceClosed) {
      toast.error('Sesiunea este finalizată. Redeschideți prezența pentru a gestiona cererile.');
      return;
    }
    setRejectingReq(req);
    setRejectReason('');
  };

  const confirmRejectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq || !rejectReason.trim() || !selectedEvent) return;

    const adminActorName = currentUserObj?.name || currentUserObj?.nickname || (currentUserObj?.username ? `@${currentUserObj.username}` : (isAdmin ? 'Board / Conducere' : 'Sistem'));
    const adminActorId = currentUserObj?.id;
    const adminActorUsername = currentUserObj?.username;

    try {
      const updated: AbsenceRequest = { 
        ...rejectingReq, 
        status: 'rejected' as const, 
        reviewedBy: adminActorName,
        reviewedById: adminActorId,
        reviewedByUsername: adminActorUsername,
        reviewedAt: new Date().toISOString(), 
        rejectReason: rejectReason.trim() 
      };
      await saveAbsenceRequest(updated);
      setRequests(prev => prev.map(r => r.id === rejectingReq.id ? updated : r));

      const member = members.find(m => m.id === rejectingReq.memberId);
      if (member && selectedEvent) {
        const currentPresence = selectedEvent.rsvps?.[member.id] || 'none';
        if (currentPresence === 'excused') {
          const newPresences = member.presences || 0;
          let newExcused = member.excusedAbsences || 0;
          const newUnexcused = member.unexcusedAbsences || 0;

          if (selectedEvent.type === 'meeting') {
            newExcused = Math.max(0, newExcused - 1);
          }

          const updatedStats = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
          const deltas = {
            presencesDelta: newPresences - (member.presences || 0),
            excusedDelta: newExcused - (member.excusedAbsences || 0),
            unexcusedDelta: newUnexcused - (member.unexcusedAbsences || 0),
          };
          await recordAttendance(selectedEvent.id, member.id, 'none', deltas);
          
          const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [member.id]: 'none' } };
          setSelectedEvent(updatedEvent);
          setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
          onUpdateMember({ ...member, ...updatedStats });
        }
      }

      await logScoreAudit({
        id: `audit_rej_${rejectingReq.id}_${Date.now()}`,
        adminId: adminActorId,
        adminName: adminActorName,
        adminUsername: adminActorUsername,
        targetMemberId: rejectingReq.memberId,
        targetMemberName: member?.name || rejectingReq.memberName || 'Membru',
        action: 'ABSENCE_REJECTED',
        points: 0,
        reason: `Învoire respinsă de ${adminActorName} pentru "${selectedEvent?.title || 'Eveniment'}" (Motiv respingere: "${rejectReason.trim()}")`
      });

      triggerAbsencePushNotification('rejected', rejectingReq.memberId, rejectReason.trim());
      toast.success(`Cererea a fost respinsă de ${adminActorName}.`);
      setRejectingReq(null);
      setRejectReason('');
    } catch (err) {
      toast.error('Eroare la respingere.');
    }
  };

  const handleRevertRequestForMember = async (memberId: string) => {
    if (!selectedEvent) return;
    const req = requests.find(r => r.memberId === memberId && r.eventId === selectedEvent.id);
    if (req) {
      try {
        await deleteAbsenceRequest(req.id);
        setRequests(prev => prev.filter(r => r.id !== req.id));

        const member = members.find(m => m.id === req.memberId);
        if (member && selectedEvent) {
          const currentPresence = selectedEvent.rsvps?.[member.id] || 'none';
          if (currentPresence === 'excused') {
            const newPresences = member.presences || 0;
            let newExcused = member.excusedAbsences || 0;
            const newUnexcused = member.unexcusedAbsences || 0;

            if (selectedEvent.type === 'meeting') {
              newExcused = Math.max(0, newExcused - 1);
            }

            const updatedStats = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
            const deltas = {
              presencesDelta: 0,
              excusedDelta: newExcused - (member.excusedAbsences || 0),
              unexcusedDelta: 0,
            };
            await recordAttendance(selectedEvent.id, member.id, 'none', deltas);
            
            const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [member.id]: 'none' } };
            setSelectedEvent(updatedEvent);
            setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
            onUpdateMember({ ...member, ...updatedStats });
          }
        }
        toast.success('Motivarea a fost anulată cu succes!');
      } catch (err) {
        toast.error('Eroare la anularea motivării.');
      }
    } else {
      const member = members.find(m => m.id === memberId);
      if (member) {
        try {
          const currentPresence = selectedEvent.rsvps?.[memberId] || 'none';
          if (currentPresence === 'excused') {
            const newPresences = member.presences || 0;
            let newExcused = member.excusedAbsences || 0;
            const newUnexcused = member.unexcusedAbsences || 0;

            if (selectedEvent.type === 'meeting') {
              newExcused = Math.max(0, newExcused - 1);
            }

            const updatedStats = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
            const deltas = {
              presencesDelta: 0,
              excusedDelta: newExcused - (member.excusedAbsences || 0),
              unexcusedDelta: 0,
            };
            await recordAttendance(selectedEvent.id, member.id, 'none', deltas);
            
            const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [member.id]: 'none' } };
            setSelectedEvent(updatedEvent);
            setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
            onUpdateMember({ ...member, ...updatedStats });
            toast.success('Motivarea a fost anulată!');
          }
        } catch (err) {
          toast.error('Eroare la anularea motivării.');
        }
      }
    }
  };

  const handleMarkAttendance = async (memberId: string, presenceType: 'present' | 'absent' | 'excused' | 'unexcused') => {
    if (!selectedEvent) return;

    if (selectedEvent.attendanceClosed) {
      toast.error('Această sesiune de prezență este finalizată și nu mai poate fi modificată.');
      return;
    }
    
    const eventDateTime = new Date(`${selectedEvent.date}T${selectedEvent.time}`).getTime();
    const isTimeLocked = Date.now() < eventDateTime;

    if (isTimeLocked) {
      toast.error('Prezențele se pot marca doar după ora evenimentului.');
      return;
    }

    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const currentPresence = selectedEvent.rsvps?.[memberId] || 'none';
    if (currentPresence === presenceType) return;

    let newPresences = member.presences || 0;
    let newExcused = member.excusedAbsences || 0;
    let newUnexcused = member.unexcusedAbsences || 0;

    if (selectedEvent.type === 'meeting') {
      if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
      if (currentPresence === 'excused') newExcused = Math.max(0, newExcused - 1);
      if (currentPresence === 'unexcused' || currentPresence === 'absent') newUnexcused = Math.max(0, newUnexcused - 1);
      if (presenceType === 'present') newPresences += 1;
      if (presenceType === 'excused') newExcused += 1;
      if (presenceType === 'absent' || presenceType === 'unexcused') newUnexcused += 1;
    } else {
      if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
      if (presenceType === 'present') newPresences += 1;
    }

    const updatedStats = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
    const deltas = {
      presencesDelta: newPresences - (member.presences || 0),
      excusedDelta: newExcused - (member.excusedAbsences || 0),
      unexcusedDelta: newUnexcused - (member.unexcusedAbsences || 0),
    };

    try {
      await recordAttendance(selectedEvent.id, memberId, presenceType, deltas);
      const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [memberId]: presenceType } };
      setSelectedEvent(updatedEvent);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      onUpdateMember({ ...member, ...updatedStats });
      toast.success('Prezența marcată cu succes!');
    } catch (err) {
      toast.error('Eroare la marcarea prezenței.');
    }
  };

  const isTimeLocked = selectedEvent ? Date.now() < new Date(`${selectedEvent.date}T${selectedEvent.time}`).getTime() : false;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  // Compute archive targeted members and detailed statistics
  const targetArchiveMembers = useMemo(() => {
    if (!selectedEvent) return [];
    return members
      .filter(m => !isSystemAccount(m) && m.role !== 'admin')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ro', { sensitivity: 'base' }));
  }, [members, selectedEvent]);

  const archiveStats = useMemo(() => {
    if (!selectedEvent) return { present: [], excused: [], absent: [], rate: 0, total: 0 };
    const present = targetArchiveMembers.filter(m => (selectedEvent.rsvps?.[m.id]) === 'present');
    const excused = targetArchiveMembers.filter(m => (selectedEvent.rsvps?.[m.id]) === 'excused');
    const absent = targetArchiveMembers.filter(m => {
      const r = selectedEvent.rsvps?.[m.id] || 'none';
      return r === 'absent' || r === 'unexcused' || r === 'none';
    });
    const total = targetArchiveMembers.length;
    const rate = total > 0 ? Math.round((present.length / total) * 100) : 0;
    return { present, excused, absent, rate, total };
  }, [targetArchiveMembers, selectedEvent]);

  const filteredArchiveMembers = useMemo(() => {
    return targetArchiveMembers.filter(m => {
      const rsvp = selectedEvent?.rsvps?.[m.id] || 'none';
      const isPresent = rsvp === 'present';
      const isExcused = rsvp === 'excused';
      const isAbsent = rsvp === 'absent' || rsvp === 'unexcused' || rsvp === 'none';

      if (archiveFilter === 'present' && !isPresent) return false;
      if (archiveFilter === 'excused' && !isExcused) return false;
      if (archiveFilter === 'absent' && !isAbsent) return false;

      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchNick = m.nickname?.toLowerCase().includes(q);
        const matchRole = m.role?.toLowerCase().includes(q);
        const matchComm = m.committee?.toLowerCase().includes(q);
        return matchName || matchNick || matchRole || matchComm;
      }
      return true;
    });
  }, [targetArchiveMembers, selectedEvent, archiveFilter, archiveSearch]);

  if (!isAdmin) {
    return (
      <MemberAttendanceView 
        member={members.find(m => m.id === currentUserId)}
        events={events}
        currentUserId={currentUserId || ''}
        preselectedEventId={preselectedEventId}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] p-4 sm:p-6 shadow-sm flex flex-col h-full min-h-[500px] font-anthropic">
      
      {/* Top Header & Mode Navigation Toggle */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-white">Gestionare Prezențe</h2>
            <span className="px-2.5 py-0.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase font-title border border-slate-200 dark:border-slate-700">
              {viewMode === 'active' ? 'Catalog Activ' : 'Arhivă Încheiate'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold font-anthropic">
            {viewMode === 'active' 
              ? 'Catalogul sesiunilor deschise pentru marcat prezențe, cereri de învoire și finalizare.' 
              : 'Evidența completă a ședințelor încheiate: cine a venit, cine a fost învoit și de ce.'}
          </p>
        </div>

        {/* Section Switcher Tabs: Active vs Archive */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 font-title shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleSwitchViewMode('active')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'active'
                ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Clock size={14} />
            <span>Sesiuni Active</span>
            <span className={`px-1.5 py-0.2 rounded-[2px] text-[11px] font-data font-bold ${
              viewMode === 'active' ? 'bg-white/20 text-white dark:bg-slate-950/30 dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {activeMeetings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchViewMode('archive')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'archive'
                ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Archive size={14} />
            <span>Arhivă & Istoric</span>
            <span className={`px-1.5 py-0.2 rounded-[2px] text-[11px] font-data font-bold ${
              viewMode === 'archive' ? 'bg-white/20 text-white dark:bg-slate-950/30 dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {archivedMeetings.length}
            </span>
          </button>
        </div>
      </div>

      {/* Event Selector for Current Mode */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-[2px] border border-slate-200 dark:border-slate-800 font-anthropic">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 font-title uppercase tracking-wider">
          {viewMode === 'active' ? (
            <>
              <Clock size={16} className="text-sky-600 dark:text-sky-400" />
              <span>Selectează Ședința Activă:</span>
            </>
          ) : (
            <>
              <Archive size={16} className="text-amber-600 dark:text-amber-400" />
              <span>Selectează Raportul din Arhivă:</span>
            </>
          )}
        </div>

        <div className="relative w-full sm:w-80 shrink-0 font-anthropic">
          {loadingEvents ? (
            <div className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] text-xs font-semibold opacity-50">
              Se încarcă lista...
            </div>
          ) : (
            <>
              <select 
                className="w-full px-3.5 py-2 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 appearance-none font-title cursor-pointer"
                onChange={(e) => {
                  const ev = events.find(x => x.id === e.target.value);
                  setSelectedEvent(ev || null);
                  setActiveTab('attendance');
                }}
                value={selectedEvent?.id || ''}
              >
                <option value="">
                  {viewMode === 'active' ? '-- Alege o ședință activă --' : '-- Alege un raport încheiat --'}
                </option>
                {(viewMode === 'active' ? activeMeetings : archivedMeetings).map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({new Date(e.date).toLocaleDateString('ro-RO')} · {e.time})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ACTIVE SESSIONS VIEW (Taking attendance, requests review, WhatsApp)    */}
      {/* ========================================================================= */}
      {viewMode === 'active' && (
        <>
          {activeMeetings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[2px] p-8 sm:p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 font-anthropic">
              <div className="w-14 h-14 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3.5 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <CheckCircle2 size={30} />
              </div>
              <h3 className="text-lg font-bold font-anthropicSerif text-slate-900 dark:text-white mb-1">Toate prezențele sunt la zi!</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 font-anthropic">
                Nu există nicio sesiune deschisă în acest moment. Toate prezențele anterioare au fost finalizate și arhivate.
              </p>
              <button
                type="button"
                onClick={() => handleSwitchViewMode('archive')}
                className="px-4 py-2.5 btn-civic-secondary text-xs font-title uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <Archive size={14} />
                <span>Consultă Arhiva & Istoricul Prezențelor ({archivedMeetings.length})</span>
              </button>
            </div>
          ) : !selectedEvent || selectedEvent.attendanceClosed ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[2px] p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs sm:text-sm font-title mb-2">
                Alege o ședință activă din meniul de mai sus
              </p>
              <p className="text-xs text-slate-400 font-anthropic">Sunt disponibile {activeMeetings.length} sesiuni deschise pentru marcare.</p>
            </div>
          ) : (
            <motion.div 
              key={selectedEvent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col flex-1"
            >
              {isTimeLocked && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-[2px] mb-5 flex items-start gap-3 shrink-0 font-anthropic">
                  <Clock className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={18} />
                  <div>
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wider font-title">Time Lock Activ</p>
                    <p className="text-xs opacity-85 mt-0.5 font-anthropic">
                      Evenimentul este programat pentru <strong>{new Date(selectedEvent.date).toLocaleDateString('ro-RO')} ora {selectedEvent.time}</strong>. Prezențele se pot marca după începerea ședinței.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 mb-4 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3 font-title">
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('attendance')}
                    className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'attendance'
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Catalog Prezențe
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'requests'
                        ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Cereri Învoire</span>
                    {pendingRequestsCount > 0 && (
                      <span className="bg-rose-600 text-white text-xs font-bold px-1.5 py-0.2 rounded-[2px] font-data">{pendingRequestsCount}</span>
                    )}
                  </button>
                  <button
                    onClick={() => { setWhatsappSearchTerm(''); setShowWhatsappModal(true); }}
                    className="px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <MessageSquare size={13} /> Confirmat WhatsApp
                  </button>
                </div>

                {!isTimeLocked && (
                  <button
                    onClick={handleOpenFinalizeModal}
                    className="px-3.5 py-1.5 btn-civic-danger text-xs font-title uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock size={13} /> Finalizează & Salvează
                  </button>
                )}
              </div>

              {/* Attendance Table or Requests List */}
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col font-anthropic">
                {activeTab === 'attendance' && (
                  <div className="overflow-y-auto scrollbar-thin p-3 sm:p-4 font-anthropic flex-1">
                    {members.length === 0 ? (
                      <p className="text-center text-sm opacity-50 py-8 font-anthropic">Nu există membri în baza de date.</p>
                    ) : (
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm font-title">
                          <TableRow>
                            <TableHead className="py-2.5 px-3 font-bold text-xs uppercase tracking-wider">Membru</TableHead>
                            <TableHead className="py-2.5 px-3 font-bold text-xs uppercase tracking-wider">Status Curent</TableHead>
                            <TableHead className="py-2.5 px-3 text-right font-bold text-xs uppercase tracking-wider">Acțiuni Prezență</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members
                            .filter(m => !isSystemAccount(m) && m.role !== 'admin')
                            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ro', { sensitivity: 'base' }))
                            .map(m => {
                              const status = selectedEvent.rsvps?.[m.id] || 'none';
                              const isButtonLocked = isTimeLocked;

                              return (
                                <TableRow key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                                  <TableCell className="py-3 px-3">
                                    <div className="flex items-center gap-3">
                                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} className="w-8 h-8 rounded-[2px] border border-slate-200 dark:border-white/10 shrink-0" alt="" />
                                      <div>
                                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-title">{m.name}</div>
                                        <div className="text-[11px] text-slate-500 font-data">{m.nickname || m.username || 'Voluntar'} • {m.committee || 'Comitet'}</div>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider ${
                                      status === 'present' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                                      status === 'excused' ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                                      status === 'absent' || status === 'unexcused' ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' :
                                      'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}>
                                      {status === 'present' ? 'Prezent' :
                                       status === 'excused' ? 'Motivat' :
                                       status === 'absent' || status === 'unexcused' ? 'Absent' : 'Nespecificat'}
                                    </span>
                                  </TableCell>

                                  <TableCell className="py-3 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5 font-title">
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'present')}
                                        className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                          status === 'present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                                        Prezent
                                      </button>
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'absent')}
                                        className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                          status === 'absent' || status === 'unexcused' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                                        Absent
                                      </button>
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'excused')}
                                        className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                          status === 'excused' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                                        Motivat
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                {activeTab === 'requests' && (
                  <div className="overflow-y-auto scrollbar-thin p-4 sm:p-5 font-anthropic flex-1">
                    {loadingRequests ? (
                      <div className="flex items-center justify-center p-8 text-xs font-semibold opacity-60">
                        <Loader2 className="animate-spin mr-2" size={16} /> Se încarcă cererile...
                      </div>
                    ) : requests.length === 0 ? (
                      <p className="text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-10 font-anthropic">
                        Nu există nicio cerere de învoire depusă pentru această ședință.
                      </p>
                    ) : (
                      <div className="space-y-3 font-anthropic">
                        {requests.map(req => {
                          const member = members.find(m => m.id === req.memberId);
                          const memberName = member?.name || req.memberName || 'Membru';
                          return (
                            <div key={req.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs font-anthropic">
                              <div className="flex items-start gap-3.5">
                                <img src={member?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}`} className="w-10 h-10 rounded-[2px] border border-slate-200 dark:border-white/10 shrink-0" alt="" />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base font-title">{memberName}</span>
                                    <span className="text-xs text-slate-400 font-data">{req.timestamp ? new Date(req.timestamp).toLocaleDateString('ro-RO') : ''}</span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-anthropic"><strong>Motiv:</strong> {req.reason}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-title">
                                {req.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleApproveRequest(req)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
                                    >
                                      <Check size={14} /> Aprobă
                                    </button>
                                    <button
                                      onClick={() => handleRejectRequest(req)}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
                                    >
                                      <X size={14} /> Respinge
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider ${
                                      req.status === 'approved' 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
                                        : 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                    }`}>
                                      {req.status === 'approved' ? 'Aprobat' : 'Respins'}
                                    </span>
                                    {req.reviewedBy && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-data">
                                        de {req.reviewedBy}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. ARCHIVE & HISTORY VIEW (Detailed breakdown of who came & WHY)           */}
      {/* ========================================================================= */}
      {viewMode === 'archive' && (
        <>
          {archivedMeetings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[2px] p-8 sm:p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 font-anthropic">
              <div className="w-14 h-14 rounded-[2px] bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3.5 border border-amber-200 dark:border-amber-800 shadow-xs">
                <Archive size={30} />
              </div>
              <h3 className="text-lg font-bold font-anthropicSerif text-slate-900 dark:text-white mb-1">Arhiva este goală</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 font-anthropic">
                Nu există încă nicio ședință finalizată și salvată în arhivă. Când finalizezi o prezență din catalogul activ, raportul complet va fi salvat automat aici.
              </p>
              <button
                type="button"
                onClick={() => handleSwitchViewMode('active')}
                className="px-4 py-2.5 btn-civic-primary text-xs font-title uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <Clock size={14} />
                <span>Mergi la Sesiuni Active</span>
              </button>
            </div>
          ) : !selectedEvent || !selectedEvent.attendanceClosed ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[2px] p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs sm:text-sm font-title mb-2">
                Selectează un raport încheiat din lista de mai sus
              </p>
              <p className="text-xs text-slate-400 font-anthropic">Sunt disponibile {archivedMeetings.length} ședințe arhivate cu evidența completă.</p>
            </div>
          ) : (
            <motion.div 
              key={selectedEvent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col flex-1 space-y-6"
            >
              {/* Concluded Header Banner */}
              <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-[2px] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 font-anthropic">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 bg-slate-900 dark:bg-slate-800 text-amber-400 rounded-[2px] flex items-center justify-center shrink-0 shadow-xs border border-slate-800 dark:border-slate-700">
                    <Award size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg sm:text-xl font-bold font-anthropicSerif text-slate-900 dark:text-white">
                        {selectedEvent.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-[2px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold uppercase font-title border border-emerald-300 dark:border-emerald-800">
                        Arhivată & Încheiată
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-data flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(selectedEvent.date).toLocaleDateString('ro-RO')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock size={13} /> {selectedEvent.time}</span>
                      {selectedEvent.location && (
                        <>
                          <span>•</span>
                          <span>📍 {selectedEvent.location}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Durată: {selectedEvent.durationHours || 2} ore / membru</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center font-title">
                  <button
                    type="button"
                    onClick={handleReopenAttendance}
                    className="px-3.5 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Redeschide sesiunea pentru modificări în caz de eroare"
                  >
                    <Unlock size={14} className="text-amber-500" />
                    <span>Redeschide Sesiunea</span>
                  </button>
                </div>
              </div>

              {/* Statistics Overview Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-anthropic">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[2px] shadow-xs flex flex-col justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title mb-1">Rată Prezență</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-data">
                    {archiveStats.rate}%
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-[2px] mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${archiveStats.rate}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-[2px] shadow-xs flex flex-col justify-between bg-emerald-50/20 dark:bg-emerald-950/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 font-title mb-1 flex items-center gap-1.5">
                    <UserCheck size={14} /> Prezenți
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-data">
                    {archiveStats.present.length} <span className="text-xs text-slate-400 font-normal font-anthropic">/ {archiveStats.total}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-data">
                    +{selectedEvent.durationHours || 2}h voluntariat acordate
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 p-4 rounded-[2px] shadow-xs flex flex-col justify-between bg-amber-50/20 dark:bg-amber-950/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 font-title mb-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Învoiți (Motivați)
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-data">
                    {archiveStats.excused.length} <span className="text-xs text-slate-400 font-normal font-anthropic">membri</span>
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-data">
                    Învoiri justificate & validate
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 p-4 rounded-[2px] shadow-xs flex flex-col justify-between bg-rose-50/20 dark:bg-rose-950/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400 font-title mb-1 flex items-center gap-1.5">
                    <UserX size={14} /> Absenți Nemotivați
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-500 font-data">
                    {archiveStats.absent.length} <span className="text-xs text-slate-400 font-normal font-anthropic">membri</span>
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-1 font-data">
                    Fără justificare sau cerere respinsă
                  </div>
                </div>
              </div>

              {/* Archive Search and Filter Category Tabs */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2 font-anthropic">
                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-[2px] border border-slate-200 dark:border-slate-800 font-title">
                  <button
                    type="button"
                    onClick={() => setArchiveFilter('all')}
                    className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      archiveFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Toți ({archiveStats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveFilter('present')}
                    className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      archiveFilter === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                    }`}
                  >
                    Prezenți ({archiveStats.present.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveFilter('excused')}
                    className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      archiveFilter === 'excused'
                        ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                    }`}
                  >
                    Motivați ({archiveStats.excused.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveFilter('absent')}
                    className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      archiveFilter === 'absent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                    }`}
                  >
                    Nemotivați ({archiveStats.absent.length})
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64 font-anthropic">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={e => setArchiveSearch(e.target.value)}
                    placeholder="Caută voluntar..."
                    className="w-full pl-9 pr-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 font-anthropic"
                  />
                </div>
              </div>

              {/* Detailed Members Breakdown List with Explanations (Cine a venit, cine nu și DE CE) */}
              <div className="space-y-3 font-anthropic pb-4">
                {filteredArchiveMembers.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[2px] bg-slate-50/50 dark:bg-slate-900/30">
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Niciun membru nu corespunde filtrelor selectate.</p>
                  </div>
                ) : (
                  filteredArchiveMembers.map(m => {
                    const rsvp = selectedEvent.rsvps?.[m.id] || 'none';
                    const isPresent = rsvp === 'present';
                    const isExcused = rsvp === 'excused';

                    const memberReq = requests.find(r => r.memberId === m.id);

                    return (
                      <div 
                        key={m.id}
                        className={`p-4 rounded-[2px] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                          isPresent 
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50' 
                            : isExcused 
                            ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50' 
                            : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50'
                        }`}
                      >
                        {/* Member identity & metadata */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <img 
                            src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} 
                            className="w-10 h-10 rounded-[2px] border border-slate-200 dark:border-white/10 shrink-0 mt-0.5" 
                            alt="" 
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base font-title">
                                {m.name}
                              </span>
                              {m.nickname && (
                                <span className="text-xs text-slate-500 font-data">({m.nickname})</span>
                              )}
                              <span className="px-2 py-0.2 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold font-title">
                                {m.committee || 'Voluntar'}
                              </span>
                            </div>

                            {/* Detailed Explanation / Reason Box (DE CE) */}
                            <div className="mt-1.5 text-xs">
                              {isPresent && (
                                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium">
                                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                  <span>Prezent la ședință. A primit <strong>+{selectedEvent.durationHours || 2}h voluntariat</strong> și <strong>+{Math.round((selectedEvent.durationHours || 2) * 2)} puncte</strong>.</span>
                                </div>
                              )}

                              {isExcused && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-medium">
                                    <Info size={13} className="text-amber-600 shrink-0" />
                                    <span>
                                      <strong>Motiv Învoire:</strong> {memberReq?.reason || 'Confirmat direct de conducere pe WhatsApp'}
                                    </span>
                                  </div>
                                  {memberReq?.reviewedBy && (
                                    <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-data pl-5">
                                      Aprobat de: <strong>{memberReq.reviewedBy}</strong> {memberReq.reviewedAt ? `la ${new Date(memberReq.reviewedAt).toLocaleDateString('ro-RO')}` : ''}
                                    </div>
                                  )}
                                </div>
                              )}

                              {!isPresent && !isExcused && (
                                <div className="space-y-1">
                                  {memberReq && memberReq.status === 'rejected' ? (
                                    <>
                                      <div className="flex items-center gap-1.5 text-rose-900 dark:text-rose-200 font-medium">
                                        <AlertCircle size={13} className="text-rose-600 shrink-0" />
                                        <span>
                                          <strong>Cerere Respinsă:</strong> "{memberReq.rejectReason || 'Neconform'}"
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-rose-800/80 dark:text-rose-300/80 font-data pl-5">
                                        Motiv solicitat inițial de membru: "{memberReq.reason}" • Respins de: <strong>{memberReq.reviewedBy || 'Admin'}</strong>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-medium">
                                      <UserX size={13} className="text-rose-600 shrink-0" />
                                      <span>Absent nemotivat • Nicio cerere de învoire transmisă.</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 self-end md:self-center font-title">
                          <span className={`px-3 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs ${
                            isPresent 
                              ? 'bg-emerald-600 text-white' 
                              : isExcused 
                              ? 'bg-amber-500 text-slate-950 font-extrabold' 
                              : 'bg-rose-600 text-white'
                          }`}>
                            {isPresent ? <UserCheck size={13} /> : isExcused ? <CheckCircle2 size={13} /> : <UserX size={13} />}
                            {isPresent ? 'Prezent' : isExcused ? 'Motivat' : 'Absent Nemotivat'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Rejection Reason Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 font-anthropic">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => { setRejectingReq(null); setRejectReason(''); }}
          />
          <div 
            className="relative bg-white dark:bg-slate-900 rounded-[2px] w-full max-w-md max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 dark:border-slate-800 font-anthropic z-10 touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-5 sm:p-6">
              <h3 className="text-lg font-bold font-anthropicSerif text-slate-900 dark:text-white mb-2">Respinge Cererea</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4 font-anthropic">Te rugăm să introduci motivul pentru care cererea de învoire este respinsă.</p>
              
              <form onSubmit={confirmRejectRequest} className="font-anthropic">
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Motivul respingerii (Obligatoriu)..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[2px] p-3 text-sm text-slate-900 dark:text-slate-100 font-anthropic focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 resize-none h-28 mb-4"
                  required
                />
                
                <div className="flex gap-3 font-title">
                  <button
                    type="button"
                    onClick={() => { setRejectingReq(null); setRejectReason(''); }}
                    className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 btn-civic-danger text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
                  >
                    Confirmă Respingerea
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Attendance Modal */}
      {showFinalizeModal && selectedEvent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 font-anthropic">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowFinalizeModal(false)}
          />
          <div 
            className="relative bg-white dark:bg-slate-900 rounded-[2px] w-full max-w-md max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 dark:border-slate-800 font-anthropic z-10 touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-[2px]">
                  <Clock size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-anthropicSerif text-slate-900 dark:text-white">Finalizare Prezență</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium font-anthropic">{selectedEvent.title}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-[2px] border border-slate-200 dark:border-slate-700 mb-4 font-anthropic">
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold mb-1">Membri marcați PREZENT:</div>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-data">
                  {members.filter(m => m.role !== 'admin' && selectedEvent.rsvps?.[m.id] === 'present').length} membri
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-anthropic">
                  * Orele și punctele se vor adăuga automat în contul fiecărui voluntar prezent, iar sesiunea va fi mutată în Arhivă.
                </div>
              </div>

              <form onSubmit={handleConfirmFinalize} className="font-anthropic">
                <div className="mb-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 font-title">
                    Durata Ședinței (Ore de Voluntariat)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={eventDurationInput}
                      onChange={e => setEventDurationInput(e.target.value)}
                      placeholder="ex: 2.5"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2px] px-3.5 py-2.5 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 text-base font-data"
                      required
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">ore</span>
                  </div>
                </div>

                <div className="flex gap-3 font-title">
                  <button
                    type="button"
                    onClick={() => setShowFinalizeModal(false)}
                    disabled={isFinalizing}
                    className="flex-1 py-2.5 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isFinalizing}
                    className="flex-1 py-2.5 btn-civic-primary text-xs sm:text-sm font-title uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={15} />}
                    Finalizează & Arhivează
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick WhatsApp Excuse Modal */}
      {showWhatsappModal && selectedEvent && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 font-anthropic">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowWhatsappModal(false)}
          />
          <div 
            className="relative bg-white dark:bg-slate-900 rounded-[2px] w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[85vh] max-h-[620px] font-anthropic z-10 overflow-hidden"
          >
            <div className="p-4 sm:p-5 bg-slate-900 text-white shrink-0 font-anthropic border-b border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-[2px] text-emerald-400">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-title text-white">Motivare Rapidă WhatsApp</h3>
                    <p className="text-xs text-slate-300 font-medium">{selectedEvent.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWhatsappModal(false)}
                  className="w-8 h-8 rounded-[2px] bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-anthropic">
                Selectează un voluntar din listă pentru a-i motiva absența direct (confirmată pe WhatsApp), fără formular.
              </p>
            </div>

            <div className="p-4 sm:p-5 flex-1 min-h-0 flex flex-col overflow-hidden font-anthropic bg-white dark:bg-slate-900">
              <div className="relative mb-3.5 shrink-0">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={whatsappSearchTerm}
                  onChange={e => setWhatsappSearchTerm(e.target.value)}
                  placeholder="Caută voluntar după nume..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2px] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 font-anthropic"
                />
              </div>

              <div 
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-2 font-anthropic touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {members
                  .filter(m => !isSystemAccount(m) && m.role !== 'admin')
                  .filter(m => (m.name || '').toLowerCase().includes(whatsappSearchTerm.toLowerCase()))
                  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ro', { sensitivity: 'base' }))
                  .map(m => {
                    const currentStatus = selectedEvent.rsvps?.[m.id];
                    const isExcused = currentStatus === 'excused';
                    return (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-[2px] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800 dark:text-white truncate font-title">
                            {m.name}
                          </div>
                          <div className="text-xs text-slate-500 font-data mt-0.5">
                            {m.committee || 'Membru'} • {isExcused ? <span className="text-amber-500 font-bold">Motivat</span> : 'Nemotivat'}
                          </div>
                        </div>

                        {isExcused ? (
                          <button
                            disabled={isExcusingWhatsapp}
                            onClick={() => handleRevertRequestForMember(m.id)}
                            title="Anulează motivarea pentru acest voluntar"
                            className="px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            <RotateCcw size={13} />
                            Anulează Motivarea
                          </button>
                        ) : (
                          <button
                            disabled={isExcusingWhatsapp}
                            onClick={() => handleQuickWhatsappExcuse(m.id)}
                            className="px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            <MessageSquare size={13} />
                            Motivează (WhatsApp)
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
              <button
                onClick={() => setShowWhatsappModal(false)}
                className="px-4 py-2 btn-civic-secondary text-xs sm:text-sm font-title uppercase tracking-wider cursor-pointer"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
