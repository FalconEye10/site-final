import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ChevronDown, Lock, Loader2, MessageSquare, Search, RotateCcw, Check, X } from 'lucide-react';
import { EventData, AbsenceRequest, fetchAbsenceRequests, saveAbsenceRequest, deleteAbsenceRequest, recordAttendance, fetchEvents, saveEvent, applyMemberScoreAdjustment, isSystemAccount } from '../../../utils/supabaseService';
import { toast } from '../../ui/Toast';
import { triggerAbsencePushNotification } from '../../../utils/pushNotifications';
import { Badge } from '../../ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';

interface AttendanceViewProps {
  members: any[];
  onUpdateMember: (updatedMember: any) => void;
  isAdmin: boolean;
  currentUserId?: string;
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

  const eligibleEvents = events.filter(ev => ev.type === 'meeting').filter(ev => {
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
                className="w-full px-3.5 py-2 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-anthropic"
                required
              >
                <option value="">-- Selectează --</option>
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
            <button type="submit" className="w-full py-2.5 btn-civic-primary text-xs font-title uppercase tracking-wider">
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

export function AttendanceView({ members, onUpdateMember, isAdmin, currentUserId, preselectedEventId }: AttendanceViewProps) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [activeTab, setActiveTab] = useState<'attendance' | 'requests'>('attendance');
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [rejectingReq, setRejectingReq] = useState<AbsenceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [eventDurationInput, setEventDurationInput] = useState('2');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('all');

  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappSearchTerm, setWhatsappSearchTerm] = useState('');
  const [isExcusingWhatsapp, setIsExcusingWhatsapp] = useState(false);

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

    setIsExcusingWhatsapp(true);
    try {
      const whatsappReq: AbsenceRequest = {
        id: `req_wa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        eventId: selectedEvent.id,
        memberId: member.id,
        reason: 'Confirmat pe WhatsApp (Motivare Directă Board)',
        status: 'approved',
        timestamp: new Date().toISOString(),
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

      const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [member.id]: 'excused' } };
      setSelectedEvent(updatedEvent);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      onUpdateMember({ ...member, ...updatedStats });

      triggerAbsencePushNotification('approved', member.id, 'Motivat direct via WhatsApp');
      toast.success(`✅ Absența lui ${member.name} a fost motivată via WhatsApp!`);
    } catch (err) {
      console.error(err);
      toast.error('Eroare la motivarea prin WhatsApp.');
    } finally {
      setIsExcusingWhatsapp(false);
    }
  };

  // Load events
  useEffect(() => {
    async function load() {
      try {
        const evs = await fetchEvents();
        // Sort descending by date
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

  const handleOpenFinalizeModal = () => {
    if (!selectedEvent) return;

    if (!selectedEvent.attendanceClosed) {
      const activeMembers = members.filter(m => !isSystemAccount(m) && m.role !== 'admin');
      let targetMembers = activeMembers;
      if (selectedEvent.isShiftBased && selectedEvent.shifts?.length) {
        targetMembers = activeMembers.filter(m => selectedEvent.shifts!.some(s => s.assignedMembers.includes(m.id)));
      } else if (selectedEvent.type !== 'meeting' && selectedEvent.committees) {
        targetMembers = activeMembers.filter(m => Object.values(selectedEvent.committees!).some(c => c.members.includes(m.id)));
      }

      const unassignedCount = targetMembers.filter(m => (selectedEvent.rsvps?.[m.id] || 'none') === 'none').length;
      if (unassignedCount > 0) {
        toast.error(`Nu poți finaliza: ${unassignedCount} membri repartizați au status nespecificat.`);
        return;
      }
    } else {
      // Toggle reopen
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
      toast.success('Prezența a fost redeschisă pentru editare.');
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
      let targetMembers = activeMembers;
      if (selectedEvent.isShiftBased && selectedEvent.shifts?.length) {
        targetMembers = activeMembers.filter(m => selectedEvent.shifts!.some(s => s.assignedMembers.includes(m.id)));
      } else if (selectedEvent.type !== 'meeting' && selectedEvent.committees) {
        targetMembers = activeMembers.filter(m => Object.values(selectedEvent.committees!).some(c => c.members.includes(m.id)));
      }

      const presentMembers = targetMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'present');

      for (const member of presentMembers) {
        let memberDuration = fallbackHours;
        let shiftName = '';
        if (selectedEvent.isShiftBased && selectedEvent.shifts?.length) {
          const mShift = selectedEvent.shifts.find(s => s.assignedMembers.includes(member.id));
          if (mShift) {
            memberDuration = mShift.hours || fallbackHours;
            shiftName = ` [${mShift.name}]`;
          }
        }
        const pointsToAdd = Math.round(memberDuration * 2);

        const newAdjustment = {
          id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          points: pointsToAdd,
          reason: `Prezență${shiftName} (${memberDuration}h): ${selectedEvent.title}`,
          date: new Date().toISOString(),
          adminName: 'Admin'
        };

        const updatedMember = {
          ...member,
          stats: {
            ...member.stats,
            hours: (member.stats?.hours || 0) + memberDuration,
            projects: (member.stats?.projects || 0) + 1
          },
          score: (member.score || 0) + pointsToAdd,
          scoreAdjustments: [...(member.scoreAdjustments || []), newAdjustment]
        };

        await applyMemberScoreAdjustment(member.id, pointsToAdd, newAdjustment, { hoursDelta: memberDuration, projectsDelta: 1 });
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
      toast.success(`✅ Prezență finalizată! S-au acordat orele și punctele pentru cei ${presentMembers.length} membri prezenți.`);
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
    try {
      const updated = { ...req, status: 'approved' as const, reviewedAt: new Date().toISOString() };
      await saveAbsenceRequest(updated);
      setRequests(prev => prev.map(r => r.id === req.id ? updated : r));

      // Automatically set the member's attendance to 'excused' and increment their excused stats
      const member = members.find(m => m.id === req.memberId);
      if (member && selectedEvent) {
        const currentPresence = selectedEvent.rsvps?.[member.id] || 'none';
        if (currentPresence !== 'excused') {
          let newPresences = member.presences || 0;
          let newExcused = member.excusedAbsences || 0;
          let newUnexcused = member.unexcusedAbsences || 0;

          // Remove old impact
          if (selectedEvent.type === 'meeting') {
            if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
            if (currentPresence === 'excused') newExcused = Math.max(0, newExcused - 1);
            if (currentPresence === 'unexcused' || currentPresence === 'absent') newUnexcused = Math.max(0, newUnexcused - 1);
          } else {
            if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
          }

          // Add new impact (excused)
          if (selectedEvent.type === 'meeting') {
            newExcused += 1;
          }

          const updatedStats = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
          const deltas = {
            presencesDelta: newPresences - (member.presences || 0),
            excusedDelta: newExcused - (member.excusedAbsences || 0),
            unexcusedDelta: newUnexcused - (member.unexcusedAbsences || 0),
          };
          await recordAttendance(selectedEvent.id, member.id, 'excused', deltas);
          
          // Update local event object for UI reflection
          const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [member.id]: 'excused' } };
          setSelectedEvent(updatedEvent);
          setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
          
          // Update member locally in parent
          onUpdateMember({ ...member, ...updatedStats });
        }
      }

      triggerAbsencePushNotification('approved', req.memberId, req.reason);
      toast.success('Cererea a fost aprobată.');
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

    try {
      const updated = { ...rejectingReq, status: 'rejected' as const, reviewedAt: new Date().toISOString(), rejectReason: rejectReason.trim() };
      await saveAbsenceRequest(updated);
      setRequests(prev => prev.map(r => r.id === rejectingReq.id ? updated : r));

      // Revert from excused to none if they were previously excused
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

      triggerAbsencePushNotification('rejected', rejectingReq.memberId, rejectReason.trim());
      toast.success('Cererea a fost respinsă.');
      setRejectingReq(null);
      setRejectReason('');
    } catch (err) {
      toast.error('Eroare la respingere.');
    }
  };

  const handleRevertRequest = async (req: AbsenceRequest) => {
    if (selectedEvent?.attendanceClosed) {
      toast.error('Sesiunea este finalizată. Redeschideți prezența pentru a gestiona cererile.');
      return;
    }
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
      console.error(err);
      toast.error('Eroare la anularea motivării.');
    }
  };

  const handleRevertRequestForMember = async (memberId: string) => {
    if (!selectedEvent) return;
    const req = requests.find(r => r.memberId === memberId && r.eventId === selectedEvent.id);
    if (req) {
      await handleRevertRequest(req);
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
          console.error(err);
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

    // Remove old impact
    if (selectedEvent.type === 'meeting') {
      if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
      if (currentPresence === 'excused') newExcused = Math.max(0, newExcused - 1);
      if (currentPresence === 'unexcused' || currentPresence === 'absent') newUnexcused = Math.max(0, newUnexcused - 1);
    } else {
      if (currentPresence === 'present') newPresences = Math.max(0, newPresences - 1);
    }

    // Add new impact
    if (selectedEvent.type === 'meeting') {
      if (presenceType === 'present') newPresences += 1;
      if (presenceType === 'excused') newExcused += 1;
      if (presenceType === 'unexcused' || presenceType === 'absent') newUnexcused += 1;
    } else {
      if (presenceType === 'present') newPresences += 1;
    }

    // NOTĂ: marcarea prezenței actualizează DOAR contoarele de prezență/absență.
    // Punctele și orele se acordă o singură dată, la finalizarea evenimentului
    // (EventsView.handleFinalize), pe baza membrilor marcați „prezent”. Dacă am
    // acorda scor și aici, membrii ar primi punctaj de două ori pentru aceeași
    // prezență, iar comutarea prezent↔absent ar umfla scorul la nesfârșit.
    const updatedStats: any = { presences: newPresences, excusedAbsences: newExcused, unexcusedAbsences: newUnexcused };
    const deltas = {
      presencesDelta: newPresences - (member.presences || 0),
      excusedDelta: newExcused - (member.excusedAbsences || 0),
      unexcusedDelta: newUnexcused - (member.unexcusedAbsences || 0),
    };

    try {
      await recordAttendance(selectedEvent.id, memberId, presenceType, deltas);
      
      // If marking as present or unexcused/absent, remove any existing absence request
      if (presenceType !== 'excused') {
        const existingReq = requests.find(r => r.memberId === memberId && r.eventId === selectedEvent.id);
        if (existingReq) {
          try {
            await deleteAbsenceRequest(existingReq.id);
            setRequests(prev => prev.filter(r => r.id !== existingReq.id));
          } catch (e) {
            console.error("Error removing absence request on manual mark:", e);
          }
        }
      }

      // Update local event object for UI reflection
      const updatedEvent = { ...selectedEvent, rsvps: { ...selectedEvent.rsvps, [memberId]: presenceType } };
      setSelectedEvent(updatedEvent);
      // We also update the main events array so if they switch and come back it's there
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      
      // Update member locally in parent
      onUpdateMember({ ...member, ...updatedStats });
      
      toast.success('Prezența marcată cu succes!');
    } catch (err) {
      toast.error('Eroare la marcarea prezenței.');
    }
  };

  const isTimeLocked = selectedEvent ? Date.now() < new Date(`${selectedEvent.date}T${selectedEvent.time}`).getTime() : false;
  const isSessionLocked = isTimeLocked || !!selectedEvent?.attendanceClosed;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;



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
    <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-slate-800 rounded-[2px] p-5 sm:p-6 shadow-sm flex flex-col h-full min-h-[500px] font-anthropic">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold font-anthropicSerif text-slate-900 dark:text-white">Gestionare Prezențe</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold mt-1">
            Alege un eveniment pentru a marca prezențele sau a gestiona învoirile.
          </p>
        </div>
        
        <div className="relative w-full md:w-80 shrink-0 font-anthropic">
          {loadingEvents ? (
            <div className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2px] text-xs font-semibold opacity-50">Se încarcă evenimentele...</div>
          ) : (
            <>
              <select 
                className="w-full px-4 py-2.5 rounded-[2px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 appearance-none font-title cursor-pointer"
                onChange={(e) => {
                  const ev = events.find(x => x.id === e.target.value);
                  setSelectedEvent(ev || null);
                  setActiveTab('attendance');
                }}
                value={selectedEvent?.id || ''}
              >
                <option value="">-- Selectează Eveniment --</option>
                {events.filter(e => e.type === 'meeting').map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({new Date(e.date).toLocaleDateString('ro-RO')})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </>
          )}
        </div>
      </div>

      {!selectedEvent ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[2px] p-10 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-xs sm:text-sm font-title">
            Niciun eveniment selectat din listă
          </p>
        </div>
      ) : (
        <motion.div 
          key={selectedEvent.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col flex-1"
        >
          {selectedEvent.attendanceClosed && (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 p-4 sm:p-5 rounded-[2px] mb-6 flex items-start gap-3.5 shrink-0 font-anthropic">
              <Lock className="mt-0.5 shrink-0 text-slate-500" size={20} />
              <div>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-title">Prezență Finalizată (Sesiune Închisă)</p>
                <p className="text-xs sm:text-sm opacity-80 mt-1 font-anthropic">
                  Această sesiune de prezență a fost încheiată de un administrator. Nu mai pot fi efectuate modificări în listă sau cereri.
                </p>
              </div>
            </div>
          )}

          {isTimeLocked && !selectedEvent.attendanceClosed && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 sm:p-5 rounded-[2px] mb-6 flex items-start gap-3.5 shrink-0 font-anthropic">
              <Clock className="mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider font-title">Time Lock Activ</p>
                <p className="text-xs sm:text-sm opacity-80 mt-1 font-anthropic">
                  Evenimentul nu a început încă. Prezențele pot fi marcate doar după data și ora programată.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-4 font-title">
            <div className="flex flex-wrap items-center gap-2.5">
              <button 
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                Lista Prezențe
              </button>
              {selectedEvent.type === 'meeting' && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className={`px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'requests'
                      ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Cereri Învoire</span>
                  {pendingRequestsCount > 0 && (
                    <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-[2px] font-data">{pendingRequestsCount}</span>
                  )}
                </button>
              )}
              {!selectedEvent.attendanceClosed && (
                <button
                  onClick={() => { setWhatsappSearchTerm(''); setShowWhatsappModal(true); }}
                  className="px-4 py-2 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <MessageSquare size={16} /> Confirmat WhatsApp
                </button>
              )}
            </div>

            {!isTimeLocked && !selectedEvent.attendanceClosed && (
              <button
                onClick={handleOpenFinalizeModal}
                className="px-4 py-2 btn-civic-danger text-xs sm:text-sm font-title uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Lock size={15} /> Finalizează Prezența & Adaugă Ore
              </button>
            )}
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2px] border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col font-anthropic">
            {activeTab === 'attendance' && selectedEvent.isShiftBased && selectedEvent.shifts && selectedEvent.shifts.length > 0 && !selectedEvent.attendanceClosed && (
              <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/40 flex flex-wrap items-center gap-2 font-anthropic">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200 mr-1 flex items-center gap-1.5 font-title">
                  <Clock size={14} className="text-purple-600 dark:text-purple-400" /> Filtrează Tura:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedShiftId('all')}
                  className={`px-3.5 py-1.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer font-title uppercase tracking-wider ${
                    selectedShiftId === 'all'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-slate-700 border border-purple-200 dark:border-purple-800'
                  }`}
                >
                  Toate Turele ({selectedEvent.shifts.reduce((sum, s) => sum + (s.assignedMembers?.length || 0), 0)} repartizați)
                </button>
                {selectedEvent.shifts.map((shift) => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setSelectedShiftId(shift.id)}
                    className={`px-3.5 py-1.5 rounded-[2px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 font-title uppercase tracking-wider ${
                      selectedShiftId === shift.id
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-slate-700 border border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    <span>{shift.name}</span>
                    <span className="text-xs opacity-80 font-normal font-data">({shift.assignedMembers?.length || 0}/{shift.maxVolunteers} pers · {shift.hours}h)</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="overflow-y-auto scrollbar-thin p-4 sm:p-5 font-anthropic">
                {selectedEvent.attendanceClosed ? (
                  (() => {
                    const activeMembers = members.filter(m => !isSystemAccount(m) && m.role !== 'admin');
                    let targetMembers = activeMembers;
                    if (selectedEvent.isShiftBased && selectedEvent.shifts?.length) {
                      targetMembers = activeMembers.filter(m => selectedEvent.shifts!.some(s => s.assignedMembers.includes(m.id)));
                    } else if (selectedEvent.type !== 'meeting' && selectedEvent.committees) {
                      targetMembers = activeMembers.filter(m => Object.values(selectedEvent.committees!).some(c => c.members.includes(m.id)));
                    }

                    const total = targetMembers.length;
                    const presentCount = targetMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'present').length;
                    const absentCount = targetMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'absent' || selectedEvent.rsvps?.[m.id] === 'unexcused').length;
                    const excusedCount = targetMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'excused').length;
                    
                    const presentPct = total ? Math.round((presentCount / total) * 100) : 0;
                    const absentPct = total ? Math.round((absentCount / total) * 100) : 0;
                    const excusedPct = total ? Math.round((excusedCount / total) * 100) : 0;

                    return (
                      <div className="flex flex-col gap-6 py-3 px-1 max-w-4xl mx-auto font-anthropic">
                        <div className="flex flex-col md:flex-row items-center gap-5 justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5 md:p-6 rounded-[2px] shadow-xs">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-[2px] flex items-center justify-center shadow-xs border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 size={28} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold font-anthropicSerif text-slate-900 dark:text-white mb-0.5">Rezumat Prezențe</h3>
                              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-[2px] bg-emerald-500"></span>
                                Sesiune finalizată și securizată
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-900 p-4 rounded-[2px] border border-slate-200 dark:border-slate-700 text-center min-w-[140px] shadow-xs">
                            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-data">{presentPct}%</div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1 font-title">Rată de Prezență</div>
                          </div>
                        </div>

                        {/* Bar chart progress */}
                        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[2px] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 font-anthropic">
                          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-title">Grafic Distribuție</h4>
                          <div className="w-full h-7 flex rounded-[2px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                            <div style={{ width: `${presentPct}%` }} className="bg-emerald-500 h-full transition-all duration-1000 flex items-center justify-center overflow-hidden">
                              {presentPct > 5 && <span className="text-xs font-bold text-white font-data">{presentPct}%</span>}
                            </div>
                            <div style={{ width: `${absentPct}%` }} className="bg-rose-500 h-full transition-all duration-1000 flex items-center justify-center overflow-hidden">
                              {absentPct > 5 && <span className="text-xs font-bold text-white font-data">{absentPct}%</span>}
                            </div>
                            <div style={{ width: `${excusedPct}%` }} className="bg-amber-500 h-full transition-all duration-1000 flex items-center justify-center overflow-hidden">
                              {excusedPct > 5 && <span className="text-xs font-bold text-white font-data">{excusedPct}%</span>}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 font-title">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-[2px] bg-emerald-500"></span>
                              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Prezenți ({presentCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-[2px] bg-rose-500"></span>
                              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Absenți ({absentCount})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-[2px] bg-amber-500"></span>
                              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Învoiți ({excusedCount})</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 font-anthropic">
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-[2px] shadow-xs flex flex-col justify-between">
                            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-title uppercase tracking-wider">Membri Repartizați</div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-data">{total}</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-[2px] shadow-xs flex flex-col justify-between">
                            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-title uppercase tracking-wider">Prezenți</div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-data">{presentCount}</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-[2px] shadow-xs flex flex-col justify-between">
                            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-title uppercase tracking-wider">Absenți</div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-rose-500 font-data">{absentCount}</div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-[2px] shadow-xs flex flex-col justify-between">
                            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-title uppercase tracking-wider">Motivați</div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-amber-500 font-data">{excusedCount}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : members.length === 0 ? (
                  <p className="text-center text-sm opacity-50 py-8 font-anthropic">Nu există membri în baza de date.</p>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-sm font-title">
                      <TableRow>
                        <TableHead className="py-3 px-4 font-bold text-xs sm:text-sm uppercase tracking-wider">Membru</TableHead>
                        <TableHead className="py-3 px-4 font-bold text-xs sm:text-sm uppercase tracking-wider">Status Curent</TableHead>
                        <TableHead className="py-3 px-4 text-right font-bold text-xs sm:text-sm uppercase tracking-wider">Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members
                        .filter(m => !isSystemAccount(m) && m.role !== 'admin')
                        .filter(m => {
                          if (selectedEvent.isShiftBased && selectedEvent.shifts?.length) {
                            if (selectedShiftId === 'all') {
                              return selectedEvent.shifts.some(s => s.assignedMembers.includes(m.id));
                            }
                            const currShift = selectedEvent.shifts.find(s => s.id === selectedShiftId);
                            return currShift ? currShift.assignedMembers.includes(m.id) : false;
                          }
                          if (selectedEvent.type === 'meeting') return true;
                          if (!selectedEvent.committees) return false;
                          return Object.values(selectedEvent.committees).some(c => c.members.includes(m.id));
                        })
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(m => {
                          const status = selectedEvent.rsvps?.[m.id] || 'none';
                          const hasPendingRequest = requests.some(r => r.memberId === m.id && r.status === 'pending');
                          const isButtonLocked = isSessionLocked || hasPendingRequest;
                          const assignedShift = selectedEvent.isShiftBased && selectedEvent.shifts
                            ? selectedEvent.shifts.find(s => s.assignedMembers.includes(m.id))
                            : null;

                          return (
                            <TableRow key={m.id} className="group border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                              <TableCell className="py-3 px-4 flex items-center gap-3">
                                <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} className="w-9 h-9 rounded-[2px] border border-slate-200 dark:border-white/10" alt="" />
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-white text-sm sm:text-base block font-title">{m.name}</span>
                                  {assignedShift && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-purple-100 text-purple-900 text-xs font-bold mt-0.5 font-data">
                                      {assignedShift.name} ({assignedShift.hours}h)
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                {status === 'present' && <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700/50 shadow-xs font-title uppercase tracking-wider"><CheckCircle2 size={14} /> PREZENT</div>}
                                {(status === 'absent' || status === 'unexcused') && <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold text-xs border border-rose-300 dark:border-rose-700/50 shadow-xs font-title uppercase tracking-wider"><XCircle size={14} /> ABSENT</div>}
                                {status === 'excused' && <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300 dark:border-amber-700/50 shadow-xs font-title uppercase tracking-wider"><Clock size={14} /> MOTIVAT</div>}
                                {status === 'none' && <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs border border-slate-200 dark:border-slate-700 border-dashed opacity-70 font-title uppercase tracking-wider"> NESPECIFICAT</div>}
                              </TableCell>
                              <TableCell className="text-right py-3 px-4">
                                <div className="flex justify-end items-center gap-2 font-title">
                                  {selectedEvent.type === 'meeting' ? (
                                    <>
                                      {hasPendingRequest && <span className="text-xs sm:text-sm font-bold text-amber-500 mr-2 flex items-center"><Clock size={13} className="mr-1"/> În așteptare</span>}
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'present')}
                                        className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${status === 'present' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 border border-cyan-300' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:border-cyan-200 dark:hover:border-cyan-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >Prezent</button>
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'absent')}
                                        className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${status === 'absent' || status === 'unexcused' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border border-rose-300' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >Absent</button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'present')}
                                        className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${status === 'present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >Prezent</button>
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'absent')}
                                        className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${status === 'absent' || status === 'unexcused' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >Absent</button>
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'excused')}
                                        className={`px-3.5 py-1.5 rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${status === 'excused' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >Motivat</button>
                                    </>
                                  )}
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
              <div className="overflow-y-auto scrollbar-thin p-4 sm:p-5 font-anthropic">
                {loadingRequests ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : requests.length === 0 ? (
                  <p className="text-center text-sm opacity-50 py-8 font-anthropic">Nu există cereri de învoire pentru acest eveniment.</p>
                ) : (
                  <div className="space-y-3 font-anthropic">
                    {requests.map(req => {
                      const member = members.find(m => m.id === req.memberId);
                      const memberName = member?.name || 'Membru';
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
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <Check size={14} /> Aprobă
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(req)}
                                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <X size={14} /> Respinge
                                </button>
                              </>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider ${
                                req.status === 'approved' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {req.status === 'approved' ? 'Aprobat' : 'Respins'}
                              </span>
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

      {rejectingReq && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 overflow-y-auto overscroll-contain p-2.5 sm:p-4 flex min-h-full items-center justify-center font-anthropic">
          <div 
            className="bg-white dark:bg-slate-900 rounded-[2px] w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 dark:border-slate-800 font-anthropic my-auto touch-pan-y"
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

      {showFinalizeModal && selectedEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 overflow-y-auto overscroll-contain p-2.5 sm:p-4 flex min-h-full items-center justify-center font-anthropic">
          <div 
            className="bg-white dark:bg-slate-900 rounded-[2px] w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] overflow-y-auto overscroll-contain shadow-2xl border border-slate-200 dark:border-slate-800 font-anthropic my-auto touch-pan-y"
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
                  * Orele se vor adăuga automat doar în contul celor marcați prezent.
                </div>
              </div>

              <form onSubmit={handleConfirmFinalize} className="font-anthropic">
                <div className="mb-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 font-title">
                    Durata Evenimentului (Ore de Voluntariat)
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
                    Finalizează & Adaugă Orele
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showWhatsappModal && selectedEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 overflow-y-auto overscroll-contain p-2.5 sm:p-4 flex min-h-full items-center justify-center font-anthropic">
          <div 
            className="bg-white dark:bg-slate-900 rounded-[2px] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] font-anthropic my-auto touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-5 bg-slate-900 text-white shrink-0 font-anthropic">
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
              <p className="text-xs sm:text-sm text-slate-300 mt-1 font-anthropic">
                Selectează un voluntar din listă pentru a-i motiva absența direct (confirmată pe WhatsApp), fără formular.
              </p>
            </div>

            <div className="p-5 flex-1 flex flex-col overflow-hidden font-anthropic">
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

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 font-anthropic">
                {members
                  .filter(m => m.role !== 'admin')
                  .filter(m => m.name.toLowerCase().includes(whatsappSearchTerm.toLowerCase()))
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
                            className="px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw size={13} />
                            Anulează Motivarea
                          </button>
                        ) : (
                          <button
                            disabled={isExcusingWhatsapp}
                            onClick={() => handleQuickWhatsappExcuse(m.id)}
                            className="px-3 py-1.5 rounded-[2px] text-xs font-bold font-title uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
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

            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
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
