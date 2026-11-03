ALTER TABLE public.ris_items
  ADD COLUMN IF NOT EXISTS iar_item_id uuid REFERENCES public.iar_items(id);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_line_id uuid;
