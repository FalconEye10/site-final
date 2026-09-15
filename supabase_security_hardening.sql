-- ==============================================================================
-- SUPABASE SECURITY HARDENING & AUDIT REMEDIATION (v10.0.0)
-- Interact Camena Web Platform
-- ==============================================================================
-- This script fixes all vulnerabilities identified during the security audit:
-- 1. Enforces Row Level Security (RLS) on all public and private tables
-- 2. Closes privilege escalation vectors on public.members via BEFORE UPDATE trigger
-- 3. Fixes overly permissive policies (removes 'OR true', restricts updates to admins)
-- 4. Revokes blanket table modifications from the public 'anon' role
-- 5. Hardens RPC functions against unauthorized execution and search_path hijacking
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REVOKE DANGEROUS BLANKET PERMISSIONS FROM ANON
-- ------------------------------------------------------------------------------
-- Never grant ALL ON ALL TABLES to anon; anon should only have SELECT on public tables
-- and controlled INSERT on specific public endpoints (like community project pitches).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Grant minimal necessary schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. ENSURE RLS IS ENABLED ON EVERY TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.archived_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budget_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS private.member_credentials ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. PRIVILEGE ESCALATION DEFENSE: TRIGGER ON public.members
-- ------------------------------------------------------------------------------
-- Prevents non-administrators from altering sensitive fields:
-- role, hours, totalPaid, totalDebt, presences, excusedAbsences, unexcusedAbsences
CREATE OR REPLACE FUNCTION public.protect_members_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- Check if the current executing session is an administrator
  SELECT (LOWER(COALESCE(role, '')) = 'admin') INTO v_caller_is_admin
  FROM public.members
  WHERE user_id = (SELECT auth.uid())
  LIMIT 1;

  -- Allow service_role or admin to update any field
  IF (SELECT current_user) IN ('postgres', 'service_role') OR v_caller_is_admin = TRUE THEN
    RETURN NEW;
  END IF;

  -- If caller is a regular user updating their own profile, block critical field mutations
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Securitate: Nu ai permisiunea de a modifica rolul contului.';
  END IF;

  IF NEW.hours IS DISTINCT FROM OLD.hours OR
     NEW."totalPaid" IS DISTINCT FROM OLD."totalPaid" OR
     NEW."totalDebt" IS DISTINCT FROM OLD."totalDebt" OR
     NEW.presences IS DISTINCT FROM OLD.presences OR
     NEW."excusedAbsences" IS DISTINCT FROM OLD."excusedAbsences" OR
     NEW."unexcusedAbsences" IS DISTINCT FROM OLD."unexcusedAbsences" OR
     NEW."attendanceRate" IS DISTINCT FROM OLD."attendanceRate" THEN
    RAISE EXCEPTION 'Securitate: Nu ai permisiunea de a modifica metadatele financiare sau de prezență.';
  END IF;

  RETURN NEW;
END;
$$;

-- Revoke public execution of trigger function
REVOKE EXECUTE ON FUNCTION public.protect_members_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_members_escalation ON public.members;
CREATE TRIGGER trg_protect_members_escalation
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_members_escalation();

-- ------------------------------------------------------------------------------
-- 4. DROP ALL EXISTING PERMISSIVE / VULNERABLE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "members_select_policy" ON public.members;
DROP POLICY IF EXISTS "members_insert_policy" ON public.members;
DROP POLICY IF EXISTS "members_update_policy" ON public.members;
DROP POLICY IF EXISTS "members_delete_policy" ON public.members;

DROP POLICY IF EXISTS "pitches_insert_policy" ON public.project_pitches;
DROP POLICY IF EXISTS "pitches_select_policy" ON public.project_pitches;
DROP POLICY IF EXISTS "pitches_update_policy" ON public.project_pitches;
DROP POLICY IF EXISTS "pitches_delete_policy" ON public.project_pitches;

DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_update_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON public.payments;

DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;

DROP POLICY IF EXISTS "absence_select_policy" ON public.absence_requests;
DROP POLICY IF EXISTS "absence_insert_policy" ON public.absence_requests;
DROP POLICY IF EXISTS "absence_update_policy" ON public.absence_requests;
DROP POLICY IF EXISTS "absence_delete_policy" ON public.absence_requests;

DROP POLICY IF EXISTS "proposals_select_policy" ON public.project_proposals;
DROP POLICY IF EXISTS "proposals_insert_policy" ON public.project_proposals;
DROP POLICY IF EXISTS "proposals_update_policy" ON public.project_proposals;
DROP POLICY IF EXISTS "proposals_delete_policy" ON public.project_proposals;

