-- ============================================================================
-- Semi-Expendable Property Workflow Rules (Rules 1-9)
-- Each rule runs as a single database transaction; idempotent on re-approval.
-- ============================================================================

alter type public.app_role add value if not exists 'custodian';
alter type public.app_role add value if not exists 'approver';

drop index if exists user_roles_user_id_role_key;
create unique index if not exists user_roles_user_id_role_key
  on public.user_roles (user_id, role);

alter table public.user_roles
  drop constraint if exists user_roles_allowed_role;
alter table public.user_roles
  add constraint user_roles_allowed_role
  check (role in ('viewer', 'staff', 'admin', 'accounting', 'custodian', 'approver')) not valid;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text default null,
  actor_email text default null,
  action text not null,
  table_name text not null,
  row_id text default null,
  payload jsonb default null,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select using (public.has_role(auth.uid(), 'admin'));

create or replace function public.write_audit_log(
  p_action text, p_table_name text, p_row_id text, p_payload jsonb default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, actor_email, action, table_name, row_id, payload)
  values (coalesce(auth.uid()::text, 'system'),
          coalesce(current_setting('request.jwt.claims.email', true), 'system'),
          p_action, p_table_name, p_row_id, p_payload);
end;
$$;

revoke all on function public.write_audit_log(text, text, text, jsonb) from public, anon;
grant execute on function public.write_audit_log(text, text, text, jsonb) to authenticated, service_role;

alter table public.iar_forms drop constraint if exists iar_forms_status_check;
alter table public.iar_forms add constraint iar_forms_status_check
  check (status in ('draft', 'submitted', 'approved', 'cancelled'));

alter table public.ris_forms drop constraint if exists ris_forms_status_check;
alter table public.ris_forms add constraint ris_forms_status_check
  check (status in ('draft', 'submitted', 'approved', 'cancelled', 'issued', 'rejected'));

alter table public.ics_forms drop constraint if exists ics_forms_status_check;
alter table public.ics_forms add constraint ics_forms_status_check
  check (status in ('draft', 'submitted', 'approved', 'cancelled', 'issued', 'returned'));

alter table public.par_forms drop constraint if exists par_forms_status_check;
alter table public.par_forms add constraint par_forms_status_check
  check (status in ('draft', 'submitted', 'approved', 'cancelled', 'issued', 'returned'));

alter table public.items
  add column if not exists issued_quantity numeric(14,2) not null default 0,
  add column if not exists returned_quantity numeric(14,2) not null default 0,
  add column if not exists last_ics_id uuid,
  add column if not exists last_issuance_date timestamptz;

comment on column public.items.issued_quantity is 'Total quantity currently issued out (active ICS)';
comment on column public.items.returned_quantity is 'Total quantity returned to supply officer custody';
comment on column public.items.last_ics_id is 'Reference to the most recent active ICS for this item';
comment on column public.items.last_issuance_date is 'Timestamp of the most recent issuance';

create table if not exists public.form_approvals (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  form_id uuid not null,
  role text not null check (role in ('supply_officer', 'accountant', 'approver', 'custodian', 'head_of_office')),
  person_name text not null,
  person_id uuid references auth.users(id),
  action text not null check (action in ('submit', 'approve', 'reject', 'cancel')),
  action_date timestamptz not null default now(),
  remarks text
);
alter table public.form_approvals enable row level security;
drop policy if exists form_approvals_read_auth on public.form_approvals;
create policy form_approvals_read_auth on public.form_approvals
  for select using (auth.uid() is not null);

