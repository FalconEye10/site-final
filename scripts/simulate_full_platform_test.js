import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsuxzfblbkqpcolujdlo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU'
);

async function runFullSimulation() {
  console.log('================================================================');
  console.log('       SIMULARE & VERIFICARE INTEGRALĂ PLATFORMĂ CAMENA        ');
  console.log('================================================================\n');

  const creds = JSON.parse(fs.readFileSync('scripts/output/credentials.json'));
  console.log(`[PAS 1] Testare autentificare pentru toate cele ${creds.length} de conturi din baza de date...`);

  let authSuccess = 0;
  let authFailed = 0;
  const failedList = [];

  for (const c of creds) {
    const { data, error } = await supabase.rpc('authenticate_member', {
      p_identifier: c.username,
      p_password: c.tempPassword,
    });

    if (data && data.success === true && data.member && data.member.id === c.id) {
      authSuccess++;
    } else {
      authFailed++;
      failedList.push({
        id: c.id,
        name: c.name,
        username: c.username,
        error: data?.error || error?.message,
      });
    }
  }

  console.log(`  -> Succes: ${authSuccess} / ${creds.length}`);
  if (authFailed > 0) {
    console.log(`  -> Eșuate (${authFailed}):`, failedList);
  }

  console.log('\n[PAS 2] Testare flexibilitate identificatori (ID, Username, Email, Diacritice)...');
  const testStefan = [
    { label: 'Username exact', ident: 'stan.stefan', pass: 'Camena-Admin-Stefan26!' },
    { label: 'ID Membru', ident: 'M061', pass: 'Camena-Admin-Stefan26!' },
    { label: 'Nume complet', ident: 'Stan Stefan', pass: 'Camena-Admin-Stefan26!' },
    { label: 'Email sintetic', ident: 'stan.stefan@interact-camena.internal', pass: 'Camena-Admin-Stefan26!' },
  ];

  for (const t of testStefan) {
    const { data } = await supabase.rpc('authenticate_member', {
      p_identifier: t.ident,
      p_password: t.pass,
    });
    console.log(`  -> [${t.label}] '${t.ident}':`, data?.success ? 'PASS (Logat ca ' + data.member.name + ')' : 'FAIL: ' + data?.error);
  }

  console.log('\n[PAS 3] Testare securitate & blocare atacuri / parole incorecte...');
  const securityTests = [
    { label: 'Parolă greșită', ident: 'stan.stefan', pass: 'ParolaGresita999!' },
    { label: 'Parolă veche default', ident: 'stan.stefan', pass: 'Camena2026!' },
    { label: 'SQL Injection clasic', ident: "' OR '1'='1", pass: "' OR '1'='1" },
    { label: 'Username inexistent', ident: 'utilizator.inexistent', pass: 'Oarecare123!' },
    { label: 'Camp gol', ident: '', pass: '' },
  ];

  for (const st of securityTests) {
    const { data } = await supabase.rpc('authenticate_member', {
      p_identifier: st.ident,
      p_password: st.pass,
    });
    const blocked = !data || data.success === false;
    console.log(`  -> [${st.label}] Blocat corect:`, blocked ? 'PASS (' + (data?.error || 'Refuzat') + ')' : 'FAIL (Bypass detectat!)');
  }

  console.log('\n[PAS 4] Testare integritate tabele publice (SELECT)...');
  const tables = [
    'members',
    'payments',
    'events',
    'news',
    'budget_transactions',
    'score_audit_logs',
    'forum_posts',
    'suggestions',
    'push_subscriptions',
  ];

  for (const tbl of tables) {
    const { data, error } = await supabase.from(tbl).select('*').limit(3);
    if (error) {
      console.log(`  -> Tabela '${tbl}': FAIL (${error.message})`);
    } else {
      console.log(`  -> Tabela '${tbl}': PASS (${data.length} înregistrări citite)`);
    }
  }

  console.log('\n================================================================');
  console.log('                     RAPORT FINAL SIMULARE                      ');
  console.log('================================================================');
}

runFullSimulation();
