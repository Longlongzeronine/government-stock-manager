create table if not exists public.ppe_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('ppe-ledger', 'par', 'ptr', 'rpcppe', 'iirup', 'rlsddp', 'rrpe')),
  document_no text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'cancelled')),
  form_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_type, document_no)
);

alter table public.accountability_events add column if not exists quantity numeric(14,2);

alter table public.ppe_documents enable row level security;

drop policy if exists ppe_documents_read_authenticated on public.ppe_documents;
create policy ppe_documents_read_authenticated on public.ppe_documents
  for select to authenticated using (auth.uid() is not null);

drop policy if exists ppe_documents_insert_staff on public.ppe_documents;
create policy ppe_documents_insert_staff on public.ppe_documents
  for insert to authenticated with check (public.can_write_inventory(auth.uid()));

drop policy if exists ppe_documents_update_staff on public.ppe_documents;
create policy ppe_documents_update_staff on public.ppe_documents
  for update to authenticated using (public.can_write_inventory(auth.uid()))
  with check (public.can_write_inventory(auth.uid()));

create or replace function public.approve_ppe_document(
  p_document_id uuid,
  p_actor_id uuid default null,
  p_actor_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc ppe_documents%rowtype;
  v_line jsonb;
  v_form jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_event_type text;
  v_par_id uuid;
  v_par_no text;
  v_status text;
  v_notes text;
begin
  if auth.uid() is not null and not public.can_write_inventory(auth.uid()) then
    raise exception 'You do not have permission to approve PPE forms.';
  end if;

  select * into v_doc from ppe_documents where id = p_document_id for update;
  if not found then raise exception 'PPE form not found.'; end if;
  if v_doc.status = 'approved' then return to_jsonb(v_doc); end if;
  if v_doc.status <> 'draft' then raise exception 'Only draft PPE forms can be approved.'; end if;
  v_form := v_doc.form_data;
  v_notes := concat_ws(' | ', nullif(v_form->>'circumstances',''), nullif(v_form->>'reasonForTransfer',''), nullif(v_form->>'remarks',''));

  if v_doc.document_type = 'par' then
    insert into par_forms (par_no, accountable_person, office, created_by, created_by_name)
    values (v_doc.document_no, coalesce(v_form->>'accountablePerson',''), nullif(v_form->>'office',''), coalesce(p_actor_id,v_doc.created_by), coalesce(p_actor_name,v_doc.created_by_name))
    on conflict (par_no) do update set accountable_person = excluded.accountable_person, office = excluded.office
    returning id into v_par_id;
    for v_line in select value from jsonb_array_elements(coalesce(v_form->'items','[]'::jsonb))
    loop
      v_item_id := nullif(v_line->>'itemId','')::uuid;
      v_quantity := greatest(coalesce(nullif(v_line->>'quantity','')::numeric,1),0);
      if v_item_id is null or v_quantity <= 0 then continue; end if;
      if not exists (select 1 from par_items where par_id = v_par_id and item_id = v_item_id) then
        insert into par_items (par_id,item_id,quantity,unit_cost,remarks)
        values (v_par_id,v_item_id,v_quantity,coalesce(nullif(v_line->>'unitCost','')::numeric,0),nullif(v_line->>'remarks',''));
        update items set accountability_status = 'issued', issued_quantity = coalesce(issued_quantity,0) + v_quantity where id = v_item_id;
      end if;
    end loop;
  end if;

  if v_doc.document_type in ('ptr','iirup','rlsddp','rrpe') then
    for v_line in select value from jsonb_array_elements(coalesce(v_form->'items','[]'::jsonb))
    loop
      v_item_id := nullif(v_line->>'itemId','')::uuid;
      v_quantity := greatest(coalesce(nullif(v_line->>'quantity','')::numeric,1),0);
      if v_item_id is null or v_quantity <= 0 then continue; end if;
      v_event_type := case
        when v_doc.document_type = 'ptr' then 'transferred'
        when v_doc.document_type = 'rrpe' then 'returned'
        when v_doc.document_type = 'iirup' then 'disposed'
        when v_form->>'propertyStatus' in ('Lost','Stolen') then 'lost'
        when v_form->>'propertyStatus' = 'Destroyed' then 'disposed'
        else 'damaged'
      end;

      insert into accountability_events (item_id,quantity,event_type,reference_no,reported_by,from_custodian,to_custodian,notes,created_by,created_by_name)
      values (v_item_id,v_quantity,v_event_type,v_doc.document_no,coalesce(p_actor_name,v_doc.created_by_name),
        coalesce(v_form->>'fromAccountableOfficer',v_form->>'accountableOfficer',v_form->>'returnedBy'),
        case when v_doc.document_type = 'ptr' then v_form->>'toAccountableOfficer' when v_doc.document_type = 'rrpe' then coalesce(v_form->>'receivedBy','Property Custodian') else null end,
        nullif(v_notes,''),coalesce(p_actor_id,v_doc.created_by),coalesce(p_actor_name,v_doc.created_by_name));

      if v_doc.document_type = 'ptr' then
        if coalesce(nullif(v_form->>'previousParNo',''),nullif(v_form->>'parNo','')) is not null then
          update par_forms set status = 'cancelled' where par_no = coalesce(nullif(v_form->>'previousParNo',''),nullif(v_form->>'parNo','')) and status = 'issued';
        else
          update par_forms set status = 'cancelled' where id in (select par_id from par_items where item_id = v_item_id) and status = 'issued';
        end if;
        v_par_no := v_doc.document_no || '-PAR';
        insert into par_forms (par_no,accountable_person,office,created_by,created_by_name)
        values (v_par_no,coalesce(v_form->>'toAccountableOfficer',''),nullif(v_form->>'toOffice',''),coalesce(p_actor_id,v_doc.created_by),coalesce(p_actor_name,v_doc.created_by_name))
        on conflict (par_no) do update set accountable_person = excluded.accountable_person, office = excluded.office
        returning id into v_par_id;
        insert into par_items (par_id,item_id,quantity,unit_cost,remarks)
        select v_par_id,v_item_id,v_quantity,coalesce(nullif(v_line->>'unitCost','')::numeric,0),nullif(v_line->>'remarks','')
        where not exists (select 1 from par_items where par_id = v_par_id and item_id = v_item_id);
        update items set accountability_status = 'issued' where id = v_item_id;
      elsif v_doc.document_type = 'rrpe' then
        if nullif(v_form->>'parNo','') is not null then
          update par_forms set status = 'returned' where par_no = v_form->>'parNo' and status = 'issued';
        else
          update par_forms set status = 'returned' where id in (select par_id from par_items where item_id = v_item_id) and status = 'issued';
        end if;
        update items set accountability_status = 'returned', issued_quantity = greatest(coalesce(issued_quantity,0)-v_quantity,0), returned_quantity = coalesce(returned_quantity,0)+v_quantity where id = v_item_id;
        insert into transactions (item_id,type,quantity,staff_name,remarks,source_form_type,source_form_id)
        values (v_item_id,'IN',v_quantity,coalesce(p_actor_name,v_doc.created_by_name),
          'RRPE ' || v_doc.document_no || ' | Return from ' || coalesce(v_form->>'returnedBy',''),
          'RRPE',p_document_id);
      else
        if coalesce(nullif(v_form->>'previousParNo',''),nullif(v_form->>'parNo','')) is not null then
          update par_forms set status = 'cancelled' where par_no = coalesce(nullif(v_form->>'previousParNo',''),nullif(v_form->>'parNo','')) and status = 'issued';
        else
          update par_forms set status = 'cancelled' where id in (select par_id from par_items where item_id = v_item_id) and status = 'issued';
        end if;
        v_status := case when v_event_type = 'lost' then 'lost' when v_event_type = 'damaged' then 'damaged' else 'disposed' end;
        update items set accountability_status = v_status, issued_quantity = greatest(coalesce(issued_quantity,0)-v_quantity,0) where id = v_item_id;
      end if;
    end loop;
  end if;

  update ppe_documents set status = 'approved', updated_at = now() where id = p_document_id returning * into v_doc;
  return to_jsonb(v_doc);
end;
$$;

revoke all on function public.approve_ppe_document(uuid, uuid, text) from public, anon;
grant execute on function public.approve_ppe_document(uuid, uuid, text) to authenticated, service_role;
