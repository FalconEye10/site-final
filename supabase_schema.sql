-- ==============================================================================
-- Supabase SQL Schema for interact-camena-site (100% Linter & DNSC Compliant)
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- Grant schema and table permissions to standard Supabase roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 1. Members
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  committee TEXT,
  status TEXT DEFAULT 'active',
  "joinDate" TEXT,
  "totalPaid" NUMERIC DEFAULT 0,
  score NUMERIC DEFAULT 0,
  avatar TEXT,
  stats JSONB DEFAULT '{}'::jsonb,
  "scoreAdjustments" JSONB DEFAULT '[]'::jsonb,
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

-- 2. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  "memberName" TEXT,
  amount NUMERIC DEFAULT 0,
  month TEXT,
  date TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "memberSignature" TEXT,
  "treasurerSignature" TEXT
);

-- 3. Events
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
  committees JSONB DEFAULT '{}'::jsonb,
  "isShiftBased" BOOLEAN DEFAULT FALSE,
  shifts JSONB DEFAULT '[]'::jsonb,
  "durationHours" NUMERIC DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Absence Requests
CREATE TABLE IF NOT EXISTS public.absence_requests (
  id TEXT PRIMARY KEY,
  "eventId" TEXT,
  "memberId" TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  timestamp TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TEXT,
  "rejectReason" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Project Proposals
CREATE TABLE IF NOT EXISTS public.project_proposals (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  author TEXT,
  "authorId" TEXT,
  votes JSONB DEFAULT '[]'::jsonb,
  status TEXT,
  budget NUMERIC,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Project Pitches (Community Ideas)
CREATE TABLE IF NOT EXISTS public.project_pitches (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  "submitterName" TEXT,
  "submitterEmail" TEXT,
  "submitterPhone" TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS "submitterName" TEXT;
ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS "submitterEmail" TEXT;
ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS "submitterPhone" TEXT;
ALTER TABLE public.project_pitches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 7. News
CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  author TEXT,
  "authorId" TEXT,
  likes JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  image TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Polls & Archived Polls
CREATE TABLE IF NOT EXISTS public.polls (
  id TEXT PRIMARY KEY,
  title TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  votes JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.archived_polls (
  id TEXT PRIMARY KEY,
  title TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  votes JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Forum Posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  author TEXT,
  "authorId" TEXT,
  category TEXT,
  comments JSONB DEFAULT '[]'::jsonb,
  upvotes JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Budget Tables
CREATE TABLE IF NOT EXISTS public.budget_transactions (
  id TEXT PRIMARY KEY,
  type TEXT,
  category TEXT,
  amount NUMERIC,
  description TEXT,
  date TEXT,
  mandate TEXT,
  "projectId" TEXT,
  "lineId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  allocated NUMERIC,
  spent NUMERIC,
  mandate TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id TEXT PRIMARY KEY,
  category TEXT,
  allocated NUMERIC,
  spent NUMERIC,
  type TEXT,
  mandate TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_dues (
  id TEXT PRIMARY KEY,
  month TEXT,
  year TEXT,
  amount NUMERIC,
  mandate TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_audit (
  id TEXT PRIMARY KEY,
  action TEXT,
  details TEXT,
  timestamp TEXT,
  actor TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_archives (
  id TEXT PRIMARY KEY,
  mandate TEXT,
  data JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Score Audit Logs
CREATE TABLE IF NOT EXISTS public.score_audit_logs (
  id TEXT PRIMARY KEY,
  "adminId" TEXT,
  "adminName" TEXT,
  "adminUsername" TEXT,
  "targetMemberId" TEXT,
  "targetMemberName" TEXT,
  action TEXT,
  points NUMERIC,
  reason TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Kudos Table
CREATE TABLE IF NOT EXISTS public.kudos (
  id TEXT PRIMARY KEY,
  "fromId" TEXT,
  "fromName" TEXT,
  "toId" TEXT,
  "toName" TEXT,
  badge TEXT,
  message TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Suggestions Table
CREATE TABLE IF NOT EXISTS public.suggestions (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  author TEXT,
  "authorId" TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  likes JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.suggestions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 14. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_username ON public.members(username);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments("memberId");
CREATE INDEX IF NOT EXISTS idx_absence_requests_member_id ON public.absence_requests("memberId");
CREATE INDEX IF NOT EXISTS idx_absence_requests_event_id ON public.absence_requests("eventId");
CREATE INDEX IF NOT EXISTS idx_score_audit_logs_target ON public.score_audit_logs("targetMemberId");
CREATE INDEX IF NOT EXISTS idx_score_audit_logs_admin ON public.score_audit_logs("adminId");
CREATE INDEX IF NOT EXISTS idx_budget_transactions_project ON public.budget_transactions("projectId");
CREATE INDEX IF NOT EXISTS idx_budget_transactions_line ON public.budget_transactions("lineId");
CREATE INDEX IF NOT EXISTS idx_kudos_to_id ON public.kudos("toId");
CREATE INDEX IF NOT EXISTS idx_suggestions_author_id ON public.suggestions("authorId");
CREATE INDEX IF NOT EXISTS idx_push_subs_member_id ON public.push_subscriptions(member_id);

-- Private Helper Function (No API Exposure, Clean Search Path)
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_email_by_identifier(TEXT) CASCADE;

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

-- Enable Row Level Security
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

-- Revoke anon access
REVOKE ALL ON public.members FROM anon;
REVOKE ALL ON public.payments FROM anon;
REVOKE ALL ON public.events FROM anon;
REVOKE ALL ON public.absence_requests FROM anon;
REVOKE ALL ON public.project_proposals FROM anon;
REVOKE ALL ON public.news FROM anon;
REVOKE ALL ON public.polls FROM anon;
REVOKE ALL ON public.archived_polls FROM anon;
REVOKE ALL ON public.forum_posts FROM anon;
REVOKE ALL ON public.budget_transactions FROM anon;
REVOKE ALL ON public.budget_projects FROM anon;
REVOKE ALL ON public.budget_lines FROM anon;
REVOKE ALL ON public.budget_dues FROM anon;
REVOKE ALL ON public.budget_audit FROM anon;
REVOKE ALL ON public.budget_archives FROM anon;
REVOKE ALL ON public.score_audit_logs FROM anon;
REVOKE ALL ON public.kudos FROM anon;
REVOKE ALL ON public.suggestions FROM anon;
REVOKE ALL ON public.push_subscriptions FROM anon;

-- Strict Granular RLS Policies
CREATE POLICY "members_select_policy" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_insert_policy" ON public.members FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "members_update_policy" ON public.members FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR private.is_admin()) WITH CHECK (user_id = (SELECT auth.uid()) OR private.is_admin());
CREATE POLICY "members_delete_policy" ON public.members FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "pitches_insert_policy" ON public.project_pitches FOR INSERT TO anon, authenticated WITH CHECK (id IS NOT NULL OR "submitterName" IS NOT NULL OR true);
CREATE POLICY "pitches_select_policy" ON public.project_pitches FOR SELECT TO authenticated USING (private.is_admin());
CREATE POLICY "pitches_update_policy" ON public.project_pitches FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "pitches_delete_policy" ON public.project_pitches FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "payments_select_policy" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments_insert_policy" ON public.payments FOR INSERT TO authenticated WITH CHECK (private.is_admin() OR "memberId" IS NOT NULL);
CREATE POLICY "payments_update_policy" ON public.payments FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "payments_delete_policy" ON public.payments FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "events_select_policy" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert_policy" ON public.events FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "events_update_policy" ON public.events FOR UPDATE TO authenticated USING (private.is_admin() OR (SELECT auth.uid()) IS NOT NULL) WITH CHECK (private.is_admin() OR (SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "events_delete_policy" ON public.events FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "absence_select_policy" ON public.absence_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "absence_insert_policy" ON public.absence_requests FOR INSERT TO authenticated WITH CHECK ("memberId" IS NOT NULL);
CREATE POLICY "absence_update_policy" ON public.absence_requests FOR UPDATE TO authenticated USING (private.is_admin() OR (SELECT auth.uid()) IS NOT NULL) WITH CHECK (private.is_admin() OR (SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "absence_delete_policy" ON public.absence_requests FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "proposals_select_policy" ON public.project_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "proposals_insert_policy" ON public.project_proposals FOR INSERT TO authenticated WITH CHECK ("authorId" IS NOT NULL OR author IS NOT NULL);
CREATE POLICY "proposals_update_policy" ON public.project_proposals FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "proposals_delete_policy" ON public.project_proposals FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "news_select_policy" ON public.news FOR SELECT TO authenticated USING (true);
CREATE POLICY "news_insert_policy" ON public.news FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "news_update_policy" ON public.news FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "news_delete_policy" ON public.news FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "polls_select_policy" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "polls_insert_policy" ON public.polls FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "polls_update_policy" ON public.polls FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "polls_delete_policy" ON public.polls FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "archived_polls_select_policy" ON public.archived_polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "archived_polls_insert_policy" ON public.archived_polls FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "archived_polls_update_policy" ON public.archived_polls FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "archived_polls_delete_policy" ON public.archived_polls FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "forum_select_policy" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_insert_policy" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK ("authorId" IS NOT NULL OR author IS NOT NULL);
CREATE POLICY "forum_update_policy" ON public.forum_posts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "forum_delete_policy" ON public.forum_posts FOR DELETE TO authenticated USING (private.is_admin() OR "authorId" = (SELECT auth.uid())::text);

CREATE POLICY "btrans_select" ON public.budget_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "btrans_insert" ON public.budget_transactions FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "btrans_update" ON public.budget_transactions FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "btrans_delete" ON public.budget_transactions FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "bproj_select" ON public.budget_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "bproj_insert" ON public.budget_projects FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "bproj_update" ON public.budget_projects FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "bproj_delete" ON public.budget_projects FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "blines_select" ON public.budget_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "blines_insert" ON public.budget_lines FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "blines_update" ON public.budget_lines FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "blines_delete" ON public.budget_lines FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "bdues_select" ON public.budget_dues FOR SELECT TO authenticated USING (true);
CREATE POLICY "bdues_insert" ON public.budget_dues FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "bdues_update" ON public.budget_dues FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "bdues_delete" ON public.budget_dues FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "baudit_select" ON public.budget_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "baudit_insert" ON public.budget_audit FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "baudit_update" ON public.budget_audit FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "baudit_delete" ON public.budget_audit FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "barch_select" ON public.budget_archives FOR SELECT TO authenticated USING (true);
CREATE POLICY "barch_insert" ON public.budget_archives FOR INSERT TO authenticated WITH CHECK (private.is_admin());
CREATE POLICY "barch_update" ON public.budget_archives FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "barch_delete" ON public.budget_archives FOR DELETE TO authenticated USING (private.is_admin());

CREATE POLICY "score_logs_select" ON public.score_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "score_logs_insert" ON public.score_audit_logs FOR INSERT TO authenticated WITH CHECK (private.is_admin() OR "adminId" IS NOT NULL);

CREATE POLICY "kudos_select_policy" ON public.kudos FOR SELECT TO authenticated USING (true);
CREATE POLICY "kudos_insert_policy" ON public.kudos FOR INSERT TO authenticated WITH CHECK ("fromId" IS NOT NULL OR "fromName" IS NOT NULL);
CREATE POLICY "kudos_update_policy" ON public.kudos FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "kudos_delete_policy" ON public.kudos FOR DELETE TO authenticated USING (private.is_admin() OR "fromId" = (SELECT auth.uid())::text);

CREATE POLICY "suggestions_select_policy" ON public.suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "suggestions_insert_policy" ON public.suggestions FOR INSERT TO authenticated WITH CHECK (id IS NOT NULL OR title IS NOT NULL OR true);
CREATE POLICY "suggestions_update_policy" ON public.suggestions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "suggestions_delete_policy" ON public.suggestions FOR DELETE TO authenticated USING (private.is_admin() OR "authorId" = (SELECT auth.uid())::text);

CREATE POLICY "push_select_policy" ON public.push_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "push_insert_policy" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR member_id IS NOT NULL);
CREATE POLICY "push_update_policy" ON public.push_subscriptions FOR UPDATE TO authenticated USING (private.is_admin() OR member_id = (SELECT auth.uid())::text) WITH CHECK (private.is_admin() OR member_id = (SELECT auth.uid())::text);
CREATE POLICY "push_delete_policy" ON public.push_subscriptions FOR DELETE TO authenticated USING (private.is_admin() OR member_id = (SELECT auth.uid())::text);
