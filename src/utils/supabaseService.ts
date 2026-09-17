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

const officialClubMembersRoster = [
  "Andraș Andreea (Role: member)",
  "Popa Ioana (Role: admin)",
  "Abiculesei Alessia (Role: member)",
  "Paisa Anastasia (Role: member)",
  "Dorneanu Mădălina (Role: member)",
  "Amatioaiei Ioana (Role: member)",
  "Apetrei Sofia (Role: member)",
  "Beșu Ioana (Role: member)",
  "Cacciola Anastasia (Role: admin)",
  "Căruntu Ruxandra (Role: admin)",
  "Ciurea Alex (Role: member)",
  "Crușitu Mihnea (Role: member)",
  "Enache Diana (Role: member)",
  "Filimon Teodora (Role: member)",
  "Ifrim Luca (Role: member)",
  "Ioniță Daria (Role: member)",
  "Marunțelu Alex (Role: member)",
  "Măzare Sofia (Role: admin)",
  "Miron Maya (Role: member)",
  "Onțanu Vanessa (Role: member)",
  "Orcheanu Maria (Role: member)",
  "Pascaru Rareș (Role: admin)",
  "Radu Sabin (Role: member)",
  "Radu Teodora (Role: member)",
  "Răducanu Maya (Role: member)",
  "Zugravu Rareș (Role: member)",
  "Alungulesei Darius (Role: member)",
  "Ariton Bogdan (Role: member)",
  "Huhulea Miruna (Role: member)",
  "Lăpușneanu David (Role: member)",
  "Lupu Miruna (Role: member)",
  "Manole Iustin (Role: member)",
  "Micu Ingrid (Role: member)",
  "Mihuț Alexandra (Role: member)",
  "Negru Maia (Role: member)",
  "Poenaru Cristiana (Role: member)",
  "Stîngaciu Mario (Role: member)",
  "Timofte Tudor (Role: member)",
  "Timofte Teodora (Role: admin)",
  "Timoscov Roxana (Role: member)",
  "Ursache Stefania (Role: member)",
  "Mihalache Mara (Role: member)",
  "Corfă Tudor (Role: member)",
  "Mancas Ilinca (Role: member)",
  "Stan Stefan (Role: admin)",
  "Enache Denisa (Role: member)",
  "Sandu Emilia (Role: member)",
  "Solomon Luiza Ștefania (Role: member)",
  "Rusei Catrina (Role: member)",
  "Mocanu Matei (Role: member)",
  "Raduc Riana (Role: member)",
  "Tatomir Bianca (Role: member)",
  "Alexa Dragoș (Role: member)",
  "Diac Evelina (Role: member)",
  "Vicol Amalia (Role: member)",
  "Beca Rareș (Role: member)",
  "Mihut Călin (Role: member)",
  "Chetreanu Olivia (Role: member)",
  "Pascali Roberto (Role: member)",
  "Filimon Ianis (Role: member)",
  "Ududec Răzvan (Role: member)",
  "Mocanu Mihai (Role: member)",
  "Luncanu Iustin (Role: member)",
  "Ștefan Jucan (Role: member)",
  "Crăciun Eric (Role: member)",
  "Ciobanu Karina (Role: member)",
  "Bour Nicole (Role: member)",
  "Mitrea Matei (Role: member)",
  "Cociorba Ștefan (Role: member)",
  "Moroșanu Ana Francesca (Role: member)",
  "Pascaru Alexandra (Role: member)",
  "Baboi Maya (Role: member)",
  "Mihnea Matei (Role: member)"
];

