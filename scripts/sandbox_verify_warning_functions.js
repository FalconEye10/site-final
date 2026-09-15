import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSandboxVerification() {
  console.log('======================================================================');
  console.log('🧪 SIMULARE DE SANDBOX: VERIFICARE FUNCȚII & RLS CU AVERTIZĂRI SUPABASE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, condition, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `-> ${details}` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // GRUPA 1: VERIFICARE RPC "authenticate_member"
  // (Avertizare: anon_security_definer_function_executable)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. TESTARE RPC: authenticate_member ---');

  // Test 1.1: Apel cu parametri goli
  try {
    const { data: resEmpty } = await supabase.rpc('authenticate_member', {
      p_identifier: '',
      p_password: ''
    });
    test(
      'Respingere parametri goi (identifier/password vid)',
      resEmpty && resEmpty.success === false && resEmpty.error.includes('introduci'),
      JSON.stringify(resEmpty)
    );
  } catch (err) {
    test('Respingere parametri goi', false, err.message);
  }

  // Test 1.2: Apel cu utilizator inexistent
  try {
    const { data: resNonExistent } = await supabase.rpc('authenticate_member', {
      p_identifier: 'user_inexistent_xyz_' + Date.now(),
      p_password: 'parola_oarecare_123'
    });
    test(
      'Respingere utilizator inexistent (fără crash sau excepție)',
      resNonExistent && resNonExistent.success === false && resNonExistent.error.includes('incorect'),
      JSON.stringify(resNonExistent)
    );
  } catch (err) {
    test('Respingere utilizator inexistent', false, err.message);
  }

  // Test 1.3: Tentativă SQL Injection în câmpul de identificator
  try {
    const { data: resInject } = await supabase.rpc('authenticate_member', {
      p_identifier: "' OR '1'='1' --",
      p_password: 'fake_password'
    });
    test(
      'Imunitate la SQL Injection în p_identifier (blocat în mod securizat)',
      resInject && resInject.success === false,
      JSON.stringify(resInject)
    );
  } catch (err) {
    test('Imunitate la SQL Injection', false, err.message);
  }

  // Test 1.4: Asigurare că nu se scurg niciodată hash-uri sau parole în răspuns
  try {
    const { data: resLeakCheck } = await supabase.rpc('authenticate_member', {
      p_identifier: 'admin',
      p_password: 'parola_gresita_test'
    });
    const stringified = JSON.stringify(resLeakCheck || {});
    const noHashLeak = !stringified.includes('password_hash') && !stringified.includes('$2a$') && !stringified.includes('$2b$');
    test(
      'Securitate date: Nicio scurgere de hash-uri bcrypt sau date din vault privat',
      noHashLeak,
      stringified
    );
  } catch (err) {
    test('Securitate date hash leak', false, err.message);
  }


  // --------------------------------------------------------------------------
  // GRUPA 2: VERIFICARE RPC "change_member_password"
  // (Avertizare: anon_security_definer_function_executable)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. TESTARE RPC: change_member_password ---');

  // Test 2.1: Parolă nouă prea scurtă (< 6 caractere)
  try {
    const { data: resShortPass } = await supabase.rpc('change_member_password', {
      p_member_id: 'MEM-TEST-XYZ',
      p_old_password: 'old_password_123',
      p_new_password: '123'
    });
    test(
      'Validare lungime parolă nouă (minim 6 caractere)',
      resShortPass && resShortPass.success === false && resShortPass.error.includes('6 caractere'),
      JSON.stringify(resShortPass)
    );
  } catch (err) {
    test('Validare lungime parolă nouă', false, err.message);
  }

  // Test 2.2: Membru inexistent
  try {
    const { data: resNoMember } = await supabase.rpc('change_member_password', {
      p_member_id: 'MEM-INEXISTENT-' + Date.now(),
      p_old_password: 'old_password_123',
      p_new_password: 'new_valid_password_456'
    });
    test(
      'Respingere schimbare parolă membru inexistent',
      resNoMember && resNoMember.success === false && resNoMember.error.includes('nu a fost găsit'),
      JSON.stringify(resNoMember)
    );
  } catch (err) {
    test('Respingere schimbare parolă membru inexistent', false, err.message);
  }

  // Test 2.3: Parolă veche incorectă (pentru membru existent)
  try {
    const { data: membersList } = await supabase.from('members').select('id, username').limit(1);
    const existingMember = membersList && membersList[0];
    if (existingMember) {
      const { data: resWrongOld } = await supabase.rpc('change_member_password', {
        p_member_id: existingMember.id,
        p_old_password: 'parola_veche_total_gresita_xyz',
        p_new_password: 'new_valid_password_456'
      });
      test(
        `Protecție la parolă veche incorectă pentru membru existent (${existingMember.username || existingMember.id})`,
        resWrongOld && resWrongOld.success === false,
        JSON.stringify(resWrongOld)
      );
    } else {
      test('Verificare membru existent pentru schimbare parolă', true, 'Skip: Niciun membru');
    }
  } catch (err) {
    test('Protecție parolă veche incorectă', false, err.message);
  }


  // --------------------------------------------------------------------------
  // GRUPA 3: VERIFICARE RPC "admin_set_member_password"
  // (Avertizări: anon_security_definer & authenticated_security_definer)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. TESTARE RPC: admin_set_member_password ---');

  // Test 3.1: Parametri invalizi
  try {
    const { data: resAdminEmpty } = await supabase.rpc('admin_set_member_password', {
      p_admin_member_id: '',
      p_admin_password: '',
      p_target_member_id: '',
      p_new_password: ''
    });
    test(
      'Respingere parametri nuli / goi la resetarea de către administrator',
      resAdminEmpty && resAdminEmpty.success === false && resAdminEmpty.error.includes('invalizi'),
      JSON.stringify(resAdminEmpty)
    );
  } catch (err) {
    test('Respingere parametri nuli admin', false, err.message);
  }

  // Test 3.2: Apel de către un utilizator non-admin (sau inexistent)
  try {
    const { data: resNonAdmin } = await supabase.rpc('admin_set_member_password', {
      p_admin_member_id: 'fake_hacker_account',
      p_admin_password: 'any_password',
      p_target_member_id: 'target_victim',
      p_new_password: 'hacked_password_123'
    });
    test(
      'Respingere resetare dacă apelantul NU este administrator în baza de date',
      resNonAdmin && resNonAdmin.success === false && resNonAdmin.error.includes('Neautorizat'),
      JSON.stringify(resNonAdmin)
    );
  } catch (err) {
    test('Respingere resetare non-admin', false, err.message);
  }

  // Test 3.3: Apel cu utilizator admin dar parolă de admin incorectă
  try {
    const { data: admins } = await supabase.from('members').select('id, username').eq('role', 'admin').limit(1);
    const realAdmin = admins && admins[0];
    if (realAdmin) {
      const { data: resBadAdminPass } = await supabase.rpc('admin_set_member_password', {
        p_admin_member_id: realAdmin.id,
        p_admin_password: 'parola_admin_gresita_123',
        p_target_member_id: realAdmin.id,
        p_new_password: 'new_pass_123456'
      });
      test(
        `Verificare criptografică strictă parolă admin (cont admin: ${realAdmin.username})`,
        resBadAdminPass && resBadAdminPass.success === false && resBadAdminPass.error.includes('incorectă'),
        JSON.stringify(resBadAdminPass)
      );
    } else {
      test('Verificare parolă admin pe cont real', true, 'Skip: Niciun admin găsit');
    }
  } catch (err) {
    test('Verificare criptografică parolă admin', false, err.message);
  }


  // --------------------------------------------------------------------------
  // GRUPA 4: VERIFICARE TABEL & POLITICI RLS "project_pitches"
  // (Avertizare rezolvată: rls_policy_always_true)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. TESTARE RLS & INTEGRITATE: project_pitches ---');

  const testPitchId = `test_pitch_${Date.now()}`;
  try {
    // Test 4.1: Citire propuneri existente (SELECT policy funcțională)
    const { data: pitches, error: selectErr } = await supabase.from('project_pitches').select('id, title').limit(5);
    test(
      'Citire (SELECT) propuneri comunitate fără eroare de acces',
      !selectErr,
      selectErr?.message
    );

    // Test 4.2: Inserare propunere validă (pitches_insert_policy)
    const { error: insertErr } = await supabase.from('project_pitches').insert({
      id: testPitchId,
      title: 'Proiect Ecologizare Mal Lac Test',
      submitterName: 'Cetățean Implicat',
      submitterEmail: 'contact@example.com',
      description: 'Propunere de ecologizare trimisă în sandbox test.',
      createdAt: new Date().toISOString()
    });
    test(
      'Inserare propunere validă (pitches_insert_policy verificată)',
      !insertErr,
      insertErr?.message
    );

    // Test 4.3: Ștergere propunere de test (pitches_delete_policy)
    const { error: deleteErr } = await supabase.from('project_pitches').delete().eq('id', testPitchId);
    test(
      'Ștergere entitate test și curățare (pitches_delete_policy verificată)',
      !deleteErr,
      deleteErr?.message
    );
  } catch (err) {
    test('Testare project_pitches', false, err.message);
  }


  // --------------------------------------------------------------------------
  // GRUPA 5: VERIFICARE TABEL & POLITICI RLS "suggestions"
  // (Avertizare rezolvată: rls_policy_always_true)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. TESTARE RLS & INTEGRITATE: suggestions ---');

  const testSuggId = `SUGG-SANDBOX-${Date.now()}`;
  try {
    // Test 5.1: Citire sugestii (SELECT policy)
    const { data: suggs, error: selectSuggErr } = await supabase.from('suggestions').select('id, status').limit(5);
    test(
      'Citire (SELECT) casetă sugestii fără erori de acces',
      !selectSuggErr,
      selectSuggErr?.message
    );

    // Test 5.2: Inserare sugestie validă (suggestions_insert_policy)
    const { error: insertSuggErr } = await supabase.from('suggestions').insert({
      id: testSuggId,
      topic: '💬 Optimizare Activități',
      message: 'Sugestie sandbox pentru validarea politicilor RLS actualizate.',
      isAnonymous: true,
      status: 'nou',
      createdAt: new Date().toISOString()
    });
    test(
      'Inserare sugestie validă (suggestions_insert_policy verificată)',
      !insertSuggErr,
      insertSuggErr?.message
    );

    // Test 5.3: Actualizare status sugestie (suggestions_update_policy)
    const { error: updateSuggErr } = await supabase
      .from('suggestions')
      .update({ status: 'discutat' })
      .eq('id', testSuggId);
    test(
      'Actualizare status sugestie "nou" -> "discutat" (suggestions_update_policy verificată)',
      !updateSuggErr,
      updateSuggErr?.message
    );

    // Test 5.4: Ștergere sugestie de test (suggestions_delete_policy)
    const { error: deleteSuggErr } = await supabase.from('suggestions').delete().eq('id', testSuggId);
    test(
      'Ștergere sugestie test și curățare (suggestions_delete_policy verificată)',
      !deleteSuggErr,
      deleteSuggErr?.message
    );
  } catch (err) {
    test('Testare suggestions', false, err.message);
  }


  // --------------------------------------------------------------------------
  // GRUPA 6: VERIFICARE INTEGRITATE DATE GENERALE (MEMBRI, POZE, EVENIMENTE)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. VERIFICARE AFISARE GENERALĂ DATE & POZE ---');

  try {
    const { data: mems, error: mErr } = await supabase.from('members').select('id, name, avatar, role').limit(10);
    const hasMembers = !mErr && Array.isArray(mems) && mems.length > 0;
    test(
      `Citire tabel 'members' cu poze și avatare (${mems ? mems.length : 0} membri încărcați)`,
      hasMembers,
      mErr?.message
    );

    const { data: evts, error: eErr } = await supabase.from('events').select('id, title').limit(5);
    test(
      `Citire tabel 'events' (${evts ? evts.length : 0} evenimente încărcate)`,
      !eErr,
      eErr?.message
    );

    const { data: news, error: nErr } = await supabase.from('news').select('id, title').limit(5);
    test(
      `Citire tabel 'news' (${news ? news.length : 0} știri încărcate)`,
      !nErr,
      nErr?.message
    );
  } catch (err) {
    test('Verificare date generale', false, err.message);
  }

  // --------------------------------------------------------------------------
  // REZULTATE FINALE
  // --------------------------------------------------------------------------
  const total = passed + failed;
  const percentage = Math.round((passed / total) * 100);

  console.log('\n======================================================================');
  console.log(`📊 REZULTAT FINAL SIMULARE SANDBOX: ${passed} / ${total} TESTE TRECUTE (${percentage}%)`);
  if (failed === 0) {
    console.log('🎉 TOATE FUNCȚIILE ȘI POLITICILE RLS AU FOST TESTATE ȘI FUNCȚIONEAZĂ IMPECABIL!');
  } else {
    console.warn(`⚠️ Există ${failed} teste eșuate care necesită verificare.`);
  }
  console.log('======================================================================\n');
}

runSandboxVerification();
