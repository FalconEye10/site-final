import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lsuxzfblbkqpcolujdlo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXh6ZmJsYmtxcGNvbHVqZGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTA1ODksImV4cCI6MjEwMTYyNjU4OX0.YWO1JIeEuXTdtm-MAWFdKNHSYb4YPcOOEPmllMu02sU'
);

async function main() {
  const { data: members, error } = await supabase
    .from('members')
    .select('*')
    .order('id', { ascending: true });

  if (error || !members) {
    console.error('Error fetching members:', error);
    return;
  }

  const adminSeeds = ['7K9P', '3M8W', '9B2X', '4R7L', '6H3Y', '8F5Q', '2N6V', '5J8D', '1A4Z', '9999'];
  let adminIdx = 0;
  let volSeed = 2468;

  const credsList = [];

  for (const m of members) {
    const isSys = m.id === 'SYS_AUDIT_LOGS' || m.username === 'sys_audit_logs';
    const isAdmin = m.role === 'admin' || (m.boardPosition && m.boardPosition.length > 0);

    let tempPass = '';
    if (isSys) {
      tempPass = 'Camena-Sys-0000!';
    } else if (m.username === 'stan.stefan' || m.id === 'M061' || m.id === 'M050') {
      tempPass = 'Camena-Admin-Stefan26!';
    } else if (isAdmin) {
      const code = adminSeeds[adminIdx % adminSeeds.length];
      adminIdx++;
      tempPass = `Camena-Admin-${code}!`;
    } else {
      volSeed = (volSeed * 37 + 101) % 8999 + 1000;
      tempPass = `Camena-Vol-${volSeed}!`;
    }

    const cleanUsername = (m.username || m.name || m.id)
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/ț/g, 't')
      .replace(/ș/g, 's')
      .replace(/ă/g, 'a')
      .replace(/î/g, 'i')
      .replace(/â/g, 'a')
      .replace(/[^a-z0-9.]/g, '');

    const email = m.email || `${cleanUsername}@interact-camena.internal`;

    credsList.push({
      id: m.id,
      name: m.name,
      username: m.username || cleanUsername,
      email,
      role: m.role || 'member',
      boardPosition: m.boardPosition || 'Voluntar',
      tempPassword: tempPass,
      isAdmin,
    });
  }

  if (!fs.existsSync('scripts/output')) {
    fs.mkdirSync('scripts/output', { recursive: true });
  }

  fs.writeFileSync('scripts/output/credentials.json', JSON.stringify(credsList, null, 2));

  // Build the complete SQL script that setups credentials table and inserts all password hashes
  let sql = `-- ==============================================================================
-- REWORK COMPLET: SISTEM DE AUTENTIFICARE SECURIZAT & PAROLE DISTINCTE
-- ==============================================================================
-- Rulează acest script în Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- 1. Creează tabela privată 'private.member_credentials'
-- 2. Creează funcția de autentificare sigură 'public.authenticate_member'
-- 3. Creează funcțiile de schimbare și resetare a parolei
-- 4. Populează toate cele ${credsList.length} de conturi cu parole temporare DISTINCTE
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1. Structura tabelei de credențiale (cu RLS 100% activat)
CREATE TABLE IF NOT EXISTS private.member_credentials (
  member_id TEXT PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  temp_password TEXT,
  must_change_password BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activează explicit Row Level Security (RLS) pentru a elimina avertismentul Supabase
ALTER TABLE private.member_credentials ENABLE ROW LEVEL SECURITY;

-- Securizare tabelă privată: doar procesele interne de sistem pot citi/scrie
DROP POLICY IF EXISTS "no_direct_client_access" ON private.member_credentials;
CREATE POLICY "no_direct_client_access" ON private.member_credentials
  FOR ALL TO postgres, service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON private.member_credentials FROM anon, authenticated;
GRANT ALL ON private.member_credentials TO postgres, service_role;

-- 2. Funcție de autentificare sigură (RPC)
CREATE OR REPLACE FUNCTION public.authenticate_member(
  p_identifier TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
  v_member public.members%ROWTYPE;
  v_cred private.member_credentials%ROWTYPE;
  v_clean_ident TEXT;
  v_norm_ident TEXT;
BEGIN
  IF p_identifier IS NULL OR length(trim(p_identifier)) = 0 OR p_password IS NULL OR length(trim(p_password)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Te rugăm să introduci numele de utilizator și parola.');
  END IF;

  v_clean_ident := lower(trim(p_identifier));
  v_norm_ident := lower(regexp_replace(v_clean_ident, '[^a-z0-9]', '', 'g'));

  -- Căutăm membrul după username, email, ID sau nume
  SELECT * INTO v_member
  FROM public.members
  WHERE lower(username) = v_clean_ident
     OR lower(email) = v_clean_ident
     OR lower(id) = v_clean_ident
     OR lower(regexp_replace(coalesce(username, ''), '[^a-z0-9]', '', 'g')) = v_norm_ident
     OR lower(regexp_replace(coalesce(name, ''), '[^a-z0-9]', '', 'g')) = v_norm_ident
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nume de utilizator sau email incorect.');
  END IF;

  SELECT * INTO v_cred
  FROM private.member_credentials
  WHERE member_id = v_member.id;

  IF v_cred.member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contul nu are parola inițializată. Contactează administratorul.');
  END IF;

  -- Verificăm hash-ul parolei prin pgcrypto crypt
  IF v_cred.password_hash != crypt(p_password, v_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola introdusă este incorectă.');
  END IF;

  -- Actualizăm data ultimei logări
  UPDATE private.member_credentials
  SET last_login = NOW()
  WHERE member_id = v_member.id;

  RETURN jsonb_build_object(
    'success', true,
    'member', to_jsonb(v_member),
    'must_change_password', v_cred.must_change_password
  );
END;
$$;

-- 3. Funcție pentru schimbarea propriei parole
CREATE OR REPLACE FUNCTION public.change_member_password(
  p_member_id TEXT,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
  v_cred private.member_credentials%ROWTYPE;
BEGIN
  IF length(trim(p_new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Noua parolă trebuie să aibă cel puțin 6 caractere.');
  END IF;

  SELECT * INTO v_cred
  FROM private.member_credentials
  WHERE member_id = p_member_id;

  IF v_cred.member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Membrul nu a fost găsit.');
  END IF;

  IF v_cred.password_hash != crypt(p_old_password, v_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola actuală este incorectă.');
  END IF;

  UPDATE private.member_credentials
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      must_change_password = false,
      updated_at = NOW()
  WHERE member_id = p_member_id;

  RETURN jsonb_build_object('success', true, 'message', 'Parola a fost modificată cu succes!');
END;
$$;

-- 4. Funcție pentru resetarea parolei de către un Administrator
CREATE OR REPLACE FUNCTION public.admin_set_member_password(
  p_admin_member_id TEXT,
  p_target_member_id TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
  v_admin public.members%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM public.members WHERE id = p_admin_member_id;
  IF v_admin.id IS NULL OR lower(v_admin.role) != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Neautorizat: Doar administratorii pot reseta parole.');
  END IF;

  IF length(trim(p_new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola trebuie să aibă cel puțin 6 caractere.');
  END IF;

  INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
  VALUES (
    p_target_member_id,
    crypt(p_new_password, gen_salt('bf', 10)),
    true,
    NOW()
  )
  ON CONFLICT (member_id) DO UPDATE SET
    password_hash = crypt(p_new_password, gen_salt('bf', 10)),
    must_change_password = true,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Parola a fost setată cu succes!');
END;
$$;

-- Permisiuni de execuție pe funcțiile RPC publice
GRANT EXECUTE ON FUNCTION public.authenticate_member(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_member_password(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. POPULARE PAROLE DISTINCTE PENTRU TOȚI MEMBRII
`;

  for (const c of credsList) {
    const escapedPass = c.tempPassword.replace(/'/g, "''");
    sql += `
INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('${c.id}', crypt('${escapedPass}', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('${escapedPass}', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();
`;
  }

  sql += `
-- Confirmare finală
SELECT 'SISTEMUL DE AUTENTIFICARE A FOST RECONSTRUIT CU SUCCES! TOTAL CONTURI CONFIGURATE: ${credsList.length}' AS rezultat;
`;

  fs.writeFileSync('MIGRATE_ALL_MEMBERS_TO_AUTH.sql', sql);
  console.log(`Generated SQL file with ${credsList.length} distinct member credentials.`);
}

main();
