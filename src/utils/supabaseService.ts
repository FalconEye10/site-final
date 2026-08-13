import { supabase } from '../supabase';
import { calculateDebt } from './finance';

/**
 * Verifică dacă un membru este un cont tehnic de sistem (admin tehnic sau registrul de audit)
 */
export function isSystemAccount(m: any): boolean {
  if (!m) return true;
  const username = (m.username || '').toLowerCase().trim();
  const id = (m.id || '').toUpperCase().trim();
  const name = (m.name || '').toLowerCase().trim();
  return (
    username === 'admin' ||
    username === 'sys_audit_logs' ||
    id === 'SYS_AUDIT_LOGS' ||
    id === 'M058' ||
    name === 'admin' ||
    name === 'system audit records'
  );
}

// Preia toți membrii din Supabase (excluzând conturile tehnice de sistem)
export async function fetchMembers(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('members').select('*');
    if (error) throw error;
    return (data || []).filter((m: any) => !isSystemAccount(m));
  } catch (error) {
    console.error("Error fetching members from Supabase:", error);
    return [];
  }
}

// Actualizează datele unui membru (ex: totalPaid)
export async function updateMemberInDB(member: any): Promise<void> {
  try {
    const { error } = await supabase.from('members').upsert(member);
    if (error) throw error;
  } catch (error) {
    console.error("Error updating member in Supabase:", error);
    throw error;
  }
}

/**
 * Scrie DOAR câmpurile date pe un membru, fără a atinge restul documentului.
 */
export async function updateMemberFields(memberId: string, fields: Record<string, any>): Promise<void> {
  try {
    const { error } = await supabase
      .from('members')
      .update(fields)
      .eq('id', memberId.toString());
    if (error) throw error;
  } catch (error) {
    console.error("Error updating member fields in Supabase:", error);
    throw error;
  }
}

/**
 * Șterge un membru din Supabase.
 * Păstrează chitanțele și semnăturile plăților istorice în tabela 'payments' (unlinking memberId),
 * eliminând definitiv datoria și contul membrului.
 */
export async function deleteMemberFromDB(memberId: string): Promise<void> {
  try {
    // 1. Deconectăm memberId-ul din plățile efectuate pentru a păstra chitanțele și semnăturile în rapoartele istorice
    await supabase.from('payments').update({ memberId: null }).eq('memberId', memberId.toString());
    
    // 2. Ștergem cererile de absență asociate
    await supabase.from('absence_requests').delete().eq('memberId', memberId.toString());

    // 3. Ștergem membrul propriu-zis
    const { error } = await supabase.from('members').delete().eq('id', memberId.toString());
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting member from Supabase:", error);
    throw error;
  }
}


export const MAX_SCORE_ADJUSTMENT = 35;
export const MIN_SCORE_ADJUSTMENT = -35;

export interface ScoreAdjustment {
  id: string;
  points: number;
  reason: string;
  date: string;
  adminName: string;
  adminUsername?: string;
  adminId?: string;
  targetMemberId?: string;
  targetMemberName?: string;
}

export interface ScoreAuditLog {
  id: string;
  adminId?: string;
  adminName: string;
  adminUsername?: string;
  targetMemberId?: string;
  targetMemberName?: string;
  action: 'ADDED' | 'SUBTRACTED' | 'REVERTED' | 'MEMBER_CREATE' | 'MEMBER_DELETE' | 'PASSWORD_CHANGE' | 'PAYMENT_ADD' | 'PAYMENT_REVERT' | string;
  points?: number;
  reason: string;
  createdAt: string;
}

/**
 * Salvează un buștean de audit (Audit Log) în Supabase
 */
export async function logScoreAudit(log: Omit<ScoreAuditLog, 'id' | 'createdAt'>): Promise<void> {
  try {
    const auditEntry: ScoreAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminId: log.adminId || undefined,
      adminName: log.adminName || 'Admin',
      adminUsername: log.adminUsername || undefined,
      targetMemberId: log.targetMemberId || '',
      targetMemberName: log.targetMemberName || 'Sistem',
      action: log.action,
      points: log.points || 0,
      reason: log.reason,
      createdAt: new Date().toISOString()
    };

    const { data: sysSnap } = await supabase
      .from('members')
      .select('stats')
      .eq('id', 'SYS_AUDIT_LOGS')
      .single();

    const currentLogs = Array.isArray(sysSnap?.stats?.logs) ? sysSnap.stats.logs : [];
    const updatedLogs = [auditEntry, ...currentLogs].slice(0, 1000);

    await supabase.from('members').upsert({
      id: 'SYS_AUDIT_LOGS',
      name: 'System Audit Records',
      username: 'sys_audit_logs',
      role: 'admin',
      stats: { logs: updatedLogs }
    });
  } catch (err) {
    console.warn("Error logging score audit:", err);
  }
}

