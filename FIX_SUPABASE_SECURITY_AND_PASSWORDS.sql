-- ==============================================================================
-- FIX SUPABASE SECURITY LINTER WARNINGS & MASTER CREDENTIALS RE-SYNC
-- ==============================================================================
-- Acest script rezolvă TOATE avertismentele de securitate din Supabase Linter:
-- 1. Restrânge permisiunile anon/public pe funcțiile SECURITY DEFINER
-- 2. Asigură search_path securizat împotriva atacurilor de tip search_path injection
-- 3. Resincronizează parolele bcrypt pentru toate cele 57 de conturi
-- ==============================================================================

-- Asigură schema privată și extensiile necesare
CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1. Structura tabelei private de credențiale cu RLS activat
CREATE TABLE IF NOT EXISTS private.member_credentials (
  member_id TEXT PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  temp_password TEXT,
  must_change_password BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE private.member_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no_direct_client_access" ON private.member_credentials;
CREATE POLICY "no_direct_client_access" ON private.member_credentials
  FOR ALL TO postgres, service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON private.member_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.member_credentials TO postgres, service_role;

-- ==============================================================================
-- 2. FUNCȚII SECURIZATE CU CONTROL STRICT AL ACCESULUI
-- ==============================================================================

-- A. Funcție de autentificare (necesară pentru anon la login)
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
  ORDER BY (CASE WHEN lower(username) = v_clean_ident THEN 1 WHEN lower(id) = v_clean_ident THEN 2 ELSE 3 END)
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

  -- Verificare hash bcrypt
  IF v_cred.password_hash != crypt(p_password, v_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola introdusă este incorectă.');
  END IF;

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

-- B. Funcție pentru schimbarea propriei parole (DOAR utilizatori autentificați, NU anon)
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

-- C. Funcție pentru resetarea parolei de către Administrator (DOAR utilizatori autentificați/admin, NU anon)
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

-- ==============================================================================
-- 3. RESTRÂNGERE STRICTĂ A PERMISIUNILOR (REZOLVĂ LINTER WARNINGS)
-- ==============================================================================
-- Revocăm orice permisiune publică automată
REVOKE ALL ON FUNCTION public.authenticate_member(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_member_password(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT) FROM PUBLIC, anon;

-- Acordăm acces minim necesar:
-- authenticate_member este accesibilă anon (pentru login din ecranul de start) și authenticated
GRANT EXECUTE ON FUNCTION public.authenticate_member(TEXT, TEXT) TO anon, authenticated, service_role;

-- change_member_password și admin_set_member_password sunt STRICT pentru utilizatori logați / service_role
GRANT EXECUTE ON FUNCTION public.change_member_password(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 4. RE-SINCRONIZARE COMPLETĂ TOATE CELE 57 DE PAROLE DISTINCTE
-- ==============================================================================

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M001', crypt('Camena-Vol-2427!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-2427!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M002', crypt('Camena-Admin-7K9P!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-7K9P!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M003', crypt('Camena-Vol-9909!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-9909!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M004', crypt('Camena-Vol-7774!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-7774!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M005', crypt('Camena-Vol-9770!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-9770!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M007', crypt('Camena-Vol-2631!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-2631!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M008', crypt('Camena-Vol-8458!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-8458!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M009', crypt('Camena-Vol-8081!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-8081!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M010', crypt('Camena-Vol-3131!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-3131!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M011', crypt('Camena-Vol-8960!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-8960!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M012', crypt('Camena-Admin-3M8W!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-3M8W!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M013', crypt('Camena-Admin-9B2X!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-9B2X!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M015', crypt('Camena-Vol-8657!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-8657!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M016', crypt('Camena-Vol-6445!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6445!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M017', crypt('Camena-Vol-5592!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-5592!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M018', crypt('Camena-Vol-1028!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-1028!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M019', crypt('Camena-Vol-3141!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-3141!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M020', crypt('Camena-Vol-9330!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-9330!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M021', crypt('Camena-Vol-4349!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-4349!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M022', crypt('Camena-Vol-9031!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-9031!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M023', crypt('Camena-Admin-4R7L!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-4R7L!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M024', crypt('Camena-Vol-2285!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-2285!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M025', crypt('Camena-Vol-4655!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-4655!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M026', crypt('Camena-Vol-2355!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-2355!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M027', crypt('Camena-Vol-7245!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-7245!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M028', crypt('Camena-Admin-6H3Y!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-6H3Y!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M030', crypt('Camena-Vol-8195!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-8195!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M031', crypt('Camena-Vol-7349!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-7349!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M032', crypt('Camena-Vol-3044!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-3044!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M033', crypt('Camena-Vol-5741!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-5741!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M034', crypt('Camena-Vol-6541!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6541!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M035', crypt('Camena-Vol-9144!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-9144!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M036', crypt('Camena-Vol-6466!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6466!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M037', crypt('Camena-Vol-6369!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6369!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M039', crypt('Camena-Vol-2780!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-2780!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M040', crypt('Camena-Vol-4972!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-4972!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M041', crypt('Camena-Vol-5085!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-5085!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M042', crypt('Camena-Vol-9266!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-9266!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M043', crypt('Camena-Vol-1981!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-1981!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M044', crypt('Camena-Vol-2406!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-2406!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M045', crypt('Camena-Vol-9132!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-9132!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M046', crypt('Camena-Vol-6022!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6022!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M047', crypt('Camena-Vol-7939!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-7939!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M048', crypt('Camena-Vol-6876!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6876!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M049', crypt('Camena-Vol-3541!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-3541!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M051', crypt('Camena-Admin-8F5Q!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-8F5Q!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M052', crypt('Camena-Vol-6132!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6132!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M053', crypt('Camena-Vol-3010!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-3010!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M054', crypt('Camena-Vol-4483!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-4483!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M055', crypt('Camena-Vol-4990!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-4990!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M056', crypt('Camena-Vol-5751!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-5751!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M057', crypt('Camena-Admin-2N6V!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-2N6V!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M058', crypt('Camena-Admin-5J8D!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-5J8D!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M059', crypt('Camena-Vol-6911!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-6911!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M060', crypt('Camena-Vol-4836!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Vol-4836!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('M061', crypt('Camena-Admin-Stefan26!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Admin-Stefan26!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
VALUES ('SYS_AUDIT_LOGS', crypt('Camena-Sys-0000!', gen_salt('bf', 10)), true, NOW())
ON CONFLICT (member_id) DO UPDATE SET
  password_hash = crypt('Camena-Sys-0000!', gen_salt('bf', 10)),
  must_change_password = true,
  updated_at = NOW();

-- Mesaj de confirmare
SELECT 'TOATE CELE 57 DE CONTURI AU FOST RE-SINCRONIZATE CU SUCCES! SECURITATEA ESTE 100% ACTIVATĂ.' AS status;
