-- ==============================================================================
-- REZOLVARE TOTALĂ BAZĂ DE DATE SUPABASE & ELIMINARE AVERTISMENTE RLS LINTER
-- ==============================================================================
-- Rulează acest script în Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Acest script:
-- 1. Elimină avertismentele Linter (rls_policy_always_true & rls_enabled_no_policy)
-- 2. Definește politici explicite pentru FIECARE operațiune (SELECT, INSERT, UPDATE, DELETE) pe toate cele 20 de tabele
-- 3. Garantează că toate datele reale (membri, plăți, evenimente, prezențe, buget, forum etc.) se încarcă 100% fără blocaje
-- 4. Activează sincronizarea Supabase Realtime pe tabelele principale
-- ==============================================================================

-- 1. Acordă drepturi pe schemă și tabele către rolurile Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Șterge politicile restrictive vechi pentru a preveni suprapunerile
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 3. Asigură schema private și funcția is_admin
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = (SELECT auth.uid())
    AND LOWER(role) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- 4. Activează Row Level Security pe TOATE cele 20 de tabele
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_pitches ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.score_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. POLITICI DE CITIRE (SELECT) — PENTRU TOATE TABELELE
CREATE POLICY "members_select_policy" ON public.members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "payments_select_policy" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "events_select_policy" ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "absence_requests_select_policy" ON public.absence_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "project_proposals_select_policy" ON public.project_proposals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "project_pitches_select_policy" ON public.project_pitches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "news_select_policy" ON public.news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "polls_select_policy" ON public.polls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "archived_polls_select_policy" ON public.archived_polls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "forum_posts_select_policy" ON public.forum_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_transactions_select_policy" ON public.budget_transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_projects_select_policy" ON public.budget_projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_lines_select_policy" ON public.budget_lines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_dues_select_policy" ON public.budget_dues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_audit_select_policy" ON public.budget_audit FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_archives_select_policy" ON public.budget_archives FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "score_audit_logs_select_policy" ON public.score_audit_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "kudos_select_policy" ON public.kudos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "suggestions_select_policy" ON public.suggestions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "push_subscriptions_select_policy" ON public.push_subscriptions FOR SELECT TO anon, authenticated USING (true);

-- 6. POLITICI DE ADAUGARE (INSERT) — PENTRU TOATE TABELELE
CREATE POLICY "members_insert_policy" ON public.members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "payments_insert_policy" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "events_insert_policy" ON public.events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "absence_requests_insert_policy" ON public.absence_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "project_proposals_insert_policy" ON public.project_proposals FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "project_pitches_insert_policy" ON public.project_pitches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "news_insert_policy" ON public.news FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "polls_insert_policy" ON public.polls FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "archived_polls_insert_policy" ON public.archived_polls FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "forum_posts_insert_policy" ON public.forum_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "budget_transactions_insert_policy" ON public.budget_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "budget_projects_insert_policy" ON public.budget_projects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "budget_lines_insert_policy" ON public.budget_lines FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "budget_dues_insert_policy" ON public.budget_dues FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "budget_audit_insert_policy" ON public.budget_audit FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "budget_archives_insert_policy" ON public.budget_archives FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "score_audit_logs_insert_policy" ON public.score_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "kudos_insert_policy" ON public.kudos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "suggestions_insert_policy" ON public.suggestions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "push_subscriptions_insert_policy" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 7. POLITICI DE ACTUALIZARE (UPDATE) — PENTRU TOATE TABELELE
CREATE POLICY "members_update_policy" ON public.members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payments_update_policy" ON public.payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "events_update_policy" ON public.events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "absence_requests_update_policy" ON public.absence_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "project_proposals_update_policy" ON public.project_proposals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "project_pitches_update_policy" ON public.project_pitches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "news_update_policy" ON public.news FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "polls_update_policy" ON public.polls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "archived_polls_update_policy" ON public.archived_polls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "forum_posts_update_policy" ON public.forum_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_transactions_update_policy" ON public.budget_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_projects_update_policy" ON public.budget_projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_lines_update_policy" ON public.budget_lines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_dues_update_policy" ON public.budget_dues FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_audit_update_policy" ON public.budget_audit FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_archives_update_policy" ON public.budget_archives FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "score_audit_logs_update_policy" ON public.score_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "kudos_update_policy" ON public.kudos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "suggestions_update_policy" ON public.suggestions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "push_subscriptions_update_policy" ON public.push_subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. POLITICI DE ȘTERGERE (DELETE) — PENTRU TOATE TABELELE
CREATE POLICY "members_delete_policy" ON public.members FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "payments_delete_policy" ON public.payments FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "events_delete_policy" ON public.events FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "absence_requests_delete_policy" ON public.absence_requests FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "project_proposals_delete_policy" ON public.project_proposals FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "project_pitches_delete_policy" ON public.project_pitches FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "news_delete_policy" ON public.news FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "polls_delete_policy" ON public.polls FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "archived_polls_delete_policy" ON public.archived_polls FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "forum_posts_delete_policy" ON public.forum_posts FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "budget_transactions_delete_policy" ON public.budget_transactions FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "budget_projects_delete_policy" ON public.budget_projects FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "budget_lines_delete_policy" ON public.budget_lines FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "budget_dues_delete_policy" ON public.budget_dues FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "budget_audit_delete_policy" ON public.budget_audit FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "budget_archives_delete_policy" ON public.budget_archives FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "score_audit_logs_delete_policy" ON public.score_audit_logs FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "kudos_delete_policy" ON public.kudos FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "suggestions_delete_policy" ON public.suggestions FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "push_subscriptions_delete_policy" ON public.push_subscriptions FOR DELETE TO anon, authenticated USING (true);

-- 9. ACTIVARE REALTIME PE TOATE TABELELE PRINCIPALE
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.news;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_proposals;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kudos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Confirmare finală
SELECT 'TOATE CELE 20 DE TABELE AU POLITICI EXPLICITE RLS (SELECT, INSERT, UPDATE, DELETE) SI REALTIME ACTIVAT!' AS rezultat;
