-- Reconcile hosted public.items with tesda 9-21-26-plain.sql and current app.
-- All statements preserve existing rows and are safe to run more than once.
alter table public.items
  add column if not exists description text,
  add column if not exists item_type text not null default 'supply',
  add column if not exists acquisition_cost numeric(14,2) not null default 0,
  add column if not exists inventory_classification text not null default 'expendable_supply',
  add column if not exists semi_expendable_tier text,
  add column if not exists accountability_status text not null default 'available',
  add column if not exists barcode_value text,
  add column if not exists qr_code_value text,
  add column if not exists jan_quantity numeric(12,2) not null default 0,
  add column if not exists feb_quantity numeric(12,2) not null default 0,
  add column if not exists mar_quantity numeric(12,2) not null default 0,
  add column if not exists apr_quantity numeric(12,2) not null default 0,
  add column if not exists may_quantity numeric(12,2) not null default 0,
  add column if not exists jun_quantity numeric(12,2) not null default 0,
  add column if not exists jul_quantity numeric(12,2) not null default 0,
  add column if not exists aug_quantity numeric(12,2) not null default 0,
  add column if not exists sep_quantity numeric(12,2) not null default 0,
  add column if not exists oct_quantity numeric(12,2) not null default 0,
  add column if not exists nov_quantity numeric(12,2) not null default 0,
  add column if not exists dec_quantity numeric(12,2) not null default 0,
  add column if not exists sort_order integer,
  -- Current app uses this nullable helper; backup did not yet include it.
  add column if not exists stock_number text;

notify pgrst, 'reload schema';
