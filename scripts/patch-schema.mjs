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

const sql = `
-- 1. Events Table Updates
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS "isShiftBased" BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS shifts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS "durationHours" NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS "attendanceClosed" BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS "endDate" TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS committees JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rsvps JSONB DEFAULT '{}'::jsonb;

-- Dynamic Grant and RLS Policy for all tables in public schema
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'GRANT ALL ON TABLE public.' || quote_ident(r.tablename) || ' TO anon, authenticated, service_role';
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "allow_all_access" ON public.' || quote_ident(r.tablename);
    EXECUTE 'CREATE POLICY "allow_all_access" ON public.' || quote_ident(r.tablename) || ' FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
  END LOOP;
END $$;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
`;

async function main() {
  console.log('[PATCH-SCHEMA] Applying DDL patch for events and core tables...');
  const { data, error } = await adminClient.rpc('exec_ddl', { query: sql });
  if (error) {
    console.error('[PATCH-SCHEMA] Error executing DDL:', error);
    process.exit(1);
  }
  console.log('[PATCH-SCHEMA] DDL patch applied successfully!');

  // Wait 2 seconds for PostgREST to reload schema
  await new Promise(r => setTimeout(r, 2000));

  // Test anon client upsert
  const anonClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU');
  const testId = `test_${Date.now()}`;
  const { error: upsertErr } = await anonClient.from('events').upsert({
    id: testId,
    title: 'Test Event Anon',
    date: '2026-09-19',
    time: '18:00',
    location: 'Test Location',
    type: 'meeting',
    description: '',
    rsvps: {},
    isShiftBased: false,
    shifts: [],
    committees: {}
  });

  if (upsertErr) {
    console.error('[PATCH-SCHEMA] Test anon upsert failed:', upsertErr);
    process.exit(1);
  }
  console.log('[PATCH-SCHEMA] Test anon upsert SUCCEEDED!');

  await anonClient.from('events').delete().eq('id', testId);
  console.log('[PATCH-SCHEMA] Test anon delete SUCCEEDED!');
}

main().catch(err => {
  console.error('[PATCH-SCHEMA] Fatal error:', err);
  process.exit(1);
});
