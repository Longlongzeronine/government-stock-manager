CREATE INDEX IF NOT EXISTS idx_ris_forms_created_by_created_at
  ON public.ris_forms(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ris_items_ris_id
  ON public.ris_items(ris_id);
