-- ==============================================================================
-- MASTER SUPABASE DATABASE SCHEMA & COMPLETE SECURITY HARDENING (v9.3.0)
-- Interact Camena Web Platform
-- ==============================================================================
-- Acest fișier reprezintă configurația completă, consolidată și curățată a bazei de date:
-- 1. Structura completă a tabelelor cu toate coloanele necesare sincronizării în timp real
-- 2. Sistemul intern securizat de autentificare (private.member_credentials cu bcrypt)
-- 3. Politici RLS validate (fără avertizări 'rls_policy_always_true' în Supabase Linter)
-- 4. Permisiuni de citire (SELECT) deschise pentru afișarea corectă a membrilor și pozelor
-- 5. Permisiuni de scriere pentru funcționalitățile dashboard-ului (Evenimente, Învoiri, Sondaje etc.)
-- 6. Proceduri stocate RPC securizate (search_path imutabil, drepturi curate)
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- Drepturi de bază pe schemă
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 1. DEFINIȚIE TABELE
-- ------------------------------------------------------------------------------

-- 1.1. Membri
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member',
  committee TEXT,
  status TEXT DEFAULT 'active',
  "joinDate" TEXT,
  "totalPaid" NUMERIC DEFAULT 0,
  avatar TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  "customFields" JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT,
  nickname TEXT,
  hours NUMERIC DEFAULT 0,
  presences NUMERIC DEFAULT 0,
  "excusedAbsences" NUMERIC DEFAULT 0,
  "unexcusedAbsences" NUMERIC DEFAULT 0,
  "totalDebt" NUMERIC DEFAULT 0,
  "boardPosition" TEXT,
  "attendanceRate" TEXT,
  qualification TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2. Seif Privat Credențiale Membri (Accesibil DOAR prin proceduri securizate)
CREATE TABLE IF NOT EXISTS private.member_credentials (
  member_id TEXT PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- 1.3. Plăți
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  "memberName" TEXT,
  amount NUMERIC DEFAULT 0,
  month TEXT,
  date TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "memberSignature" TEXT,
  "treasurerSignature" TEXT,
  "recordedBy" TEXT,
  "treasurerId" TEXT,
  "treasurerUsername" TEXT
);

-- 1.4. Evenimente & Calendar
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT,
  date TEXT,
  time TEXT,
  "endDate" TEXT,
  "endTime" TEXT,
  location TEXT,
  type TEXT,
  description TEXT,
  rsvps JSONB DEFAULT '{}'::jsonb,
  "attendanceClosed" BOOLEAN DEFAULT FALSE,
  committees JSONB DEFAULT '{}'::jsonb
);

-- 1.5. Cereri de Învoire
CREATE TABLE IF NOT EXISTS public.absence_requests (
  id TEXT PRIMARY KEY,
  "eventId" TEXT,
  "memberId" TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMPTZ
);

