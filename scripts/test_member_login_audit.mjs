import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/SUPABASE_URL=(.*)/);
const anonKeyMatch = envContent.match(/SUPABASE_ANON_KEY=(.*)/);
const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const anonKey = anonKeyMatch[1].trim();
const serviceKey = serviceKeyMatch[1].trim();

const anonClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, serviceKey);

async function runAudit() {
  console.log('🔍 Pornire audit complet de autentificare pentru toți membrii...');

  // 1. Obținem toți membrii din public.members
  const { data: members, error: memErr } = await adminClient
    .from('members')
    .select('id, name, username, email, role, status')
    .order('id', { ascending: true });

  if (memErr) {
    console.error('Eroare la citirea membrilor:', memErr);
    return;
  }

  console.log(`📋 Număr total membri găsiți: ${members.length}`);

  // 2. Obținem credențialele din private.member_credentials
  // Folosim execute_sql sau interogare directă via RPC dacă există, sau direct SQL via Supabase
  // Deoarece PostgREST nu expune direct schema private, o interogăm via supabase rpc sau MCP

  // 3. Verificăm fiecare membru în parte
  const results = [];

  for (const m of members) {
    // Generăm candidați de parolă
    const candidates = [];

    // Adăugăm candidatul din credentials.json
    if (oldCredMap.has(m.id)) {
      candidates.push({ source: 'credentials_json', pass: oldCredMap.get(m.id) });
    }

    // Pentru admini cunoscuți:
    if (m.username === 'stan.stefan') {
      candidates.push({ source: 'known_stefan_1', pass: 'Stefanstan_9002' });
      candidates.push({ source: 'known_stefan_2', pass: 'Camena-Admin-Stefan26!' });
      candidates.push({ source: 'known_stefan_3', pass: 'Pursisimplunustiiparola' });
    }

    let loginSuccess = false;
    let successfulPassword = null;
    let lastError = null;
    let successfulSource = null;

    for (const c of candidates) {
      try {
        const { data, error } = await anonClient.rpc('authenticate_member', {
          p_identifier: m.username || m.id,
          p_password: c.pass
        });

        if (data && data.success === true) {
          loginSuccess = true;
          successfulPassword = c.pass;
          successfulSource = c.source;
          break;
        } else {
          lastError = data?.error || error?.message || 'Eșec necunoscut';
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    results.push({
      id: m.id,
      name: m.name,
      username: m.username,
      email: m.email,
      role: m.role,
      status: m.status,
      loginSuccess,
      successfulPassword,
      successfulSource,
      lastError: loginSuccess ? null : lastError
    });
  }

  const passed = results.filter(r => r.loginSuccess);
  const failed = results.filter(r => !r.loginSuccess);

  console.log(`\n======================================================`);
  console.log(`📊 REZULTATE PRELIMINARE: ${passed.length} / ${results.length} reușite`);
  console.log(`======================================================`);
  console.log(`Reușite: ${passed.length}`);
  console.log(`Eșuate: ${failed.length}`);

  fs.writeFileSync('audit_results.json', JSON.stringify(results, null, 2));
  console.log('Rezultatele detaliate au fost salvate în audit_results.json');
}

runAudit();
