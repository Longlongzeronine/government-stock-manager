alter table public.items
  add column if not exists unit_value numeric(14, 2) not null default 0,
  add column if not exists total_cost numeric(14, 2) generated always as (quantity * unit_value) stored,
  add column if not exists stock_number text,
  add column if not exists property_number text,
  add column if not exists fund_cluster text not null default '06',
  add column if not exists uacs_object_code text,
  add column if not exists estimated_useful_life text,
  add column if not exists accountable_officer text,
  add column if not exists office text;

create unique index if not exists items_stock_number_unique
  on public.items (lower(stock_number))
  where stock_number is not null and btrim(stock_number) <> '';

create unique index if not exists items_property_number_unique
  on public.items (lower(property_number))
  where property_number is not null and btrim(property_number) <> '';

create unique index if not exists items_name_unit_unique
  on public.items (lower(name), lower(unit));

alter table public.transactions
  add column if not exists unit_value numeric(14, 2),
  add column if not exists total_cost numeric(14, 2) generated always as (quantity * coalesce(unit_value, 0)) stored,
  add column if not exists reference_no text,
  add column if not exists responsibility_center_code text,
  add column if not exists office_officer text,
  add column if not exists transaction_date date not null default current_date;

alter table public.transactions
  drop constraint if exists transactions_type_check;

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('IN', 'OUT', 'RETURN', 'TRANSFER', 'DISPOSAL', 'ADJUSTMENT'));

create or replace function public.apply_stock_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unit_value is null then
    select unit_value into new.unit_value
    from public.items
    where id = new.item_id;
  end if;

  if new.type in ('IN', 'RETURN') then
    update public.items
    set quantity = quantity + new.quantity,
        updated_at = now()
    where id = new.item_id;
  elsif new.type in ('OUT', 'TRANSFER', 'DISPOSAL') then
    update public.items
    set quantity = greatest(quantity - new.quantity, 0),
        updated_at = now()
    where id = new.item_id;
  elsif new.type = 'ADJUSTMENT' then
    update public.items
    set quantity = greatest(new.quantity, 0),
        updated_at = now()
    where id = new.item_id;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_stock_transaction_after_insert on public.transactions;
drop trigger if exists apply_stock_transaction_before_insert on public.transactions;

create trigger apply_stock_transaction_before_insert
before insert on public.transactions
for each row execute function public.apply_stock_transaction();

-- COA-ready backend mockups. These enrich the existing seed records with the
-- fields used by the official inventory, supplies, and semi-expendable forms.
update public.items
set
  unit_value = v.unit_value,
  stock_number = v.stock_number,
  property_number = v.property_number,
  fund_cluster = v.fund_cluster,
  uacs_object_code = v.uacs_object_code,
  estimated_useful_life = v.estimated_useful_life,
  accountable_officer = v.accountable_officer,
  office = v.office
from (
  values
    ('e0000001-0000-0000-0000-000000000001'::uuid, 325.00::numeric, '001', null, '06-SSP', '50203010', null, 'ENGR. JENY E. BUSCANO', 'Admin Office'),
    ('e0000001-0000-0000-0000-000000000002'::uuid, 38.00::numeric, '022', null, '06-SSP', '50203010', null, 'ENGR. JENY E. BUSCANO', 'Admin Office'),
    ('e0000001-0000-0000-0000-000000000003'::uuid, 4800.00::numeric, 'FUR-001', null, '01-MOOE', '50203010', null, 'ENGR. JENY E. BUSCANO', 'Admin Office'),
    ('e0000001-0000-0000-0000-000000000004'::uuid, 7800.00::numeric, 'ICT-001', null, '01-MOOE', '50203010', null, 'ENGR. JENY E. BUSCANO', 'Admin Office'),
    ('e0000001-0000-0000-0000-000000000005'::uuid, 185.00::numeric, '037', null, '06-SSP', '50203010', null, 'ENGR. JENY E. BUSCANO', 'Maintenance'),
    ('e0000002-0000-0000-0000-000000000001'::uuid, 260.00::numeric, null, 'SP-MAT-2026-0001', '06-SSP', '10605030', '1 year', 'ENGR. JENY E. BUSCANO', 'Construction Workshop'),
    ('e0000002-0000-0000-0000-000000000002'::uuid, 185.00::numeric, null, 'SP-MAT-2026-0002', '06-SSP', '10605030', '1 year', 'ENGR. JENY E. BUSCANO', 'Construction Workshop'),
    ('e0000002-0000-0000-0000-000000000003'::uuid, 950.00::numeric, null, 'SP-MAT-2026-0003', '06-SSP', '10605030', '1 year', 'ENGR. JENY E. BUSCANO', 'Construction Workshop'),
    ('e0000002-0000-0000-0000-000000000004'::uuid, 220.00::numeric, null, 'SP-MAT-2026-0004', '06-SSP', '10605030', '1 year', 'ENGR. JENY E. BUSCANO', 'Construction Workshop'),
    ('e0000002-0000-0000-0000-000000000005'::uuid, 780.00::numeric, null, 'SP-MAT-2026-0005', '06-SSP', '10605030', '1 year', 'ENGR. JENY E. BUSCANO', 'Construction Workshop')
) as v(id, unit_value, stock_number, property_number, fund_cluster, uacs_object_code, estimated_useful_life, accountable_officer, office)
where public.items.id = v.id;

