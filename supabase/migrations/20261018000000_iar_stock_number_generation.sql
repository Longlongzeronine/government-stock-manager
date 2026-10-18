-- Assign legacy inventory rows their stock card number on first IAR receipt.
-- Existing numbers (including suffixed numbers such as 001A) are preserved.
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
  item_row public.items;
  line_remarks text;
  next_stock_number text;
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
    select * into item_row from public.items where id = item_uuid for update;
    if not found then raise exception 'Selected inventory item was not found.'; end if;

    if nullif(btrim(item_row.stock_number), '') is null then
      -- Transaction advisory lock serializes sequence allocation across IAR posts.
      perform pg_advisory_xact_lock(hashtextextended('inventory-stock-number-sequence', 0));
      select lpad((coalesce(max(stock_number::integer), 0) + 1)::text, 3, '0')
        into next_stock_number
        from public.items
        where stock_number ~ '^[0-9]+$';
      update public.items set stock_number = next_stock_number where id = item_uuid;
    end if;

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

notify pgrst, 'reload schema';
