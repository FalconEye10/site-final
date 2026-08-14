import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://lsuxzfblbkqpcolujdlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const creds = JSON.parse(fs.readFileSync('scripts/output/credentials.json', 'utf8'));

  const admins = creds.filter(c => c.isAdmin || c.role === 'admin' || (c.boardPosition && c.boardPosition.length > 0 && c.boardPosition !== 'Voluntar'));
  const volunteers = creds.filter(c => !admins.includes(c) && c.username !== 'admin' && c.username !== 'sys_audit_logs');

  console.log('\n========================================================================');
  console.log('1. SIMULARE LOGIN - CONTURI ADMINISTRATIVE (BOARD / ADMIN)');
  console.log('========================================================================');
  for (const adm of admins) {
    const pwd = adm.username === 'stan.stefan' ? 'Stefanstan_9002' : adm.tempPassword;
    const res = await supabase.rpc('authenticate_member', {
      p_identifier: adm.username,
      p_password: pwd
    });
    const status = res.data && res.data.success ? '✅ SUCCES (200 OK)' : '❌ EȘUAT';
    const role = res.data?.member?.role || adm.role;
    const pos = res.data?.member?.boardPosition || adm.boardPosition || 'Admin';
    console.log(`👤 ${adm.username.padEnd(20)} | Parola: ${pwd.padEnd(22)} | ${status} | Rol: ${role} | Functie: ${pos}`);
  }

  console.log('\n========================================================================');
  console.log('2. SIMULARE LOGIN - ESANTION MEMBRI & VOLUNTARI');
  console.log('========================================================================');
  for (const vol of volunteers.slice(0, 12)) {
    const pwd = vol.tempPassword;
    const res = await supabase.rpc('authenticate_member', {
      p_identifier: vol.username,
      p_password: pwd
    });
    const status = res.data && res.data.success ? '✅ SUCCES (200 OK)' : '❌ EȘUAT';
    console.log(`👤 ${vol.username.padEnd(20)} | Parola: ${pwd.padEnd(22)} | ${status} | Nume: ${vol.name}`);
  }

  console.log('\n========================================================================');
  console.log('3. RESETARE LOGIN_COUNT = 0 & HAS_SEEN_TUTORIAL = FALSE IN BAZA DE DATE');
  console.log('========================================================================');
  const { error: updateErr } = await supabase
    .from('members')
    .update({
      login_count: 0,
      has_seen_tutorial: false
    })
    .neq('id', 'SYS_AUDIT_LOGS');

  if (updateErr) {
    console.error('❌ Eroare la resetare:', updateErr);
  } else {
    console.log('✅ Campurile login_count si has_seen_tutorial au fost resetate pentru toti membrii.');
  }

  const { data: checkData, error: checkErr } = await supabase
    .from('members')
    .select('id, username, name, login_count, has_seen_tutorial')
    .neq('id', 'SYS_AUDIT_LOGS');

  if (checkData) {
    const notZero = checkData.filter(m => m.login_count !== 0 || m.has_seen_tutorial !== false);
    console.log(`📊 Membri verificati in baza de date: ${checkData.length}`);
    console.log(`📊 Membri cu valori diferite de 0: ${notZero.length}`);
    if (notZero.length === 0) {
      console.log('🎉 REZULTAT: Toate cele 56 de conturi reale au login_count = 0 si has_seen_tutorial = false!');
      console.log('👉 La urmatoarea logare, platforma va afisa automat Ghidul Interactiv (Tutorialul Obligatoriu).');
    }
  }
}

run();