-- Rule 1: IAR approved -> create Items, SPLC entries, SPC entries (in stock / un-issued)
create or replace function public.approve_iar(p_form_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form record;
  v_line record;
  v_item record;
  v_stock_no text;
  v_remarks text;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  select * into v_form from iar_forms where id = p_form_id for update;
  if not found then
    raise exception 'IAR form % not found.', p_form_id;
  end if;
  if v_form.status = 'approved' then
    return jsonb_build_object('status', 'already_approved', 'iar_no', v_form.iar_no);
  end if;
  if v_form.status <> 'submitted' then
    raise exception 'IAR % is in status ''%'', must be ''submitted'' before approval.', v_form.iar_no, v_form.status;
  end if;

  for v_line in
    select ii.* from iar_items ii where ii.iar_id = p_form_id
  loop
    select * into v_item from items where id = v_line.item_id for update;
    if not found then
      raise exception 'Item % not found.', v_line.item_id;
    end if;

    if nullif(btrim(v_item.stock_number), '') is null then
      perform pg_advisory_xact_lock(hashtextextended('inventory-stock-number-sequence', 0));
      select lpad((coalesce(max(stock_number::integer), 0) + 1)::text, 3, '0')
        into v_stock_no
        from items
        where stock_number ~ '^[0-9]+$';
      update items set stock_number = v_stock_no where id = v_line.item_id;
    end if;

    v_balance_before := coalesce(v_item.quantity, 0);
    v_balance_after := v_balance_before + v_line.quantity;

    v_remarks := concat_ws(' | ', 'IAR ' || v_form.iar_no,
      case when v_line.product_description is not null then 'Description: ' || v_line.product_description end,
      case when v_form.supplier is not null then 'Supplier: ' || v_form.supplier end,
      case when v_form.invoice_no is not null then 'Invoice: ' || v_form.invoice_no end,
      case when v_line.unit_cost > 0 then 'Unit Cost: PHP ' || to_char(v_line.unit_cost, 'FM9999999990.00') end,
      nullif(v_line.remarks, '')
    );

    insert into transactions (item_id, type, quantity, staff_id, staff_name, source_form_type, source_form_id, remarks, product_description)
    values (v_line.item_id, 'IN', v_line.quantity, v_form.created_by, v_form.created_by_name, 'IAR', v_form.id, v_remarks, v_line.product_description);

    insert into splc_entries (item_id, reference_no, entry_date, particulars, debit, credit, balance, created_by, created_by_name)
    values (v_line.item_id, 'IAR ' || v_form.iar_no, current_date,
            'Receipt per IAR ' || v_form.iar_no,
            v_line.amount, 0, v_balance_after, v_form.created_by, v_form.created_by_name);

    update items
    set accountability_status = 'available',
        updated_at = now()
    where id = v_line.item_id;

    perform write_audit_log(
      'approve_iar', 'iar_items', v_line.id::text,
      jsonb_build_object('item_id', v_line.item_id, 'quantity', v_line.quantity, 'unit_cost', v_line.unit_cost, 'balance_before', v_balance_before, 'balance_after', v_balance_after)
    );
  end loop;

  update iar_forms set status = 'approved', updated_at = now() where id = p_form_id;

  perform write_audit_log('approve_iar', 'iar_forms', p_form_id::text,
    jsonb_build_object('iar_no', v_form.iar_no, 'status', 'approved'));

  return jsonb_build_object('status', 'approved', 'iar_no', v_form.iar_no);
end;
$$;

revoke all on function public.approve_iar(uuid) from public, anon;
grant execute on function public.approve_iar(uuid) to authenticated, service_role;

-- Rule 2: RIS approved -> generate ICS for custodian; mark item issued; write issuance on SPC and SPLC
create or replace function public.approve_ris(p_form_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form record;
  v_line record;
  v_item record;
  v_ics_id uuid;
  v_ics_no text;
  v_remarks text;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  select * into v_form from ris_forms where id = p_form_id for update;
  if not found then
    raise exception 'RIS form % not found.', p_form_id;
  end if;
  if v_form.status = 'approved' then
    return jsonb_build_object('status', 'already_approved', 'ris_no', v_form.ris_no);
  end if;
  if v_form.status <> 'submitted' then
    raise exception 'RIS % is in status ''%'', must be ''submitted'' before approval.', v_form.ris_no, v_form.status;
  end if;

  v_ics_no := 'ICS-' || v_form.ris_no;

  insert into ics_forms (ics_no, ris_id, custodian_name, office, status, created_by, created_by_name)
  values (v_ics_no, v_form.id, v_form.received_by, v_form.office, 'approved',
          v_form.created_by, v_form.created_by_name)
  returning id into v_ics_id;

  for v_line in
    select ri.* from ris_items ri where ri.ris_id = p_form_id
  loop
    select * into v_item from items where id = v_line.item_id for update;
    if not found then
      raise exception 'Item % not found.', v_line.item_id;
    end if;

    if v_item.accountability_status not in ('available', 'returned') then
      raise exception 'Item % (% ) is ''%'', cannot be issued. It must be available or returned.',
        v_item.stock_number, v_item.name, v_item.accountability_status;
    end if;

    if coalesce(v_item.quantity, 0) < v_line.quantity then
      raise exception 'Insufficient quantity for item %. Available: %, Requested: %.',
        v_item.name, v_item.quantity, v_line.quantity;
    end if;

    v_balance_before := coalesce(v_item.quantity, 0);
    v_balance_after := v_balance_before - v_line.quantity;

    v_remarks := concat_ws(' | ', 'RIS ' || v_form.ris_no,
      case when v_form.purpose is not null then 'Purpose: ' || v_form.purpose end,
      case when v_form.custodian_name is not null then 'Custodian: ' || v_form.custodian_name end,
      nullif(v_line.remarks, '')
    );

    insert into transactions (item_id, type, quantity, staff_id, staff_name, source_form_type, source_form_id, remarks, product_description)
    values (v_line.item_id, 'OUT', v_line.quantity, v_form.created_by, v_form.created_by_name, 'RIS', v_form.id, v_remarks, null);

    insert into ics_items (ics_id, item_id, quantity, unit_cost, remarks)
    values (v_ics_id, v_line.item_id, v_line.quantity, v_line.unit_cost, nullif(v_line.remarks, ''));

    update items
    set accountability_status = 'issued',
        issued_quantity = coalesce(issued_quantity, 0) + v_line.quantity,
        last_ics_id = v_ics_id,
        last_issuance_date = now(),
        updated_at = now()
    where id = v_line.item_id;

    insert into splc_entries (item_id, reference_no, entry_date, particulars, debit, credit, balance, created_by, created_by_name)
    values (v_line.item_id, 'RIS ' || v_form.ris_no, current_date,
            'Issuance per RIS ' || v_form.ris_no || ' (ICS ' || v_ics_no || ')',
            0, v_line.quantity * coalesce(v_line.unit_cost, 0), v_balance_after,
            v_form.created_by, v_form.created_by_name);

    perform write_audit_log('approve_ris_issue', 'ris_items', v_line.id::text,
      jsonb_build_object('item_id', v_line.item_id, 'quantity', v_line.quantity, 'ics_id', v_ics_id, 'ics_no', v_ics_no,
                         'balance_before', v_balance_before, 'balance_after', v_balance_after));
  end loop;

  update ris_forms set status = 'approved', updated_at = now() where id = p_form_id;

  perform write_audit_log('approve_ris', 'ris_forms', p_form_id::text,
    jsonb_build_object('ris_no', v_form.ris_no, 'ics_no', v_ics_no, 'status', 'approved'));

  return jsonb_build_object('status', 'approved', 'ris_no', v_form.ris_no, 'ics_no', v_ics_no, 'ics_id', v_ics_id);
end;
$$;

revoke all on function public.approve_ris(uuid) from public, anon;
grant execute on function public.approve_ris(uuid) to authenticated, service_role;

-- Rule 4: ITR approved -> cancel previous ICS, create new active ICS for new custodian, update SPC
create or replace function public.approve_itr(p_form_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form record;
  v_line record;
  v_item record;
  v_new_ics_id uuid;
  v_new_ics_no text;
  v_remarks text;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  select * into v_form from ris_forms where id = p_form_id for update;
  if not found then
    raise exception 'ITR form % not found.', p_form_id;
  end if;
  if v_form.status = 'approved' then
    return jsonb_build_object('status', 'already_approved', 'form_no', v_form.ris_no);
  end if;
  if v_form.status <> 'submitted' then
    raise exception 'ITR % is in status ''%'', must be ''submitted'' before approval.', v_form.ris_no, v_form.status;
  end if;

  v_new_ics_no := 'ITR-ICS-' || v_form.ris_no;

  insert into ics_forms (ics_no, ris_id, custodian_name, office, status, created_by, created_by_name)
  values (v_new_ics_no, v_form.id, v_form.received_by, v_form.office, 'approved',
          v_form.created_by, v_form.created_by_name)
  returning id into v_new_ics_id;

  for v_line in
    select ri.* from ris_items ri where ri.ris_id = p_form_id
  loop
    select * into v_item from items where id = v_line.item_id for update;
    if not found then
      raise exception 'Item % not found.', v_line.item_id;
    end if;

    if v_item.last_ics_id is not null then
      update ics_forms
      set status = 'cancelled', updated_at = now()
      where id = v_item.last_ics_id and status = 'approved';
    end if;

    v_balance_before := coalesce(v_item.quantity, 0);
    v_balance_after := greatest(coalesce(v_item.quantity, 0) - v_line.quantity, 0);

    v_remarks := concat_ws(' | ', 'ITR ' || v_form.ris_no,
      case when v_form.purpose is not null then 'Purpose: ' || v_form.purpose end,
      case when v_form.received_by is not null then 'New Custodian: ' || v_form.received_by end,
      nullif(v_line.remarks, '')
    );

    insert into transactions (item_id, type, quantity, staff_id, staff_name, source_form_type, source_form_id, remarks, product_description)
    values (v_line.item_id, 'OUT', v_line.quantity, v_form.created_by, v_form.created_by_name, 'ITR', v_form.id, v_remarks, null);

    insert into ics_items (ics_id, item_id, quantity, unit_cost, remarks)
    values (v_new_ics_id, v_line.item_id, v_line.quantity, v_line.unit_cost, nullif(v_line.remarks, ''));

    update items
    set accountability_status = 'issued',
        issued_quantity = coalesce(issued_quantity, 0) + v_line.quantity,
        last_ics_id = v_new_ics_id,
        last_issuance_date = now(),
        updated_at = now()
    where id = v_line.item_id;

    insert into splc_entries (item_id, reference_no, entry_date, particulars, debit, credit, balance, created_by, created_by_name)
    values (v_line.item_id, 'ITR ' || v_form.ris_no, current_date,
            'Transfer per ITR ' || v_form.ris_no || ' (ICS ' || v_new_ics_no || ')',
            0, v_line.quantity * coalesce(v_line.unit_cost, 0), v_balance_after,
            v_form.created_by, v_form.created_by_name);

    perform write_audit_log('approve_itr_transfer', 'ris_items', v_line.id::text,
      jsonb_build_object('item_id', v_line.item_id, 'quantity', v_line.quantity, 'old_ics_id', v_item.last_ics_id,
                         'new_ics_id', v_new_ics_id, 'balance_before', v_balance_before, 'balance_after', v_balance_after));
  end loop;

  update ris_forms set status = 'approved', updated_at = now() where id = p_form_id;

  perform write_audit_log('approve_itr', 'ris_forms', p_form_id::text,
    jsonb_build_object('form_no', v_form.ris_no, 'new_ics_no', v_new_ics_no, 'status', 'approved'));

  return jsonb_build_object('status', 'approved', 'form_no', v_form.ris_no, 'new_ics_no', v_new_ics_no, 'ics_id', v_new_ics_id);
end;
$$;

revoke all on function public.approve_itr(uuid) from public, anon;
grant execute on function public.approve_itr(uuid) to authenticated, service_role;

-- Rule 5: RLSDDSP / IIRUSP approved -> update SPC, cancel previous ICS, update SPLC
create or replace function public.report_property_loss(p_form_id uuid, p_event_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form record;
  v_line record;
  v_item record;
  v_status text;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  if p_event_type = 'lost' then v_status := 'lost';
  elsif p_event_type = 'stolen' then v_status := 'lost';
  elsif p_event_type = 'damaged' then v_status := 'damaged';
  elsif p_event_type = 'destroyed' then v_status := 'disposed';
  elsif p_event_type = 'unserviceable' then v_status := 'damaged';
  else raise exception 'Invalid event type: %', p_event_type;
  end if;

  select * into v_form from ris_forms where id = p_form_id for update;
  if not found then
    raise exception 'Property report form % not found.', p_form_id;
  end if;
  if v_form.status = 'approved' then
    return jsonb_build_object('status', 'already_approved', 'form_no', v_form.ris_no);
  end if;
  if v_form.status <> 'submitted' then
    raise exception 'Report % is in status ''%'', must be ''submitted'' before approval.', v_form.ris_no, v_form.status;
  end if;

  for v_line in
    select ri.* from ris_items ri where ri.ris_id = p_form_id
  loop
    select * into v_item from items where id = v_line.item_id for update;
    if not found then
      raise exception 'Item % not found.', v_line.item_id;
    end if;

    if v_item.accountability_status <> 'issued' then
      raise exception 'Item % (% ) is ''%'', cannot be reported as % because it is not currently issued.',
        v_item.stock_number, v_item.name, v_item.accountability_status, p_event_type;
    end if;

    if v_item.last_ics_id is not null then
      update ics_forms
      set status = 'cancelled', updated_at = now()
      where id = v_item.last_ics_id and status = 'approved';
    end if;

    v_balance_before := coalesce(v_item.quantity, 0);
    v_balance_after := greatest(v_balance_before - v_line.quantity, 0);

    update items
    set accountability_status = v_status,
        issued_quantity = greatest(coalesce(issued_quantity, 0) - v_line.quantity, 0),
        updated_at = now()
    where id = v_line.item_id;

    insert into accountability_events (item_id, event_type, reference_no, reported_by, from_custodian, to_custodian, notes, created_by, created_by_name)
    values (v_line.item_id, p_event_type, v_form.ris_no, v_form.requested_by,
            v_form.custodian_name, null,
            case when v_form.purpose is not null then 'Purpose: ' || v_form.purpose end,
            v_form.created_by, v_form.created_by_name);

    insert into splc_entries (item_id, reference_no, entry_date, particulars, debit, credit, balance, created_by, created_by_name)
    values (v_line.item_id, v_form.ris_no, current_date,
            'Report of ' || p_event_type || ' per ' || v_form.ris_no,
            0, v_line.quantity * coalesce(v_line.unit_cost, 0), v_balance_after,
            v_form.created_by, v_form.created_by_name);

    perform write_audit_log('report_property_loss', 'ris_items', v_line.id::text,
      jsonb_build_object('item_id', v_line.item_id, 'event_type', p_event_type, 'new_status', v_status,
                         'quantity', v_line.quantity, 'cancelled_ics_id', v_item.last_ics_id,
                         'balance_before', v_balance_before, 'balance_after', v_balance_after));
  end loop;

  update ris_forms set status = 'approved', updated_at = now() where id = p_form_id;

  perform write_audit_log('report_property_loss', 'ris_forms', p_form_id::text,
    jsonb_build_object('form_no', v_form.ris_no, 'event_type', p_event_type, 'new_status', v_status, 'status', 'approved'));

  return jsonb_build_object('status', 'approved', 'form_no', v_form.ris_no, 'event_type', p_event_type, 'new_status', v_status);
end;
$$;

revoke all on function public.report_property_loss(uuid, text) from public, anon;
grant execute on function public.report_property_loss(uuid, text) to authenticated, service_role;

-- Rule 6: RRSP approved -> update SPC (item status: returned, in supply officer custody)
create or replace function public.receive_returned_property(p_form_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form record;
  v_line record;
  v_item record;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  select * into v_form from ris_forms where id = p_form_id for update;
  if not found then
    raise exception 'RRSP form % not found.', p_form_id;
  end if;
  if v_form.status = 'approved' then
    return jsonb_build_object('status', 'already_approved', 'form_no', v_form.ris_no);
  end if;
  if v_form.status <> 'submitted' then
    raise exception 'RRSP % is in status ''%'', must be ''submitted'' before approval.', v_form.ris_no, v_form.status;
  end if;

  for v_line in
    select ri.* from ris_items ri where ri.ris_id = p_form_id
  loop
    select * into v_item from items where id = v_line.item_id for update;
    if not found then
      raise exception 'Item % not found.', v_line.item_id;
    end if;

    if v_item.accountability_status <> 'issued' then
      raise exception 'Item % (% ) is ''%'', cannot be received as returned because it is not currently issued.',
        v_item.stock_number, v_item.name, v_item.accountability_status;
    end if;

    if v_item.last_ics_id is not null then
      update ics_forms
      set status = 'cancelled', updated_at = now()
      where id = v_item.last_ics_id and status = 'approved';
    end if;

    v_balance_before := coalesce(v_item.quantity, 0);
    v_balance_after := v_balance_before + v_line.quantity;

    update items
    set accountability_status = 'returned',
        issued_quantity = greatest(coalesce(issued_quantity, 0) - v_line.quantity, 0),
        returned_quantity = coalesce(returned_quantity, 0) + v_line.quantity,
        last_ics_id = null,
        updated_at = now()
    where id = v_line.item_id;

    insert into accountability_events (item_id, event_type, reference_no, reported_by, from_custodian, to_custodian, notes, created_by, created_by_name)
    values (v_line.item_id, 'returned', v_form.ris_no, v_form.requested_by,
            v_form.custodian_name, 'Supply Officer',
            case when v_form.purpose is not null then 'Purpose: ' || v_form.purpose end,
            v_form.created_by, v_form.created_by_name);

    insert into splc_entries (item_id, reference_no, entry_date, particulars, debit, credit, balance, created_by, created_by_name)
    values (v_line.item_id, v_form.ris_no, current_date,
            'Return per RRSP ' || v_form.ris_no || ' (to supply officer custody)',
            v_line.quantity * coalesce(v_line.unit_cost, 0), 0, v_balance_after,
            v_form.created_by, v_form.created_by_name);

    perform write_audit_log('receive_returned', 'ris_items', v_line.id::text,
      jsonb_build_object('item_id', v_line.item_id, 'quantity', v_line.quantity, 'cancelled_ics_id', v_item.last_ics_id,
                         'balance_before', v_balance_before, 'balance_after', v_balance_after));
  end loop;

  update ris_forms set status = 'approved', updated_at = now() where id = p_form_id;

  perform write_audit_log('receive_returned', 'ris_forms', p_form_id::text,
    jsonb_build_object('form_no', v_form.ris_no, 'status', 'approved'));

  return jsonb_build_object('status', 'approved', 'form_no', v_form.ris_no);
end;
$$;

revoke all on function public.receive_returned_property(uuid) from public, anon;
grant execute on function public.receive_returned_property(uuid) to authenticated, service_role;

-- Rule 7: RegSPI generated -> reads issued items and updates SPC issuance column
create or replace function public.generate_regspi(p_form_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form record;
  v_line record;
  v_item record;
  v_remarks text;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  select * into v_form from ris_forms where id = p_form_id for update;
  if not found then
    raise exception 'RegSPI form % not found.', p_form_id;
  end if;
  if v_form.status = 'approved' then
    return jsonb_build_object('status', 'already_approved', 'form_no', v_form.ris_no);
  end if;
  if v_form.status <> 'submitted' then
    raise exception 'RegSPI % is in status ''%'', must be ''submitted'' before generation.', v_form.ris_no, v_form.status;
  end if;

  for v_line in
    select ri.* from ris_items ri where ri.ris_id = p_form_id
  loop
    select * into v_item from items where id = v_line.item_id for update;
    if not found then
      raise exception 'Item % not found.', v_line.item_id;
    end if;

    if v_item.accountability_status <> 'issued' then
      continue;
    end if;

    v_balance_before := coalesce(v_item.quantity, 0);
    v_balance_after := greatest(v_balance_before - v_line.quantity, 0);

    v_remarks := concat_ws(' | ', 'RegSPI ' || v_form.ris_no,
      case when v_form.purpose is not null then 'Purpose: ' || v_form.purpose end,
      nullif(v_line.remarks, '')
    );

    insert into transactions (item_id, type, quantity, staff_id, staff_name, source_form_type, source_form_id, remarks, product_description)
    values (v_line.item_id, 'OUT', v_line.quantity, v_form.created_by, v_form.created_by_name, 'REGSPI', v_form.id, v_remarks, null);

    update items
    set issued_quantity = greatest(coalesce(issued_quantity, 0) - v_line.quantity, 0),
        updated_at = now()
    where id = v_line.item_id;

    insert into splc_entries (item_id, reference_no, entry_date, particulars, debit, credit, balance, created_by, created_by_name)
    values (v_line.item_id, 'RegSPI ' || v_form.ris_no, current_date,
            'Registry issuance per RegSPI ' || v_form.ris_no,
            0, v_line.quantity * coalesce(v_line.unit_cost, 0), v_balance_after,
            v_form.created_by, v_form.created_by_name);

    perform write_audit_log('generate_regspi', 'ris_items', v_line.id::text,
      jsonb_build_object('item_id', v_line.item_id, 'quantity', v_line.quantity, 'balance_before', v_balance_before, 'balance_after', v_balance_after));
  end loop;

  update ris_forms set status = 'approved', updated_at = now() where id = p_form_id;

  perform write_audit_log('generate_regspi', 'ris_forms', p_form_id::text,
    jsonb_build_object('form_no', v_form.ris_no, 'status', 'approved'));

  return jsonb_build_object('status', 'approved', 'form_no', v_form.ris_no);
end;
$$;

revoke all on function public.generate_regspi(uuid) from public, anon;
grant execute on function public.generate_regspi(uuid) to authenticated, service_role;

-- Rule 8: RSPI generated -> collects ICS issuances for period, prevents double counting
create or replace function public.generate_rspi(p_form_id uuid, p_period_start date, p_period_end date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form record;
  v_ics record;
  v_ics_line record;
  v_item record;
  v_already_counted boolean;
  v_remarks text;
  v_balance_before numeric;
  v_balance_after numeric;
begin
  select * into v_form from ris_forms where id = p_form_id for update;
  if not found then
    raise exception 'RSPI form % not found.', p_form_id;
  end if;
  if v_form.status = 'approved' then
    return jsonb_build_object('status', 'already_approved', 'form_no', v_form.ris_no);
  end if;
  if v_form.status <> 'submitted' then
    raise exception 'RSPI % is in status ''%'', must be ''submitted'' before generation.', v_form.ris_no, v_form.status;
  end if;

  for v_ics in
    select icf.id, icf.ics_no, icf.custodian_name, icf.office, icf.created_at
    from ics_forms icf
    where icf.status = 'approved'
      and icf.created_at::date >= p_period_start
      and icf.created_at::date <= p_period_end
    order by icf.created_at asc
  loop
    select exists (
      select 1 from transactions t
      where t.source_form_type = 'RSPI'
        and t.source_form_id = p_form_id
        and t.remarks like '%ICS ' || v_ics.ics_no || '%'
    ) into v_already_counted;

    if v_already_counted then
      continue;
    end if;

    for v_ics_line in
      select ii.* from ics_items ii where ii.ics_id = v_ics.id
    loop
      select * into v_item from items where id = v_ics_line.item_id for update;
      if not found then
        raise exception 'Item % not found.', v_ics_line.item_id;
      end if;

      if v_item.accountability_status <> 'issued' then
        continue;
      end if;

      v_balance_before := coalesce(v_item.quantity, 0);
      v_balance_after := greatest(v_balance_before - v_ics_line.quantity, 0);

      v_remarks := concat_ws(' | ', 'RSPI ' || v_form.ris_no,
        'ICS ' || v_ics.ics_no,
        case when v_ics.custodian_name is not null then 'Custodian: ' || v_ics.custodian_name end,
        nullif(v_ics_line.remarks, '')
      );

      insert into transactions (item_id, type, quantity, staff_id, staff_name, source_form_type, source_form_id, remarks, product_description)
      values (v_ics_line.item_id, 'OUT', v_ics_line.quantity, v_form.created_by, v_form.created_by_name, 'RSPI', v_form.id, v_remarks, null);

      update items
      set issued_quantity = greatest(coalesce(issued_quantity, 0) - v_ics_line.quantity, 0),
          updated_at = now()
      where id = v_ics_line.item_id;

      insert into splc_entries (item_id, reference_no, entry_date, particulars, debit, credit, balance, created_by, created_by_name)
      values (v_ics_line.item_id, 'RSPI ' || v_form.ris_no, current_date,
              'Expense per RSPI ' || v_form.ris_no || ' (ICS ' || v_ics.ics_no || ')',
              0, v_ics_line.quantity * coalesce(v_ics_line.unit_cost, 0), v_balance_after,
              v_form.created_by, v_form.created_by_name);

      perform write_audit_log('generate_rspi', 'ics_items', v_ics_line.id::text,
        jsonb_build_object('item_id', v_ics_line.item_id, 'quantity', v_ics_line.quantity, 'ics_id', v_ics.id,
                           'ics_no', v_ics.ics_no, 'rspi_no', v_form.ris_no,
                           'balance_before', v_balance_before, 'balance_after', v_balance_after));
    end loop;
  end loop;

  update ris_forms set status = 'approved', updated_at = now() where id = p_form_id;

  perform write_audit_log('generate_rspi', 'ris_forms', p_form_id::text,
    jsonb_build_object('form_no', v_form.ris_no, 'period_start', p_period_start, 'period_end', p_period_end, 'status', 'approved'));

  return jsonb_build_object('status', 'approved', 'form_no', v_form.ris_no);
end;
$$;

revoke all on function public.generate_rspi(uuid, date, date) from public, anon;
grant execute on function public.generate_rspi(uuid, date, date) to authenticated, service_role;

-- Rule 9: RPCSP generated -> reads SPC: all un-issued items plus returned items in supply officer custody
create or replace function public.generate_rpcsp(p_as_of_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id text;
begin
  v_report_id := 'RPCSP-' || to_char(p_as_of_date, 'YYYYMMDD');

  perform write_audit_log('generate_rpcsp', 'items', null,
    jsonb_build_object('report_id', v_report_id, 'as_of_date', p_as_of_date,
                       'description', 'Physical count of un-issued and returned items'));

  return jsonb_build_object('status', 'generated', 'report_id', v_report_id, 'as_of_date', p_as_of_date);
end;
$$;

revoke all on function public.generate_rpcsp(date) from public, anon;
grant execute on function public.generate_rpcsp(date) to authenticated, service_role;

-- Reconciliation check: SPC quantities and SPLC balances must reconcile
create or replace function public.check_inventory_reconciliation(p_item_id uuid default null)
returns table (
  item_id uuid,
  stock_number text,
  item_name text,
  spc_quantity numeric,
  splc_balance numeric,
  difference numeric,
  reconciled boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id,
    i.stock_number,
    i.name,
    coalesce(i.quantity, 0) as spc_quantity,
    coalesce(splc.total_balance, 0) as splc_balance,
    coalesce(i.quantity, 0) - coalesce(splc.total_balance, 0) as difference,
    (coalesce(i.quantity, 0) - coalesce(splc.total_balance, 0)) = 0 as reconciled
  from items i
  left join (
    select item_id, sum(debit - credit) as total_balance
    from splc_entries
    group by item_id
  ) splc on splc.item_id = i.id
  where (p_item_id is null or i.id = p_item_id)
  order by i.stock_number nulls last, i.name;
end;
$$;

revoke all on function public.check_inventory_reconciliation(uuid) from public, anon;
grant execute on function public.check_inventory_reconciliation(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';