function getOfficialClubRoster(): any[] {
  let counter = 1;
  return officialClubMembersRoster.map(raw => {
    const match = raw.match(/(.+?)\s+\(Role:\s+(\w+)\)/);
    const fullName = match ? match[1].trim() : raw;
    const role = match ? match[2].trim() : 'member';
    const username = fullName.toLowerCase().replace(/\s+/g, '.').replace(/ț/g, 't').replace(/ș/g, 's').replace(/ă/g, 'a').replace(/î/g, 'i').replace(/â/g, 'a');
    const isStefan = username === 'stan.stefan';
    const isBoardAdmin = isStefan || role === 'admin';
    const id = `M${counter.toString().padStart(3, '0')}`;
    counter++;

    return {
      id,
      name: fullName,
      username,
      role: isBoardAdmin ? 'admin' : role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=101D34&color=FAF9F5`,
      nickname: fullName.split(' ')[0] || fullName,
      email: `${username}@club.ro`,
      joinDate: '2026-05-01T00:00:00Z',
      presences: 0,
      excusedAbsences: 0,
      unexcusedAbsences: 0,
      attendanceRate: '100%',
      qualification: 'Maxim',
      status: 'active',
      totalPaid: 0,
      totalDebt: 0,
      stats: { totalHours: 0 },
      login_count: 0,
      has_seen_tutorial: false,
      committee: isBoardAdmin ? 'Board Executiv' : 'Comitet Voluntariat',
      boardPosition: isStefan ? 'Președinte' : (role === 'admin' ? 'Membru Board' : undefined)
    };
  });
}

// Preia toți membrii direct din Supabase și sincronizează automat plățile reale din tabela 'payments'
export async function fetchMembers(): Promise<any[]> {
  try {
    const [membersRes, paymentsRes] = await Promise.allSettled([
      supabase.from('members').select('*'),
      supabase.from('payments').select('*').order('date', { ascending: false })
    ]);

    const membersData = membersRes.status === 'fulfilled' && !membersRes.value.error && membersRes.value.data
      ? membersRes.value.data
      : [];

    const paymentsData: any[] = paymentsRes.status === 'fulfilled' && !paymentsRes.value.error && paymentsRes.value.data
      ? paymentsRes.value.data
      : [];

    if (membersData.length > 0) {
      const filtered = membersData.filter((m: any) => !isSystemAccount(m));
      if (filtered.length > 0) {
        // Enriched members with guaranteed accurate payment synchronization
        return filtered.map((m: any) => {
          const mNameClean = (m.name || '').toLowerCase().trim();
          const mUserClean = (m.username || '').toLowerCase().trim();
          const mIdClean = (m.id || '').toUpperCase().trim();

          const memPayments = paymentsData.filter((p: any) => {
            const pMemId = (p.memberId || '').toUpperCase().trim();
            const pMemName = (p.memberName || '').toLowerCase().trim();
            return (
              pMemId === mIdClean ||
              pMemId === mUserClean ||
              (pMemName && (pMemName === mNameClean || mNameClean.includes(pMemName) || pMemName.includes(mNameClean)))
            );
          });

          const pSum = memPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          const safeTotalPaid = Math.max(Number(m.totalPaid || 0), pSum);
          const dynamicDebt = calculateDebt(m.joinDate, safeTotalPaid);
          const isPassive = m.status === 'pasiv' || m.status === 'passive';

          return {
            ...m,
            totalPaid: safeTotalPaid,
            totalDebt: dynamicDebt,
            payments: memPayments,
            status: isPassive ? 'passive' : (dynamicDebt === 0 ? 'active' : 'debtor')
          };
        });
      }
    }
    return getOfficialClubRoster();
  } catch (error) {
    console.warn("Eroare la citirea membrilor din Supabase, se folosește registrul oficial:", error);
    return getOfficialClubRoster();
  }
}

const VALID_MEMBER_COLUMNS = new Set([
  'id', 'name', 'email', 'phone', 'role', 'committee', 'status', 'joinDate',
  'totalPaid', 'avatar', 'stats', 'customFields',
  'createdAt', 'boardPosition', 'address', 'payments', 'attendanceRate',
  'qualification', 'totalDebt', 'nickname', 'presences', 'excusedAbsences',
  'unexcusedAbsences', 'username', 'login_count', 'has_seen_tutorial',
  'user_id', 'hours'
]);

function sanitizeMemberPayload(payload: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (VALID_MEMBER_COLUMNS.has(key) && key !== 'password') {
      sanitized[key] = value;
    } else if (key === 'customMilestones') {
      sanitized.stats = { ...(sanitized.stats || {}), customMilestones: value };
    }
  }
  return sanitized;
}

// Actualizează datele unui membru (ex: totalPaid)
export async function updateMemberInDB(member: any): Promise<void> {
  try {
    const cleanMember = sanitizeMemberPayload(member);
    const { error } = await supabase.from('members').upsert(cleanMember);
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
    const cleanFields = sanitizeMemberPayload(fields);
    if (Object.keys(cleanFields).length === 0) return;

    const { error } = await supabase
      .from('members')
      .update(cleanFields)
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


export interface AuditLog {
  id: string;
  adminId?: string;
  adminName: string;
  adminUsername?: string;
  targetMemberId?: string;
  targetMemberName?: string;
  action: 'MEMBER_CREATE' | 'MEMBER_DELETE' | 'PASSWORD_CHANGE' | 'PAYMENT_ADD' | 'PAYMENT_REVERT' | string;
  points?: number;
  reason: string;
  createdAt: string;
}

export type ScoreAuditLog = AuditLog;

/**
 * Salvează un log de audit în tabela 'members' (sub documentul SYS_AUDIT_LOGS)
 */
export async function logSystemAudit(log: Partial<AuditLog> & { action: string; reason: string }): Promise<void> {
  try {
    const auditEntry: AuditLog = {
      id: log.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminId: log.adminId || undefined,
      adminName: log.adminName || 'Admin',
      adminUsername: log.adminUsername || undefined,
      targetMemberId: log.targetMemberId || '',
      targetMemberName: log.targetMemberName || 'Sistem',
      action: log.action as any,
      points: log.points || 0,
      reason: log.reason,
      createdAt: log.createdAt || new Date().toISOString()
    };

    const { data: sysSnap } = await supabase
      .from('budget_archives')
      .select('data')
      .eq('id', 'SYSTEM_AUDIT_LOGS')
      .maybeSingle();

    const currentLogs: AuditLog[] = Array.isArray(sysSnap?.data?.logs) ? sysSnap.data.logs : [];
    
    // Prevent inserting exact duplicates into SYS_AUDIT_LOGS
    const isDuplicate = currentLogs.some(l => 
      l.id === auditEntry.id || 
      (l.targetMemberId === auditEntry.targetMemberId && 
       l.action === auditEntry.action && 
       l.reason === auditEntry.reason &&
       Math.abs(new Date(l.createdAt).getTime() - new Date(auditEntry.createdAt).getTime()) < 3000)
    );

    if (isDuplicate) {
      return;
    }

    const updatedLogs = [auditEntry, ...currentLogs].slice(0, 1000);

    await supabase.from('budget_archives').upsert({
      id: 'SYSTEM_AUDIT_LOGS',
      data: { logs: updatedLogs }
    });
  } catch (err) {
    console.warn("Error logging system audit:", err);
  }
}

export const logScoreAudit = logSystemAudit;

/**
 * Preia toate jurnalele de audit din întreg sistemul (Plăți, Membri, Învoiri, Proiecte, Sugestii, Kudos)
 */
export async function fetchSystemAuditLogs(): Promise<AuditLog[]> {
  try {
    const { data: sysSnap } = await supabase
      .from('budget_archives')
      .select('data')
      .eq('id', 'SYSTEM_AUDIT_LOGS')
      .maybeSingle();

    const sysLogs: AuditLog[] = Array.isArray(sysSnap?.data?.logs) ? sysSnap.data.logs : [];

    const { data: membersData } = await supabase
      .from('members')
      .select('id, name, nickname, username, role, boardPosition')
      .neq('id', 'SYS_AUDIT_LOGS');

    // Build comprehensive lookup for real admin names and nicknames
    const memberLookup = new Map<string, { name: string; nickname?: string; username?: string }>();
    if (membersData) {
      membersData.forEach((m: any) => {
        const info = { name: m.name, nickname: m.nickname, username: m.username };
        if (m.id) memberLookup.set(m.id.toLowerCase(), info);
        if (m.username) memberLookup.set(m.username.toLowerCase(), info);
        if (m.name) memberLookup.set(m.name.toLowerCase(), info);
      });
    }

    const resolveAdmin = (rawAdminName?: string, adminId?: string, adminUsername?: string): { name: string; username?: string } => {
      if (adminId && memberLookup.has(adminId.toLowerCase())) {
        const m = memberLookup.get(adminId.toLowerCase())!;
        return { name: m.nickname || m.name, username: m.username || adminUsername };
      }
      if (adminUsername && memberLookup.has(adminUsername.toLowerCase())) {
        const m = memberLookup.get(adminUsername.toLowerCase())!;
        return { name: m.nickname || m.name, username: m.username || adminUsername };
      }
      if (rawAdminName && memberLookup.has(rawAdminName.toLowerCase())) {
        const m = memberLookup.get(rawAdminName.toLowerCase())!;
        return { name: m.nickname || m.name, username: m.username || adminUsername };
      }
      if (rawAdminName && rawAdminName.trim() !== '' && rawAdminName !== 'Admin' && rawAdminName !== 'Sistem' && rawAdminName !== 'Trezorier' && rawAdminName !== 'Board') {
        return { name: rawAdminName, username: adminUsername };
      }
      if (rawAdminName === 'Trezorier' || rawAdminName === 'Casierie') {
        return { name: 'Trezorerie / Încasări', username: adminUsername || 'trezorerie' };
      }
      if (rawAdminName === 'Board' || rawAdminName === 'Conducere') {
        return { name: 'Conducere / Board', username: adminUsername || 'board' };
      }
      if (rawAdminName === 'Sistem') {
        return { name: 'Sistem Automat', username: 'sistem' };
      }
      return { name: rawAdminName || 'Conducere / Admin', username: adminUsername || 'admin' };
    };

    // Fetch payments to ensure financial transactions always appear in master audit
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .order('date', { ascending: false });

    // Fetch absence requests
    const { data: absenceData } = await supabase
      .from('absence_requests')
      .select('*');

    // Fetch project proposals
    const { data: proposalData } = await supabase
      .from('project_proposals')
      .select('*');

    // Fetch suggestions
    const { data: suggestionData } = await supabase
      .from('suggestions')
      .select('*');

    // Fetch kudos
    const { data: kudosData } = await supabase
      .from('kudos')
      .select('*');

    const compiledMap = new Map<string, ScoreAuditLog>();
    
    // 1. Add system audit records (Authoritative) with resolved admin names
    sysLogs.forEach(l => {
      if (l && l.id) {
        const resolved = resolveAdmin(l.adminName, l.adminId, l.adminUsername);
        compiledMap.set(l.id, {
          ...l,
          adminName: resolved.name,
          adminUsername: resolved.username || l.adminUsername
        });
      }
    });

    // Helper to check if duplicate already exists in compiledMap
    const isAlreadyPresent = (targetId: string, action: string, points: number, reason: string, timeIso: string) => {
      const targetTime = new Date(timeIso).getTime();
      for (const existing of compiledMap.values()) {
        if (
          existing.targetMemberId === targetId &&
          existing.action === action &&
          existing.points === points &&
          (existing.reason === reason || existing.reason?.includes(reason) || reason?.includes(existing.reason)) &&
          Math.abs(new Date(existing.createdAt).getTime() - targetTime) < 5000
        ) {
          return true;
        }
      }
      return false;
    };


    // 3. Add payments (Dues / Cotizații)
    if (paymentsData) {
      paymentsData.forEach((p: any) => {
        const payId = `pay_${p.id}`;
        if (!compiledMap.has(payId)) {
          const time = p.date || p.createdAt || new Date().toISOString();
          if (!isAlreadyPresent(p.memberId, 'PAYMENT', p.amount || 0, p.month, time)) {
            const resolved = resolveAdmin(p.recordedBy || 'Mădălina Dorneanu', p.treasurerId, 'dorneanu.madalina');
            compiledMap.set(payId, {
              id: payId,
              adminName: resolved.name,
              adminUsername: resolved.username || 'dorneanu.madalina',
              targetMemberId: p.memberId,
              targetMemberName: p.memberName || 'Membru',
              action: 'PAYMENT',
              points: p.amount || 0,
              reason: `Cotizație achitată: ${p.month} — ${p.amount} RON (Chitanță: ${p.id})`,
              createdAt: time
            });
          }
        }
      });
    }

    // 4. Add absence requests
    if (absenceData) {
      absenceData.forEach((a: any) => {
        const absId = `abs_${a.id}`;
        if (!compiledMap.has(absId)) {
          const time = a.reviewedAt || a.timestamp || new Date().toISOString();
          
          let actorName = 'Conducere / Board';
          let actorUsername: string | undefined = undefined;
          const actorId: string | undefined = a.reviewedById;

          if (a.status === 'pending') {
            const memberInfo = memberLookup.get((a.memberId || '').toLowerCase());
            actorName = memberInfo?.name || a.memberName || 'Membru';
            actorUsername = memberInfo?.username;
          } else if (a.reviewedBy || a.reviewedById || a.reviewedByUsername) {
            const resolved = resolveAdmin(a.reviewedBy, a.reviewedById, a.reviewedByUsername);
            actorName = resolved.name;
            actorUsername = resolved.username;
          }

          compiledMap.set(absId, {
            id: absId,
            adminId: actorId,
            adminName: actorName,
            adminUsername: actorUsername,
            targetMemberId: a.memberId,
            targetMemberName: a.memberName || memberLookup.get((a.memberId || '').toLowerCase())?.name || 'Membru',
            action: a.status === 'approved' ? 'ABSENCE_APPROVED' : a.status === 'rejected' ? 'ABSENCE_REJECTED' : 'ABSENCE_REQUEST',
            points: 0,
            reason: a.status === 'approved'
              ? (a.reason?.startsWith('Confirmat pe WhatsApp') 
                  ? a.reason 
                  : `Învoire aprobată de ${actorName}: "${a.reason || 'Confirmat'}"`)
              : a.status === 'rejected'
              ? `Învoire respinsă de ${actorName} (Motiv respingere: "${a.rejectReason || 'Respins'}")`
              : `Cerere învoire trimisă de membru: "${a.reason || 'Fără motiv specificat'}"`,
            createdAt: time
          });
        }
      });
    }

    // 5. Add Project Proposals
    if (proposalData) {
      proposalData.forEach((pr: any) => {
        const prId = `prop_${pr.id}`;
        if (!compiledMap.has(prId)) {
          const time = pr.createdAt || new Date().toISOString();
          const resolved = resolveAdmin(pr.authorName, pr.authorId, undefined);
          compiledMap.set(prId, {
            id: prId,
            adminName: resolved.name,
            adminUsername: resolved.username,
            targetMemberId: pr.authorId,
            targetMemberName: pr.authorName,
            action: 'PROJECT_PROPOSAL',
            points: 0,
            reason: `Propunere Proiect (${pr.status || 'în analiză'}): "${pr.title}" - Buget: ${pr.budget || 0} RON`,
            createdAt: time
          });
        }
      });
    }

    // 6. Add Suggestions
    if (suggestionData) {
      suggestionData.forEach((s: any) => {
        const sugId = `sug_${s.id}`;
        if (!compiledMap.has(sugId)) {
          const time = s.created_at || s.createdAt || new Date().toISOString();
          const resolved = s.is_anonymous ? { name: 'Anonim' } : resolveAdmin(s.member_name, s.member_id, undefined);
          compiledMap.set(sugId, {
            id: sugId,
            adminName: resolved.name,
            adminUsername: resolved.username,
            targetMemberId: s.member_id,
            targetMemberName: s.is_anonymous ? 'Anonim' : s.member_name,
            action: 'SUGGESTION',
            points: 0,
            reason: `Casetă Sugestii (${s.category || 'general'}): "${s.content?.substring(0, 80)}${s.content?.length > 80 ? '...' : ''}"`,
            createdAt: time
          });
        }
      });
    }

    // 7. Add Kudos
    if (kudosData) {
      kudosData.forEach((k: any) => {
        const kId = `kudos_${k.id}`;
        if (!compiledMap.has(kId)) {
          const time = k.created_at || k.createdAt || new Date().toISOString();
          const resolved = resolveAdmin(k.from_name, undefined, undefined);
          compiledMap.set(kId, {
            id: kId,
            adminName: resolved.name,
            adminUsername: resolved.username,
            targetMemberId: k.recipient_id || k.to_id,
            targetMemberName: k.recipient_name || k.to_name,
            action: 'KUDOS',
            points: 0,
            reason: `Kudos (${k.badge_type || 'Apreciere'}): "${k.message?.substring(0, 80)}" de la ${k.from_name}`,
            createdAt: time
          });
        }
      });
    }

    return Array.from(compiledMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error fetching master audit logs:", err);
    return [];
  }
}

export const fetchScoreAuditLogs = fetchSystemAuditLogs;

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
  recordedBy?: string;
  treasurerId?: string;
  treasurerUsername?: string;
}

/**
 * Crează plata în tabela 'payments', updatează `totalPaid` & `status` pe membrul părinte și înregistrează în jurnalul de audit.
 */
export async function processTreasuryPayment(
  memberId: string,
  paymentDoc: TreasuryPayment
): Promise<{ newTotalPaid: number; newStatus: string }> {
  try {
    const { data: memberSnap, error: fetchErr } = await supabase
      .from('members')
      .select('joinDate, totalPaid, status, name, nickname, username')
      .eq('id', memberId.toString())
      .single();

    if (fetchErr || !memberSnap) throw new Error("Membrul nu a fost găsit.");

    const currentTotalPaid = Number(memberSnap.totalPaid || 0);
    const paymentAmount = Number(paymentDoc.amount || 15);
    const newTotalPaid = currentTotalPaid + paymentAmount;
    
    // Recalculăm datoria rămasă pentru a actualiza statusul membrului
    const remainingDebt = calculateDebt(memberSnap.joinDate, newTotalPaid);
    const currentStatus = memberSnap.status || 'active';
    let updatedStatus = currentStatus;
    if (currentStatus !== 'pasiv' && currentStatus !== 'admin') {
      updatedStatus = remainingDebt === 0 ? 'active' : 'debtor';
    }

    const paymentPayload = {
      id: paymentDoc.id,
      memberId: memberId.toString(),
      memberName: memberSnap.name || memberSnap.nickname || paymentDoc.memberName || 'Membru',
      amount: paymentAmount,
      month: paymentDoc.month,
      date: paymentDoc.date || new Date().toISOString(),
      memberSignature: paymentDoc.memberSignature,
      treasurerSignature: paymentDoc.treasurerSignature,
      recordedBy: paymentDoc.recordedBy || null,
      treasurerId: paymentDoc.treasurerId || null,
      treasurerUsername: paymentDoc.treasurerUsername || null,
      createdAt: new Date().toISOString()
    };

    const { error: paymentErr } = await supabase
      .from('payments')
      .upsert(paymentPayload);

    if (paymentErr) throw paymentErr;

    const { error: memberErr } = await supabase
      .from('members')
      .update({ totalPaid: newTotalPaid, status: updatedStatus })
      .eq('id', memberId.toString());

    if (memberErr) throw memberErr;

    // Înregistrare imediată în Jurnalul de Audit Executiv
    const memberDisplayName = memberSnap.name || memberSnap.nickname || paymentDoc.memberName || 'Membru';
    await logScoreAudit({
      id: `audit_pay_${paymentDoc.id}`,
      adminId: paymentDoc.treasurerId,
      adminName: paymentDoc.recordedBy || 'Trezorier',
      adminUsername: paymentDoc.treasurerUsername,
      targetMemberId: memberId.toString(),
      targetMemberName: memberDisplayName,
      action: 'PAYMENT',
      points: paymentAmount,
      reason: `Încasare cotizație: ${paymentDoc.month} — ${paymentAmount} RON (Chitanță: ${paymentDoc.id})`
    });

    return { newTotalPaid, newStatus: updatedStatus };
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
    const cleanId = memberId.toString().trim();
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .or(`memberId.eq.${cleanId},memberId.ilike.%${cleanId}%`)
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
      .select('joinDate, totalPaid, status, name, nickname')
      .eq('id', memberId.toString())
      .single();

    if (fetchErr || !memberSnap) throw new Error("Membrul nu a fost găsit.");

    const currentTotalPaid = Number(memberSnap.totalPaid || 0);
    const newTotalPaid = Math.max(0, currentTotalPaid - paymentAmount);
    
    // Recalculăm datoria rămasă după anulare
    const remainingDebt = calculateDebt(memberSnap.joinDate, newTotalPaid);
    const currentStatus = memberSnap.status || 'active';
    let updatedStatus = currentStatus;
    if (currentStatus !== 'pasiv' && currentStatus !== 'admin') {
      updatedStatus = remainingDebt === 0 ? 'active' : 'debtor';
    }

    const { error: delErr } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (delErr) throw delErr;

    const { error: memberErr } = await supabase
      .from('members')
      .update({ totalPaid: newTotalPaid, status: updatedStatus })
      .eq('id', memberId.toString());

    if (memberErr) throw memberErr;

    // Înregistrare anulare în Jurnalul de Audit Executiv
    const memberDisplayName = memberSnap.name || memberSnap.nickname || 'Membru';
    await logScoreAudit({
      id: `audit_revert_${paymentId}_${Date.now()}`,
      targetMemberId: memberId.toString(),
      targetMemberName: memberDisplayName,
      action: 'PAYMENT_REVERT',
      points: -paymentAmount,
      reason: `Anulare plată cotizație: Chitanță ${paymentId} (${paymentAmount} RON)`
    });

    return { newTotalPaid, newStatus: updatedStatus };
  } catch (error) {
    console.error("Error reverting treasury payment:", error);
    throw error;
  }
}

// ==========================================
// EVENTS OPERATIONS
// ==========================================

export interface EventShift {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  maxVolunteers: number;
  assignedMembers: string[];
}

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
  durationHours?: number;
  isShiftBased?: boolean;
  shifts?: EventShift[];
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
    const list = (data || []).map((raw: any) => {
      const ev: EventData = { ...raw };
      // Fallback: If shifts meta was packed into committees
      if (!ev.shifts && raw.committees?.__shiftsMeta) {
        ev.isShiftBased = raw.committees.__shiftsMeta.isShiftBased;
        ev.shifts = raw.committees.__shiftsMeta.shifts;
      }
      return ev;
    });

    return list.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return (Number.isFinite(dateA) ? dateA : 0) - (Number.isFinite(dateB) ? dateB : 0);
    });
  } catch (error) {
    console.error("Error fetching events from Supabase:", error);
    return [];
  }
}

export async function saveEvent(event: EventData): Promise<void> {
  try {
    const { error } = await supabase.from('events').upsert(event);
    if (error) {
      // If error is caused by missing columns in older DB schema, fallback to core payload with packed shifts
      console.warn("Standard event upsert warning, retrying with schema fallback:", error.message);
      const fallbackCommittees = {
        ...(event.committees || {}),
        ...(event.isShiftBased || (event.shifts && event.shifts.length > 0)
          ? { __shiftsMeta: { isShiftBased: event.isShiftBased, shifts: event.shifts } }
          : {})
      };

      const fallbackPayload: Record<string, any> = {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        endDate: event.endDate || null,
        endTime: event.endTime || null,
        location: event.location || '',
        type: event.type || 'meeting',
        description: event.description || '',
        rsvps: event.rsvps || {},
        attendanceClosed: event.attendanceClosed || false,
        committees: fallbackCommittees
      };

      const { error: fallbackErr } = await supabase.from('events').upsert(fallbackPayload);
      if (fallbackErr) throw fallbackErr;
    }
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
  memberName?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  reviewedBy?: string | null;
  reviewedById?: string | null;
  reviewedByUsername?: string | null;
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
    // Igienizare strictă: transmitem doar coloanele suportate de schema PostgreSQL
    const cleanPayload: Record<string, any> = {
      id: request.id,
      eventId: request.eventId,
      memberId: request.memberId ? request.memberId.toString() : null,
      reason: request.reason || '',
      status: request.status || 'pending',
      timestamp: request.timestamp || new Date().toISOString(),
      reviewedBy: request.reviewedBy || null,
      reviewedAt: request.reviewedAt || null,
      rejectReason: request.rejectReason || null
    };

    const { error } = await supabase.from('absence_requests').upsert(cleanPayload);
    if (error) throw error;
  } catch (error) {
    console.error("Error saving absence request to Supabase:", error);
    throw error;
  }
}

export async function deleteAbsenceRequest(requestId: string): Promise<void> {
  try {
    const { error } = await supabase.from('absence_requests').delete().eq('id', requestId);
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting absence request from Supabase:", error);
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
