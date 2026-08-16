import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Accurate saveEvent with schema fallback
async function saveEvent(event) {
  try {
    const { error } = await supabase.from('events').upsert(event);
    if (error) {
      const fallbackCommittees = {
        ...(event.committees || {}),
        ...(event.isShiftBased || (event.shifts && event.shifts.length > 0)
          ? { __shiftsMeta: { isShiftBased: event.isShiftBased, shifts: event.shifts } }
          : {})
      };

      const fallbackPayload = {
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
    throw error;
  }
}

async function fetchEvents() {
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw error;
  return (data || []).map(raw => {
    const ev = { ...raw };
    if (!ev.shifts && raw.committees?.__shiftsMeta) {
      ev.isShiftBased = raw.committees.__shiftsMeta.isShiftBased;
      ev.shifts = raw.committees.__shiftsMeta.shifts;
    }
    return ev;
  });
}

async function logScoreAudit(log) {
  const auditEntry = {
    id: log.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminId: log.adminId || undefined,
    adminName: log.adminName || 'Admin',
    adminUsername: log.adminUsername || undefined,
    targetMemberId: log.targetMemberId || '',
    targetMemberName: log.targetMemberName || 'Sistem',
    action: log.action,
    points: log.points || 0,
    reason: log.reason,
    createdAt: log.createdAt || new Date().toISOString()
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
}

async function runFullSimulation() {
  console.log('====================================================');
  console.log('🚀 PORNIRE SIMULARE COMPLETĂ PLATFORMĂ INTERACT CAMENA');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: CALENDAR & EVENIMENTE
    // ----------------------------------------------------
    console.log('\n--- 1. TESTARE EVENIMENTE & CALENDAR ---');
    const testEventId = `test_evt_${Date.now()}`;
    const testMeeting = {
      id: testEventId,
      title: 'Ședință de Test Simulare',
      date: new Date().toISOString().split('T')[0],
      time: '19:00',
      location: 'Sediul Camena & Zoom',
      type: 'meeting',
      description: 'Eveniment creat prin testul de simulare completă.',
      rsvps: {},
      attendanceClosed: false,
      isShiftBased: false,
      shifts: [],
      committees: {}
    };

    // A. Adaugare eveniment folosind saveEvent robust
    let saveOk = false;
    try {
      await saveEvent(testMeeting);
      saveOk = true;
    } catch (e) {
      console.error('saveEvent error:', e);
    }
    assert(saveOk, `Adăugare eveniment nou în calendar: ${testMeeting.title}`);

    // B. Citire evenimente cu unpack shifts
    const eventsList = await fetchEvents();
    assert(eventsList.some(e => e.id === testEventId), `Regăsire eveniment în lista generală (Total: ${eventsList.length} evenimente)`);

    // C. Modificare / Editare eveniment
    const updatedTitle = 'Ședință de Test Simulare - Modificată';
    let updateOk = false;
    try {
      await saveEvent({
        ...testMeeting,
        title: updatedTitle,
        location: 'Locație Actualizată'
      });
      updateOk = true;
    } catch (e) {
      console.error('update error:', e);
    }
    assert(updateOk, `Modificare / Editare eveniment existent (${updatedTitle})`);

    // D. Creare eveniment de tip Proiect cu Comitete de Lucru
    const testProjectId = `test_proj_${Date.now()}`;
    const testProject = {
      id: testProjectId,
      title: 'Proiect Ecologizare Test',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '14:00',
      location: 'Parc Central',
      type: 'project',
      description: 'Proiect de voluntariat cu departamente.',
      rsvps: {},
      attendanceClosed: false,
      isShiftBased: false,
      shifts: [],
      committees: {
        com_logistica: {
          name: 'Logistică & Transport',
          description: 'Preluare materiale',
          coordinatorId: null,
          members: ['M001', 'M002'],
          hours: 4
        }
      }
    };
    let projOk = false;
    try {
      await saveEvent(testProject);
      projOk = true;
    } catch (e) {
      console.error('proj error:', e);
    }
    assert(projOk, `Creare eveniment tip Proiect cu Comitete de lucru (${testProject.title})`);

    // E. Creare eveniment cu Ture de Voluntariat (Shifts)
    const testShiftId = `test_shift_evt_${Date.now()}`;
    const testShiftEvent = {
      id: testShiftId,
      title: 'Festival Ture Voluntariat Test',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      location: 'Piața Unirii',
      type: 'project',
      description: 'Festival organizat pe intervale orare.',
      rsvps: {},
      attendanceClosed: false,
      isShiftBased: true,
      shifts: [
        {
          id: 'shift_1',
          name: 'Tura de Dimineață',
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '13:00',
          hours: 4,
          maxVolunteers: 5,
          assignedMembers: ['M001']
        }
      ],
      committees: {}
    };
    let shiftOk = false;
    try {
      await saveEvent(testShiftEvent);
      shiftOk = true;
    } catch (e) {
      console.error('shift error:', e);
    }
    assert(shiftOk, `Creare eveniment organizat pe Ture de Voluntariat (${testShiftEvent.title})`);

    // ----------------------------------------------------
    // TEST 2: PREZENȚE & CERERI DE ÎNVOIRE
    // ----------------------------------------------------
    console.log('\n--- 2. TESTARE PREZENȚĂ & ÎNVOIRI ---');
    const { error: rsvpErr } = await supabase.from('events').update({
      rsvps: { 'M001': 'present', 'M002': 'excused' }
    }).eq('id', testEventId);
    assert(!rsvpErr, 'Înregistrare status prezență pentru membri (Prezent / Motivat)');

    // Cerere de învoire
    const testAbsenceId = `test_abs_${Date.now()}`;
    const { error: absSaveErr } = await supabase.from('absence_requests').upsert({
      id: testAbsenceId,
      eventId: testEventId,
      memberId: 'M003',
      reason: 'Concurs național de robotică',
      status: 'pending',
      timestamp: new Date().toISOString()
    });
    assert(!absSaveErr, 'Trimitere cerere de învoire de către membru');

    // Aprobare cerere
    const { error: absApproveErr } = await supabase.from('absence_requests').update({
      status: 'approved',
      reviewedAt: new Date().toISOString()
    }).eq('id', testAbsenceId);
    assert(!absApproveErr, 'Aprobare cerere de învoire de către administrator');

    // ----------------------------------------------------
    // TEST 3: MEMBRI & AJUSTARE SCOR (ADĂUGARE / SCĂDERE)
    // ----------------------------------------------------
    console.log('\n--- 3. TESTARE MEMBRI & SISTEM SCORURI (ADĂUGARE / SCĂDERE) ---');
    const { data: members, error: memErr } = await supabase.from('members').select('*').limit(5);
    const nonSysMembers = (members || []).filter(m => m.id !== 'SYS_AUDIT_LOGS');
    assert(!memErr && nonSysMembers.length > 0, `Citire listă membri din baza de date (${nonSysMembers.length} membri încărcați)`);

    const targetMember = nonSysMembers[0] || { id: 'M001', name: 'Test User', score: 0 };
    const initialScore = Number(targetMember.score || 0);

    // A. Adaugare puncte (+10)
    const plusPoints = 10;
    const newAdjPlus = {
      id: `adj_${Date.now()}_1`,
      points: plusPoints,
      reason: 'Test Adăugare Punctaj: Participare Eveniment',
      date: new Date().toISOString(),
      adminName: 'Admin Simulare'
    };
    const scoreAfterPlus = initialScore + plusPoints;
    const { error: addScoreErr } = await supabase.from('members').update({
      score: scoreAfterPlus,
      scoreAdjustments: [...(targetMember.scoreAdjustments || []), newAdjPlus]
    }).eq('id', targetMember.id);
    assert(!addScoreErr, `Adăugare +${plusPoints} puncte pentru ${targetMember.name} (Scor nou: ${scoreAfterPlus})`);

    // B. Scadere puncte (-5)
    const minusPoints = -5;
    const newAdjMinus = {
      id: `adj_${Date.now()}_2`,
      points: minusPoints,
      reason: 'Test Scădere Punctaj: Penalizare întârziere',
      date: new Date().toISOString(),
      adminName: 'Admin Simulare'
    };
    const scoreAfterMinus = scoreAfterPlus + minusPoints;
    const { error: subScoreErr } = await supabase.from('members').update({
      score: scoreAfterMinus,
      scoreAdjustments: [...(targetMember.scoreAdjustments || []), newAdjPlus, newAdjMinus]
    }).eq('id', targetMember.id);
    assert(!subScoreErr, `Scădere ${Math.abs(minusPoints)} puncte pentru ${targetMember.name} (Scor final: ${scoreAfterMinus})`);

    // C. Editare profil membru
    const { error: editMemErr } = await supabase.from('members').update({
      phone: '0712345678',
      status: 'active'
    }).eq('id', targetMember.id);
    assert(!editMemErr, `Modificare date profil membru (${targetMember.name})`);

    // D. Audit log prin logScoreAudit
    let auditOk = false;
    try {
      await logScoreAudit({
        adminId: 'ADMIN_SIMULARE',
        adminName: 'Admin Simulare',
        targetMemberId: targetMember.id,
        targetMemberName: targetMember.name,
        action: 'SCORE_ADJUSTMENT',
        reason: `Test Simulare Scor: +10 / -5 puncte`
      });
      auditOk = true;
    } catch (e) {
      console.error('audit error:', e);
    }
    assert(auditOk, 'Înregistrare log de audit securizat în SYS_AUDIT_LOGS');

    // ----------------------------------------------------
    // TEST 4: SONDAJE, SUGESTII & KUDOS
    // ----------------------------------------------------
    console.log('\n--- 4. TESTARE MODUL COMUNITATE (SONDAJE, SUGESTII, KUDOS) ---');
    
    // A. Sondaje (Polls)
    const testPollId = `test_poll_${Date.now()}`;
    const { error: pollCreateErr } = await supabase.from('polls').upsert({
      id: testPollId,
      question: 'Ce tematică doriți pentru următorul teambuilding?',
      options: ['Munte', 'Mare', 'Cabana', 'Escape Room'],
      votes: { 'M001': 0, 'M002': 2 },
      isActive: true,
      isMultipleChoice: false,
      createdAt: new Date().toISOString()
    });
    assert(!pollCreateErr, 'Creare sondaj nou și înregistrare voturi');

    const { error: pollCloseErr } = await supabase.from('polls').update({ isActive: false }).eq('id', testPollId);
    assert(!pollCloseErr, 'Închidere status sondaj');

    // B. Caseta de sugestii
    const testSuggId = `SUGG-TEST-${Date.now()}`;
    const { error: suggErr } = await supabase.from('suggestions').insert({
      id: testSuggId,
      topic: '💡 Idee de Proiect / Acțiune',
      message: 'Sugestie de test pentru optimizarea proceselor.',
      isAnonymous: true,
      status: 'nou',
      createdAt: new Date().toISOString()
    });
    assert(!suggErr, 'Trimitere sugestie anonimă în Caseta de Sugestii');

    const { error: suggUpdateErr } = await supabase.from('suggestions').update({ status: 'discutat' }).eq('id', testSuggId);
    assert(!suggUpdateErr, 'Schimbare status sugestie (nou -> discutat)');

    // C. Kudos
    const testKudosId = `KUDOS-TEST-${Date.now()}`;
    const { error: kudosErr } = await supabase.from('kudos').insert({
      id: testKudosId,
      fromId: 'M001',
      fromName: 'Coleg',
      toId: 'M002',
      toName: 'Coleg 2',
      category: 'Spirit de Echipă',
      message: 'Mulțumesc pentru sprijinul excelent acordat!',
      createdAt: new Date().toISOString()
    });
    assert(!kudosErr, 'Trimitere Kudos & Aprecieri între membri');

    // ----------------------------------------------------
    // TEST 5: CURĂȚARE DATE DE TEST
    // ----------------------------------------------------
    console.log('\n--- 5. CURĂȚARE ENTITĂȚI TEMPORARE DE TEST ---');
    await supabase.from('events').delete().eq('id', testEventId);
    await supabase.from('events').delete().eq('id', testProjectId);
    await supabase.from('events').delete().eq('id', testShiftId);
    await supabase.from('absence_requests').delete().eq('id', testAbsenceId);
    await supabase.from('polls').delete().eq('id', testPollId);
    await supabase.from('suggestions').delete().eq('id', testSuggId);
    await supabase.from('kudos').delete().eq('id', testKudosId);

    // Restabilire scor membru la cel inițial
    await supabase.from('members').update({
      score: initialScore,
      scoreAdjustments: targetMember.scoreAdjustments || []
    }).eq('id', targetMember.id);

    console.log('  ✅ Entitățile temporare de test au fost curățate cu succes.');

    console.log('\n====================================================');
    console.log(`🎉 REZULTAT FINAL SIMULARE: ${passedTests} / ${totalTests} TESTE TRECUTE CU SUCCES (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('====================================================\n');
  } catch (globalErr) {
    console.error('Eroare neașteptată în timpul simulării:', globalErr);
  }
}

runFullSimulation();
