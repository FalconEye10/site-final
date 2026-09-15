-- ==============================================================================
-- SUPABASE STORAGE SECURITY POLICIES (v10.1.0 - Fully Self-Contained)
-- Interact Camena Web Platform
-- ==============================================================================
-- Fixed for Supabase SQL Editor:
-- 1. Removed `ALTER TABLE storage.objects` (prevents 'must be owner of table objects' error)
-- 2. Added self-contained `private.is_admin()` function so it runs standalone
-- 3. Uses standard `(id, name, public)` columns for storage.buckets compatibility
-- 4. Enforces strict folder-level isolation: files must live in `{auth.uid()}/*`
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENSURE PRIVATE SCHEMA & ADMIN HELPER EXIST
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = (SELECT auth.uid())
      AND LOWER(COALESCE(role, '')) = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. CREATE / CONFIGURE STORAGE BUCKETS
-- ------------------------------------------------------------------------------
-- Insert basic bucket configs (safe on all Supabase storage versions)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('receipts', 'receipts', false),
  ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;

-- Optional: Set file size and mime types safely if columns exist
DO $$
BEGIN
  BEGIN
    UPDATE storage.buckets SET 
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
    WHERE id = 'avatars';

    UPDATE storage.buckets SET 
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']
    WHERE id = 'receipts';

    UPDATE storage.buckets SET 
      file_size_limit = 15728640,
      allowed_mime_types = ARRAY['application/pdf']
    WHERE id = 'documents';
  EXCEPTION WHEN others THEN
    -- If columns do not exist in this storage version, ignore safely
    NULL;
  END;
END $$;

-- ------------------------------------------------------------------------------
-- 3. CLEAN UP ANY PREVIOUS POLICIES ON storage.objects
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Avatars Viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Upload Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Update Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Delete Own Avatar" ON storage.objects;

DROP POLICY IF EXISTS "Admins Or Owners View Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users Upload Own Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins Or Owners Delete Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins Or Owners Modify Receipts" ON storage.objects;

DROP POLICY IF EXISTS "Admins Or Owners View Documents" ON storage.objects;
DROP POLICY IF EXISTS "Users Upload Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins Or Owners Delete Documents" ON storage.objects;

-- ------------------------------------------------------------------------------
-- 4. AVATARS BUCKET POLICIES
-- Public Read | Upload, Update, Delete restricted to: avatars/{auth.uid()}/*
-- ------------------------------------------------------------------------------

-- Public read access for avatar images
CREATE POLICY "Public Avatars Viewable" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Users can only upload their own avatar into folder matching their auth.uid()
CREATE POLICY "Users Can Upload Own Avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Users can only update their own avatar
CREATE POLICY "Users Can Update Own Avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Users can delete their own avatar, admins can delete any avatar
CREATE POLICY "Users Can Delete Own Avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

-- ------------------------------------------------------------------------------
-- 5. RECEIPTS BUCKET POLICIES (Private Financial Vouchers)
-- Owner or Admin Only: receipts/{auth.uid()}/*
-- ------------------------------------------------------------------------------

CREATE POLICY "Admins Or Owners View Receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

CREATE POLICY "Users Upload Own Receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

CREATE POLICY "Users Update Own Receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  )
  WITH CHECK (
    bucket_id = 'receipts' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

CREATE POLICY "Admins Or Owners Delete Receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

-- ------------------------------------------------------------------------------
-- 6. DOCUMENTS BUCKET POLICIES (Private Pitch / Proposal PDFs)
-- Owner or Admin Only: documents/{auth.uid()}/*
-- ------------------------------------------------------------------------------

CREATE POLICY "Admins Or Owners View Documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

CREATE POLICY "Users Upload Own Documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

CREATE POLICY "Users Update Own Documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  )
  WITH CHECK (
    bucket_id = 'documents' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );

CREATE POLICY "Admins Or Owners Delete Documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
      (SELECT private.is_admin())
    )
  );