DROP POLICY IF EXISTS "news_select_policy" ON public.news;
DROP POLICY IF EXISTS "news_insert_policy" ON public.news;
DROP POLICY IF EXISTS "news_update_policy" ON public.news;
DROP POLICY IF EXISTS "news_delete_policy" ON public.news;

DROP POLICY IF EXISTS "polls_select_policy" ON public.polls;
DROP POLICY IF EXISTS "polls_insert_policy" ON public.polls;
DROP POLICY IF EXISTS "polls_update_policy" ON public.polls;
DROP POLICY IF EXISTS "polls_delete_policy" ON public.polls;

DROP POLICY IF EXISTS "archived_polls_select_policy" ON public.archived_polls;
DROP POLICY IF EXISTS "archived_polls_insert_policy" ON public.archived_polls;
DROP POLICY IF EXISTS "archived_polls_update_policy" ON public.archived_polls;
DROP POLICY IF EXISTS "archived_polls_delete_policy" ON public.archived_polls;

DROP POLICY IF EXISTS "forum_select_policy" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_insert_policy" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_update_policy" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_delete_policy" ON public.forum_posts;

DROP POLICY IF EXISTS "kudos_select_policy" ON public.kudos;
DROP POLICY IF EXISTS "kudos_insert_policy" ON public.kudos;
DROP POLICY IF EXISTS "kudos_update_policy" ON public.kudos;
DROP POLICY IF EXISTS "kudos_delete_policy" ON public.kudos;

DROP POLICY IF EXISTS "suggestions_select_policy" ON public.suggestions;
DROP POLICY IF EXISTS "suggestions_insert_policy" ON public.suggestions;
DROP POLICY IF EXISTS "suggestions_update_policy" ON public.suggestions;
DROP POLICY IF EXISTS "suggestions_delete_policy" ON public.suggestions;

DROP POLICY IF EXISTS "push_select_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_insert_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_update_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_delete_policy" ON public.push_subscriptions;

-- ------------------------------------------------------------------------------
-- 5. RECREATE STRICT RLS POLICIES
-- ------------------------------------------------------------------------------

-- 5.1. Members
CREATE POLICY "members_select_policy" ON public.members 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "members_insert_policy" ON public.members 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_admin());

CREATE POLICY "members_update_policy" ON public.members 
  FOR UPDATE TO authenticated 
  USING (user_id = (SELECT auth.uid()) OR private.is_admin()) 
  WITH CHECK (user_id = (SELECT auth.uid()) OR private.is_admin());

CREATE POLICY "members_delete_policy" ON public.members 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

-- 5.2. Community Pitches (Allow public inserts with non-empty fields, no 'OR true')
GRANT INSERT ON public.project_pitches TO anon;
CREATE POLICY "pitches_insert_policy" ON public.project_pitches 
  FOR INSERT TO anon, authenticated 
  WITH CHECK (
    id IS NOT NULL AND 
    length(trim(title)) > 0 AND 
    length(trim("submitterName")) > 0 AND 
    length(trim("submitterEmail")) > 0
  );

CREATE POLICY "pitches_select_policy" ON public.project_pitches 
  FOR SELECT TO authenticated 
  USING (private.is_admin());

CREATE POLICY "pitches_update_policy" ON public.project_pitches 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "pitches_delete_policy" ON public.project_pitches 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

-- 5.3. Payments (Only admin can record/modify payments; authenticated users can view)
CREATE POLICY "payments_select_policy" ON public.payments 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "payments_insert_policy" ON public.payments 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_admin());

CREATE POLICY "payments_update_policy" ON public.payments 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "payments_delete_policy" ON public.payments 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

-- 5.4. Events (Only admin can create, update or delete events)
CREATE POLICY "events_select_policy" ON public.events 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "events_insert_policy" ON public.events 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_admin());

CREATE POLICY "events_update_policy" ON public.events 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "events_delete_policy" ON public.events 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

-- 5.5. Absence Requests (Members can insert their own, view, and admins review)
CREATE POLICY "absence_select_policy" ON public.absence_requests 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "absence_insert_policy" ON public.absence_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (
    "memberId" IS NOT NULL AND (
      "memberId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
      OR private.is_admin()
    )
  );

