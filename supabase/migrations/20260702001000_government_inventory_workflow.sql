alter table public.user_roles
  drop constraint if exists user_roles_allowed_role;

alter table public.user_roles
  add constraint user_roles_allowed_role
  check (role in ('viewer', 'staff', 'admin', 'accounting')) not valid;

create or replace function public.can_write_inventory(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'staff');
$$;

create or replace function public.can_accounting_edit(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'accounting');
$$;

alter table public.items
  add column if not exists acquisition_cost numeric(14,2) not null default 0,
  add column if not exists inventory_classification text not null default 'expendable_supply',
  add column if not exists semi_expendable_tier text,
  add column if not exists accountability_status text not null default 'available',
  add column if not exists barcode_value text,
  add column if not exists qr_code_value text;

alter table public.items
  drop constraint if exists items_inventory_classification_check,
  add constraint items_inventory_classification_check
  check (inventory_classification in ('expendable_supply', 'semi_expendable_property', 'ppe'));

alter table public.items
  drop constraint if exists items_semi_expendable_tier_check,
  add constraint items_semi_expendable_tier_check
  check (
    semi_expendable_tier is null
    or semi_expendable_tier in ('low_value', 'high_value')
  );

alter table public.items
  drop constraint if exists items_accountability_status_check,
  add constraint items_accountability_status_check
  check (accountability_status in ('available', 'issued', 'returned', 'lost', 'damaged', 'disposed', 'transferred'));

create or replace function public.classify_inventory_item()
returns trigger
language plpgsql
as $$
begin
  if new.acquisition_cost >= 50000 then
    new.inventory_classification := 'ppe';
    new.semi_expendable_tier := null;
  elsif new.acquisition_cost > 0 then
    if new.acquisition_cost <= 5000 then
      new.inventory_classification := 'semi_expendable_property';
      new.semi_expendable_tier := 'low_value';
    else
      new.inventory_classification := 'semi_expendable_property';
      new.semi_expendable_tier := 'high_value';
    end if;
  else
    new.inventory_classification := 'expendable_supply';
    new.semi_expendable_tier := null;
  end if;

  if new.barcode_value is null or new.barcode_value = '' then
    new.barcode_value := new.id::text;
  end if;

  if new.qr_code_value is null or new.qr_code_value = '' then
    new.qr_code_value := concat('ITEM:', new.id::text);
  end if;

  return new;
end;
$$;

drop trigger if exists classify_inventory_item_before_write on public.items;
create trigger classify_inventory_item_before_write
before insert or update of acquisition_cost, barcode_value, qr_code_value on public.items
for each row execute function public.classify_inventory_item();