insert into public.transactions (
  item_id,
  type,
  quantity,
  unit_value,
  reference_no,
  responsibility_center_code,
  office_officer,
  transaction_date,
  staff_name,
  remarks
)
select *
from (
  values
    ('e0000001-0000-0000-0000-000000000001'::uuid, 'IN', 600, 325.00::numeric, 'IAR-2026-01-001', '16 009 0 300011 07', 'Supply Office', '2026-01-02'::date, 'Mock Supply Officer', 'Initial receipt'),
    ('e0000001-0000-0000-0000-000000000001'::uuid, 'OUT', 100, 325.00::numeric, 'RIS-2026-01-001', '16 009 0 300011 07', 'Admin Office', '2026-01-15'::date, 'Mock Supply Officer', 'Issued for office use'),
    ('e0000001-0000-0000-0000-000000000002'::uuid, 'IN', 300, 38.00::numeric, 'IAR-2026-01-002', '16 009 0 300011 07', 'Supply Office', '2026-01-04'::date, 'Mock Supply Officer', 'Initial receipt'),
    ('e0000001-0000-0000-0000-000000000002'::uuid, 'OUT', 60, 38.00::numeric, 'RIS-2026-02-002', '16 009 0 300011 07', 'Training Office', '2026-02-03'::date, 'Mock Supply Officer', 'Issued'),
    ('e0000001-0000-0000-0000-000000000005'::uuid, 'IN', 50, 185.00::numeric, 'IAR-2026-01-003', '16 009 0 300011 07', 'Supply Office', '2026-01-10'::date, 'Mock Supply Officer', 'Initial receipt'),
    ('e0000001-0000-0000-0000-000000000005'::uuid, 'OUT', 10, 185.00::numeric, 'RIS-2026-02-003', '16 009 0 300011 07', 'Maintenance', '2026-02-05'::date, 'Mock Supply Officer', 'Issued'),
    ('e0000002-0000-0000-0000-000000000001'::uuid, 'IN', 220, 260.00::numeric, 'IAR-2026-03-001', '16 009 0 300011 07', 'Supply Office', '2026-03-01'::date, 'Mock Supply Officer', 'Semi-expendable receipt'),
    ('e0000002-0000-0000-0000-000000000001'::uuid, 'OUT', 20, 260.00::numeric, 'ICS-2026-03-001', '16 009 0 300011 07', 'Construction Workshop', '2026-03-12'::date, 'Mock Supply Officer', 'Issued to end-user'),
    ('e0000002-0000-0000-0000-000000000002'::uuid, 'IN', 520, 185.00::numeric, 'IAR-2026-03-002', '16 009 0 300011 07', 'Supply Office', '2026-03-02'::date, 'Mock Supply Officer', 'Semi-expendable receipt'),
    ('e0000002-0000-0000-0000-000000000002'::uuid, 'OUT', 20, 185.00::numeric, 'ICS-2026-03-002', '16 009 0 300011 07', 'Construction Workshop', '2026-03-14'::date, 'Mock Supply Officer', 'Issued to end-user'),
    ('e0000002-0000-0000-0000-000000000003'::uuid, 'TRANSFER', 5, 950.00::numeric, 'ITR-2026-04-001', '16 009 0 300011 07', 'Construction Workshop', '2026-04-08'::date, 'Mock Supply Officer', 'Transferred to training area'),
    ('e0000002-0000-0000-0000-000000000004'::uuid, 'RETURN', 3, 220.00::numeric, 'RRSP-2026-04-001', '16 009 0 300011 07', 'Construction Workshop', '2026-04-12'::date, 'Mock Supply Officer', 'Returned unused items'),
    ('e0000002-0000-0000-0000-000000000005'::uuid, 'DISPOSAL', 2, 780.00::numeric, 'IIRUSP-2026-05-001', '16 009 0 300011 07', 'Construction Workshop', '2026-05-18'::date, 'Mock Supply Officer', 'Unserviceable stock disposed')
) as seed(item_id, type, quantity, unit_value, reference_no, responsibility_center_code, office_officer, transaction_date, staff_name, remarks)
where not exists (
  select 1
  from public.transactions t
  where t.reference_no = seed.reference_no
    and t.item_id = seed.item_id
    and t.type = seed.type
);
