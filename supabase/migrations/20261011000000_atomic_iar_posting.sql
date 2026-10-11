-- Keep IAR header, receipt lines, transactions, and item balances in one commit.
alter table public.iar_forms
  add column if not exists form_data jsonb not null default '{}'::jsonb;
alter table public.iar_items
  add column if not exists product_description text,
  add column if not exists amount numeric(14,2) not null default 0;
alter table public.transactions
  add column if not exists product_description text;

-- Align hosted classification with the application and local PostgreSQL rules.
create or replace function public.classify_inventory_item()
returns trigger
language plpgsql
as $$
begin
  if new.item_type = 'supply' then
    new.inventory_classification := 'expendable_supply';
    new.semi_expendable_tier := null;
  elsif new.item_type = 'material' then
    if new.acquisition_cost >= 50000 then
      new.inventory_classification := 'ppe';
      new.semi_expendable_tier := null;
    else
      new.inventory_classification := 'semi_expendable_property';
      new.semi_expendable_tier := case when new.acquisition_cost >= 15000 then 'high_value' else 'low_value' end;
    end if;
  end if;
  if new.barcode_value is null or new.barcode_value = '' then
    new.barcode_value := new.id::text;
  end if;
  if new.qr_code_value is null or new.qr_code_value = '' then
    new.qr_code_value := 'ITEM:' || new.id::text;
  end if;
  return new;
end;
$$;

drop trigger if exists classify_inventory_item_before_write on public.items;
create trigger classify_inventory_item_before_write
before insert or update of item_type, acquisition_cost, barcode_value, qr_code_value on public.items
for each row execute function public.classify_inventory_item();

update public.items
set inventory_classification = case
      when item_type = 'supply' then 'expendable_supply'
      when acquisition_cost >= 50000 then 'ppe'
      else 'semi_expendable_property'
    end,
    semi_expendable_tier = case
      when item_type = 'material' and acquisition_cost < 50000
        then case when acquisition_cost >= 15000 then 'high_value' else 'low_value' end
      else null
    end;

create or replace function public.delete_unused_inventory_item(target_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'You are not allowed to delete inventory items.';
  end if;
  perform 1 from public.items where id = target_item_id for update;
  if not found then raise exception 'Inventory item was not found.'; end if;
  if exists (select 1 from public.transactions where item_id = target_item_id)
     or exists (select 1 from public.iar_items where item_id = target_item_id)
     or exists (select 1 from public.ris_items where item_id = target_item_id)
     or exists (select 1 from public.ics_items where item_id = target_item_id)
     or exists (select 1 from public.par_items where item_id = target_item_id)
     or exists (select 1 from public.accountability_events where item_id = target_item_id)
     or exists (select 1 from public.splc_entries where item_id = target_item_id) then
    raise exception 'Item has transaction history and cannot be deleted. Historical records are preserved.';
  end if;
  delete from public.items where id = target_item_id;
  return true;
end;
$$;

revoke all on function public.delete_unused_inventory_item(uuid) from public, anon;
grant execute on function public.delete_unused_inventory_item(uuid) to authenticated, service_role;

create or replace function public.post_iar(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  iar_row public.iar_forms;
  line jsonb;
  item_uuid uuid;
  qty numeric(14,2);
  cost numeric(14,2);
  tx_row public.transactions;
  line_remarks text;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.can_write_inventory(auth.uid()) then
    raise exception 'You are not allowed to post inventory receipts.';
  end if;
  if coalesce(trim(payload->>'iar_no'), '') = '' then
    raise exception 'IAR number is required.';
  end if;
  if coalesce(jsonb_typeof(payload->'lines'), '') <> 'array'
     or jsonb_array_length(coalesce(payload->'lines', '[]'::jsonb)) = 0 then
    raise exception 'Add at least one accepted item.';
  end if;

  insert into public.iar_forms (iar_no, supplier, invoice_no, accepted_by, form_data, created_by, created_by_name)
  values (payload->>'iar_no', nullif(payload->>'supplier',''), nullif(payload->>'invoice_no',''),
    nullif(payload->>'accepted_by',''), coalesce(payload->'form_data', '{}'::jsonb),
    nullif(payload->>'created_by','')::uuid, nullif(payload->>'created_by_name',''))
  returning * into iar_row;

  for line in select value from jsonb_array_elements(payload->'lines') loop
    item_uuid := nullif(line->>'item_id','')::uuid;
    qty := nullif(line->>'quantity','')::numeric;
    cost := coalesce(nullif(line->>'unit_cost','')::numeric, 0);
    if item_uuid is null or qty is null or qty <= 0
       or qty in ('Infinity'::numeric, '-Infinity'::numeric, 'NaN'::numeric)
       or cost < 0 or cost in ('Infinity'::numeric, '-Infinity'::numeric, 'NaN'::numeric) then
      raise exception 'Each IAR item needs an item, positive quantity, and nonnegative unit cost.';
    end if;
    perform 1 from public.items where id = item_uuid for update;
    if not found then raise exception 'Selected inventory item was not found.'; end if;

    line_remarks := concat_ws(' | ', 'IAR ' || iar_row.iar_no,
      case when nullif(line->>'product_description','') is not null then 'Description: ' || (line->>'product_description') end,
      case when iar_row.supplier is not null then 'Supplier: ' || iar_row.supplier end,
      case when iar_row.invoice_no is not null then 'Invoice: ' || iar_row.invoice_no end,
      case when cost > 0 then 'Unit Cost: PHP ' || to_char(cost, 'FM9999999990.00') end,
      nullif(line->>'remarks',''));

    insert into public.transactions (item_id, type, quantity, staff_id, staff_name, source_form_type, source_form_id, remarks, product_description)
    values (item_uuid, 'IN', qty, nullif(payload->>'created_by','')::uuid,
      nullif(payload->>'created_by_name',''), 'IAR', iar_row.id, line_remarks,
      nullif(line->>'product_description',''))
    returning * into tx_row;
    update public.items set quantity = quantity + qty where id = item_uuid;
    insert into public.iar_items (iar_id, item_id, quantity, unit_cost, amount, remarks, transaction_id, product_description)
    values (iar_row.id, item_uuid, qty, cost, qty * cost, nullif(line->>'remarks',''), tx_row.id,
      nullif(line->>'product_description',''));
  end loop;
  return to_jsonb(iar_row);
end;
$$;

revoke all on function public.post_iar(jsonb) from public, anon;
grant execute on function public.post_iar(jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