/**
 * Preia toate jurnalele de audit pentru punctaj (doar pentru admini)
 */
export async function fetchScoreAuditLogs(): Promise<ScoreAuditLog[]> {
  try {
    const { data: sysSnap } = await supabase
      .from('members')
      .select('stats')
      .eq('id', 'SYS_AUDIT_LOGS')
      .single();

    const sysLogs: ScoreAuditLog[] = Array.isArray(sysSnap?.stats?.logs) ? sysSnap.stats.logs : [];

    const { data: membersData } = await supabase
      .from('members')
      .select('id, name, scoreAdjustments')
      .neq('id', 'SYS_AUDIT_LOGS');

    const compiledMap = new Map<string, ScoreAuditLog>();
    sysLogs.forEach(l => compiledMap.set(l.id, l));

    if (membersData) {
      membersData.forEach((m: any) => {
        const adjustments = m.scoreAdjustments || [];
        adjustments.forEach((adj: any) => {
          if (adj.id && !compiledMap.has(adj.id)) {
            compiledMap.set(adj.id, {
              id: adj.id,
              adminId: adj.adminId,
              adminName: adj.adminName || 'Admin',
              adminUsername: adj.adminUsername,
              targetMemberId: m.id,
              targetMemberName: m.name || 'Membru',
              action: adj.action || (adj.points >= 0 ? 'ADDED' : 'SUBTRACTED'),
              points: adj.points || 0,
              reason: adj.reason || 'Fără motiv',
              createdAt: adj.date || new Date().toISOString()
            });
          }
        });
      });
    }

    return Array.from(compiledMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return [];
  }
}

/**
 * Aplică o ajustare de scor (și, opțional, ore/proiecte) pe un membru.
 * Limitează punctajul la maxim +35 și minim -35 per acțiune (conform ghidului de punctare).
 */
export async function applyMemberScoreAdjustment(
  memberId: string,
  pointsDelta: number,
  adjustments: ScoreAdjustment | ScoreAdjustment[],
  extra?: { hoursDelta?: number; projectsDelta?: number }
): Promise<void> {
  // Limita de securitate conform ghidului de punctare (Max: 35, Min: -35)
  if (pointsDelta > MAX_SCORE_ADJUSTMENT || pointsDelta < MIN_SCORE_ADJUSTMENT) {
    throw new Error(`Punctajul acordat sau scăzut la o singură ajustare trebuie să fie între ${MIN_SCORE_ADJUSTMENT} și +${MAX_SCORE_ADJUSTMENT} puncte.`);
  }

  try {
    const { data: member, error: fetchErr } = await supabase
      .from('members')
      .select('name, score, scoreAdjustments, stats')
      .eq('id', memberId.toString())
      .single();

    if (fetchErr) throw fetchErr;

    const list = Array.isArray(adjustments) ? adjustments : [adjustments];
    const currentScore = Number(member?.score || 0);
    const currentAdjustments = Array.isArray(member?.scoreAdjustments) ? member.scoreAdjustments : [];
    const currentStats = member?.stats || {};

    const updatedStats = { ...currentStats };
    if (extra?.hoursDelta) {
      updatedStats.hours = (Number(updatedStats.hours) || 0) + extra.hoursDelta;
    }
    if (extra?.projectsDelta) {
      updatedStats.projects = (Number(updatedStats.projects) || 0) + extra.projectsDelta;
    }

    const { error: updateErr } = await supabase
      .from('members')
      .update({
        score: currentScore + pointsDelta,
        scoreAdjustments: [...currentAdjustments, ...list],
        stats: updatedStats
      })
      .eq('id', memberId.toString());

    if (updateErr) throw updateErr;

    // Logăm în Audit Log pentru fiecare ajustare
    for (const adj of list) {
      await logScoreAudit({
        adminId: adj.adminId,
        adminName: adj.adminName || 'Admin',
        adminUsername: adj.adminUsername,
        targetMemberId: memberId,
        targetMemberName: member.name || 'Membru',
        action: pointsDelta >= 0 ? 'ADDED' : 'SUBTRACTED',
        points: pointsDelta,
        reason: adj.reason
      });
    }
  } catch (error) {
    console.error("Error applying score adjustment in Supabase:", error);
    throw error;
  }
}

/**
 * Anulează (revert) o ajustare de scor specifică a unui membru.
 */
export async function revertMemberScoreAdjustment(
  memberId: string,
  adjustmentId: string,
  adminInfo: { name: string; username?: string; id?: string }
): Promise<{ newScore: number; updatedAdjustments: ScoreAdjustment[] }> {
  try {
    const { data: member, error: fetchErr } = await supabase
      .from('members')
      .select('name, score, scoreAdjustments')
      .eq('id', memberId.toString())
      .single();

    if (fetchErr || !member) throw new Error("Membrul nu a fost găsit.");

    const currentAdjustments: ScoreAdjustment[] = Array.isArray(member.scoreAdjustments) ? member.scoreAdjustments : [];
    const targetAdj = currentAdjustments.find(a => a.id === adjustmentId);

    if (!targetAdj) {
      throw new Error("Ajustarea de punctaj specificată nu a fost găsită.");
    }

    const updatedAdjustments = currentAdjustments.filter(a => a.id !== adjustmentId);
    const pointsToRemove = targetAdj.points || 0;
    const newScore = (member.score || 0) - pointsToRemove;

    const { error: updateErr } = await supabase
      .from('members')
      .update({
        score: newScore,
        scoreAdjustments: updatedAdjustments
      })
      .eq('id', memberId.toString());

    if (updateErr) throw updateErr;

    // Înregistrăm acțiunea de REVERT în jurnalul de audit
    await logScoreAudit({
      adminId: adminInfo.id,
      adminName: adminInfo.name || 'Admin',
      adminUsername: adminInfo.username,
      targetMemberId: memberId,
      targetMemberName: member.name || 'Membru',
      action: 'REVERTED',
      points: -pointsToRemove,
      reason: `ANULAT: ${targetAdj.reason} (${pointsToRemove > 0 ? '+' : ''}${pointsToRemove} pct)`
    });

    return { newScore, updatedAdjustments };
  } catch (error) {
    console.error("Error reverting score adjustment:", error);
    throw error;
  }
}


// ==========================================
// TREASURY & PAYMENTS (STRICT RULES)
// ==========================================

export interface TreasuryPayment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  month: string;
  date: string;
  createdAt?: any;
  memberSignature: string; // Base64 JPEG Compressed
  treasurerSignature: string; // Base64 JPEG Compressed
}