create table if not exists public.iar_forms (
  id uuid primary key default gen_random_uuid(),
  iar_no text not null unique,
  supplier text,
  invoice_no text,
  accepted_by text,
  status text not null default 'posted' check (status in ('draft', 'posted', 'cancelled')),
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.iar_items (
  id uuid primary key default gen_random_uuid(),
  iar_id uuid not null references public.iar_forms(id) on delete cascade,
  item_id uuid not null references public.items(id),
  quantity numeric(14,2) not null check (quantity > 0),
  unit_cost numeric(14,2) not null default 0,
  remarks text,
  transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ris_forms (
  id uuid primary key default gen_random_uuid(),
  ris_no text not null unique,
  office text not null,
  purpose text,
  requested_by text,
  approved_by text,
  issued_by text,
  received_by text,
  status text not null default 'issued' check (status in ('draft', 'issued', 'cancelled')),
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.ris_items (
  id uuid primary key default gen_random_uuid(),
  ris_id uuid not null references public.ris_forms(id) on delete cascade,
  item_id uuid not null references public.items(id),
  quantity numeric(14,2) not null check (quantity > 0),
  remarks text,
  transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists source_form_type text,
  add column if not exists source_form_id uuid,
  add column if not exists source_line_id uuid;

create table if not exists public.ics_forms (
  id uuid primary key default gen_random_uuid(),
  ics_no text not null unique,
  ris_id uuid references public.ris_forms(id),
  custodian_name text not null,
  office text,
  status text not null default 'issued' check (status in ('issued', 'returned', 'cancelled')),
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.ics_items (
  id uuid primary key default gen_random_uuid(),
  ics_id uuid not null references public.ics_forms(id) on delete cascade,
  item_id uuid not null references public.items(id),
  quantity numeric(14,2) not null default 1,
  unit_cost numeric(14,2) not null default 0,
  remarks text
);

create table if not exists public.par_forms (
  id uuid primary key default gen_random_uuid(),
  par_no text not null unique,
  ris_id uuid references public.ris_forms(id),
  accountable_person text not null,
  office text,
  status text not null default 'issued' check (status in ('issued', 'returned', 'cancelled')),
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.par_items (
  id uuid primary key default gen_random_uuid(),
  par_id uuid not null references public.par_forms(id) on delete cascade,
  item_id uuid not null references public.items(id),
  quantity numeric(14,2) not null default 1,
  unit_cost numeric(14,2) not null default 0,
  remarks text
);

create table if not exists public.accountability_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  event_type text not null check (event_type in ('lost', 'damaged', 'returned', 'disposed', 'transferred')),
  reference_no text,
  reported_by text,
  from_custodian text,
  to_custodian text,
  notes text,
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.splc_entries (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  reference_no text,
  entry_date date not null default current_date,
  particulars text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now()
);

alter table public.iar_forms enable row level security;
alter table public.iar_items enable row level security;
alter table public.ris_forms enable row level security;
alter table public.ris_items enable row level security;
alter table public.ics_forms enable row level security;
alter table public.ics_items enable row level security;
alter table public.par_forms enable row level security;
alter table public.par_items enable row level security;
alter table public.accountability_events enable row level security;
alter table public.splc_entries enable row level security;

do $$
declare
  policy record;
begin
  for policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'iar_forms', 'iar_items', 'ris_forms', 'ris_items',
        'ics_forms', 'ics_items', 'par_forms', 'par_items',
        'accountability_events', 'splc_entries'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy.policyname, policy.schemaname, policy.tablename);
  end loop;
end $$;

create policy workflow_read_authenticated on public.iar_forms for select using (auth.uid() is not null);
create policy workflow_insert_staff_admin on public.iar_forms for insert with check (public.can_write_inventory(auth.uid()));
create policy workflow_update_admin on public.iar_forms for update using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy workflow_read_authenticated on public.iar_items for select using (auth.uid() is not null);
create policy workflow_insert_staff_admin on public.iar_items for insert with check (public.can_write_inventory(auth.uid()));
create policy workflow_update_admin on public.iar_items for update using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy workflow_read_authenticated on public.ris_forms for select using (auth.uid() is not null);
create policy workflow_insert_staff_admin on public.ris_forms for insert with check (public.can_write_inventory(auth.uid()));
create policy workflow_update_admin on public.ris_forms for update using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy workflow_read_authenticated on public.ris_items for select using (auth.uid() is not null);
create policy workflow_insert_staff_admin on public.ris_items for insert with check (public.can_write_inventory(auth.uid()));
create policy workflow_update_admin on public.ris_items for update using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy accountability_read_authenticated on public.ics_forms for select using (auth.uid() is not null);
create policy accountability_write_staff_admin on public.ics_forms for insert with check (public.can_write_inventory(auth.uid()));
create policy accountability_read_authenticated on public.ics_items for select using (auth.uid() is not null);
create policy accountability_write_staff_admin on public.ics_items for insert with check (public.can_write_inventory(auth.uid()));

create policy accountability_read_authenticated on public.par_forms for select using (auth.uid() is not null);
create policy accountability_write_staff_admin on public.par_forms for insert with check (public.can_write_inventory(auth.uid()));
create policy accountability_read_authenticated on public.par_items for select using (auth.uid() is not null);
create policy accountability_write_staff_admin on public.par_items for insert with check (public.can_write_inventory(auth.uid()));

create policy accountability_events_read_authenticated on public.accountability_events for select using (auth.uid() is not null);
create policy accountability_events_write_staff_admin on public.accountability_events for insert with check (public.can_write_inventory(auth.uid()));

create policy splc_read_authenticated on public.splc_entries for select using (auth.uid() is not null);
create policy splc_accounting_insert on public.splc_entries for insert with check (public.can_accounting_edit(auth.uid()));
create policy splc_accounting_update on public.splc_entries for update using (public.can_accounting_edit(auth.uid())) with check (public.can_accounting_edit(auth.uid()));
