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
  form_prefix text := upper(p_form_prefix);
  history_number bigint := 0;
  next_number bigint;
begin
  if auth.role() <> 'service_role'
     and (auth.uid() is null or not public.can_write_inventory(auth.uid())) then
    raise exception 'Not authorized to reserve a form number';
  end if;

  if form_prefix = 'RIS' then
    select coalesce(max(nullif(substring(ris_no from '-([0-9]+)$'), '')::bigint), 0)
      into history_number
    from public.ris_forms
    where ris_no like to_char(p_form_date, 'YYYY-MM-DD') || '-%';
  elsif form_prefix = 'ICS' then
    select coalesce(max(nullif(substring(ics_no from '-([0-9]+)$'), '')::bigint), 0)
      into history_number
    from public.ics_forms
    where ics_no like to_char(p_form_date, 'YYYY-MM-DD') || '-%'
       or ics_no like 'ICS-' || to_char(p_form_date, 'YYYY-MM-DD') || '-%';
  end if;

  insert into public.form_number_counters (form_prefix, series_year, last_number)
  values (form_prefix, extract(year from p_form_date)::integer, history_number + 1)
  on conflict (form_prefix, series_year)
  do update set last_number = greatest(
    public.form_number_counters.last_number + 1,
    excluded.last_number
  )
  returning last_number into next_number;

  if form_prefix = 'RIS' or form_prefix = 'ICS' then
    return to_char(p_form_date, 'YYYY-MM-DD') || '-' || lpad(next_number::text, 7, '0');
  end if;

  return form_prefix || '-' || to_char(p_form_date, 'YYYY-MM-DD') || '-' ||
    lpad(next_number::text, 7, '0');
end;
$$;

revoke all on function public.next_form_number(text, date) from public;
grant execute on function public.next_form_number(text, date) to authenticated;