/**
 * Crează plata în tabela 'payments' și updatează `totalPaid` pe membrul parinte.
 */
export async function processTreasuryPayment(
  memberId: string,
  paymentDoc: TreasuryPayment
): Promise<{ newTotalPaid: number; newStatus: string }> {
  try {
    const { data: memberSnap, error: fetchErr } = await supabase
      .from('members')
      .select('joinDate, totalPaid')
      .eq('id', memberId.toString())
      .single();

    if (fetchErr || !memberSnap) throw new Error("Membrul nu a fost găsit.");

    const currentTotalPaid = Number(memberSnap.totalPaid || 0);
    const newTotalPaid = currentTotalPaid + paymentDoc.amount;
    const newDebt = calculateDebt(memberSnap.joinDate, newTotalPaid);
    const newStatus = newDebt > 0 ? 'debtor' : 'active';

    const { error: paymentErr } = await supabase
      .from('payments')
      .upsert({
        ...paymentDoc,
        memberId: memberId.toString(),
        createdAt: new Date().toISOString()
      });

    if (paymentErr) throw paymentErr;

    const { error: memberErr } = await supabase
      .from('members')
      .update({ totalPaid: newTotalPaid, status: newStatus })
      .eq('id', memberId.toString());

    if (memberErr) throw memberErr;

    return { newTotalPaid, newStatus };
  } catch (error) {
    console.error("Error processing treasury payment:", error);
    throw error;
  }
}

/**
 * Preia toate plățile din tabela 'payments'.
 */
export async function fetchAllTreasuryPayments(): Promise<TreasuryPayment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as TreasuryPayment[];
  } catch (error) {
    console.error("Error fetching all treasury payments:", error);
    return [];
  }
}

/**
 * Preia plățile doar pentru un singur membru.
 */
export async function fetchTreasuryPaymentsForMember(memberId: string): Promise<TreasuryPayment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('memberId', memberId.toString())
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as TreasuryPayment[];
  } catch (error) {
    console.error(`Error fetching treasury payments for member ${memberId}:`, error);
    return [];
  }
}

/**
 * Revert STRICT doar pentru ultima plată înregistrată.
 */
