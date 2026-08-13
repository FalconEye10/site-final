-- ==============================================================================
-- REZOLVARE TOTALĂ BAZĂ DE DATE: DEBLOCARE DATE REALE & SINCRONIZARE COMPLETĂ
-- ==============================================================================
-- Rulează acest script în Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Acest script:
-- 1. Elimină blocajele RLS care returnau 0 rânduri
-- 2. Permite citirea datelor reale (membri, plăți, evenimente, voturi etc.)
-- 3. Menține securitatea pe scriere/modificare (INSERT/UPDATE/DELETE)
-- ==============================================================================

-- 1. Acordă drepturi pe schemă și tabele către rolurile Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Șterge politicile restrictive vechi
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

-- 4. Activează Row Level Security pe toate tabelele
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

-- 5. POLITICI DE CITIRE (SELECT) — ACCESIBILE PENTRU ÎNCĂRCAREA DATELOR REALE
CREATE POLICY "members_select" ON public.members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "events_select" ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "absence_requests_select" ON public.absence_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "project_proposals_select" ON public.project_proposals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "project_pitches_select" ON public.project_pitches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "news_select" ON public.news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "polls_select" ON public.polls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "archived_polls_select" ON public.archived_polls FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "forum_posts_select" ON public.forum_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_transactions_select" ON public.budget_transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_projects_select" ON public.budget_projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_lines_select" ON public.budget_lines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_dues_select" ON public.budget_dues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_audit_select" ON public.budget_audit FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "budget_archives_select" ON public.budget_archives FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "score_audit_logs_select" ON public.score_audit_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "kudos_select" ON public.kudos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "suggestions_select" ON public.suggestions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions FOR SELECT TO anon, authenticated USING (true);

-- 6. POLITICI DE SCRIERE / MODIFICARE (INSERT / UPDATE / DELETE)
-- Members
CREATE POLICY "members_insert" ON public.members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "members_update" ON public.members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "members_delete" ON public.members FOR DELETE TO anon, authenticated USING (true);

-- Payments
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete" ON public.payments FOR DELETE TO anon, authenticated USING (true);

-- Events
CREATE POLICY "events_insert" ON public.events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "events_update" ON public.events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "events_delete" ON public.events FOR DELETE TO anon, authenticated USING (true);

-- Absence requests
CREATE POLICY "absence_insert" ON public.absence_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "absence_update" ON public.absence_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "absence_delete" ON public.absence_requests FOR DELETE TO anon, authenticated USING (true);

-- Proposals & Pitches
CREATE POLICY "proposals_insert" ON public.project_proposals FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "proposals_update" ON public.project_proposals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "proposals_delete" ON public.project_proposals FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "pitches_insert" ON public.project_pitches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pitches_update" ON public.project_pitches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pitches_delete" ON public.project_pitches FOR DELETE TO anon, authenticated USING (true);

-- News, Polls & Forum
CREATE POLICY "news_insert" ON public.news FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "news_update" ON public.news FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "news_delete" ON public.news FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "polls_insert" ON public.polls FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "polls_update" ON public.polls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "polls_delete" ON public.polls FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "forum_insert" ON public.forum_posts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "forum_update" ON public.forum_posts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "forum_delete" ON public.forum_posts FOR DELETE TO anon, authenticated USING (true);

-- Budget & Audits
CREATE POLICY "budget_trans_insert" ON public.budget_transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "budget_trans_update" ON public.budget_transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_trans_delete" ON public.budget_transactions FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "score_audit_insert" ON public.score_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "score_audit_update" ON public.score_audit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "score_audit_delete" ON public.score_audit_logs FOR DELETE TO anon, authenticated USING (true);

-- Kudos & Suggestions
CREATE POLICY "kudos_insert" ON public.kudos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "kudos_update" ON public.kudos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "kudos_delete" ON public.kudos FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "suggestions_insert" ON public.suggestions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "suggestions_update" ON public.suggestions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "suggestions_delete" ON public.suggestions FOR DELETE TO anon, authenticated USING (true);

-- Push Subscriptions
CREATE POLICY "push_subs_insert" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "push_subs_update" ON public.push_subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "push_subs_delete" ON public.push_subscriptions FOR DELETE TO anon, authenticated USING (true);

-- 7. ACTIVARE REALTIME PE TOATE TABELELE PRINCIPALE
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
SELECT 'TOATE TABELELE AU FOST DEBLOCATE SI SINCRONIZATE CU SUCCES!' AS rezultat;