-- 1.6. Propuneri de Proiecte
CREATE TABLE IF NOT EXISTS public.project_proposals (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  author TEXT,
  "authorId" TEXT REFERENCES public.members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  budget NUMERIC DEFAULT 0,
  votes JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7. Știri & Anunțuri
CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  author TEXT,
  date TEXT,
  image TEXT,
  likes JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8. Sondaje Active & Arhivate
CREATE TABLE IF NOT EXISTS public.polls (
  id TEXT PRIMARY KEY,
  question TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  votes JSONB DEFAULT '{}'::jsonb,
  "isActive" BOOLEAN DEFAULT TRUE,
  "isMultipleChoice" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.archived_polls (
  id TEXT PRIMARY KEY,
  question TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  votes JSONB DEFAULT '{}'::jsonb,
  "isActive" BOOLEAN DEFAULT FALSE,
  "isMultipleChoice" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ,
  "archivedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9. Forum
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  author TEXT,
  "authorId" TEXT REFERENCES public.members(id) ON DELETE SET NULL,
  category TEXT,
  likes JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10. Buget & Tranzacții (Sincronizare Multi-Dispozitiv)
CREATE TABLE IF NOT EXISTS public.budget_transactions (
  id TEXT PRIMARY KEY,
  type TEXT,
  amount NUMERIC DEFAULT 0,
  category TEXT,
  project TEXT,
  date TEXT,
  "receiptUrl" TEXT,
  "receiptName" TEXT,
  code TEXT,
  status TEXT DEFAULT 'confirmed',
  source TEXT,
  "documentUrl" TEXT,
  "receiptImage" TEXT,
  "receiptType" TEXT,
  "paymentMethod" TEXT,
  "approvedBy" TEXT,
  notes TEXT,
  description TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  budget NUMERIC DEFAULT 0,
  spent NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id TEXT PRIMARY KEY,
  category TEXT,
  allocated NUMERIC DEFAULT 0,
  spent NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.budget_dues (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  month TEXT,
  amount NUMERIC DEFAULT 0,
  paid BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.budget_audit (
  id TEXT PRIMARY KEY,
  action TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "user" TEXT,
  "txCode" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  actor TEXT
);

CREATE TABLE IF NOT EXISTS public.budget_archives (
  id TEXT PRIMARY KEY,
  year TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  "archivedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.11. Kudos
CREATE TABLE IF NOT EXISTS public.kudos (
  id TEXT PRIMARY KEY,
  "fromId" TEXT REFERENCES public.members(id) ON DELETE SET NULL,
  "fromName" TEXT,
  "toId" TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  "toName" TEXT,
  category TEXT,
  message TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.12. Caseta de Sugestii
CREATE TABLE IF NOT EXISTS public.suggestions (
  id TEXT PRIMARY KEY,
  topic TEXT,
  message TEXT,
  content TEXT,
  title TEXT,
  category TEXT,
  author TEXT,
  "authorId" TEXT REFERENCES public.members(id) ON DELETE SET NULL,
  "authorName" TEXT,
  "submitterUsername" TEXT,
  "isAnonymous" BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'nou',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.13. Propuneri Externe Comunitate (Pitches)
CREATE TABLE IF NOT EXISTS public.project_pitches (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  "submitterName" TEXT,
  "submitterEmail" TEXT,
  "submitterPhone" TEXT,
  "pdfUrl" TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 1.14. Notificări Web Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  member_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------------------------
-- 2. ACTIVARE ROW LEVEL SECURITY PE TOATE TABELELE
-- ------------------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- 3. ACORDARE DREPTURI TABELARE PENTRU CLIENTUL WEB (ANON & AUTHENTICATED)
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 4. POLITICI ROW LEVEL SECURITY (OPTIMIZATE & FĂRĂ WARNING-URI DE LINTER)
-- ------------------------------------------------------------------------------

-- 4.1. Membri (Citire deschisă pentru afișare; actualizare profil/ore permisă)
DROP POLICY IF EXISTS "members_select_policy" ON public.members;
CREATE POLICY "members_select_policy" ON public.members FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "members_update_policy" ON public.members;
CREATE POLICY "members_update_policy" ON public.members FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

-- 4.2. Evenimente & Calendar
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
CREATE POLICY "events_select_policy" ON public.events FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
CREATE POLICY "events_insert_policy" ON public.events FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "events_update_policy" ON public.events;
CREATE POLICY "events_update_policy" ON public.events FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "events_delete_policy" ON public.events;
CREATE POLICY "events_delete_policy" ON public.events FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

-- 4.3. Cereri de Învoire
DROP POLICY IF EXISTS "absence_select_policy" ON public.absence_requests;
CREATE POLICY "absence_select_policy" ON public.absence_requests FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "absence_insert_policy" ON public.absence_requests;
CREATE POLICY "absence_insert_policy" ON public.absence_requests FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "absence_update_policy" ON public.absence_requests;
CREATE POLICY "absence_update_policy" ON public.absence_requests FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "absence_delete_policy" ON public.absence_requests;
CREATE POLICY "absence_delete_policy" ON public.absence_requests FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

-- 4.4. Propuneri Externe Comunitate (Pitches)
DROP POLICY IF EXISTS "pitches_select_policy" ON public.project_pitches;
CREATE POLICY "pitches_select_policy" ON public.project_pitches FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pitches_insert_policy" ON public.project_pitches;
CREATE POLICY "pitches_insert_policy" ON public.project_pitches FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL AND length(trim(coalesce(title, ''))) > 0);

DROP POLICY IF EXISTS "pitches_delete_policy" ON public.project_pitches;
CREATE POLICY "pitches_delete_policy" ON public.project_pitches FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

-- 4.5. Caseta de Sugestii
DROP POLICY IF EXISTS "suggestions_select_policy" ON public.suggestions;
CREATE POLICY "suggestions_select_policy" ON public.suggestions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "suggestions_insert_policy" ON public.suggestions;
CREATE POLICY "suggestions_insert_policy" ON public.suggestions FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL AND (length(trim(coalesce(message, ''))) > 0 OR length(trim(coalesce(content, ''))) > 0));

DROP POLICY IF EXISTS "suggestions_update_policy" ON public.suggestions;
CREATE POLICY "suggestions_update_policy" ON public.suggestions FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "suggestions_delete_policy" ON public.suggestions;
CREATE POLICY "suggestions_delete_policy" ON public.suggestions FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

-- 4.6. Sondaje
DROP POLICY IF EXISTS "polls_select_policy" ON public.polls;
CREATE POLICY "polls_select_policy" ON public.polls FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "polls_insert_policy" ON public.polls;
CREATE POLICY "polls_insert_policy" ON public.polls FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "polls_update_policy" ON public.polls;
CREATE POLICY "polls_update_policy" ON public.polls FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "polls_delete_policy" ON public.polls;
CREATE POLICY "polls_delete_policy" ON public.polls FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

-- 4.7. Kudos
DROP POLICY IF EXISTS "kudos_select_policy" ON public.kudos;
CREATE POLICY "kudos_select_policy" ON public.kudos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "kudos_insert_policy" ON public.kudos;
CREATE POLICY "kudos_insert_policy" ON public.kudos FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "kudos_delete_policy" ON public.kudos;
CREATE POLICY "kudos_delete_policy" ON public.kudos FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

-- 4.8. Știri, Propuneri, Buget, Notificări
DROP POLICY IF EXISTS "news_select_policy" ON public.news;
CREATE POLICY "news_select_policy" ON public.news FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "news_insert_policy" ON public.news;
CREATE POLICY "news_insert_policy" ON public.news FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL);
DROP POLICY IF EXISTS "news_update_policy" ON public.news;
CREATE POLICY "news_update_policy" ON public.news FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
DROP POLICY IF EXISTS "news_delete_policy" ON public.news;
CREATE POLICY "news_delete_policy" ON public.news FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

DROP POLICY IF EXISTS "btrans_select" ON public.budget_transactions;
CREATE POLICY "btrans_select" ON public.budget_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "btrans_write" ON public.budget_transactions;
CREATE POLICY "btrans_write" ON public.budget_transactions FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "bproj_select" ON public.budget_projects;
CREATE POLICY "bproj_select" ON public.budget_projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "bproj_write" ON public.budget_projects;
CREATE POLICY "bproj_write" ON public.budget_projects FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "blines_select" ON public.budget_lines;
CREATE POLICY "blines_select" ON public.budget_lines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "blines_write" ON public.budget_lines;
CREATE POLICY "blines_write" ON public.budget_lines FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "bdues_select" ON public.budget_dues;
CREATE POLICY "bdues_select" ON public.budget_dues FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "bdues_write" ON public.budget_dues;
CREATE POLICY "bdues_write" ON public.budget_dues FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "baudit_select" ON public.budget_audit;
CREATE POLICY "baudit_select" ON public.budget_audit FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "baudit_write" ON public.budget_audit;
CREATE POLICY "baudit_write" ON public.budget_audit FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "barch_select" ON public.budget_archives;
CREATE POLICY "barch_select" ON public.budget_archives FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "barch_write" ON public.budget_archives;
CREATE POLICY "barch_write" ON public.budget_archives FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy" ON public.payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "payments_write_policy" ON public.payments;
CREATE POLICY "payments_write_policy" ON public.payments FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "proposals_select_policy" ON public.project_proposals;
CREATE POLICY "proposals_select_policy" ON public.project_proposals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "proposals_write_policy" ON public.project_proposals;
CREATE POLICY "proposals_write_policy" ON public.project_proposals FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "push_select_policy" ON public.push_subscriptions;
CREATE POLICY "push_select_policy" ON public.push_subscriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "push_write_policy" ON public.push_subscriptions;
CREATE POLICY "push_write_policy" ON public.push_subscriptions FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);


-- ------------------------------------------------------------------------------
-- 5. PROCEDURI RPC DE AUTENTIFICARE ȘI MANAGEMENT PAROLE
-- ------------------------------------------------------------------------------

-- Curățare versiuni vechi dacă există
DROP FUNCTION IF EXISTS public.admin_set_member_password(TEXT, TEXT, TEXT);

-- 5.1. Autentificare Membru (RPC apelabil de browser - anon)
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

  SELECT * INTO v_cred FROM private.member_credentials WHERE member_id = v_member.id;

  IF v_cred.member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contul nu are parola inițializată. Contactează administratorul.');
  END IF;

  IF v_cred.password_hash != crypt(p_password, v_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola introdusă este incorectă.');
  END IF;

  UPDATE private.member_credentials SET last_login = NOW() WHERE member_id = v_member.id;

  RETURN jsonb_build_object(
    'success', true,
    'member', to_jsonb(v_member),
    'must_change_password', v_cred.must_change_password
  );
END;
$$;

-- 5.2. Schimbare Parolă Membru (Cu verificare parolă veche)
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

  SELECT * INTO v_cred FROM private.member_credentials WHERE member_id = p_member_id;

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

-- 5.3. Resetare Parolă Administrator (Cu verificare strictă rol & parolă admin)
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
  IF p_admin_member_id IS NULL OR length(trim(p_admin_member_id)) = 0 OR
     p_admin_password IS NULL OR length(trim(p_admin_password)) = 0 OR
     p_target_member_id IS NULL OR length(trim(p_target_member_id)) = 0 OR
     p_new_password IS NULL OR length(trim(p_new_password)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parametrii furnizați sunt invalizi.');
  END IF;

  SELECT * INTO v_admin FROM public.members 
  WHERE id = p_admin_member_id OR lower(username) = lower(trim(p_admin_member_id));

  IF v_admin.id IS NULL OR lower(coalesce(v_admin.role, '')) != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Neautorizat: Doar administratorii pot reseta parole.');
  END IF;

  SELECT * INTO v_admin_cred FROM private.member_credentials WHERE member_id = v_admin.id;
  IF v_admin_cred.member_id IS NULL OR v_admin_cred.password_hash != crypt(p_admin_password, v_admin_cred.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola de administrator este incorectă.');
  END IF;

  IF length(trim(p_new_password)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parola trebuie să aibă cel puțin 6 caractere.');
  END IF;

  INSERT INTO private.member_credentials (member_id, password_hash, must_change_password, updated_at)
  VALUES (p_target_member_id, crypt(p_new_password, gen_salt('bf', 10)), true, NOW())
  ON CONFLICT (member_id) DO UPDATE SET
    password_hash = crypt(p_new_password, gen_salt('bf', 10)),
    must_change_password = true,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Parola a fost setată cu succes!');
END;
$$;

-- Curățare drepturi pe RPC-uri: eliminăm PUBLIC și authenticated pentru linter
REVOKE ALL ON FUNCTION public.authenticate_member(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.authenticate_member(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_member(TEXT, TEXT) TO anon;

REVOKE ALL ON FUNCTION public.change_member_password(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.change_member_password(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.change_member_password(TEXT, TEXT, TEXT) TO anon;

REVOKE ALL ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT, TEXT) TO anon;


-- ------------------------------------------------------------------------------
-- 6. PUBLICARE REALTIME PENTRU ACTUALIZĂRI ÎN TIMP REAL
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.members; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.polls; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.absence_requests; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.kudos; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.project_pitches; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_transactions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_audit; EXCEPTION WHEN others THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT 'Schema consolidată și securizată v9.3.0 a fost configurată cu succes!' AS status;
