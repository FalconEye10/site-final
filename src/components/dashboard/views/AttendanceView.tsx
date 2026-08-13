import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ChevronDown, Lock, Loader2, MessageSquare, Search, RotateCcw } from 'lucide-react';
import { EventData, AbsenceRequest, fetchAbsenceRequests, saveAbsenceRequest, deleteAbsenceRequest, recordAttendance, fetchEvents, saveEvent, applyMemberScoreAdjustment } from '../../../utils/supabaseService';
import { toast } from '../../ui/Toast';
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
      <div className="admin-card text-brand-accent space-y-6">
        <h2 className="text-2xl font-bold">Situație Prezențe</h2>
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 rounded-md bg-amber-200 text-amber-900 font-extrabold text-xs uppercase">Statut Board / Admin</span>
            <span className="font-bold text-sm">Exonerat de la evidența prezențelor</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
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
    <div className="admin-card text-brand-accent">
      <h2 className="text-2xl font-bold mb-6">Situație Prezențe</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
          <div className="text-sm text-slate-500 font-semibold mb-1">Prezențe</div>
          <div className="text-2xl font-bold text-sky-700">{member?.presences || 0}</div>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="text-sm text-slate-500 font-semibold mb-1">Învoiri</div>
          <div className="text-2xl font-bold text-emerald-700">{member?.excusedAbsences || 0}</div>
        </div>
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
          <div className="text-sm text-slate-500 font-semibold mb-1">Absențe Nemotivate</div>
          <div className="text-2xl font-bold text-rose-700">{member?.unexcusedAbsences || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold mb-4">Trimite Cerere de Învoire</h3>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Alege Evenimentul</label>
              <select 
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="admin-input"
                required
              >
                <option value="">-- Selectează --</option>
                {eligibleEvents.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title} ({new Date(ev.date).toLocaleDateString('ro-RO')})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Motivul Absenței</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="admin-input h-24 resize-none"
                placeholder="Ex: Sunt plecat din localitate..."
                required
              />
            </div>
            <button type="submit" className="w-full py-2.5 btn-stitch-primary text-xs font-bold">
              Trimite Cererea
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Istoric Cereri</h3>
          {loading ? (
            <p className="text-slate-500">Se încarcă...</p>
          ) : requests.length === 0 ? (
            <p className="text-slate-500 italic">Nu ai trimis nicio cerere.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {requests.map(req => {
                const ev = events.find(e => e.id === req.eventId);
                return (
                  <div key={req.id} className="p-4 border border-slate-200 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">{ev?.title || 'Eveniment Necunoscut'}</div>
                      <Badge 
                        variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}
                      >
                        {req.status === 'approved' ? 'Aprobat' : req.status === 'rejected' ? 'Respins' : 'În Așteptare'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">{req.reason}</p>
                    {req.status === 'rejected' && req.rejectReason && (
                      <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                        <p className="text-xs font-bold text-rose-800 mb-1">Motiv Respingere:</p>
                        <p className="text-sm text-rose-700 italic">{req.rejectReason}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
                      <span>Trimis: {new Date(req.timestamp).toLocaleDateString('ro-RO')}</span>
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancelPendingRequest(req.id)}
                          className="text-rose-600 hover:text-rose-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
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
      const unassignedCount = members.filter(m => m.role !== 'admin').filter(m => (selectedEvent.rsvps?.[m.id] || 'none') === 'none').length;
      if (unassignedCount > 0) {
        toast.error(`Nu poți finaliza: ${unassignedCount} membri au status nespecificat.`);
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

    const durationHours = parseFloat(eventDurationInput);
    if (isNaN(durationHours) || durationHours <= 0) {
      toast.error('Te rugăm să introduci o durată validă în ore (ex: 2.5).');
      return;
    }

    setIsFinalizing(true);
    try {
      const activeMembers = members.filter(m => m.role !== 'admin');
      const presentMembers = activeMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'present');
      const pointsToAdd = Math.round(durationHours * 2);

      for (const member of presentMembers) {
        const newAdjustment = {
          id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          points: pointsToAdd,
          reason: `Prezență eveniment (${durationHours}h): ${selectedEvent.title}`,
          date: new Date().toISOString(),
          adminName: 'Admin'
        };

        const updatedMember = {
          ...member,
          stats: {
            ...member.stats,
            hours: (member.stats?.hours || 0) + durationHours,
            projects: (member.stats?.projects || 0) + 1
          },
          score: (member.score || 0) + pointsToAdd,
          scoreAdjustments: [...(member.scoreAdjustments || []), newAdjustment]
        };

        await applyMemberScoreAdjustment(member.id, pointsToAdd, newAdjustment, { hoursDelta: durationHours, projectsDelta: 1 });
        if (onUpdateMember) {
          onUpdateMember(updatedMember);
        }
      }

      const updatedEvent = { 
        ...selectedEvent, 
        attendanceClosed: true,
        durationHours 
      };
      await saveEvent(updatedEvent);
      setSelectedEvent(updatedEvent);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      setShowFinalizeModal(false);
      toast.success(`✅ Prezență finalizată! S-au adăugat +${durationHours}h de voluntariat pentru cei ${presentMembers.length} membri prezenți.`);
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
    <div className="admin-card flex flex-col h-full min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-brand-accent">Gestionare Prezențe</h2>
          <p className="text-sm opacity-60 font-semibold mt-1">
            Alege un eveniment pentru a marca prezențele sau a gestiona învoirile.
          </p>
        </div>
        
        <div className="relative w-full md:w-72 shrink-0">
          {loadingEvents ? (
            <div className="w-full p-3 bg-white/50 backdrop-blur-sm border border-brand-muted/10 rounded-xl text-sm font-semibold opacity-50">Se încarcă evenimentele...</div>
          ) : (
            <>
              <select 
                className="admin-input appearance-none bg-white/50 backdrop-blur-sm font-bold"
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-accent/40 pointer-events-none" size={16} />
            </>
          )}
        </div>
      </div>

      {!selectedEvent ? (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-brand-muted/10 rounded-2xl p-10 bg-white/30">
          <p className="text-brand-accent/40 font-bold tracking-wider uppercase text-sm">
            Niciun eveniment selectat
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
            <div className="bg-slate-100 border border-slate-300 text-slate-800 p-4 rounded-2xl mb-6 flex items-start gap-3 shrink-0">
              <Lock className="mt-0.5 shrink-0 text-slate-500" size={18} />
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-700">Prezență Finalizată (Sesiune Închisă)</p>
                <p className="text-sm font-semibold opacity-80 mt-1">
                  Această sesiune de prezență a fost încheiată de un administrator. Nu mai pot fi efectuate modificări în listă sau cereri.
                </p>
              </div>
            </div>
          )}

          {isTimeLocked && !selectedEvent.attendanceClosed && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl mb-6 flex items-start gap-3 shrink-0">
              <Clock className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="text-sm font-bold uppercase tracking-wider">Time Lock Activ</p>
                <p className="text-sm font-semibold opacity-80 mt-1">
                  Evenimentul nu a început încă. Prezențele pot fi marcate doar după data și ora programată.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 shrink-0 border-b border-brand-muted/5 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setActiveTab('attendance')}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-brand-primary text-brand-accent shadow-sm' : 'bg-white/40 text-brand-accent/60 hover:bg-white/60 border border-brand-muted/5'}`}
              >
                Lista Prezențe
              </button>
              {selectedEvent.type === 'meeting' && (
                <button 
                  onClick={() => setActiveTab('requests')}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'bg-brand-primary text-brand-accent shadow-sm' : 'bg-white/40 text-brand-accent/60 hover:bg-white/60 border border-brand-muted/5'}`}
                >
                  Cereri Învoire 
                  {pendingRequestsCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingRequestsCount}</span>
                  )}
                </button>
              )}
              {!selectedEvent.attendanceClosed && (
                <button
                  onClick={() => { setWhatsappSearchTerm(''); setShowWhatsappModal(true); }}
                  className="px-4 py-2.5 rounded-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-emerald-500"
                >
                  <MessageSquare size={16} /> Confirmat pe WhatsApp
                </button>
              )}
            </div>

            {!isTimeLocked && !selectedEvent.attendanceClosed && (
              <button
                onClick={handleOpenFinalizeModal}
                className="px-6 py-2.5 btn-stitch-danger text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Lock size={16} /> Finalizează Prezența & Adaugă Ore
              </button>
            )}
          </div>

          <div className="flex-1 admin-card bg-white shadow-xl overflow-hidden flex flex-col">
            {activeTab === 'attendance' && (
              <div className="overflow-y-auto scrollbar-thin pr-2">
                {selectedEvent.attendanceClosed ? (
                  (() => {
                    const activeMembers = members.filter(m => m.role !== 'admin');
                    const total = activeMembers.length;
                    const presentCount = activeMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'present').length;
                    const absentCount = activeMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'absent' || selectedEvent.rsvps?.[m.id] === 'unexcused').length;
                    const excusedCount = activeMembers.filter(m => selectedEvent.rsvps?.[m.id] === 'excused').length;
                    
                    const presentPct = total ? Math.round((presentCount / total) * 100) : 0;
                    const absentPct = total ? Math.round((absentCount / total) * 100) : 0;
                    const excusedPct = total ? Math.round((excusedCount / total) * 100) : 0;
                    
                    const totalRequests = requests.length;
                    const approvedReq = requests.filter(r => r.status === 'approved').length;
                    const rejectedReq = requests.filter(r => r.status === 'rejected').length;

                    return (
                      <div className="flex flex-col gap-8 py-6 px-2 h-full max-w-4xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-white border border-brand-muted/10 p-6 md:p-8 rounded-3xl shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-20 h-20 bg-brand-primary/20 text-brand-accent rounded-2xl flex items-center justify-center shadow-sm border border-brand-primary/30 rotate-3">
                              <CheckCircle2 size={40} className="-rotate-3" />
                            </div>
                            <div>
                              <h3 className="text-3xl font-black text-brand-accent mb-1">Rezumat Prezențe</h3>
                              <p className="text-sm font-bold opacity-60 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Sesiune finalizată și securizată
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center min-w-[140px]">
                            <div className="text-4xl font-black text-brand-accent">{presentPct}%</div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-accent/60 mt-1">Rată de Prezență</div>
                          </div>
                        </div>

                        {/* Bar chart progress */}
                        <div className="bg-white p-6 rounded-3xl border border-brand-muted/10 shadow-sm">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-brand-accent/50 mb-4">Grafic Distribuție</h4>
                          <div className="w-full h-8 flex rounded-xl overflow-hidden border border-brand-muted/5 shadow-inner">
                            <div style={{ width: `${presentPct}%` }} className="bg-emerald-400 h-full transition-all duration-1000 flex items-center justify-center overflow-hidden">
                              {presentPct > 5 && <span className="text-[10px] font-bold text-emerald-900">{presentPct}%</span>}
                            </div>
                            <div style={{ width: `${absentPct}%` }} className="bg-rose-400 h-full transition-all duration-1000 flex items-center justify-center overflow-hidden">
                              {absentPct > 5 && <span className="text-[10px] font-bold text-rose-900">{absentPct}%</span>}
                            </div>
                            <div style={{ width: `${excusedPct}%` }} className="bg-amber-400 h-full transition-all duration-1000 flex items-center justify-center overflow-hidden">
                              {excusedPct > 5 && <span className="text-[10px] font-bold text-amber-900">{excusedPct}%</span>}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-md bg-emerald-400"></span>
                              <span className="text-xs font-bold text-brand-accent/70">Prezenți</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-md bg-rose-400"></span>
                              <span className="text-xs font-bold text-brand-accent/70">Absenți Nemotivați</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-md bg-amber-400"></span>
                              <span className="text-xs font-bold text-brand-accent/70">Învoiți (Motivați)</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white border-l-4 border-l-slate-400 border border-y-brand-accent/5 border-r-brand-accent/5 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                              <div className="text-sm font-bold text-brand-accent/50 mb-2">Membri Total</div>
                              <div className="text-3xl sm:text-4xl font-black text-slate-700">{total}</div>
                          </div>
                          <div className="bg-white border-l-4 border-l-emerald-400 border border-y-brand-accent/5 border-r-brand-accent/5 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                              <div className="text-sm font-bold text-brand-accent/50 mb-2">Prezenți</div>
                              <div className="text-3xl sm:text-4xl font-black text-emerald-600">{presentCount}</div>
                          </div>
                          <div className="bg-white border-l-4 border-l-rose-400 border border-y-brand-accent/5 border-r-brand-accent/5 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                              <div className="text-sm font-bold text-brand-accent/50 mb-2">Absenți</div>
                              <div className="text-3xl sm:text-4xl font-black text-rose-500">{absentCount}</div>
                          </div>
                          <div className="bg-white border-l-4 border-l-amber-400 border border-y-brand-accent/5 border-r-brand-accent/5 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                              <div className="text-sm font-bold text-brand-accent/50 mb-2">Motivați</div>
                              <div className="text-3xl sm:text-4xl font-black text-amber-500">{excusedCount}</div>
                          </div>
                        </div>

                        {selectedEvent.type === 'meeting' && (
                          <div className="bg-white/40 border border-brand-muted/10 p-5 rounded-3xl mt-2 shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-brand-accent/50 mb-4 flex items-center gap-2">
                              <Clock size={16} /> Statistici Învoiri
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-black text-brand-accent">{totalRequests}</div>
                                <div className="text-[10px] font-bold uppercase text-brand-accent/50 mt-1">Total Cereri</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-black text-emerald-600">{approvedReq}</div>
                                <div className="text-[10px] font-bold uppercase text-brand-accent/50 mt-1">Aprobate</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-black text-rose-500">{rejectedReq}</div>
                                <div className="text-[10px] font-bold uppercase text-brand-accent/50 mt-1">Respinse</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : members.length === 0 ? (
                  <p className="text-center text-sm opacity-50 py-10">Nu există membri în baza de date.</p>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="pb-3 pt-1">Membru</TableHead>
                        <TableHead className="pb-3 pt-1">Status Curent</TableHead>
                        <TableHead className="pb-3 pt-1 text-right">Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members
                        .filter(m => m.role !== 'admin')
                        .filter(m => {
                          if (selectedEvent.type === 'meeting') return true;
                          if (!selectedEvent.committees) return false;
                          return Object.values(selectedEvent.committees).some(c => c.members.includes(m.id));
                        })
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(m => {
                          const status = selectedEvent.rsvps?.[m.id] || 'none';
                          const hasPendingRequest = requests.some(r => r.memberId === m.id && r.status === 'pending');
                          const isButtonLocked = isSessionLocked || hasPendingRequest;

                          return (
                            <TableRow key={m.id} className="group">
                              <TableCell className="flex items-center gap-3">
                                <img src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 dark:bg-transparent" alt="" />
                                <span className="font-bold text-slate-800 dark:text-white text-[15px]">{m.name}</span>
                              </TableCell>
                              <TableCell>
                                {status === 'present' && <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-black text-xs border-2 border-emerald-200 dark:border-emerald-700/50 shadow-sm"><CheckCircle2 size={16} /> PREZENT</div>}
                                {(status === 'absent' || status === 'unexcused') && <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-black text-xs border-2 border-rose-200 dark:border-rose-700/50 shadow-sm"><XCircle size={16} /> ABSENT</div>}
                                {status === 'excused' && <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-black text-xs border-2 border-amber-200 dark:border-amber-700/50 shadow-sm"><Clock size={16} /> MOTIVAT</div>}
                                {status === 'none' && <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs border-2 border-slate-200 dark:border-slate-700 border-dashed opacity-70"> NESPECIFICAT</div>}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  {selectedEvent.type === 'meeting' ? (
                                    <>
                                      {hasPendingRequest && <span className="text-xs font-bold text-amber-500 mr-2 flex items-center"><Clock size={12} className="mr-1"/> În așteptare</span>}
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'present')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${status === 'present' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:border-cyan-200 dark:hover:border-cyan-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >Prezent</button>
                                      <button 
                                        disabled={isButtonLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'unexcused')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${status === 'unexcused' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >Absent</button>
                                      {status === 'excused' ? (
                                        <button 
                                          disabled={isSessionLocked || isExcusingWhatsapp}
                                          onClick={() => handleRevertRequestForMember(m.id)}
                                          title="Anulează motivarea și resetează statusul"
                                          className="px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          <RotateCcw size={13} /> Anulează Motivarea
                                        </button>
                                      ) : (
                                        <button 
                                          disabled={isButtonLocked || isExcusingWhatsapp}
                                          onClick={() => handleQuickWhatsappExcuse(m.id)}
                                          title="Motivează rapid absența confirmată pe WhatsApp (fără formular)"
                                          className="px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                          <MessageSquare size={13} /> Motivat (WhatsApp)
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        disabled={isSessionLocked}
                                        onClick={() => handleMarkAttendance(m.id, 'present')}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${status === 'present' ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'} disabled:opacity-50`}
                                      >Validare (+5 pct)</button>
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

            {activeTab === 'requests' && selectedEvent.type === 'meeting' && (
              <div className="overflow-y-auto scrollbar-thin pr-2">
                {loadingRequests ? (
                  <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-muted/5 shadow-sm">
                      <Clock size={24} className="text-brand-accent/20" />
                    </div>
                    <p className="text-sm font-bold opacity-50">Nu există cereri de învoire pentru acest eveniment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requests.map(req => {
                      const member = members.find(m => m.id === req.memberId);
                      return (
                        <div key={req.id} className="admin-card p-5 flex flex-col gap-4 relative hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <img src={member?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name || 'U')}`} className="w-10 h-10 rounded-full border border-brand-muted/10" alt="" />
                              <div>
                                <div className="text-[15px] font-bold text-brand-accent leading-tight">{member?.name || 'Membru Necunoscut'}</div>
                                <div className="text-[10px] text-brand-accent/50 font-bold uppercase tracking-wider mt-0.5">{new Date(req.timestamp).toLocaleString('ro-RO')}</div>
                              </div>
                            </div>
                            <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'neutral'}>
                              {req.status === 'approved' ? 'Aprobat' : req.status === 'rejected' ? 'Respins' : 'În Așteptare'}
                            </Badge>
                          </div>
                          <div className="bg-white/40 p-4 rounded-xl text-[13px] text-brand-accent/80 font-['Manrope'] font-medium border border-brand-muted/5 italic">
                            "{req.reason}"
                          </div>
                          {req.status === 'pending' ? (
                            <div className="flex gap-2 mt-auto pt-2 border-t border-brand-muted/5">
                              <button 
                                disabled={isSessionLocked}
                                onClick={() => handleApproveRequest(req)}
                                className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle2 size={16} /> Aprobă
                              </button>
                              <button 
                                disabled={isSessionLocked}
                                onClick={() => handleRejectRequest(req)}
                                className="flex-1 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <XCircle size={16} /> Respinge
                              </button>
                              <button 
                                disabled={isSessionLocked}
                                onClick={() => handleRevertRequest(req)}
                                title="Anulează/Șterge această cerere"
                                className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <RotateCcw size={14} /> Anulează
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2 mt-auto pt-2 border-t border-brand-muted/5">
                              <button 
                                disabled={isSessionLocked}
                                onClick={() => handleRevertRequest(req)}
                                title="Anulează motivarea și resetează cererea"
                                className="py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <RotateCcw size={14} /> Anulează Motivarea (Revert)
                              </button>
                            </div>
                          )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-brand-accent mb-4">Respinge Cererea</h3>
              <p className="text-sm text-brand-accent/60 mb-6">Te rugăm să introduci motivul pentru care cererea de învoire este respinsă.</p>
              
              <form onSubmit={confirmRejectRequest}>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Motivul respingerii (Obligatoriu)..."
                  className="w-full bg-white border border-brand-muted/10 rounded-2xl p-4 text-brand-accent font-['Manrope'] focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none h-32 mb-6"
                  required
                />
                
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setRejectingReq(null); setRejectReason(''); }}
                    className="flex-1 py-2.5 btn-stitch-secondary text-xs font-bold"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 btn-stitch-danger text-xs font-bold"
                  >
                    Confirmă
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showFinalizeModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Finalizare Prezență</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedEvent.title}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5">
                <div className="text-xs text-slate-600 font-semibold mb-1">Membri marcați PREZENT:</div>
                <div className="text-2xl font-black text-emerald-600">
                  {members.filter(m => m.role !== 'admin' && selectedEvent.rsvps?.[m.id] === 'present').length} membri
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  * Orele se vor adăuga automat doar în contul celor marcați prezent.
                </div>
              </div>

              <form onSubmit={handleConfirmFinalize}>
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
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
                      className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg"
                      required
                    />
                    <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-400">ore</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFinalizeModal(false)}
                    disabled={isFinalizing}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isFinalizing}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={16} />}
                    Finalizează & Adaugă Orele
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showWhatsappModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <MessageSquare size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-white">Motivare Rapidă WhatsApp</h3>
                    <p className="text-xs text-emerald-100 font-medium">{selectedEvent.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWhatsappModal(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-emerald-50 opacity-90 mt-2">
                Selectează un voluntar din listă pentru a-i motiva absența direct (confirmată pe WhatsApp), fără formular.
              </p>
            </div>

            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="relative mb-4 shrink-0">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={whatsappSearchTerm}
                  onChange={e => setWhatsappSearchTerm(e.target.value)}
                  placeholder="Caută voluntar după nume..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {members
                  .filter(m => m.role !== 'admin')
                  .filter(m => m.name.toLowerCase().includes(whatsappSearchTerm.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(m => {
                    const status = selectedEvent.rsvps?.[m.id] || 'none';
                    const isExcused = status === 'excused';

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                            className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700"
                            alt=""
                          />
                          <div>
                            <div className="text-sm font-extrabold text-slate-900 dark:text-white">{m.name}</div>
                            <div className="text-[11px] font-bold text-slate-500">
                              Status: {status === 'present' ? 'Prezent' : isExcused ? 'Motivat (Învoit)' : status === 'unexcused' ? 'Absent' : 'Nespecificat'}
                            </div>
                          </div>
                        </div>

                        {isExcused ? (
                          <button
                            disabled={isExcusingWhatsapp}
                            onClick={() => handleRevertRequestForMember(m.id)}
                            title="Anulează motivarea pentru acest voluntar"
                            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <RotateCcw size={14} />
                            Anulează Motivarea
                          </button>
                        ) : (
                          <button
                            disabled={isExcusingWhatsapp}
                            onClick={() => handleQuickWhatsappExcuse(m.id)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <MessageSquare size={14} />
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
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
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
