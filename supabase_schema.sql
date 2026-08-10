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

CREATE POLICY "Allow public read/write on members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on absence_requests" ON absence_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on project_proposals" ON project_proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on project_pitches" ON project_pitches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on news" ON news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on polls" ON polls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on archived_polls" ON archived_polls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on forum_posts" ON forum_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on budget_transactions" ON budget_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on budget_projects" ON budget_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on budget_lines" ON budget_lines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on budget_dues" ON budget_dues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on budget_audit" ON budget_audit FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on budget_archives" ON budget_archives FOR ALL USING (true) WITH CHECK (true);
