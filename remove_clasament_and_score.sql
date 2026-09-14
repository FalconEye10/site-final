-- ==============================================================================
-- Migrare Supabase: Eliminare modul Clasament, Punctaje & Audit Scor (v9.0.0)
-- ==============================================================================

-- 1. Ștergere tabelă de audit punctaje și toate dependințele (indecși, politici RLS)
-- Notă: PostgreSQL elimină automat tabela și din publicația 'supabase_realtime' la DROP TABLE.
DROP TABLE IF EXISTS public.score_audit_logs CASCADE;

-- 2. Ștergere coloane de scor și istoricul ajustărilor din tabela 'members'
ALTER TABLE public.members DROP COLUMN IF EXISTS score CASCADE;
ALTER TABLE public.members DROP COLUMN IF EXISTS "scoreAdjustments" CASCADE;

-- 3. Reîmprospătare cache schemă PostgREST
NOTIFY pgrst, 'reload schema';
