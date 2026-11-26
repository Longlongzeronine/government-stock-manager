-- ============================================================================
-- Supabase Schema Fix: Make hosted Supabase match the local PostgreSQL schema
-- and the application code expectations.
--
-- Run this in: Supabase Dashboard -> SQL Editor
-- Or via: node scripts/apply-hosted-sql.mjs scripts/fix-supabase-schema.sql
--   (requires SUPABASE_DB_URL in .env)
--
-- All statements are idempotent (safe to re-run).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ris_forms: add columns the app code queries but Supabase is missing
--    (verification_token, verification_code, document_version, etc.)
-- ----------------------------------------------------------------------------
ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS approved_date DATE DEFAULT NULL;

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT NULL;

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS verification_token TEXT DEFAULT NULL;

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS verification_code TEXT DEFAULT NULL;

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS document_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS verification_published_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE public.ris_forms
  ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT NULL;

-- Recreate check constraint for status if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ris_forms'::regclass
      AND conname = 'ris_forms_status_check'
  ) THEN
    ALTER TABLE public.ris_forms
      ADD CONSTRAINT ris_forms_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'draft', 'issued', 'cancelled'));
  END IF;
END $$;

-- Unique indexes for verification columns
CREATE UNIQUE INDEX IF NOT EXISTS ris_forms_verification_token_key
  ON public.ris_forms (verification_token) WHERE verification_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ris_forms_verification_code_key
  ON public.ris_forms (verification_code) WHERE verification_code IS NOT NULL;

-- Index for RIS list queries (created_by, created_at)
CREATE INDEX IF NOT EXISTS idx_ris_forms_created_by_created_at
  ON public.ris_forms (created_by, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. ris_items: add unit_cost column (added in migration 20261123003000 but
--    never applied to the hosted project)
-- ----------------------------------------------------------------------------
ALTER TABLE public.ris_items
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ris_items_ris_id
  ON public.ris_items (ris_id);

-- ----------------------------------------------------------------------------
-- 3. Ensure splc_entries table exists (SPLC ledger, used by semi-expendable
--    workflow rules and item delete protection)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.splc_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id),
  reference_no TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  particulars TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.splc_entries ENABLE ROW LEVEL SECURITY;

DO scripts\fix-supabase-schema.sql
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'splc_entries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.splc_entries', policy_record.policyname);
  END LOOP;
END scripts\fix-supabase-schema.sql;

CREATE POLICY splc_read_authenticated ON public.splc_entries
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 4. Ensure ris_public_verifications table exists (public RIS verification)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ris_public_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_token TEXT NOT NULL UNIQUE,
  verification_code TEXT NOT NULL UNIQUE,
  ris_no TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'issued', 'received', 'cancelled', 'superseded')),
  office TEXT,
  purpose TEXT,
  approved_by TEXT,
  issued_by TEXT,
  approved_date DATE,
  issued_date DATE,
  item_count INTEGER NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_version INTEGER NOT NULL DEFAULT 1,
  published_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ris_public_verifications ENABLE ROW LEVEL SECURITY;

DO scripts\fix-supabase-schema.sql
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ris_public_verifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ris_public_verifications', policy_record.policyname);
  END LOOP;
END scripts\fix-supabase-schema.sql;

CREATE POLICY ris_verification_publish_authenticated ON public.ris_public_verifications
  FOR INSERT TO authenticated WITH CHECK (published_by = auth.uid());

CREATE POLICY ris_verification_update_authenticated ON public.ris_public_verifications
  FOR UPDATE TO authenticated USING (published_by = auth.uid())
  WITH CHECK (published_by = auth.uid());

REVOKE ALL ON TABLE public.ris_public_verifications FROM anon;
REVOKE ALL ON FUNCTION public.verify_ris(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_ris(TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Ensure form_number_counters table exists (sequential form numbering)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_number_counters (
  form_prefix TEXT NOT NULL,
  series_year INTEGER NOT NULL,
  last_number BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (form_prefix, series_year)
);

ALTER TABLE public.form_number_counters ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6. Notify PostgREST to reload schema so new columns are immediately visible
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- End of fix
-- ============================================================================
