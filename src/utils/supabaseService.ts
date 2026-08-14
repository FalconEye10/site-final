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
  "ANDRAS ANDREEA (Role: member)", "POPA IOANA (Role: member)", "ABICULESEI ALESSIA (Role: member)",
  "PAISA ANASTASIA (Role: member)", "DORNEANU MADALINA (Role: member)", "test (Role: member)",
  "Alungulesei Ianis (Role: member)", "Amatioaiei Ioana (Role: member)", "Apetrei Sofia (Role: member)",
  "Beșu Ioana (Role: member)", "Buftea Leonardo (Role: member)", "Cacciola Anastasia (Role: member)",
  "Căruntu Ruxandra (Role: member)", "Ciobanu Ilinca (Role: member)", "Ciurea Alex (Role: member)",
  "Covasan Marian (Role: member)", "Crușitu Mihnea (Role: member)", "Enache Diana (Role: member)",
  "Filimon Teodora (Role: member)", "Ifrim Luca (Role: member)", "Ioniță Daria (Role: member)",
  "Marunțelu Alex (Role: member)", "Măzare Sofia (Role: member)", "Miron Maya (Role: member)",
  "Onțanu Vanessa (Role: member)", "Orcheanu Maria (Role: member)", "Panainte Silviu (Role: member)",
  "Pascaru Rareș (Role: member)", "Popa Medeea (Role: member)", "Radu Sabin (Role: member)",
  "Radu Teodora (Role: member)", "Răducanu Maya (Role: member)", "Șerban Catalin (Role: member)",
  "Tănasa Teodora (Role: member)", "Zugravu Rareș (Role: member)", "Alungulesei Darius (Role: member)",
  "Ariton Bogdan (Role: member)", "Corbu Partick (Role: member)", "Huhulea Miruna (Role: member)",
  "Lăpușneanu David (Role: member)", "Lupu Miruna (Role: member)", "Manole Iustin (Role: member)",
  "Micu Ingrid (Role: member)", "Mihuț Alexandra (Role: member)", "Negru Maia (Role: member)",
  "Poenaru Cristiana (Role: member)", "Stîngaciu Mario (Role: member)", "Timofte Tudor (Role: member)",
  "IFRIM TUDOR (Role: member)", "STAN STEFAN (Role: admin)", "TIMOFTE TEODORA (Role: member)",
  "PADURARIU SABIN (Role: member)", "PASCARU RASES (Role: member)", "ORCHIANU MARIA (Role: member)",
  "MIHALACHE MARA (Role: member)", "CORFA TUDOR (Role: member)", "POPA MATEI (Role: member)"
];

function getOfficialClubRoster(): any[] {
  let counter = 1;
  return officialClubMembersRoster.map(raw => {
    const match = raw.match(/(.+?)\s+\(Role:\s+(\w+)\)/);
    const fullName = match ? match[1].trim() : raw;
    const role = match ? match[2].trim() : 'member';
    const username = fullName.toLowerCase().replace(/\s+/g, '.').replace(/ț/g, 't').replace(/ș/g, 's').replace(/ă/g, 'a').replace(/î/g, 'i').replace(/â/g, 'a');
    const isStefan = username === 'stan.stefan' || username === 'admin';
    const id = `M${counter.toString().padStart(3, '0')}`;
    counter++;

    return {
      id,
      name: fullName,
      username,
      role: isStefan ? 'admin' : role,
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
      score: 0,
      stats: { totalHours: 0 },
      committee: isStefan ? 'Board Executiv' : 'Comitet Voluntariat',
      boardPosition: isStefan ? 'Președinte' : undefined
    };
  });
}

// Preia toți membrii direct din Supabase (sau lista oficială a clubului dacă baza e goală/blocată)
export async function fetchMembers(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('members').select('*');
    if (!error && data && data.length > 0) {
      const filtered = data.filter((m: any) => !isSystemAccount(m));
      if (filtered.length > 0) return filtered;
    }
    return getOfficialClubRoster();
  } catch (error) {
    console.warn("Eroare la citirea membrilor din Supabase, se folosește registrul oficial:", error);
    return getOfficialClubRoster();
  }
}

