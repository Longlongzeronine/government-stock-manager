create or replace function public.publish_ris_verification(p_record jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to publish RIS verification';
  end if;

  insert into public.ris_public_verifications (
    verification_token, verification_code, ris_no, status, office, purpose,
    approved_by, issued_by, approved_date, issued_date, item_count, items,
    document_version, published_by, published_at, updated_at
  )
  values (
    p_record->>'verification_token',
    p_record->>'verification_code',
    p_record->>'ris_no',
    p_record->>'status',
    nullif(p_record->>'office', ''),
    nullif(p_record->>'purpose', ''),
    nullif(p_record->>'approved_by', ''),
    nullif(p_record->>'issued_by', ''),
    nullif(p_record->>'approved_date', '')::date,
    nullif(p_record->>'issued_date', '')::date,
    coalesce((p_record->>'item_count')::integer, 0),
    coalesce(p_record->'items', '[]'::jsonb),
    coalesce((p_record->>'document_version')::integer, 1),
    auth.uid(),
    now(),
    now()
  )
  on conflict (verification_token)
  do update set
    status = excluded.status,
    office = excluded.office,
    purpose = excluded.purpose,
    approved_by = excluded.approved_by,
    issued_by = excluded.issued_by,
    approved_date = excluded.approved_date,
    issued_date = excluded.issued_date,
    item_count = excluded.item_count,
    items = excluded.items,
    document_version = excluded.document_version,
    updated_at = now()
  where public.ris_public_verifications.published_by = auth.uid();
end;
$$;

revoke all on function public.publish_ris_verification(jsonb) from public;
grant execute on function public.publish_ris_verification(jsonb) to authenticated;
