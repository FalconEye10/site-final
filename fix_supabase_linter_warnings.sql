-- ==============================================================================
-- FIX SUPABASE LINTER WARNINGS & SECURITY HARDENING
-- Interact Camena Web Platform (v9.0.0)
-- ==============================================================================
-- Acest script rezolvă warning-urile din Supabase Database Linter:
-- 1. function_search_path_mutable (pentru toate funcțiile din public)
-- 2. anon_security_definer_function_executable & authenticated pe protect_critical_member_data
-- 3. Curăță semnăturile vechi/obsolescent
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASUL 1: SECURIZAREA FUNCȚIILOR DE TIP TRIGGER / INTERNE
-- (Elimină avertizările: function_search_path_mutable, anon_security_definer_function_executable,
--  authenticated_security_definer_function_executable pentru protect_critical_member_data)
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1.1. Setăm search_path = public, pg_temp pentru funcțiile trigger/interne
  -- și revocăm permisiunea de execuție din API-ul public (anon, authenticated, PUBLIC)
  -- astfel încât PostgREST să NU le mai expună ca endpoint-uri RPC pe web!
  FOR r IN (
    SELECT p.oid::regprocedure AS func_signature, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'protect_critical_member_data',
        'protect_members_escalation',
        'validate_payment_receipt'
      )
  ) LOOP
    -- Fix search_path mutable
    EXECUTE 'ALTER FUNCTION ' || r.func_signature || ' SET search_path = public, pg_temp;';
    
    -- Fix anon_security_definer_function_executable & authenticated_security_definer_function_executable
    -- Un trigger nu trebuie niciodată să poată fi apelat direct prin POST /rest/v1/rpc/...
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.func_signature || ' FROM PUBLIC, anon, authenticated;';
    
    RAISE NOTICE 'Securizat trigger intern: % (search_path setat + apel extern revocat)', r.func_signature;
  END LOOP;
END $$;


-- ------------------------------------------------------------------------------
-- PASUL 2: CURĂȚAREA VERSIUNILOR VECHI (Dacă există funcția veche cu 3 parametri)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_set_member_password(TEXT, TEXT, TEXT);


-- ------------------------------------------------------------------------------
-- PASUL 3: ASIGURAREA UNUI SEARCH_PATH STRICT PE FUNCȚIILE RPC DE AUTENTIFICARE
-- (Protejează împotriva search_path hijacking și garantează securitatea seifului)
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT p.oid::regprocedure AS func_signature, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'authenticate_member',
        'change_member_password',
        'admin_set_member_password'
      )
  ) LOOP
    EXECUTE 'ALTER FUNCTION ' || r.func_signature || ' SET search_path = public, private, extensions, pg_temp;';
    RAISE NOTICE 'Setat search_path securizat pentru RPC: %', r.func_signature;
  END LOOP;
END $$;


-- ------------------------------------------------------------------------------
-- PASUL 4: RE-DECLARAREA SECURIZATĂ A PROCEDURII ADMIN_SET_MEMBER_PASSWORD (4 PARAMETRI)
-- Cu verificare dublă: rol admin + validare parolă admin cu bcrypt
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_member_password(
  p_admin_member_id TEXT,
  p_admin_password TEXT,
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
  v_admin_cred private.member_credentials%ROWTYPE;
BEGIN
  -- Validare parametri
  IF p_admin_member_id IS NULL OR length(trim(p_admin_member_id)) = 0 OR
     p_admin_password IS NULL OR length(trim(p_admin_password)) = 0 OR
     p_target_member_id IS NULL OR length(trim(p_target_member_id)) = 0 OR
     p_new_password IS NULL OR length(trim(p_new_password)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parametrii furnizați sunt invalizi.');
  END IF;

  -- Verificare existență și rol administrator
  SELECT * INTO v_admin FROM public.members 
  WHERE id = p_admin_member_id OR lower(username) = lower(trim(p_admin_member_id));

  IF v_admin.id IS NULL OR lower(coalesce(v_admin.role, '')) != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Neautorizat: Doar administratorii pot reseta parole.');
  END IF;

  -- Verificare criptografică parolă administrator
  SELECT * INTO v_admin_cred FROM private.member_credentials WHERE member_id = v_admin.id;
  IF v_admin_cred.member_id IS NULL OR v_admin_cred.password_hash != crypt(p_admin_password, v_admin_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola de administrator este incorectă.');
  END IF;

  -- Validare lungime parolă nouă
  IF length(trim(p_new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola trebuie să aibă cel puțin 6 caractere.');
  END IF;

  -- Setare criptată în seiful privat
  INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
  VALUES (p_target_member_id, crypt(p_new_password, gen_salt('bf', 10)), true, NOW())
  ON CONFLICT (member_id) DO UPDATE SET
    password_hash = crypt(p_new_password, gen_salt('bf', 10)),
    must_change_password = true,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Parola a fost setată cu succes!');
END;
$$;

-- Acordare drepturi explicite pentru RPC-ul de admin (necesar pentru AddMemberModal și MemberDrawer)
GRANT EXECUTE ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- PASUL 5: SINCRONIZARE STRUCTURĂ TABELE BUGET & AUDIT (Cross-Device Real-Time Sync)
-- Asigură că toate câmpurile necesare pentru sincronizarea pe mobil & desktop există
-- ------------------------------------------------------------------------------
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS "receiptImage" TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS "receiptType" TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.budget_transactions ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.budget_audit ADD COLUMN IF NOT EXISTS "user" TEXT;
ALTER TABLE public.budget_audit ADD COLUMN IF NOT EXISTS "txCode" TEXT;
ALTER TABLE public.budget_audit ADD COLUMN IF NOT EXISTS "oldValue" TEXT;
ALTER TABLE public.budget_audit ADD COLUMN IF NOT EXISTS "newValue" TEXT;
ALTER TABLE public.budget_audit ADD COLUMN IF NOT EXISTS actor TEXT;

-- Notă explicativă de confirmare:
SELECT 'Configurare de securitate și sincronizare buget finalizată cu succes!' AS status;
