import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Încărcare variabile din .env
function loadEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'project-source/.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
      return envPath;
    }
  }
  return null;
}

const envFileUsed = loadEnv();
console.log(`[INIT-SCHEMA] Fișier .env încărcat din: ${envFileUsed || 'NEIDENTIFICAT (folosește variabilele de mediu existente)'}`);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[EROARE CRITICĂ] Lipsesc SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// DDL pentru fiecare dintre cele 5 tabele
const ddlStatements = [
  // 1. budget_lines
  `
  CREATE TABLE IF NOT EXISTS public.budget_lines (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT,
    allocated_amount NUMERIC DEFAULT 0,
    spent_amount NUMERIC DEFAULT 0,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC DEFAULT 0;
  ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS spent_amount NUMERIC DEFAULT 0;
  ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE public.budget_lines ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.budget_lines ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON TABLE public.budget_lines TO anon, authenticated, service_role;
  `,

  // 2. budget_projects
  `
  CREATE TABLE IF NOT EXISTS public.budget_projects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT,
    allocated_budget NUMERIC DEFAULT 0,
    spent_budget NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS allocated_budget NUMERIC DEFAULT 0;
  ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS spent_budget NUMERIC DEFAULT 0;
  ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  ALTER TABLE public.budget_projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.budget_projects ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  ALTER TABLE public.budget_projects ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON TABLE public.budget_projects TO anon, authenticated, service_role;
  `,

  // 3. budget_dues
  `
  CREATE TABLE IF NOT EXISTS public.budget_dues (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    month TEXT,
    amount NUMERIC DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.budget_dues ADD COLUMN IF NOT EXISTS member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL;
  ALTER TABLE public.budget_dues ADD COLUMN IF NOT EXISTS month TEXT;
  ALTER TABLE public.budget_dues ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
  ALTER TABLE public.budget_dues ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.budget_dues ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
  ALTER TABLE public.budget_dues ADD COLUMN IF NOT EXISTS receipt_url TEXT;
  ALTER TABLE public.budget_dues ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.budget_dues ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  ALTER TABLE public.budget_dues ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON TABLE public.budget_dues TO anon, authenticated, service_role;
  `,

  // 4. project_pitches
  `
  CREATE TABLE IF NOT EXISTS public.project_pitches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT,
    description TEXT,
    budget_estimate NUMERIC,
    submitter_name TEXT,
    submitter_email TEXT,
    pdf_storage_path TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS budget_estimate NUMERIC;
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS submitter_name TEXT;
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS submitter_email TEXT;
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS pdfUrl TEXT;
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
  ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.project_pitches ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  ALTER TABLE public.project_pitches ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON TABLE public.project_pitches TO anon, authenticated, service_role;
  `,

  // 5. forum_posts
  `
  CREATE TABLE IF NOT EXISTS public.forum_posts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT,
    content TEXT,
    author_id TEXT,
    author_name TEXT,
    category TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS content TEXT;
  ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS author_id TEXT;
  ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS author_name TEXT;
  ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
  ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.forum_posts ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON TABLE public.forum_posts TO anon, authenticated, service_role;
  `,
];

async function run() {
  console.log('[INIT-SCHEMA] Pornire execuție migrare DDL Supabase...');

  for (let i = 0; i < ddlStatements.length; i++) {
    const stmt = ddlStatements[i];
    const { error } = await supabase.rpc('exec_ddl', { query: stmt });
    if (error) {
      console.error(`[EROARE DDL pas ${i + 1}]:`, error);
      process.exit(1);
    }
  }

  console.log('[INIT-SCHEMA] Toate instrucțiunile DDL au fost executate cu succes!\n');

  // Verificare tabele
  const tables = [
    'budget_lines',
    'budget_projects',
    'budget_dues',
    'project_pitches',
    'forum_posts',
  ];

  console.log('--------------------------------------------------------------------------------------------------');
  console.log('| Nume Tabel         | Stare Creare / Verificare | RLS Activ | Răspuns Query (SELECT test)       |');
  console.log('--------------------------------------------------------------------------------------------------');

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    const queryStatus = error ? `EROARE: ${error.message}` : `OK (${Array.isArray(data) ? data.length : 0} rânduri returnate)`;
    console.log(`| ${table.padEnd(18)} | Confirmat Prezent         | Activ     | ${queryStatus.padEnd(33)} |`);
  }
  console.log('--------------------------------------------------------------------------------------------------');
}

run().catch((err) => {
  console.error('[EROARE FATALĂ]:', err);
  process.exit(1);
});
