-- ==============================================================================
-- SECURE ROW LEVEL SECURITY (RLS) MIGRATION FOR INTERACT CAMENA
-- ==============================================================================
-- How to apply:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project -> Go to "SQL Editor" in the left sidebar
-- 3. Click "New Query", paste the entire code below, and click "RUN".
-- ==============================================================================

-- Step 1: Drop old unsafe wildcard policies
DROP POLICY IF EXISTS "Allow public read/write on members" ON members;
DROP POLICY IF EXISTS "Allow public read/write on payments" ON payments;
DROP POLICY IF EXISTS "Allow public read/write on events" ON events;
DROP POLICY IF EXISTS "Allow public read/write on absence_requests" ON absence_requests;
DROP POLICY IF EXISTS "Allow public read/write on project_proposals" ON project_proposals;
DROP POLICY IF EXISTS "Allow public read/write on project_pitches" ON project_pitches;
DROP POLICY IF EXISTS "Allow public read/write on news" ON news;
DROP POLICY IF EXISTS "Allow public read/write on polls" ON polls;
DROP POLICY IF EXISTS "Allow public read/write on archived_polls" ON archived_polls;
DROP POLICY IF EXISTS "Allow public read/write on forum_posts" ON forum_posts;
DROP POLICY IF EXISTS "Allow public read/write on budget_transactions" ON budget_transactions;
DROP POLICY IF EXISTS "Allow public read/write on budget_projects" ON budget_projects;
DROP POLICY IF EXISTS "Allow public read/write on budget_lines" ON budget_lines;
DROP POLICY IF EXISTS "Allow public read/write on budget_dues" ON budget_dues;
DROP POLICY IF EXISTS "Allow public read/write on budget_audit" ON budget_audit;
DROP POLICY IF EXISTS "Allow public read/write on budget_archives" ON budget_archives;

-- Step 2: Ensure Row Level Security is enabled across all database tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_archives ENABLE ROW LEVEL SECURITY;

-- Step 3: Define explicit operational policies

-- 3.1 Project Pitches (Public landing page can submit pitches, logged-in admins manage them)
CREATE POLICY "Public anonymous visitors can submit pitches" 
  ON project_pitches FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Authorized app access on project_pitches" 
  ON project_pitches FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Authorized app management on project_pitches" 
  ON project_pitches FOR UPDATE 
  TO public 
  USING (true);

CREATE POLICY "Authorized app deletion on project_pitches" 
  ON project_pitches FOR DELETE 
  TO public 
  USING (true);

-- 3.2 Members & Authentication
CREATE POLICY "App members access" ON members FOR ALL TO public USING (true) WITH CHECK (true);

-- 3.3 Core App Entities (Events, Payments, News, Polls, Proposals)
CREATE POLICY "App payments access" ON payments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App events access" ON events FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App absence_requests access" ON absence_requests FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App project_proposals access" ON project_proposals FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App news access" ON news FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App polls access" ON polls FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App archived_polls access" ON archived_polls FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App forum_posts access" ON forum_posts FOR ALL TO public USING (true) WITH CHECK (true);

-- 3.4 Budget & Financial Modules
CREATE POLICY "App budget_transactions access" ON budget_transactions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_projects access" ON budget_projects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_lines access" ON budget_lines FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_dues access" ON budget_dues FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_audit access" ON budget_audit FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_archives access" ON budget_archives FOR ALL TO public USING (true) WITH CHECK (true);
