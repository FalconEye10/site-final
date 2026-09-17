-- ==============================================================================
-- REPARARE DEFINITIVĂ: MEMBRI NOI, SEMNĂTURI, PLĂȚI & FUNCȚII DASHBOARD
-- ==============================================================================
-- Rulează acest script în Supabase -> SQL Editor -> Run.
-- Rezolvă:
-- 1. Imposibilitatea adăugării de noi membri (INSERT permission + RLS policy pe members)
-- 2. Imposibilitatea salvării chitanțelor și semnăturilor (INSERT permission + RLS policy pe payments + coloane lipsă)
-- 3. Imposibilitatea adăugării de tranzacții în buget, forum, propuneri, sugestii
-- ==============================================================================

-- 1. ADĂUGARE COLOANE OPȚIONALE PE PAYMENTS DACĂ NU EXISTĂ
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "treasurerId" TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "treasurerUsername" TEXT;

-- 2. ACORDARE DREPTURI TABELARE COMPLETE (ANON & AUTHENTICATED)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absence_requests TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kudos TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_transactions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_projects TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_lines TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_dues TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_audit TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_archives TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_posts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_pitches TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_proposals TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO anon, authenticated, service_role;

-- 3. POLITICI RLS PENTRU MEMBRI (ADĂUGARE, EDITARE, ȘTERGERE, AFISARE)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select_policy" ON public.members;
CREATE POLICY "members_select_policy" ON public.members 
  FOR SELECT TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "members_insert_policy" ON public.members;
CREATE POLICY "members_insert_policy" ON public.members 
  FOR INSERT TO anon, authenticated 
  WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "members_update_policy" ON public.members;
CREATE POLICY "members_update_policy" ON public.members 
  FOR UPDATE TO anon, authenticated 
  USING (id IS NOT NULL) 
  WITH CHECK (id IS NOT NULL);

DROP POLICY IF EXISTS "members_delete_policy" ON public.members;
CREATE POLICY "members_delete_policy" ON public.members 
  FOR DELETE TO anon, authenticated 
  USING (id IS NOT NULL);

-- 4. POLITICI RLS PENTRU PLĂȚI & SEMNĂTURI (PAYMENTS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy" ON public.payments 
  FOR SELECT TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "payments_write_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
CREATE POLICY "payments_write_policy" ON public.payments 
  FOR ALL TO anon, authenticated 
  USING (id IS NOT NULL) 
  WITH CHECK (id IS NOT NULL);

-- 5. POLITICI RLS PENTRU BUGET (TRANZACȚII, PROIECTE, LINII, DATORII, AUDIT)
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "btrans_select" ON public.budget_transactions;
CREATE POLICY "btrans_select" ON public.budget_transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "btrans_write" ON public.budget_transactions;
CREATE POLICY "btrans_write" ON public.budget_transactions FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.budget_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bproj_select" ON public.budget_projects;
CREATE POLICY "bproj_select" ON public.budget_projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "bproj_write" ON public.budget_projects;
CREATE POLICY "bproj_write" ON public.budget_projects FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blines_select" ON public.budget_lines;
CREATE POLICY "blines_select" ON public.budget_lines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "blines_write" ON public.budget_lines;
CREATE POLICY "blines_write" ON public.budget_lines FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.budget_dues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bdues_select" ON public.budget_dues;
CREATE POLICY "bdues_select" ON public.budget_dues FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "bdues_write" ON public.budget_dues;
CREATE POLICY "bdues_write" ON public.budget_dues FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.budget_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "baudit_select" ON public.budget_audit;
CREATE POLICY "baudit_select" ON public.budget_audit FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "baudit_write" ON public.budget_audit;
CREATE POLICY "baudit_write" ON public.budget_audit FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.budget_archives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "barch_select" ON public.budget_archives;
CREATE POLICY "barch_select" ON public.budget_archives FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "barch_write" ON public.budget_archives;
CREATE POLICY "barch_write" ON public.budget_archives FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

-- 6. POLITICI RLS PENTRU FORUM, PROPUNERI, SUGESTII, NOTIFICĂRI
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "forum_select" ON public.forum_posts;
CREATE POLICY "forum_select" ON public.forum_posts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "forum_write" ON public.forum_posts;
CREATE POLICY "forum_write" ON public.forum_posts FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.project_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposals_select_policy" ON public.project_proposals;
CREATE POLICY "proposals_select_policy" ON public.project_proposals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "proposals_write_policy" ON public.project_proposals;
CREATE POLICY "proposals_write_policy" ON public.project_proposals FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suggestions_select_policy" ON public.suggestions;
CREATE POLICY "suggestions_select_policy" ON public.suggestions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "suggestions_write_policy" ON public.suggestions;
CREATE POLICY "suggestions_write_policy" ON public.suggestions FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_select_policy" ON public.push_subscriptions;
CREATE POLICY "push_select_policy" ON public.push_subscriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "push_write_policy" ON public.push_subscriptions;
CREATE POLICY "push_write_policy" ON public.push_subscriptions FOR ALL TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

-- 7. REÎMPROSPĂTARE SCHEMA CACHE POSTGREST
NOTIFY pgrst, 'reload schema';

SELECT 'Toate permisiunile pentru membri, semnături/plăți și funcționalitățile dashboard-ului au fost restaurate cu succes!' AS status;
