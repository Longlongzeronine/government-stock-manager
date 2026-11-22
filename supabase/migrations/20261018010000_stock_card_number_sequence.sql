-- Backfill legacy inventory and assign a stock number to every new inventory row.
-- Preserve existing assigned numbers; generated sequence begins at 001 when empty.
create sequence if not exists public.stock_number_seq;

select setval(
  'public.stock_number_seq',
  coalesce(max(stock_number::bigint), 1),
  max(stock_number::bigint) is not null
)
from public.items
where stock_number ~ '^[0-9]+$';

create or replace function public.assign_item_stock_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(new.stock_number), '') is not null then
    return new;
  end if;

  new.stock_number := lpad(nextval('public.stock_number_seq')::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists assign_item_stock_number_before_insert on public.items;
create trigger assign_item_stock_number_before_insert
before insert on public.items
for each row execute function public.assign_item_stock_number();

create or replace function public.ensure_stock_numbers(p_item_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item_row record;
  assigned_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.can_write_inventory(auth.uid()) then
    raise exception 'You are not allowed to assign stock numbers.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('inventory-stock-number-sequence', 0));
  for item_row in
    select id
    from public.items
    where nullif(btrim(stock_number), '') is null
      and (p_item_ids is null or id = any(p_item_ids))
    order by sort_order asc nulls last, created_at asc, id
    for update
  loop
    update public.items
      set stock_number = lpad(nextval('public.stock_number_seq')::text, 3, '0')
      where id = item_row.id;
    assigned_count := assigned_count + 1;
  end loop;
  return assigned_count;
end;
$$;

revoke all on function public.ensure_stock_numbers(uuid[]) from public, anon;
grant execute on function public.ensure_stock_numbers(uuid[]) to authenticated, service_role;

do $$
declare
  item_row record;
begin
  perform pg_advisory_xact_lock(hashtextextended('inventory-stock-number-sequence', 0));
  for item_row in
    select id
    from public.items
    where nullif(btrim(stock_number), '') is null
    order by sort_order asc nulls last, created_at asc, id
  loop
    update public.items
      set stock_number = lpad(nextval('public.stock_number_seq')::text, 3, '0')
      where id = item_row.id;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