export async function revertLatestTreasuryPayment(
  memberId: string,
  paymentId: string,
  paymentAmount: number
): Promise<{ newTotalPaid: number; newStatus: string }> {
  try {
    const { data: memberSnap, error: fetchErr } = await supabase
      .from('members')
      .select('joinDate, totalPaid')
      .eq('id', memberId.toString())
      .single();

    if (fetchErr || !memberSnap) throw new Error("Membrul nu a fost găsit.");

    const currentTotalPaid = Number(memberSnap.totalPaid || 0);
    const newTotalPaid = Math.max(0, currentTotalPaid - paymentAmount);
    const newDebt = calculateDebt(memberSnap.joinDate, newTotalPaid);
    const newStatus = newDebt > 0 ? 'debtor' : 'active';

    const { error: delErr } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (delErr) throw delErr;

    const { error: memberErr } = await supabase
      .from('members')
      .update({ totalPaid: newTotalPaid, status: newStatus })
      .eq('id', memberId.toString());

    if (memberErr) throw memberErr;

    return { newTotalPaid, newStatus };
  } catch (error) {
    console.error("Error reverting treasury payment:", error);
    throw error;
  }
}

// ==========================================
// EVENTS OPERATIONS
// ==========================================

export interface EventData {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endDate?: string;
  endTime?: string;
  location: string;
  type: 'meeting' | 'project' | 'social' | 'other';
  description: string;
  rsvps: Record<string, string>;
  attendanceClosed?: boolean;
  committees?: Record<string, {
    name: string;
    description: string;
    coordinatorId: string | null;
    members: string[];
    hours?: number;
  }>;
}

export async function fetchEvents(): Promise<EventData[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*');

    if (error) throw error;
    const list = (data || []) as EventData[];
    return list.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return dateA - dateB;
    });
  } catch (error) {
    console.error("Error fetching events from Supabase:", error);
    return [];
  }
}

export async function saveEvent(event: EventData): Promise<void> {
  try {
    const { error } = await supabase.from('events').upsert(event);
    if (error) throw error;
  } catch (error) {
    console.error("Error saving event to Supabase:", error);
    throw error;
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting event from Supabase:", error);
    throw error;
  }
}

// ==========================================
// ABSENCE REQUESTS OPERATIONS
// ==========================================

export interface AbsenceRequest {
  id: string;
  eventId: string;
  memberId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectReason?: string | null;
}

export async function fetchAbsenceRequests(eventId?: string): Promise<AbsenceRequest[]> {
  try {
    const { data, error } = await supabase.from('absence_requests').select('*');
    if (error) throw error;
    const list = (data || []) as AbsenceRequest[];
    if (eventId) {
      return list.filter(r => r.eventId === eventId);
    }
    return list;
  } catch (error) {
    console.error("Error fetching absence requests from Supabase:", error);
    return [];
  }
}

export async function saveAbsenceRequest(request: AbsenceRequest): Promise<void> {
  try {
    const { error } = await supabase.from('absence_requests').upsert(request);
    if (error) throw error;
  } catch (error) {
    console.error("Error saving absence request to Supabase:", error);
    throw error;
  }
}

// ==========================================
// ATTENDANCE TRANSACTIONS
// ==========================================

export async function recordAttendance(
  eventId: string,
  memberId: string,
  presenceType: string,
  deltas: {
    presencesDelta: number,
    excusedDelta: number,
    unexcusedDelta: number
  }
): Promise<void> {
  try {
    const { data: event, error: eventFetchErr } = await supabase
      .from('events')
      .select('rsvps')
      .eq('id', eventId)
      .single();

    if (eventFetchErr) throw eventFetchErr;

    const rsvps = { ...(event?.rsvps || {}) };
    rsvps[memberId] = presenceType;

    const { error: eventUpdateErr } = await supabase
      .from('events')
      .update({ rsvps })
      .eq('id', eventId);

    if (eventUpdateErr) throw eventUpdateErr;

    if (deltas.presencesDelta || deltas.excusedDelta || deltas.unexcusedDelta) {
      const { data: member, error: memberFetchErr } = await supabase
        .from('members')
        .select('presences, excusedAbsences, unexcusedAbsences')
        .eq('id', memberId)
        .single();

      if (!memberFetchErr && member) {
        const presences = Math.max(0, (Number(member.presences) || 0) + deltas.presencesDelta);
        const excusedAbsences = Math.max(0, (Number(member.excusedAbsences) || 0) + deltas.excusedDelta);
        const unexcusedAbsences = Math.max(0, (Number(member.unexcusedAbsences) || 0) + deltas.unexcusedDelta);

        await supabase
          .from('members')
          .update({ presences, excusedAbsences, unexcusedAbsences })
          .eq('id', memberId);
      }
    }
  } catch (error) {
    console.error("Error recording attendance in Supabase:", error);
    throw error;
  }
}