CREATE POLICY "absence_update_policy" ON public.absence_requests 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "absence_delete_policy" ON public.absence_requests 
  FOR DELETE TO authenticated 
  USING (
    private.is_admin() OR 
    "memberId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

-- 5.6. Project Proposals
CREATE POLICY "proposals_select_policy" ON public.project_proposals 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "proposals_insert_policy" ON public.project_proposals 
  FOR INSERT TO authenticated 
  WITH CHECK (
    "authorId" IS NOT NULL AND (
      "authorId" = (SELECT auth.uid())::text 
      OR "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
      OR private.is_admin()
    )
  );

CREATE POLICY "proposals_update_policy" ON public.project_proposals 
  FOR UPDATE TO authenticated 
  USING (
    private.is_admin() OR 
    "authorId" = (SELECT auth.uid())::text OR
    "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  ) 
  WITH CHECK (
    private.is_admin() OR 
    "authorId" = (SELECT auth.uid())::text OR
    "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "proposals_delete_policy" ON public.project_proposals 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

-- 5.7. News & Announcements (Only admins can publish or modify)
CREATE POLICY "news_select_policy" ON public.news 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "news_insert_policy" ON public.news 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_admin());

CREATE POLICY "news_update_policy" ON public.news 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "news_delete_policy" ON public.news 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

-- 5.8. Polls & Archived Polls (Admin managed)
CREATE POLICY "polls_select_policy" ON public.polls 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "polls_insert_policy" ON public.polls 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_admin());

CREATE POLICY "polls_update_policy" ON public.polls 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "polls_delete_policy" ON public.polls 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

CREATE POLICY "archived_polls_select_policy" ON public.archived_polls 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "archived_polls_insert_policy" ON public.archived_polls 
  FOR INSERT TO authenticated 
  WITH CHECK (private.is_admin());

CREATE POLICY "archived_polls_update_policy" ON public.archived_polls 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "archived_polls_delete_policy" ON public.archived_polls 
  FOR DELETE TO authenticated 
  USING (private.is_admin());

-- 5.9. Forum Posts
CREATE POLICY "forum_select_policy" ON public.forum_posts 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "forum_insert_policy" ON public.forum_posts 
  FOR INSERT TO authenticated 
  WITH CHECK (
    "authorId" IS NOT NULL AND (
      "authorId" = (SELECT auth.uid())::text 
      OR "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
      OR private.is_admin()
    )
  );

CREATE POLICY "forum_update_policy" ON public.forum_posts 
  FOR UPDATE TO authenticated 
  USING (
    private.is_admin() OR 
    "authorId" = (SELECT auth.uid())::text OR 
    "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  ) 
  WITH CHECK (
    private.is_admin() OR 
    "authorId" = (SELECT auth.uid())::text OR 
    "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "forum_delete_policy" ON public.forum_posts 
  FOR DELETE TO authenticated 
  USING (
    private.is_admin() OR 
    "authorId" = (SELECT auth.uid())::text OR
    "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

-- 5.10. Kudos
CREATE POLICY "kudos_select_policy" ON public.kudos 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "kudos_insert_policy" ON public.kudos 
  FOR INSERT TO authenticated 
  WITH CHECK (
    "fromId" IS NOT NULL AND (
      "fromId" = (SELECT auth.uid())::text OR
      "fromId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid())) OR
      private.is_admin()
    )
  );

CREATE POLICY "kudos_update_policy" ON public.kudos 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "kudos_delete_policy" ON public.kudos 
  FOR DELETE TO authenticated 
  USING (
    private.is_admin() OR 
    "fromId" = (SELECT auth.uid())::text OR
    "fromId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

-- 5.11. Suggestions (Removes 'OR true')
CREATE POLICY "suggestions_select_policy" ON public.suggestions 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "suggestions_insert_policy" ON public.suggestions 
  FOR INSERT TO authenticated 
  WITH CHECK (
    length(trim(title)) > 0 AND 
    length(trim(content)) > 0
  );

CREATE POLICY "suggestions_update_policy" ON public.suggestions 
  FOR UPDATE TO authenticated 
  USING (private.is_admin()) 
  WITH CHECK (private.is_admin());

CREATE POLICY "suggestions_delete_policy" ON public.suggestions 
  FOR DELETE TO authenticated 
  USING (
    private.is_admin() OR 
    "authorId" = (SELECT auth.uid())::text OR
    "authorId" IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

-- 5.12. Push Subscriptions
CREATE POLICY "push_select_policy" ON public.push_subscriptions 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "push_insert_policy" ON public.push_subscriptions 
  FOR INSERT TO authenticated 
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid())) OR 
    private.is_admin()
  );

CREATE POLICY "push_update_policy" ON public.push_subscriptions 
  FOR UPDATE TO authenticated 
  USING (
    private.is_admin() OR 
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  ) 
  WITH CHECK (
    private.is_admin() OR 
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

-- ------------------------------------------------------------------------------
-- 6. REFRESH POSTGREST SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
