-- Supabase SQL Schema for interact-camena-site

-- 1. Members
CREATE TABLE IF NOT EXISTS members (
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
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Payments (subcollection payments in Firestore)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES members(id) ON DELETE CASCADE,
  "memberName" TEXT,
  amount NUMERIC DEFAULT 0,
  month TEXT,
  date TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "memberSignature" TEXT,
  "treasurerSignature" TEXT
);

-- 3. Events
CREATE TABLE IF NOT EXISTS events (
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
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Absence Requests
CREATE TABLE IF NOT EXISTS absence_requests (
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
CREATE TABLE IF NOT EXISTS project_proposals (
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
CREATE TABLE IF NOT EXISTS project_pitches (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  "submitterName" TEXT,
  "submitterEmail" TEXT,
  "submitterPhone" TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. News
CREATE TABLE IF NOT EXISTS news (
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
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  title TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  votes JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archived_polls (
  id TEXT PRIMARY KEY,
  title TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  votes JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Forum Posts
CREATE TABLE IF NOT EXISTS forum_posts (
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
CREATE TABLE IF NOT EXISTS budget_transactions (
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

CREATE TABLE IF NOT EXISTS budget_projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  allocated NUMERIC,
  spent NUMERIC,
  mandate TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY,
  category TEXT,
  allocated NUMERIC,
  spent NUMERIC,
  type TEXT,
  mandate TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_dues (
  id TEXT PRIMARY KEY,
  month TEXT,
  year TEXT,
  amount NUMERIC,
  mandate TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_audit (
  id TEXT PRIMARY KEY,
  action TEXT,
  details TEXT,
  timestamp TEXT,
  actor TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_archives (
  id TEXT PRIMARY KEY,
  mandate TEXT,
  data JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Score Audit Logs (Strict Admin Audit Log - Non-deletable)
CREATE TABLE IF NOT EXISTS score_audit_logs (
  id TEXT PRIMARY KEY,
  "adminId" TEXT,
  "adminName" TEXT,
  "adminUsername" TEXT,
  "targetMemberId" TEXT,
  "targetMemberName" TEXT,
  action TEXT, -- 'ADDED', 'SUBTRACTED', 'REVERTED'
  points NUMERIC,
  reason TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public access policies
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
ALTER TABLE score_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public anonymous visitors can submit pitches" ON project_pitches FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authorized app access on project_pitches" ON project_pitches FOR SELECT TO public USING (true);
CREATE POLICY "Authorized app management on project_pitches" ON project_pitches FOR UPDATE TO public USING (true);
CREATE POLICY "Authorized app deletion on project_pitches" ON project_pitches FOR DELETE TO public USING (true);

CREATE POLICY "App members access" ON members FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App payments access" ON payments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App events access" ON events FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App absence_requests access" ON absence_requests FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App project_proposals access" ON project_proposals FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App news access" ON news FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App polls access" ON polls FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App archived_polls access" ON archived_polls FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App forum_posts access" ON forum_posts FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "App budget_transactions access" ON budget_transactions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_projects access" ON budget_projects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_lines access" ON budget_lines FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_dues access" ON budget_dues FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_audit access" ON budget_audit FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "App budget_archives access" ON budget_archives FOR ALL TO public USING (true) WITH CHECK (true);

-- Score Audit Logs Access (Read & Insert only, NO DELETE policy exists)
CREATE POLICY "App score_audit_logs select" ON score_audit_logs FOR SELECT TO public USING (true);
CREATE POLICY "App score_audit_logs insert" ON score_audit_logs FOR INSERT TO public WITH CHECK (true);

