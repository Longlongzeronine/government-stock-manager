-- Persist the IAR extended amount for downstream RPCI reporting. It remains
-- intentionally absent from the official IAR print layout.
alter table public.iar_items
  add column if not exists amount numeric(14,2) not null default 0;

update public.iar_items
set amount = quantity * unit_cost
where amount = 0 and unit_cost <> 0;

-- One counter per form type and year gives RIS a seven-digit series that
-- automatically starts again at 0000001 in January.
create table if not exists public.form_number_counters (
  form_prefix text not null,
  series_year integer not null,
  last_number bigint not null default 0,
  primary key (form_prefix, series_year)
);

alter table public.form_number_counters enable row level security;

create or replace function public.next_form_number(
  p_form_prefix text,
  p_form_date date default current_date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
begin
  if auth.uid() is null or not public.can_write_inventory(auth.uid()) then
    raise exception 'Not authorized to reserve a form number';
  end if;

  insert into public.form_number_counters (form_prefix, series_year, last_number)
  values (upper(p_form_prefix), extract(year from p_form_date)::integer, 1)
  on conflict (form_prefix, series_year)
  do update set last_number = public.form_number_counters.last_number + 1
  returning last_number into next_number;

  if upper(p_form_prefix) = 'RIS' then
    return to_char(p_form_date, 'YYYY-MM-DD') || '-' || lpad(next_number::text, 7, '0');
  end if;

  return upper(p_form_prefix) || '-' || to_char(p_form_date, 'YYYY-MM-DD') || '-' ||
    lpad(next_number::text, 7, '0');
end;
$$;

revoke all on function public.next_form_number(text, date) from public;
grant execute on function public.next_form_number(text, date) to authenticated;

create table if not exists public.form_personnel_memory (
  id uuid primary key default gen_random_uuid(),
  role text not null check (
    role in (
      'iar_accepted_by',
      'ris_requested_by',
      'ris_approved_by',
      'ris_issued_by',
      'ris_received_by'
    )
  ),
  person_name text not null check (btrim(person_name) <> ''),
  last_used_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  unique (role, person_name)
);

alter table public.form_personnel_memory enable row level security;

create policy form_personnel_read_authenticated
  on public.form_personnel_memory for select
  using (auth.uid() is not null);

create policy form_personnel_insert_staff_admin
  on public.form_personnel_memory for insert
  with check (public.can_write_inventory(auth.uid()));

create policy form_personnel_update_staff_admin
  on public.form_personnel_memory for update
  using (public.can_write_inventory(auth.uid()))
  with check (public.can_write_inventory(auth.uid()));
