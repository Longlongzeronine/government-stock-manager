-- Inventory columns the app writes locally but that were never added to the
-- hosted project. Without them the local -> Supabase sync skips these values.
--
-- Apply with:  supabase db push        (linked project)
--          or paste this file into the Supabase SQL editor.
-- Every statement is idempotent, so it is safe to re-run.

-- Monthly consumption quantities + manual sort order (APP-CSE per-month columns).
alter table public.items
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
  add column if not exists sort_order integer;

create index if not exists idx_items_sort_order on public.items (sort_order);

alter table public.categories
  add column if not exists sort_order integer;

-- Also added by 20260727000000_forms_flow_improvements.sql; repeated here so a
-- project that skipped that migration still ends up with the column.
alter table public.iar_items
  add column if not exists amount numeric(14,2) not null default 0;

update public.iar_items
set amount = quantity * unit_cost
where amount = 0 and unit_cost <> 0;
