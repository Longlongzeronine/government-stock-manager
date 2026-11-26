-- ============================================================================
-- Fix: Insert missing form keys into Supabase forms table
--
-- The Users form access matrix renders from FORM_DEFINITIONS (frontend) but
-- saves permissions to role_form_permissions which has a foreign key on
-- form_key referencing public.forms(form_key). If a form_key is missing from
-- the forms table, upserting permissions fails with:
--
--   insert or update on table "role_form_permissions" violates foreign key
--   constraint "role_form_permissions_form_key_fkey"
--
-- Run this in: Supabase Dashboard -> SQL Editor
-- All statements are idempotent (safe to re-run).
-- ============================================================================

INSERT INTO public.forms (form_key, section, label, sort_order) VALUES
  -- Supplies & Materials
  ('supplies_stock_card', 'Supplies', 'Stock Card', 12)
ON CONFLICT (form_key) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- Semi-Expendable Property
INSERT INTO public.forms (form_key, section, label, sort_order) VALUES
  ('semi_spc', 'Semi-Expendable Property', 'SPC', 54),
  ('semi_ics', 'Semi-Expendable Property', 'ICS', 58),
  ('semi_itr', 'Semi-Expendable Property', 'ITR', 60),
  ('semi_regspi', 'Semi-Expendable Property', 'RegSPI', 82),
  ('semi_iirup', 'Semi-Expendable Property', 'IIRUP', 84),
  ('semi_rlsddp', 'Semi-Expendable Property', 'RLSDDP', 86),
  ('semi_rrpe', 'Semi-Expendable Property', 'RRPE', 88),
  ('semi_rpcsp', 'Semi-Expendable Property', 'RPCSP', 90)
ON CONFLICT (form_key) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- Property, Plant & Equipment
INSERT INTO public.forms (form_key, section, label, sort_order) VALUES
  ('ppe_pc', 'PPE', 'PC', 104),
  ('ppe_par', 'PPE', 'PAR', 108),
  ('ppe_ptr', 'PPE', 'PTR', 110),
  ('ppe_rpcppe', 'PPE', 'RPCPPE', 112),
  ('ppe_iirup', 'PPE', 'IIRUP', 114),
  ('ppe_rlsddp', 'PPE', 'RLSDDP', 116),
  ('ppe_rrpe', 'PPE', 'RRPE', 118)
ON CONFLICT (form_key) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- End of fix
-- ============================================================================
