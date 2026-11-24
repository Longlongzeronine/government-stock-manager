ALTER TABLE public.ris_items
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0;

UPDATE public.ris_items ri
SET unit_cost = ii.unit_cost
FROM public.transactions t
JOIN public.iar_items ii ON ii.id = t.source_line_id
WHERE ri.transaction_id = t.id
  AND ri.unit_cost = 0
  AND ii.unit_cost > 0;
