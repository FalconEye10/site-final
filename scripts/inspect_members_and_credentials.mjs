import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const serviceRoleKey = keyMatch[1].trim();

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function inspect() {
  console.log('Connecting to Supabase:', supabaseUrl);

  // 1. Get all members
  const { data: members, error: memErr } = await adminClient
    .from('members')
    .select('id, name, username, email, role, status')
    .order('id', { ascending: true });

  if (memErr) {
    console.error('Error fetching members:', memErr);
    return;
  }

  console.log(`Found ${members.length} members in public.members:`);

  // 2. Query private.member_credentials
  // Since private schema cannot be accessed directly via postgrest unless exposed or via RPC / SQL:
  // Let's test if we can access it via direct RPC or SQL or check credentials
  const { data: creds, error: credErr } = await adminClient
    .rpc('get_admin_credentials_audit')
    .catch(() => ({ data: null, error: 'RPC does not exist' }));

  console.log('RPC get_admin_credentials_audit:', creds, credErr);
}

inspect();