const VALID_MEMBER_COLUMNS = new Set([
  'id', 'name', 'email', 'phone', 'role', 'committee', 'status', 'joinDate',
  'totalPaid', 'score', 'avatar', 'stats', 'scoreAdjustments', 'customFields',
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
 * Salvează un log de audit în tabela 'members' (sub documentul SYS_AUDIT_LOGS)
 */
export async function logScoreAudit(log: Partial<ScoreAuditLog> & { action: string; reason: string }): Promise<void> {
  try {
    const auditEntry: ScoreAuditLog = {
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
      .from('members')
      .select('stats')
      .eq('id', 'SYS_AUDIT_LOGS')
      .single();

    const currentLogs: ScoreAuditLog[] = Array.isArray(sysSnap?.stats?.logs) ? sysSnap.stats.logs : [];
    
    // Prevent inserting exact duplicates into SYS_AUDIT_LOGS
    const isDuplicate = currentLogs.some(l => 
      l.id === auditEntry.id || 
      (l.targetMemberId === auditEntry.targetMemberId && 
       l.action === auditEntry.action && 
       l.points === auditEntry.points && 
       l.reason === auditEntry.reason &&
       Math.abs(new Date(l.createdAt).getTime() - new Date(auditEntry.createdAt).getTime()) < 3000)
    );

    if (isDuplicate) {
      return;
    }

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
 * Preia toate jurnalele de audit din întreg sistemul (Punctaje, Plăți, Membri, Învoiri, Proiecte, Sugestii, Kudos)
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
      .select('id, name, nickname, username, role, boardPosition, scoreAdjustments')
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
      if (rawAdminName && rawAdminName !== 'Admin' && rawAdminName !== 'Sistem' && rawAdminName !== 'Trezorier' && rawAdminName !== 'Board') {
        return { name: rawAdminName, username: adminUsername };
      }
      return { name: 'Ștefan Stan', username: 'stan.stefan' };
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

    // 2. Add score adjustments from members (only if not already logged in sysLogs)
    if (membersData) {
      membersData.forEach((m: any) => {
        const adjustments = m.scoreAdjustments || [];
        adjustments.forEach((adj: any) => {
          if (adj.id && !compiledMap.has(adj.id)) {
            const time = adj.date || new Date().toISOString();
            const act = adj.action || (adj.points >= 0 ? 'ADDED' : 'SUBTRACTED');
            if (!isAlreadyPresent(m.id, act, adj.points || 0, adj.reason || '', time)) {
              const resolved = resolveAdmin(adj.adminName, adj.adminId, adj.adminUsername);
              compiledMap.set(adj.id, {
                id: adj.id,
                adminId: adj.adminId,
                adminName: resolved.name,
                adminUsername: resolved.username || adj.adminUsername,
                targetMemberId: m.id,
                targetMemberName: m.nickname || m.name || 'Membru',
                action: act,
                points: adj.points || 0,
                reason: adj.reason || 'Ajustare punctaj',
                createdAt: time
              });
            }
          }
        });
      });
    }

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
          const time = a.timestamp || new Date().toISOString();
          const resolved = resolveAdmin(a.reviewedBy, undefined, undefined);
          compiledMap.set(absId, {
            id: absId,
            adminName: resolved.name,
            adminUsername: resolved.username,
            targetMemberId: a.memberId,
            targetMemberName: a.memberName || 'Membru',
            action: a.status === 'approved' ? 'ABSENCE_APPROVED' : a.status === 'rejected' ? 'ABSENCE_REJECTED' : 'ABSENCE_REQUEST',
            points: 0,
            reason: `Cerere învoire (${a.status || 'în așteptare'}): ${a.reason || 'Fără motiv specificat'}`,
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

    // Anti-duplicate protection: ignore adjustments that are already present
    const existingIds = new Set(currentAdjustments.map((a: any) => a.id));
    const newItems = list.filter((a: any) => !existingIds.has(a.id));
    if (newItems.length === 0 && list.length > 0) {
      console.warn("Ajustare de punctaj duplicată ignorată:", list);
      return;
    }

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
        scoreAdjustments: [...currentAdjustments, ...newItems],
        stats: updatedStats
      })
      .eq('id', memberId.toString());

    if (updateErr) throw updateErr;

    // Logăm în Audit Log pentru fiecare ajustare cu ACELAȘI ID pentru a preveni duplicatele
    for (const adj of newItems) {
      await logScoreAudit({
        id: adj.id,
        adminId: adj.adminId,
        adminName: adj.adminName || 'Admin',
        adminUsername: adj.adminUsername,
        targetMemberId: memberId,
        targetMemberName: member.name || 'Membru',
        action: pointsDelta >= 0 ? 'ADDED' : 'SUBTRACTED',
        points: pointsDelta,
        reason: adj.reason,
        createdAt: adj.date || new Date().toISOString()
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

    // Înregistrăm acțiunea de REVERT în jurnalul de audit cu un ID determinist
    const revertAuditId = `revert_${adjustmentId}`;
    await logScoreAudit({
      id: revertAuditId,
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
